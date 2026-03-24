from pydantic import BaseModel
from typing import Optional

class CheckRequest(BaseModel):
    input: str
    input_type: str = "text"       # "text" | "url"
    web_enabled: bool = True       # False → skip Tavily web search
    doc_text: Optional[str] = None # populated when a file is uploaded
    doc_query: Optional[str] = None# the specific claim to verify against the doc
