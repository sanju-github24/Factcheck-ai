from pydantic import BaseModel
from typing import Optional

class CheckRequest(BaseModel):
    input: str
    input_type: str = "text"   # "text" | "url"
