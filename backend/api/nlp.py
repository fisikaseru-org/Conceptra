"""Conceptra — NLP Preprocessing Router"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.preprocessor import get_preprocessor

router = APIRouter()

class PreprocessRequest(BaseModel):
    text: str

@router.post("/preprocess")
async def preprocess_text(request: PreprocessRequest):
    """
    Memproses teks menggunakan 17-Tahap NLP Pipeline dan mengembalikan trace data.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        preprocessor = get_preprocessor()
        trace = preprocessor.preprocess(request.text)
        return {"status": "success", "trace": trace}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preprocessing error: {str(e)}")
