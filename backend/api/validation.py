"""
Conceptra — Validation API Router
Endpoint untuk Validation Engine (Layer 5).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

router = APIRouter()


class ValidationRequest(BaseModel):
    module: str
    y_true: List[str]
    y_pred: List[str]
    confidences: Optional[List[float]] = None
    annotator_a: Optional[List[str]] = None
    annotator_b: Optional[List[str]] = None


class KappaRequest(BaseModel):
    annotator_a: List[str]
    annotator_b: List[str]


@router.get("/corpus-audit")
async def get_corpus_audit():
    """
    Audit ilmiah lengkap terhadap seluruh corpus miskonsepsi.
    Menampilkan secara jujur status data (fabricated vs verified).
    """
    from core.evidence_engine import get_evidence_engine
    from core.corpus import PHYSICS_MISCONCEPTIONS

    engine = get_evidence_engine()
    audit = engine.audit_corpus_entries(PHYSICS_MISCONCEPTIONS)
    return audit


@router.get("/metadata-quality")
async def get_metadata_quality():
    """Laporan kualitas metadata bibliografis corpus."""
    from core.metadata_layer import get_metadata_layer
    layer = get_metadata_layer()
    return layer.get_quality_report()


@router.get("/prisma-flowchart")
async def get_prisma_flowchart():
    """Data PRISMA 2020 flowchart untuk systematic review compliance."""
    from core.metadata_layer import get_metadata_layer
    layer = get_metadata_layer()
    return layer.get_prisma_flowchart_data()


@router.post("/compute-metrics")
async def compute_validation_metrics(request: ValidationRequest):
    """
    Hitung metrik validasi ilmiah (Precision, Recall, F1, Kappa).

    Digunakan untuk memvalidasi output model sebelum klaim ilmiah dibuat.
    """
    from core.validation_engine import get_validation_engine
    engine = get_validation_engine()

    if len(request.y_true) != len(request.y_pred):
        raise HTTPException(
            status_code=400,
            detail=f"Panjang y_true ({len(request.y_true)}) != y_pred ({len(request.y_pred)})"
        )

    annotator_labels = None
    if request.annotator_a and request.annotator_b:
        annotator_labels = (request.annotator_a, request.annotator_b)

    result = engine.run_full_validation(
        module_name=request.module,
        y_true=request.y_true,
        y_pred=request.y_pred,
        confidences=request.confidences,
        annotator_labels=annotator_labels,
    )
    return result.to_dict()


@router.post("/cohens-kappa")
async def compute_kappa(request: KappaRequest):
    """
    Hitung Cohen's Kappa untuk dua annotator.
    Diperlukan sebelum setiap klaim tentang reliabilitas anotasi.
    """
    from core.validation_engine import get_validation_engine
    engine = get_validation_engine()

    if len(request.annotator_a) != len(request.annotator_b):
        raise HTTPException(
            status_code=400,
            detail="Kedua annotator harus memiliki jumlah label yang sama."
        )

    kappa = engine.compute_cohens_kappa(request.annotator_a, request.annotator_b)

    return {
        "kappa": round(kappa, 4),
        "interpretation": _interpret_kappa(kappa),
        "acceptable_for_publication": kappa >= 0.61,
        "reference": "Landis & Koch (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159–174.",
    }


def _interpret_kappa(k: float) -> str:
    if k < 0:
        return "Poor (below chance agreement)"
    elif k < 0.20:
        return "Slight"
    elif k < 0.40:
        return "Fair"
    elif k < 0.60:
        return "Moderate"
    elif k < 0.80:
        return "Substantial ✓ (minimum acceptable)"
    else:
        return "Almost Perfect ✓✓"


@router.get("/bias-detection")
async def detect_biases():
    """
    Deteksi potensi bias dalam corpus penelitian.
    Meliputi: language bias, temporal bias, sampling bias, dataset size bias.
    """
    from core.validation_engine import get_validation_engine
    from core.corpus import PHYSICS_MISCONCEPTIONS
    engine = get_validation_engine()

    import sqlite3
    import os
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "conceptra.db")
    langs = []
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("SELECT a.language FROM extracted_misconceptions e JOIN articles a ON e.article_id = a.id WHERE a.language IS NOT NULL")
            langs = [r[0] for r in c.fetchall()]
            conn.close()
        except:
            pass

    corpus_metadata = []
    for i, m in enumerate(PHYSICS_MISCONCEPTIONS):
        corpus_metadata.append({
            "id": m["id"],
            "language": langs[i % len(langs)] if langs else "mixed",
            "year": max(m.get("years_active", [2020])) if m.get("years_active") else 2020,
            "educational_level": m.get("educational_level", []),
            "source": m.get("source", "fabricated"),
        })

    biases = engine.detect_biases(corpus_metadata)
    return {
        "bias_flags": biases,
        "total_flags": len(biases),
        "has_critical_bias": any(b["severity"] in ["fatal", "high"] for b in biases),
        "recommendation": (
            "Corpus membutuhkan perbaikan signifikan sebelum dapat digunakan untuk klaim ilmiah."
            if biases else "Tidak terdeteksi bias yang signifikan."
        )
    }


@router.get("/threat-analysis")
async def get_threat_analysis():
    """
    Analisis Threat to Validity (Internal, External, Construct, Conclusion, Ecological).
    """
    from core.validation_engine import get_validation_engine
    from core.corpus import PHYSICS_MISCONCEPTIONS
    engine = get_validation_engine()

    corpus_metadata = [
        {"source": m.get("source", "fabricated"), "id": m["id"]}
        for m in PHYSICS_MISCONCEPTIONS
    ]

    threats = engine.generate_threat_analysis(
        corpus_metadata=corpus_metadata,
        kappa=0.0,       # Belum ada inter-rater data
        f1=0.0,          # Belum ada ground truth
        sample_size=len(PHYSICS_MISCONCEPTIONS),
    )

    return {
        "threats": threats,
        "total_threats": len(threats),
        "fatal_threats": [t for t in threats if t["level"] == "fatal"],
        "overall_validity": "COMPROMISED" if any(t["level"] == "fatal" for t in threats) else "ACCEPTABLE",
        "publication_blocker": any(t["level"] == "fatal" for t in threats),
    }


@router.get("/evidence-summary")
async def get_evidence_summary():
    """Ringkasan seluruh evidence records yang terdaftar di Evidence Engine."""
    from core.evidence_engine import get_evidence_engine
    engine = get_evidence_engine()
    # Trigger corpus audit untuk mengisi registry
    from core.corpus import PHYSICS_MISCONCEPTIONS
    engine.audit_corpus_entries(PHYSICS_MISCONCEPTIONS)
    return engine.get_all_evidence_summary()
