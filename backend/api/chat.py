"""Conceptra — Chat API Router (RAG + LLM)"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from core.rag_chain import get_rag_chain

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    mode: str = "socratic"  # "socratic" | "analytical"
    domain_filter: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: list
    kg_nodes_used: list
    confidence: float
    mode: str

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Kirim pesan ke RAG Chat (Tutor Sokratik)."""
    chain = get_rag_chain()
    response = chain.chat(
        user_message=request.message,
        mode=request.mode,
        domain_filter=request.domain_filter
    )
    return ChatResponse(
        answer=response.answer,
        sources=response.sources,
        kg_nodes_used=response.kg_nodes_used,
        confidence=response.confidence,
        mode=response.mode
    )

@router.post("/reset")
async def reset_chat():
    """Reset chat history."""
    chain = get_rag_chain()
    chain.clear_history()
    return {"status": "Chat history cleared"}

@router.get("/suggestions")
async def get_suggestions():
    """Saran pertanyaan untuk pengguna baru."""
    return {
        "suggestions": [
            "Apa miskonsepsi paling umum dalam fisika mekanika?",
            "Mengapa siswa sering salah memahami gaya dan gerak?",
            "Bagaimana cara terbaik meremediasi miskonsepsi listrik?",
            "Apa dampak COVID-19 pada jenis miskonsepsi fisika?",
            "Instrumen asesmen apa yang paling efektif untuk mendeteksi miskonsepsi?",
            "Jelaskan mengapa model Bohr menyebabkan miskonsepsi kuantum",
            "Apa perbedaan antara kalor dan suhu menurut fisika?",
            "Bagaimana miskonsepsi gravitasi astronot terbentuk?",
        ]
    }
