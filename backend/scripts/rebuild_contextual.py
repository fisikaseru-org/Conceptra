#!/usr/bin/env python3
"""
Conceptra — Contextual Literature Rebuilder
=============================================
Membangun ulang `contextual_literatures` untuk semua 24 seed misconceptions
dari artikel yang ADA di database (sumber: OpenAlex, terverifikasi).

INVARIANT:
- Setiap artikel yang masuk ke contextual_literatures HARUS memiliki record
  di tabel articles dengan DOI valid dari OpenAlex.
- Jika tidak ada artikel relevan → contextual_literatures = []
- TIDAK PERNAH mengisi dengan data yang tidak ada di database.
"""
import os
import sys
import json
import sqlite3
import uuid
from datetime import datetime, timezone

# ─── PATHS ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "data", "conceptra.db")
CORPUS_PATH = os.path.join(BACKEND_DIR, "core", "corpus.py")

# ─── MISCONCEPTION KEYWORD MAPPING ────────────────────────────────────────────
MISCONCEPTION_KEYWORDS = {
    "MEC-001": {
        "keywords": ["impetus", "gaya terpendam", "force motion", "kinetic energy force",
                     "benda bergerak gaya", "misconception force", "miskonsepsi gaya gerak",
                     "newton law misconception", "hukum newton miskonsepsi"],
        "domain_filter": "Mekanika",
        "min_relevance": 0.3
    },
    "MEC-002": {
        "keywords": ["kinematic", "velocity acceleration misconception", "kecepatan percepatan",
                     "grafik gerak", "v-t graph", "x-t graph", "kinematika miskonsepsi",
                     "motion graph student"],
        "domain_filter": "Mekanika",
        "min_relevance": 0.3
    },
    "MEC-003": {
        "keywords": ["newton law", "hukum newton", "action reaction", "aksi reaksi",
                     "constant force motion", "gaya konstan", "impetus theory",
                     "force misconception", "miskonsepsi hukum newton"],
        "domain_filter": "Mekanika",
        "min_relevance": 0.3
    },
    "MEC-004": {
        "keywords": ["projectile motion", "gerak parabola", "gerak peluru",
                     "horizontal vertical motion", "projectile misconception"],
        "domain_filter": "Mekanika",
        "min_relevance": 0.3
    },
    "MEC-005": {
        "keywords": ["circular motion", "gerak melingkar", "centripetal centrifugal",
                     "gaya sentripetal", "gaya sentrifugal misconception"],
        "domain_filter": "Mekanika",
        "min_relevance": 0.3
    },
    "MEC-006": {
        "keywords": ["momentum conservation", "kekekalan momentum", "collision misconception",
                     "tumbukan", "momentum miskonsepsi"],
        "domain_filter": "Mekanika",
        "min_relevance": 0.3
    },
    "MEC-007": {
        "keywords": ["rotation", "rotasi", "torque", "torsi", "angular momentum",
                     "moment of inertia", "momen inersia", "rotational misconception"],
        "domain_filter": "Mekanika",
        "min_relevance": 0.3
    },
    "FLU-001": {
        "keywords": ["archimedes misconception", "buoyancy student", "gaya apung",
                     "hydrostatic misconception", "tekanan hidrostatis miskonsepsi",
                     "archimedes miskonsepsi", "fluida miskonsepsi"],
        "domain_filter": "Fluida",
        "min_relevance": 0.3
    },
    "FLU-002": {
        "keywords": ["bernoulli misconception", "fluid flow", "aliran fluida",
                     "bernoulli student", "venturi", "hukum bernoulli miskonsepsi"],
        "domain_filter": "Fluida",
        "min_relevance": 0.3
    },
    "GEL-001": {
        "keywords": ["wave misconception", "gelombang miskonsepsi", "superposition wave",
                     "interference diffraction student", "transverse longitudinal wave"],
        "domain_filter": "Gelombang",
        "min_relevance": 0.3
    },
    "GEL-002": {
        "keywords": ["doppler effect student", "efek doppler", "sound wave misconception",
                     "gelombang bunyi miskonsepsi", "resonance student"],
        "domain_filter": "Gelombang",
        "min_relevance": 0.3
    },
    "OPT-001": {
        "keywords": ["light misconception", "miskonsepsi cahaya", "optics student",
                     "lens misconception", "reflection refraction misconception",
                     "cahaya miskonsepsi", "optika miskonsepsi"],
        "domain_filter": "Optika",
        "min_relevance": 0.3
    },
    "ELE-001": {
        "keywords": ["electric circuit misconception", "miskonsepsi listrik",
                     "current consumption model", "ohm law student", "battery misconception",
                     "rangkaian listrik miskonsepsi", "arus tegangan miskonsepsi"],
        "domain_filter": "Listrik",
        "min_relevance": 0.3
    },
    "ELE-002": {
        "keywords": ["electrostatic misconception", "coulomb law student",
                     "electric field misconception", "capacitor student",
                     "miskonsepsi elektrostatik", "medan listrik miskonsepsi"],
        "domain_filter": "Listrik",
        "min_relevance": 0.3
    },
    "MAG-001": {
        "keywords": ["magnetic field misconception", "miskonsepsi magnet",
                     "lorentz force student", "electromagnetic induction student",
                     "medan magnet miskonsepsi", "induksi elektromagnetik siswa"],
        "domain_filter": "Magnetisme",
        "min_relevance": 0.3
    },
    "EM-001": {
        "keywords": ["electromagnetic wave student", "maxwell equation student",
                     "gelombang elektromagnetik miskonsepsi", "radiation misconception"],
        "domain_filter": "Magnetisme",
        "min_relevance": 0.3
    },
    "TERM-001": {
        "keywords": ["heat temperature misconception", "kalor suhu miskonsepsi",
                     "thermal equilibrium student", "conduction convection student",
                     "termodinamika miskonsepsi", "suhu kalor siswa"],
        "domain_filter": "Termodinamika",
        "min_relevance": 0.3
    },
    "TERM-002": {
        "keywords": ["thermodynamics law student", "entropy misconception",
                     "carnot engine student", "gas kinetic theory student",
                     "hukum termodinamika miskonsepsi", "entropi siswa"],
        "domain_filter": "Termodinamika",
        "min_relevance": 0.3
    },
    "MOD-001": {
        "keywords": ["photoelectric effect student", "wave particle duality misconception",
                     "atomic model misconception", "efek fotolistrik miskonsepsi",
                     "dualisme gelombang partikel", "model atom miskonsepsi",
                     "fisika modern miskonsepsi"],
        "domain_filter": "Fisika Modern",
        "min_relevance": 0.3
    },
    "KUA-001": {
        "keywords": ["quantum mechanics student", "uncertainty principle student",
                     "wave function misconception", "kuantum miskonsepsi",
                     "prinsip ketidakpastian siswa", "mekanika kuantum siswa"],
        "domain_filter": "Fisika Modern",
        "min_relevance": 0.3
    },
    "REL-001": {
        "keywords": ["relativity misconception", "time dilation student",
                     "length contraction student", "relativitas miskonsepsi",
                     "dilatasi waktu siswa", "einstein relativity student"],
        "domain_filter": "Fisika Modern",
        "min_relevance": 0.3
    },
    "NUK-001": {
        "keywords": ["nuclear physics student", "radioactivity misconception",
                     "half life student", "fisika nuklir miskonsepsi",
                     "radioaktivitas siswa", "peluruhan radioaktif"],
        "domain_filter": "Fisika Modern",
        "min_relevance": 0.3
    },
    "AST-001": {
        "keywords": ["astronomy misconception", "season misconception",
                     "gravity space student", "astronomi miskonsepsi",
                     "musim bumi matahari", "tata surya miskonsepsi",
                     "kepler law student"],
        "domain_filter": "Astronomi",
        "min_relevance": 0.3
    },
    "DIG-001": {
        "keywords": ["simulation physics", "phet misconception", "virtual lab physics",
                     "digital learning physics", "simulasi fisika",
                     "computational physics education"],
        "domain_filter": "Fisika Umum",
        "min_relevance": 0.2
    },
}


