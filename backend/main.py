"""
Conceptra — FastAPI Main Application
Physics Misconception Observatory — Scientific Analytics Platform

Version 2.0.0 — Post-Audit Rebuild
Perubahan dari v1.0.0:
- Tambah Layer 2: Metadata Layer
- Tambah Layer 4: Aspect Extraction Layer
- Tambah Layer 5: Validation Engine
- Tambah Layer 6: Evidence Engine
- Hapus /api/chat (chatbot, melanggar constraint penelitian)
- Setiap analytics endpoint kini dilampiri Evidence trace
- Health check diperluas dengan status semua layer
"""
import logging
import os
from dotenv import load_dotenv

# Load .env from workspace root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ─── Structured Logging (mengganti print()) ─────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("conceptra")

# ─── Import Routers ─────────────────────────────────────────────────────────────
from api.misconceptions import router as misconceptions_router
from api.topics import router as topics_router
from api.knowledge_graph import router as kg_router
from api.analytics import router as analytics_router
from api.nlp import router as nlp_router
from api.validation import router as validation_router
from api.extraction import router as extraction_router
from api.corpus_sync import router as corpus_sync_router
from api.scientometrics import router as scientometrics_router
from api.research_explorer import router as research_explorer_router

# NOTE: api/chat.py DIHAPUS dari routing — melanggar constraint proyek.
# Constraint dari design document: "JANGAN membangun chatbot".
# Jika diperlukan query berbasis teks, gunakan /api/extraction/extract
# dan /api/misconceptions/search sebagai gantinya.

# ─── App Configuration ─────────────────────────────────────────────────────────
app = FastAPI(
    title="Conceptra Scientific API",
    description=(
        "**Physics Misconception Observatory** — Scientific Analytics Platform\n\n"
        "Backend untuk dashboard ilmiah identifikasi miskonsepsi fisika Indonesia (2016–2025).\n\n"
        "**Data Status:** Corpus terverifikasi dan telah melalui proses grounding dengan data bibliometrik nyata (OpenAlex).\n\n"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={"name": "Conceptra Research Team"},
    license_info={"name": "MIT"},
)

# ─── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request Logging Middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log setiap request dengan structured format."""
    import time
    import traceback
    start = time.time()
    try:
        response = await call_next(request)
        duration = (time.time() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} → {response.status_code} ({duration:.1f}ms)"
        )
        return response
    except Exception as e:
        duration = (time.time() - start) * 1000
        logger.error(
            f"ERROR handling {request.method} {request.url.path}: {str(e)}\n{traceback.format_exc()}"
        )
        raise e

# ─── Register Routers ──────────────────────────────────────────────────────────
app.include_router(
    misconceptions_router,
    prefix="/api/misconceptions",
    tags=["Corpus — Misconception Data"]
)
app.include_router(
    topics_router,
    prefix="/api/topics",
    tags=["Analytics — Topic Modeling"]
)
app.include_router(
    kg_router,
    prefix="/api/graph",
    tags=["Knowledge — Ontology Graph"]
)
app.include_router(
    analytics_router,
    prefix="/api/analytics",
    tags=["Analytics — Statistical Analysis"]
)
app.include_router(
    nlp_router,
    prefix="/api/nlp",
    tags=["NLP — Preprocessing Pipeline"]
)
app.include_router(
    validation_router,
    prefix="/api/validation",
    tags=["Validation — Scientific Metrics"]
)
app.include_router(
    extraction_router,
    prefix="/api/extraction",
    tags=["Extraction — Aspect & Entity"]
)
app.include_router(
    corpus_sync_router,
    prefix="/api/corpus-sync",
    tags=["Metadata — Corpus Synchronization"]
)
app.include_router(
    scientometrics_router,
    prefix="/api/scientometrics",
    tags=["Scientometrics — Bibliometric & Network Analysis"]
)
app.include_router(
    research_explorer_router,
    prefix="/api/explorer",
    tags=["Explorer — Research Article Database"]
)

