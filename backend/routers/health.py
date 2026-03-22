from fastapi import APIRouter
from config import FLASH_MODEL, PRO_MODEL

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "flash_model": FLASH_MODEL,
        "pro_model": PRO_MODEL,
    }