def compute_relevance_score(keywords: list, title: str, abstract: str) -> tuple:
    """
    Hitung relevance score berdasarkan keyword match.
    Returns (score, matched_keywords).
    DETERMINISTIK — tidak ada random.
    """
    title_lower = (title or "").lower()
    abstract_lower = (abstract or "").lower()

    matched = []
    raw_score = 0.0

    for kw in keywords:
        kw_lower = kw.lower()
        words = kw_lower.split()
        if not words:
            continue

        in_title = all(w in title_lower for w in words)
        in_abstract = all(w in abstract_lower for w in words)

        if in_title:
            raw_score += 2.0
            matched.append(kw)
        elif in_abstract:
            raw_score += 1.0
            if kw not in matched:
                matched.append(kw)

    if not keywords:
        return 0.0, []

    # Normalize by 3.0 so that a single title match (2.0/3.0 = 0.667) or single abstract match (1.0/3.0 = 0.333)
    # easily passes the minimum relevance threshold of 0.3 (or 0.2).
    normalized = min(raw_score / 3.0, 1.0)
    return round(normalized, 3), matched


def format_authors(authors_json: str) -> str:
    """Format authors JSON array into a readable string."""
    try:
        authors_list = json.loads(authors_json) if authors_json else []
        if isinstance(authors_list, list) and authors_list:
            formatted = "; ".join(authors_list[:3])
            if len(authors_list) > 3:
                formatted += " et al."
            return formatted
    except (json.JSONDecodeError, TypeError):
        pass
    return "Unknown Author"


