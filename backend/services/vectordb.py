"""
Vector Database Service using ChromaDB.
Stores document chunks as embeddings for fast semantic retrieval.

Install: pip install chromadb

Why ChromaDB:
- Runs fully in-memory or on disk (no external server)
- Fast cosine similarity search
- Persistent storage across sessions
- Free and open source
"""
import hashlib
import re
import os
import asyncio
from typing import Optional

# ChromaDB import with graceful fallback
try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
    print("[vectordb] ChromaDB loaded successfully")
except ImportError:
    CHROMA_AVAILABLE = False
    print("[vectordb] ChromaDB not installed — run: pip install chromadb")
    print("[vectordb] Falling back to in-memory keyword search")


# ── Singleton Chroma client ────────────────────────────────────────────────
_client  = None
_collection = None

def _get_collection():
    global _client, _collection
    if not CHROMA_AVAILABLE:
        return None
    if _collection is None:
        _client = chromadb.Client(Settings(
            anonymized_telemetry=False,
            is_persistent=False,   # in-memory for hackathon, set True for persistence
        ))
        _collection = _client.get_or_create_collection(
            name="factcheck_documents",
            metadata={"hnsw:space": "cosine"},
        )
        print("[vectordb] ChromaDB collection ready")
    return _collection


# ── Text chunking ──────────────────────────────────────────────────────────
def chunk_document(text: str, chunk_size: int = 200, overlap: int = 40) -> list[dict]:
    """Split document into overlapping chunks with metadata."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks    = []
    current   = []
    word_count = 0
    chunk_idx  = 0

    for sent in sentences:
        words = sent.split()
        if word_count + len(words) > chunk_size and current:
            chunk_text = " ".join(current)
            chunks.append({
                "text":      chunk_text,
                "chunk_idx": chunk_idx,
                "word_count": word_count,
            })
            # Overlap — keep last N words
            overlap_words = current[-overlap:] if len(current) > overlap else current
            current    = overlap_words + words
            word_count = len(current)
            chunk_idx += 1
        else:
            current.append(sent)
            word_count += len(words)

    if current:
        chunks.append({
            "text":      " ".join(current),
            "chunk_idx": chunk_idx,
            "word_count": word_count,
        })
    return chunks


def _doc_id(doc_text: str) -> str:
    """Stable ID for a document based on content hash."""
    return "doc_" + hashlib.md5(doc_text[:500].encode()).hexdigest()[:12]


# ── Store document in vector DB ────────────────────────────────────────────
def store_document(doc_text: str, doc_name: str = "document") -> dict:
    """
    Chunk a document and store all chunks in ChromaDB.
    Returns info about what was stored.
    """
    col = _get_collection()
    if col is None:
        return {"stored": False, "reason": "ChromaDB not available", "chunks": 0}

    doc_id = _doc_id(doc_text)
    chunks = chunk_document(doc_text)

    ids        = []
    documents  = []
    metadatas  = []

    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}_chunk_{i}"
        ids.append(chunk_id)
        documents.append(chunk["text"])
        metadatas.append({
            "doc_id":    doc_id,
            "doc_name":  doc_name,
            "chunk_idx": i,
            "total_chunks": len(chunks),
        })

    # Upsert — safe to re-add same document
    col.upsert(ids=ids, documents=documents, metadatas=metadatas)
    print(f"[vectordb] Stored {len(chunks)} chunks for '{doc_name}' (id: {doc_id})")

    return {
        "stored":    True,
        "doc_id":    doc_id,
        "doc_name":  doc_name,
        "chunks":    len(chunks),
        "reason":    "OK",
    }


# ── Query vector DB ────────────────────────────────────────────────────────
def query_document(query: str, doc_text: str = "", top_k: int = 6) -> str:
    """
    Find the most semantically relevant chunks for a query.
    If ChromaDB unavailable, falls back to keyword search.

    Returns formatted string of top-K relevant passages.
    """
    col = _get_collection()

    if col is not None and doc_text:
        doc_id = _doc_id(doc_text)
        try:
            results = col.query(
                query_texts=[query],
                n_results=min(top_k, 10),
                where={"doc_id": doc_id},
            )
            passages = results.get("documents", [[]])[0]
            distances = results.get("distances", [[]])[0]

            if passages:
                formatted = []
                for i, (passage, dist) in enumerate(zip(passages, distances)):
                    similarity = round(1 - dist, 3)
                    formatted.append(
                        f"[Passage {i+1} | Relevance: {similarity}]\n{passage}"
                    )
                print(f"[vectordb] ChromaDB found {len(passages)} relevant passages (top sim: {round(1-distances[0],3)})")
                return "\n\n---\n\n".join(formatted)
        except Exception as e:
            print(f"[vectordb] Query error: {e} — falling back to keyword search")

    # Fallback: keyword-based search
    return _keyword_search(query, doc_text, top_k)


def _keyword_search(query: str, doc_text: str, top_k: int) -> str:
    """Keyword-based fallback when ChromaDB unavailable."""
    if not doc_text:
        return "No document content available."

    chunks    = chunk_document(doc_text)
    q_words   = set(query.lower().split())
    stop      = {"the","a","an","is","are","was","were","in","on","at","to","for","and","or"}
    q_keywords = q_words - stop

    scored = []
    for chunk in chunks:
        words  = set(chunk["text"].lower().split())
        score  = len(q_keywords & words) / max(len(q_keywords), 1)
        scored.append((score, chunk["text"]))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    formatted = []
    for i, (score, text) in enumerate(top):
        formatted.append(f"[Passage {i+1} | Relevance: {round(score, 3)}]\n{text}")

    print(f"[vectordb] Keyword search: {len(top)} passages (top score: {round(top[0][0],3) if top else 0})")
    return "\n\n---\n\n".join(formatted)


# ── Collection stats ──────────────────────────────────────────────────────
def get_stats() -> dict:
    col = _get_collection()
    if col is None:
        return {"available": False, "backend": "keyword fallback"}
    try:
        count = col.count()
        return {
            "available": True,
            "backend":   "ChromaDB in-memory",
            "chunks_stored": count,
        }
    except Exception:
        return {"available": True, "backend": "ChromaDB", "chunks_stored": 0}