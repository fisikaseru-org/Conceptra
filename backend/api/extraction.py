"""
Conceptra — Aspect Extraction API Router (Layer 4)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class ExtractionRequest(BaseModel):
    text: str
    include_relations: bool = True


class BatchExtractionRequest(BaseModel):
    texts: List[str]


class EvaluationRequest(BaseModel):
    texts: List[str]
    ground_truth_domains: List[str]


@router.post("/extract")
async def extract_aspects(request: ExtractionRequest):
    """
    Ekstraksi entitas dan aspek dari teks penelitian miskonsepsi fisika.

    Output meliputi:
    - Named Entities (domain, assessment tool, jenjang)
    - Aspect-Based Sentiment (remediasi: efektif/tidak efektif)
    - Relation triplets
    - Miskonsepsi candidates
    """
    if len(request.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Teks terlalu pendek untuk diekstraksi.")

    from core.aspect_extractor import get_aspect_extractor
    extractor = get_aspect_extractor()
    result = extractor.extract(request.text)
    return result.to_dict()


@router.post("/batch-extract")
async def batch_extract(request: BatchExtractionRequest):
    """Ekstraksi batch dari multiple teks."""
    if len(request.texts) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maksimum 50 teks per request untuk menghindari timeout."
        )

    from core.aspect_extractor import get_aspect_extractor
    extractor = get_aspect_extractor()
    results = extractor.batch_extract(request.texts)
    return {
        "results": [r.to_dict() for r in results],
        "total": len(results),
        "note": "Extraction using rule-based baseline — requires expert validation for scientific claims."
    }


@router.post("/evaluate")
async def evaluate_extractor(request: EvaluationRequest):
    """
    Evaluasi akurasi ekstractor pada sampel berlabel.
    Hanya valid jika ground_truth_domains adalah anotasi pakar nyata.
    """
    if len(request.texts) != len(request.ground_truth_domains):
        raise HTTPException(
            status_code=400,
            detail="Jumlah teks dan ground truth harus sama."
        )

    from core.aspect_extractor import get_aspect_extractor
    extractor = get_aspect_extractor()
    eval_result = extractor.evaluate_on_sample(request.texts, request.ground_truth_domains)
    return eval_result


@router.post("/extract-misconceptions")
async def extract_misconception_candidates(request: ExtractionRequest):
    """
    Ekstraksi khusus kandidat miskonsepsi dari teks abstrak/artikel.
    Setiap kandidat memerlukan validasi pakar sebelum masuk corpus.
    """
    from core.aspect_extractor import get_aspect_extractor
    extractor = get_aspect_extractor()
    result = extractor.extract(request.text)

    return {
        "misconception_candidates": result.misconception_candidates,
        "total_candidates": len(result.misconception_candidates),
        "domain": result.domain,
        "validation_required": True,
        "validation_note": (
            "Semua kandidat ini HARUS divalidasi oleh minimal 2 pakar bidang fisika "
            "sebelum dimasukkan ke corpus. Gunakan endpoint /api/validation/cohens-kappa "
            "untuk mengukur inter-rater agreement."
        )
    }