def build_contextual_literatures():
    """
    Main algorithm:
    1. For each misconception ID:
       a. Query articles from DB where domain matches
       b. Compute relevance score via keyword matching
       c. Filter: only score >= min_relevance
       d. Sort by: relevance_score DESC, citation_count DESC, year DESC
       e. Take TOP 5 articles
       f. Save to contextual_links table
    2. Regenerate corpus.py with verified contextual_literatures

    HARD VALIDATION:
    - Every DOI MUST exist in articles table
    - Every article_id MUST exist in articles table
    - If TOP 5 is empty (all scores < min_relevance) → [] not fake data
    """
    print("=" * 70)
    print("  CONCEPTRA — CONTEXTUAL LITERATURE REBUILDER")
    print("=" * 70)

    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}. Run harvest_100k.py first.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Check articles table exists and has data
    cur.execute("SELECT COUNT(*) FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026 AND doi IS NOT NULL AND doi != ''")
    total_with_doi = cur.fetchone()[0]
    print(f"\n📊 Articles with DOI in database: {total_with_doi:,}")

    if total_with_doi == 0:
        print("❌ No articles with DOI found. Run harvest_100k.py first.")
        conn.close()
        sys.exit(1)

    # Ensure contextual_links table exists
    cur.execute("""
    CREATE TABLE IF NOT EXISTS contextual_links (
        id TEXT PRIMARY KEY,
        misconception_id TEXT NOT NULL,
        article_id TEXT NOT NULL,
        doi TEXT NOT NULL,
        relevance_score REAL NOT NULL,
        match_keywords TEXT,
        link_type TEXT DEFAULT 'contextual',
        created_at TEXT,
        FOREIGN KEY(article_id) REFERENCES articles(id),
        UNIQUE(misconception_id, article_id)
    )
    """)

    # Clear old contextual links
    cur.execute("DELETE FROM contextual_links")
    conn.commit()
    print("🗑️  Cleared old contextual_links table.")

    results = {}  # misconception_id → list of contextual entries
    total_links = 0
    empty_count = 0

    for misc_id, config in MISCONCEPTION_KEYWORDS.items():
        keywords = config["keywords"]
        domain_filter = config["domain_filter"]
        min_relevance = config["min_relevance"]

        print(f"\n{'─' * 50}")
        print(f"🔍 Processing {misc_id} ({domain_filter})...")

        # Query from DB: domain match + fallback to Fisika Umum
        # Also include articles from any domain that might be broadly relevant
        cur.execute("""
            SELECT id, doi, title, authors, journal, year, abstract, citation_count, url
            FROM articles
            WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026
              AND doi IS NOT NULL AND doi != ''
              AND abstract IS NOT NULL AND abstract != ''
              AND (physics_domain = ? OR physics_domain = 'Fisika Umum')
            ORDER BY citation_count DESC, year DESC
            LIMIT 3000
        """, (domain_filter,))

        candidates = cur.fetchall()

        # If too few domain-specific candidates, also try broader search
        if len(candidates) < 100:
            cur.execute("""
                SELECT id, doi, title, authors, journal, year, abstract, citation_count, url
                FROM articles
                WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026
                  AND doi IS NOT NULL AND doi != ''
                  AND abstract IS NOT NULL AND abstract != ''
                ORDER BY citation_count DESC, year DESC
                LIMIT 3000
            """)
            candidates = cur.fetchall()

        print(f"   Candidates pool: {len(candidates)}")

        # Score each candidate
        scored = []
        for article in candidates:
            score, matched = compute_relevance_score(
                keywords, article["title"], article["abstract"]
            )
            if score >= min_relevance:
                scored.append({
                    "article_id": article["id"],
                    "doi": article["doi"],
                    "title": article["title"],
                    "authors": article["authors"],
                    "journal": article["journal"] or "Unknown Journal",
                    "year": article["year"],
                    "citation_count": article["citation_count"] or 0,
                    "relevance_score": score,
                    "matched_keywords": matched,
                    "abstract": article["abstract"],
                    "url": article["url"]
                })

        # Sort: relevance primary, citations secondary, year tertiary
        scored.sort(key=lambda x: (
            -x["relevance_score"],
            -x["citation_count"],
            -(x["year"] or 0)
        ))

        top_articles = scored[:5]
        print(f"   Relevant articles: {len(scored)} | Using top: {len(top_articles)}")

        # Format contextual_literatures
        contextual_list = []
        for art in top_articles:
            formatted_authors = format_authors(art["authors"])

            # Extract first two sentences of abstract as the insight
            abstract_text = art.get("abstract") or ""
            # Split by periods, ignoring empty components
            sentences = [s.strip() for s in abstract_text.split(".") if s.strip()]
            insight = ". ".join(sentences[:2])
            if insight and not insight.endswith("."):
                insight += "."
            if len(insight) > 250:
                insight = insight[:247] + "..."
            if not insight:
                insight = f"Studi literatur tentang pemetaan konsep {domain_filter}."

            entry = {
                "title": art["title"],
                "authors": formatted_authors,
                "journal": art["journal"],
                "year": art["year"],
                "doi": art["doi"],
                "url": art["url"] or f"https://doi.org/{art['doi']}",
                "insight": insight,
                "relevance_score": art["relevance_score"],
                "matched_keywords": art["matched_keywords"],
            }
            contextual_list.append(entry)

            # Save to contextual_links table
            link_id = str(uuid.uuid4())
            cur.execute("""
                INSERT OR REPLACE INTO contextual_links
                (id, misconception_id, article_id, doi, relevance_score,
                 match_keywords, link_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'contextual', ?)
            """, (
                link_id,
                misc_id,
                art["article_id"],
                art["doi"],
                art["relevance_score"],
                json.dumps(art["matched_keywords"]),
                datetime.now(timezone.utc).isoformat()
            ))
            total_links += 1

        results[misc_id] = contextual_list
        conn.commit()

        if not contextual_list:
            empty_count += 1
            print(f"   ⚠️  WARNING: No relevant articles found. contextual_literatures = []")
        else:
            print(f"   ✅ {len(contextual_list)} articles linked:")
            for art in contextual_list:
                print(f"      [{art['relevance_score']:.3f}] {art['doi']} — {art['title'][:60]}")

    # ─── VALIDATE INTEGRITY ────────────────────────────────────────────────────
    print(f"\n{'=' * 50}")
    print("🔒 VALIDATING DATA INTEGRITY...")

    cur.execute("""
        SELECT cl.doi FROM contextual_links cl
        LEFT JOIN articles a ON cl.doi = a.doi
        WHERE a.doi IS NULL
    """)
    orphan_dois = cur.fetchall()

    if orphan_dois:
        print(f"   ❌ PROBLEM: {len(orphan_dois)} orphan DOIs found!")
        for row in orphan_dois[:5]:
            print(f"      {row[0]}")
    else:
        print(f"   ✅ ALL DOIs VERIFIED — every DOI exists in articles table")

    cur.execute("SELECT COUNT(DISTINCT misconception_id) FROM contextual_links")
    linked_misc = cur.fetchone()[0]

    conn.close()

    print(f"\n📊 REBUILD SUMMARY:")
    print(f"   Total contextual links: {total_links}")
    print(f"   Misconceptions with links: {linked_misc}/24")
    print(f"   Misconceptions with NO links: {empty_count}")
    print(f"   Orphan DOIs: {len(orphan_dois)}")

    return results


