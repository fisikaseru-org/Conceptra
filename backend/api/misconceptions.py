"""Conceptra — Misconceptions API Router"""
from fastapi import APIRouter, Query
from typing import Optional, List
from core.corpus import PHYSICS_MISCONCEPTIONS, DOMAIN_STATS, YEARLY_DATA, REMEDIATION_TOOLS

router = APIRouter()

@router.get("/")
async def get_all_misconceptions(
    domain: Optional[str] = Query(None, description="Filter by domain"),
    level: Optional[str] = Query(None, description="Filter by educational level"),
    year: Optional[int] = Query(None, description="Filter by year"),
    min_frequency: Optional[int] = Query(None, description="Minimum frequency"),
    limit: int = Query(5000, le=10000)
):
    """Ambil semua data miskonsepsi dengan opsi filter."""
    results = PHYSICS_MISCONCEPTIONS.copy()
    
    if domain:
        results = [m for m in results if domain.lower() in m["domain"].lower()]
    if level:
        results = [m for m in results if any(level.lower() in l.lower() for l in m["educational_level"])]
    if year:
        results = [m for m in results if year in m["years_active"]]
    if min_frequency:
        results = [m for m in results if m["frequency"] >= min_frequency]
    
    results = sorted(results, key=lambda x: x["frequency"], reverse=True)
    return {"data": results[:limit], "total": len(results)}

@router.get("/domains")
async def get_domain_stats():
    """Statistik per domain fisika."""
    domains = []
    for domain, stats in DOMAIN_STATS.items():
        domains.append({
            "domain": domain,
            **stats,
            "misconceptions": [m for m in PHYSICS_MISCONCEPTIONS if m["domain"] == domain]
        })
    return {"data": sorted(domains, key=lambda x: x["total_frequency"], reverse=True)}

@router.get("/search")
async def search_misconceptions(
    q: str = Query(..., description="Search query"),
    use_semantic: bool = Query(False)
):
    """Cari miskonsepsi berdasarkan teks."""
    q_lower = q.lower()
    results = []
    
    for entry in PHYSICS_MISCONCEPTIONS:
        score = 0
        score += 3 if q_lower in entry["misconception"].lower() else 0
        score += 2 if q_lower in entry["domain"].lower() else 0
        score += 2 if q_lower in entry["concept"].lower() else 0
        score += 1 if any(q_lower in kw.lower() for kw in entry["keywords"]) else 0
        score += 1 if q_lower in entry["root_cause"].lower() else 0
        
        if score > 0:
            results.append({**entry, "relevance_score": score})
    
    if use_semantic:
        try:
            from core.embeddings import get_embedding_engine
            engine = get_embedding_engine()
            engine.initialize()
            semantic_results = engine.search(q, n_results=5)
            # Merge dengan semantic results
            semantic_ids = {r["id"] for r in semantic_results}
            for r in results:
                if r["id"] in semantic_ids:
                    r["relevance_score"] += 2
        except:
            pass
    
    return {
        "query": q,
        "results": sorted(results, key=lambda x: x["relevance_score"], reverse=True)
    }

@router.get("/remediation-tools")
async def get_remediation_tools():
    """Peta alat remediasi dan miskonsepsi yang ditangani."""
    tools = []
    for tool, ids in REMEDIATION_TOOLS.items():
        misconceptions_data = [
            {"id": m["id"], "domain": m["domain"], "misconception": m["misconception"]}
            for m in PHYSICS_MISCONCEPTIONS if m["id"] in ids
        ]
        tools.append({
            "tool": tool,
            "misconceptions_handled": len(ids),
            "misconceptions": misconceptions_data
        })
    return {"data": sorted(tools, key=lambda x: x["misconceptions_handled"], reverse=True)}

@router.get("/{misconception_id}")
async def get_misconception_by_id(misconception_id: str):
    """Detail satu miskonsepsi berdasarkan ID."""
    entry = next((m for m in PHYSICS_MISCONCEPTIONS if m["id"] == misconception_id), None)
    if not entry:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Misconception {misconception_id} not found")
    
    # Enrich with ontology data
    from core.ontology import get_ontology
    ont = get_ontology()
    remediation_path = ont.get_remediation_path(f"MIS-{misconception_id.split('-')[1]}")
    
    return {
        "data": entry,
        "ontology_remediation": remediation_path
    }
