from pydantic import BaseModel
from typing import Optional, List

class Source(BaseModel):
    title: str = ""
    url: str = ""
    relevance: str = ""

class Claim(BaseModel):
    id: int
    claim: str
    context: str = ""
    checkworthy: bool = True

class ClaimResult(BaseModel):
    id: int
    claim: str
    context: str = ""
    verdict: str = "unverifiable"
    confidence: float = 0.0
    summary: str = ""
    supporting_evidence: List[str] = []
    contradicting_evidence: List[str] = []
    sources: List[Source] = []
    nuance: str = ""

class AIScore(BaseModel):
    ai_probability: float = 0.3
    reasoning: str = ""
    signals: List[str] = []

class Report(BaseModel):
    claims: List[ClaimResult] = []
    ai_score: AIScore = AIScore()
    overall_accuracy: float = 0.0
    total_claims: int = 0
    true_claims: int = 0
    false_claims: int = 0
    partial_claims: int = 0
    unverifiable_claims: int = 0