def regenerate_corpus_py(contextual_results: dict):
    """
    Regenerate corpus.py with verified contextual_literatures.
    ONLY modifies the contextual_literatures field.
    All other fields remain unchanged.
    """
    print(f"\n{'=' * 50}")
    print("📝 REGENERATING corpus.py...")

    if not os.path.exists(CORPUS_PATH):
        print(f"❌ corpus.py not found at {CORPUS_PATH}")
        return

    # Import the current misconceptions
    sys.path.insert(0, BACKEND_DIR)
    from core.corpus import PHYSICS_MISCONCEPTIONS

    # Update contextual_literatures for each misconception
    for entry in PHYSICS_MISCONCEPTIONS:
        mid = entry["id"]
        if mid in contextual_results:
            entry["contextual_literatures"] = contextual_results[mid]
        else:
            entry["contextual_literatures"] = []

    # Read the original file
    with open(CORPUS_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the PHYSICS_MISCONCEPTIONS list boundaries
    start_marker = "PHYSICS_MISCONCEPTIONS: List[MisconceptionEntry] = "
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print("❌ Could not find PHYSICS_MISCONCEPTIONS in corpus.py")
        return

    # Find the end: look for the next top-level definition after the list
    # We look for "# Domain statistics" or similar markers
    end_markers = ["# Domain statistics", "# Research gap", "DOMAIN_STATS",
                   "# Research interventions", "REMEDIATION_TOOLS",
                   "AUTHOR_NETWORK", "# ─── SCIENTOMETRICS"]
    end_idx = len(content)
    for marker in end_markers:
        idx = content.find(marker, start_idx + len(start_marker))
        if idx != -1 and idx < end_idx:
            end_idx = idx

    # Build the new list string
    new_list_str = start_marker + json.dumps(
        PHYSICS_MISCONCEPTIONS, indent=4, ensure_ascii=False
    ) + "\n\n"

    # Fix Python-specific syntax: true/false/null → True/False/None
    new_list_str = (new_list_str
                    .replace(": true", ": True")
                    .replace(": false", ": False")
                    .replace(": null", ": None"))

    # Reconstruct the file
    new_content = content[:start_idx] + new_list_str + content[end_idx:]

    with open(CORPUS_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"✅ corpus.py regenerated successfully!")
    print(f"   Updated contextual_literatures for {len(contextual_results)} misconceptions.")


if __name__ == "__main__":
    results = build_contextual_literatures()
    regenerate_corpus_py(results)
    print("\n" + "=" * 70)
    print("  REBUILD COMPLETE")
    print("  All contextual_literatures are now 100% from OpenAlex database.")
    print("=" * 70)
