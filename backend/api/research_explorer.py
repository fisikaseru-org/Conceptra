"""
Conceptra — Research Explorer API
Menyediakan akses ke database 17,755 artikel penelitian fisika Indonesia (1996-2026).
Endpoint untuk browsing, filtering, dan statistik artikel.
"""
from fastapi import APIRouter, Query
from typing import Optional, List
import sqlite3
import os
import json

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'conceptra.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/articles")
async def get_articles(
    domain: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    language: Optional[str] = None,
    has_doi: Optional[bool] = None,
    evidence_level: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("citation_count", description="citation_count | year | quality_score"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Browse artikel penelitian fisika Indonesia dari database (1996-2026).
    Mendukung filter domain, tahun, bahasa, DOI, evidence level, dan pencarian teks.
    """
    conn = get_conn()
    cur = conn.cursor()

    conditions = [
        "(is_indonesia_context = 1 OR is_indonesia_context IS NULL)",
        "year >= 1996",
        "year <= 2026"
    ]
    params: List = []

    if domain and domain != 'all':
        conditions.append("physics_domain = ?")
        params.append(domain)
    if year_from:
        conditions.append("year >= ?")
        params.append(year_from)
    if year_to:
        conditions.append("year <= ?")
        params.append(year_to)
    if language and language != 'all':
        conditions.append("language = ?")
        params.append(language)
    if has_doi is True:
        conditions.append("doi IS NOT NULL AND doi != ''")
    elif has_doi is False:
        conditions.append("(doi IS NULL OR doi = '')")
    if evidence_level and evidence_level != 'all':
        conditions.append("evidence_level = ?")
        params.append(evidence_level)
    if search:
        conditions.append("(LOWER(title) LIKE ? OR LOWER(abstract) LIKE ?)")
        s = f"%{search.lower()}%"
        params.extend([s, s])

    where = " AND ".join(conditions)

    safe_sort = {
        "citation_count": "citation_count DESC",
        "year": "year DESC",
        "quality_score": "quality_score DESC",
    }
    order = safe_sort.get(sort_by, "citation_count DESC")

    # total count
    cur.execute(f"SELECT COUNT(*) FROM articles WHERE {where}", params)
    total = cur.fetchone()[0]

    # paginated data
    offset = (page - 1) * limit
    cur.execute(f"""
        SELECT id, doi, title, authors, journal, year, abstract, citation_count,
               url, evidence_level, quality_score, physics_domain, language, 
               is_indonesia_context, open_access_url, concepts, keywords
        FROM articles
        WHERE {where}
        ORDER BY {order}
        LIMIT ? OFFSET ?
    """, params + [limit, offset])
    rows = cur.fetchall()

    articles = []
    for row in rows:
        authors = []
        try:
            authors = json.loads(row["authors"]) if row["authors"] else []
        except Exception:
            authors = [row["authors"]] if row["authors"] else []

        concepts = []
        try:
            concepts = json.loads(row["concepts"]) if row["concepts"] else []
        except Exception:
            pass

        keywords = []
        try:
            keywords = json.loads(row["keywords"]) if row["keywords"] else []
        except Exception:
            pass

        abstract_preview = (row["abstract"] or "")[:300]
        if len(row["abstract"] or "") > 300:
            abstract_preview += "..."

        articles.append({
            "id": row["id"],
            "doi": row["doi"],
            "title": row["title"],
            "authors": authors[:5],  # max 5 authors
            "journal": row["journal"],
            "year": row["year"],
            "abstract_preview": abstract_preview,
            "citation_count": row["citation_count"] or 0,
            "url": row["url"] or (f"https://doi.org/{row['doi']}" if row["doi"] else None),
            "open_access_url": row["open_access_url"],
            "evidence_level": row["evidence_level"],
            "quality_score": row["quality_score"],
            "physics_domain": row["physics_domain"],
            "language": row["language"],
            "concepts": concepts[:5],
            "keywords": keywords[:5],
        })

    conn.close()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "data": articles
    }


@router.get("/stats/summary")
async def get_db_stats_summary():
    """Statistik lengkap database artikel Indonesia 1996-2026."""
    conn = get_conn()
    cur = conn.cursor()

    total = cur.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    by_domain = cur.execute("""
        SELECT physics_domain, COUNT(*) as c, AVG(citation_count) as avg_cit, 
               MAX(citation_count) as max_cit, SUM(citation_count) as total_cit
        FROM articles
        GROUP BY physics_domain 
        ORDER BY c DESC
    """).fetchall()
    by_year = cur.execute("""
        SELECT year, COUNT(*) as c, SUM(citation_count) as total_cit
        FROM articles
        GROUP BY year ORDER BY year ASC
    """).fetchall()
    by_language = cur.execute("SELECT language, COUNT(*) as c FROM articles GROUP BY language").fetchall()
    by_evidence = cur.execute("SELECT evidence_level, COUNT(*) as c FROM articles GROUP BY evidence_level ORDER BY c DESC").fetchall()

    # Decade breakdown
    decades = cur.execute("""
        SELECT 
            CASE 
                WHEN year BETWEEN 1996 AND 2004 THEN '1996-2004'
                WHEN year BETWEEN 2005 AND 2014 THEN '2005-2014'
                WHEN year BETWEEN 2015 AND 2019 THEN '2015-2019'
                WHEN year BETWEEN 2020 AND 2026 THEN '2020-2026'
            END as decade,
            COUNT(*) as c,
            AVG(citation_count) as avg_cit
        FROM articles
        GROUP BY decade
        ORDER BY decade
    """).fetchall()

    top_journals = cur.execute("""
        SELECT journal, COUNT(*) as c, AVG(citation_count) as avg_cit
        FROM articles
        WHERE journal IS NOT NULL AND journal != ''
        GROUP BY journal
        ORDER BY c DESC
        LIMIT 20
    """).fetchall()

    top_cited = cur.execute("""
        SELECT title, journal, year, citation_count, physics_domain, doi
        FROM articles
        WHERE citation_count > 0
        ORDER BY citation_count DESC
        LIMIT 10
    """).fetchall()

    conn.close()
    return {
        "total_articles": total,
        "by_domain": [{"domain": r["physics_domain"], "count": r["c"], "avg_citation": round(r["avg_cit"] or 0, 1), "total_citations": r["total_cit"] or 0} for r in by_domain],
        "by_year": [{"year": r["year"], "count": r["c"], "total_citations": r["total_cit"] or 0} for r in by_year],
        "by_language": [{"language": r["language"] or "unknown", "count": r["c"]} for r in by_language],
        "by_evidence_level": [{"level": r["evidence_level"], "count": r["c"]} for r in by_evidence],
        "by_decade": [{"decade": r["decade"], "count": r["c"], "avg_citation": round(r["avg_cit"] or 0, 1)} for r in decades],
        "top_journals": [{"journal": r["journal"], "count": r["c"], "avg_citation": round(r["avg_cit"] or 0, 1)} for r in top_journals],
        "top_cited": [{"title": r["title"], "journal": r["journal"], "year": r["year"], "citation_count": r["citation_count"], "domain": r["physics_domain"], "doi": r["doi"]} for r in top_cited],
    }


@router.get("/articles/{article_id}")
async def get_article_detail(article_id: str):
    """Detail lengkap satu artikel beserta miskonsepsi yang diekstrak darinya."""
    conn = get_conn()
    cur = conn.cursor()

    row = cur.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
    if not row:
        conn.close()
        return {"error": "Article not found"}

    authors = []
    try:
        authors = json.loads(row["authors"]) if row["authors"] else []
    except Exception:
        pass

    concepts = []
    try:
        concepts = json.loads(row["concepts"]) if row["concepts"] else []
    except Exception:
        pass

    keywords = []
    try:
        keywords = json.loads(row["keywords"]) if row["keywords"] else []
    except Exception:
        pass

    # Get related misconceptions
    misc_rows = cur.execute("""
        SELECT misconception_text, concept, confidence, prevalence_pct, remediation, assessment_tool
        FROM extracted_misconceptions
        WHERE article_id = ?
        ORDER BY confidence DESC
    """, (article_id,)).fetchall()

    conn.close()

    return {
        "id": row["id"],
        "doi": row["doi"],
        "title": row["title"],
        "authors": authors,
        "journal": row["journal"],
        "year": row["year"],
        "abstract": row["abstract"],
        "citation_count": row["citation_count"] or 0,
        "url": row["url"] or (f"https://doi.org/{row['doi']}" if row["doi"] else None),
        "open_access_url": row["open_access_url"],
        "evidence_level": row["evidence_level"],
        "quality_score": row["quality_score"],
        "physics_domain": row["physics_domain"],
        "language": row["language"],
        "scopus_id": row["scopus_id"],
        "source": row["source"],
        "harvested_at": row["harvested_at"],
        "concepts": concepts,
        "keywords": keywords,
        "extracted_misconceptions": [
            {
                "text": m["misconception_text"],
                "concept": m["concept"],
                "confidence": m["confidence"],
                "prevalence_pct": m["prevalence_pct"],
                "remediation": m["remediation"],
                "assessment_tool": m["assessment_tool"],
            }
            for m in misc_rows
        ]
    }


@router.get("/stats/yearly-breakdown")
async def get_yearly_breakdown():
    """Breakdown domain per tahun untuk visualisasi heatmap/river."""
    conn = get_conn()
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT year, physics_domain, COUNT(*) as c, SUM(citation_count) as total_cit
        FROM articles
        GROUP BY year, physics_domain
        ORDER BY year, c DESC
    """).fetchall()
    conn.close()

    # Group by year
    yearly: dict = {}
    for r in rows:
        y = r["year"]
        if y not in yearly:
            yearly[y] = {"year": y, "total": 0, "domains": {}}
        yearly[y]["total"] += r["c"]
        yearly[y]["domains"][r["physics_domain"]] = {
            "count": r["c"],
            "citations": r["total_cit"] or 0
        }

    return {"data": list(yearly.values())}
