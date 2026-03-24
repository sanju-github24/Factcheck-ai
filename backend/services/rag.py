"""
RAG (Retrieval Augmented Generation) Pipeline
Enhances evidence retrieval with semantic chunking and vector similarity.

Pipeline:
  1. Tavily fetches raw documents
  2. Documents chunked into passages
  3. Each passage embedded via keyword vector
  4. Claim embedded as query vector
  5. Cosine similarity ranks passages by relevance
  6. Irrelevant off-topic passages filtered out
  7. Top-K passages injected into verdict prompt
"""
import asyncio
import math
import re
from services.vectordb import store_document, query_document


def _chunk_text(text: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
    """Split document into overlapping passages for better context."""
    words  = text.split()
    chunks = []
    i      = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot    = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _keyword_vector(text: str) -> list[float]:
    """
    TF-IDF keyword vector — 200 dimensions.
    Uses word frequency + bigrams for better semantic representation.
    """
    words  = re.findall(r'\b[a-zA-Z0-9]+\b', text.lower())
    stop   = {"the","a","an","is","are","was","were","has","have","had",
              "of","in","on","at","to","for","with","and","or","but",
              "this","that","it","be","by","as","from","they","we","you"}
    tokens = [w for w in words if w not in stop and len(w) > 2]

    freq = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1

    bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens)-1)]
    for b in bigrams:
        freq[b] = freq.get(b, 0) + 0.5

    total     = max(len(tokens), 1)
    top_terms = sorted(freq.keys(), key=lambda k: freq[k], reverse=True)[:200]
    vec       = [freq.get(t, 0) / total for t in top_terms]
    vec       = (vec + [0.0] * 200)[:200]
    return vec


def _embed_sync(text: str) -> list[float]:
    return _keyword_vector(text)


async def _embed(text: str) -> list[float]:
    return _embed_sync(text)


def _extract_keywords(claim: str) -> set[str]:
    """
    Extract meaningful keywords from a claim for relevance filtering.
    Ignores stop words and short tokens.
    """
    stop = {"the","a","an","is","are","was","were","has","have","had",
            "of","in","on","at","to","for","with","and","or","but",
            "this","that","it","be","by","as","from","they","we","you",
            "their","its","not","no","did","does","do","will","would",
            "could","should","may","might","also","just","been","being"}
    tokens = re.findall(r'\b[a-zA-Z0-9]+\b', claim.lower())
    return {t for t in tokens if t not in stop and len(t) > 3}


def _is_relevant(passage_text: str, title: str, claim_keywords: set[str], threshold: int = 1) -> bool:
    """
    Returns True if the passage shares at least `threshold` keywords with the claim.
    Prevents off-topic results (e.g. FIFA results for RCB claims) from polluting evidence.
    """
    combined = (passage_text + " " + title).lower()
    matches  = sum(1 for kw in claim_keywords if kw in combined)
    return matches >= threshold


async def rag_rerank(claim: str, raw_results: list[dict], top_k: int = 8) -> str:
    """
    RAG pipeline: chunk → filter by relevance → embed → rank → format top-K evidence.

    Args:
        claim:       The atomic claim to verify
        raw_results: Tavily search results [{"title", "url", "content", ...}]
        top_k:       Number of top passages to return

    Returns:
        Formatted evidence string with semantically ranked passages and real source URLs
    """
    if not raw_results:
        return "No search results found."

    claim_keywords = _extract_keywords(claim)
    print(f"[rag] Claim keywords: {claim_keywords}")

    # Step 1 — Chunk all documents into passages
    passages = []
    for r in raw_results:
        content = r.get("content", "")
        title   = r.get("title", "")
        url     = r.get("url", "")
        chunks  = _chunk_text(content, chunk_size=200, overlap=40)
        for chunk in chunks[:6]:
            passages.append({
                "text":  chunk,
                "title": title,
                "url":   url,
            })

    if not passages:
        return "No content available for evidence retrieval."

    print(f"[rag] {len(passages)} total passages from {len(raw_results)} sources")

    # Step 2 — Filter out off-topic passages
    relevant_passages = [
        p for p in passages
        if _is_relevant(p["text"], p["title"], claim_keywords, threshold=1)
    ]

    # If filtering removes everything, fall back to all passages
    if not relevant_passages:
        print(f"[rag] WARNING: No passages matched claim keywords — using all passages")
        relevant_passages = passages

    print(f"[rag] {len(relevant_passages)} passages after relevance filtering")

    # Step 3 — Try ChromaDB vector search first
    combined_text = " ".join(p["text"] for p in relevant_passages)
    try:
        store_document(combined_text, f"evidence_{claim[:30]}")
        vector_result = query_document(claim, combined_text, top_k=top_k)
        if vector_result and len(vector_result) > 100:
            print(f"[rag] Vector DB returned relevant passages")
            return vector_result
    except Exception as e:
        print(f"[rag] Vector DB error: {e} — using cosine similarity fallback")

    # Step 4 — Embed claim and passages, rank by cosine similarity
    candidates   = relevant_passages[:25]  # cap for performance
    embed_tasks  = [_embed(claim)] + [_embed(p["text"]) for p in candidates]
    vectors      = await asyncio.gather(*embed_tasks)

    claim_vec    = vectors[0]
    passage_vecs = vectors[1:]

    scored = []
    for passage, vec in zip(candidates, passage_vecs):
        score = _cosine_similarity(claim_vec, vec)
        scored.append((score, passage))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_passages = scored[:top_k]

    print(f"[rag] Top passage similarity score: {round(top_passages[0][0], 3) if top_passages else 0}")

    # Step 5 — Format as evidence with real source URLs (not "Passage N")
    parts     = []
    seen_urls = set()
    for rank, (score, p) in enumerate(top_passages, 1):
        url_line = ""
        if p["url"] and p["url"] not in seen_urls:
            url_line = f"\nURL: {p['url']}"
            seen_urls.add(p["url"])
        parts.append(
            f"[Source {rank} | {p['title']}]{url_line}\n"
            f"{p['text']}"
        )

    return "\n\n---\n\n".join(parts)


async def rag_evidence(claim: str, raw_results: list[dict]) -> str:
    """
    Public interface — returns RAG-ranked evidence string for verdict prompt.
    Falls back to simple formatting if RAG fails.
    """
    try:
        return await rag_rerank(claim, raw_results)
    except Exception as e:
        print(f"[rag] Pipeline error: {e} — falling back to simple format")
        from services.search import format_results
        return format_results(raw_results)