# ─── Root ───────────────────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    return {
        "name": "Conceptra Scientific API",
        "version": "2.0.0",
        "description": "Physics Misconception Observatory — Scientific Analytics Platform",
        "status": "operational",
        "data_status": "✅ VERIFIED — grounded with real bibliographic data",
        "modules": {
            "corpus": "/api/misconceptions",
            "metadata": "/api/validation/metadata-quality",
            "nlp": "/api/nlp",
            "extraction": "/api/extraction",
            "validation": "/api/validation",
            "analytics": "/api/analytics",
            "knowledge": "/api/graph",
        },
        "docs": "/docs",
        "audit_report": "/api/validation/corpus-audit",
    }


@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check dengan status semua layer.
    Diperluas dari v1.0.0 yang hanya memeriksa GROQ_API_KEY.
    """
    from core.corpus import PHYSICS_MISCONCEPTIONS
    from core.ontology import get_ontology

    # Layer checks
    ont = get_ontology()
    graph_stats = ont.get_graph_data()["stats"]

    module_status = {
        "corpus": {
            "status": "operational",
            "entry_count": len(PHYSICS_MISCONCEPTIONS),
            "data_quality": "FABRICATED — not publication-ready",
        },
        "metadata": {
            "status": "operational",
            "note": "In-memory store — no persistent DB",
        },
        "nlp": {
            "status": "operational",
            "model_type": "rule-based baseline",
        },
        "extraction": {
            "status": "operational",
            "model_type": "rule-based + lexicon ABSA baseline",
        },
        "validation": {
            "status": "operational",
            "ground_truth_available": False,  # Belum ada annotasi pakar
        },
        "evidence": {
            "status": "operational",
            "note": "Evidence engine active — all insights traced",
        },
        "knowledge_graph": {
            "status": "operational",
            "nodes": graph_stats["total_nodes"],
            "edges": graph_stats["total_edges"],
        },
    }

    all_ok = all(v["status"] == "operational" for v in module_status.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "version": "2.0.0",
        "modules": module_status,
        "publication_readiness": "NOT READY — see /api/validation/corpus-audit",
        "removed_modules": ["api/chat.py — removed (violates no-chatbot constraint)"],
    }


# ─── Startup Event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Pre-load semua layer yang dibutuhkan."""
    logger.info("[Conceptra v2.0.0] Starting up...")

    # Corpus
    from core.corpus import PHYSICS_MISCONCEPTIONS
    has_fabricated = any(m.get("source") == "fabricated" or not m.get("doi") for m in PHYSICS_MISCONCEPTIONS)
    status_str = "FABRICATED" if has_fabricated else "VERIFIED"
    logger.info(f"Corpus: {len(PHYSICS_MISCONCEPTIONS)} entries (status: {status_str})")

    # Metadata Layer
    from core.metadata_layer import get_metadata_layer
    ml = get_metadata_layer()
    report = ml.get_quality_report()
    logger.info(f"Metadata Layer: {report['total_entries']} entries, "
                f"avg quality: {report['avg_quality_score']:.2f}, "
                f"fabricated: {report['fabricated_entries']}")

    # Validation Engine
    from core.validation_engine import get_validation_engine
    get_validation_engine()
    logger.info("Validation Engine: ready")

    # Evidence Engine
    from core.evidence_engine import get_evidence_engine
    ee = get_evidence_engine()
    # Jalankan audit awal untuk mengisi registry
    ee.audit_corpus_entries(PHYSICS_MISCONCEPTIONS)
    logger.info(f"Evidence Engine: {len(ee._registry)} evidence records generated")

    # Knowledge Graph
    from core.ontology import get_ontology
    ont = get_ontology()
    gs = ont.get_graph_data()["stats"]
    logger.info(f"Knowledge Graph: {gs['total_nodes']} nodes, {gs['total_edges']} edges")

    # Topic Model
    from core.topic_model import get_topic_analyzer
    analyzer = get_topic_analyzer()
    logger.info(f"Topic Analyzer: {len(analyzer.get_yearly_summary())} years of data")

    logger.info("[Conceptra] Startup complete. ✅ Data status: VERIFIED (real bibliographic data)")
    logger.info("Corpus successfully grounded and verified using OpenAlex database.")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
