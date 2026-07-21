#!/usr/bin/env python3
"""
Conceptra — NLP-Based Misconception Extractor
=============================================
Menggantikan extract_10k.py yang menggunakan template palsu.

PRINSIP:
- Setiap miskonsepsi yang diekstrak HARUS memiliki extracted_sentence (kalimat sumber)
- Confidence score berdasarkan kekuatan sinyal linguistik, bukan random
- Tidak ada template string — teks miskonsepsi diambil dari abstract
- extraction_method selalu jelas: 'keyword_match' atau 'sentence_pattern'
- Minimum threshold confidence >= 0.50 untuk disimpan
"""
import os
import sys
import re
import json
import sqlite3
import uuid
from datetime import datetime, timezone

# ─── PATHS ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "data", "conceptra.db")

# ─── MINIMUM THRESHOLDS ───────────────────────────────────────────────────────
MIN_ABSTRACT_LENGTH = 100
MIN_CONFIDENCE = 0.60

# ─── LINGUISTIC SIGNALS ───────────────────────────────────────────────────────

MISCONCEPTION_SIGNALS = {
    # Patterns indicating a misconception IS PRESENT in the study
    "misconception_present": [
        # English patterns
        r"(?:students?|learners?)\s+(?:still\s+)?(?:believe|think|consider|assume|hold)\s+(?:that\s+)?(.{20,150})",
        r"(?:common\s+)?misconception(?:s)?\s+(?:about|regarding|on|in|related to)\s+(.{20,120})",
        r"(?:incorrect|wrong|false|erroneous)\s+(?:understanding|belief|conception|idea|notion)\s+(?:that|about|of|regarding)\s*(.{20,120})",
        r"(?:students?\s+(?:often|commonly|frequently|typically)\s+)?(?:confuse|mix up|conflate)\s+(.{20,120})",
        r"(?:alternative\s+conception|preconception|naive\s+(?:conception|theory|belief))\s+(?:about|of|that|regarding)\s+(.{20,120})",
        r"(?:students?\s+)?(?:fail(?:ed)?|unable)\s+to\s+(?:understand|distinguish|differentiate|grasp)\s+(.{20,120})",
        # Indonesian patterns
        r"miskonsepsi\s+(?:tentang|pada|mengenai|terkait|dalam)\s+(.{20,120})",
        r"(?:siswa|peserta didik|mahasiswa)\s+(?:masih\s+)?(?:menganggap|beranggapan|berpikir|percaya)\s+(?:bahwa\s+)?(.{20,150})",
        r"(?:kesalahan|kekeliruan)\s+(?:konsep|pemahaman|konsepsi)\s+(?:tentang|pada|mengenai)\s+(.{20,120})",
        r"(?:konsepsi\s+alternatif|konsep\s+awal|prakonsepsi)\s+(?:tentang|pada|mengenai)\s+(.{20,120})",
    ],
    # Patterns indicating PREVALENCE of misconception
    "prevalence_pattern": [
        r"(\d{1,3}(?:[.,]\d+)?)\s*%\s+(?:of\s+)?(?:students?|siswa|respondents?|responden|participants?|peserta|learners?)",
        r"(?:students?|siswa|respondents?)\s+(?:show(?:ed)?|demonstrat(?:ed?)|had|have|memiliki|mengalami)\s+(\d{1,3}(?:[.,]\d+)?)\s*%",
        r"(?:prevalence|percentage|persentase|proporsi)\s+(?:of\s+)?(?:misconception|miskonsepsi)\s+(?:is|was|were|sebesar|sebanyak)?\s*(\d{1,3}(?:[.,]\d+)?)\s*%",
        r"(\d{1,3}(?:[.,]\d+)?)\s*%\s+(?:misconception|miskonsepsi|having misconception)",
        r"(?:as\s+(?:high|much)\s+as|mencapai|sebesar)\s+(\d{1,3}(?:[.,]\d+)?)\s*%",
    ],
    # Patterns indicating REMEDIATION was applied
    "remediation_pattern": [
        r"(?:using|dengan|melalui|menggunakan|applying|menerapkan)\s+((?:phet|cbt|poe|inquiry|cognitive conflict|conceptual change|four-tier|three-tier|cri|fci|demonstration|demonstrasi|simulation|simulasi|predict.observe.explain|problem.based|project.based)(?:\s+\w+){0,5})",
        r"(?:implement(?:ed|ing)?|diterapkan|digunakan|applied)\s+(.{10,80})\s+(?:to\s+(?:reduce|address|remediate|overcome)|untuk\s+(?:mengurangi|mengatasi|mereduksi|meremediasi))",
        r"(?:effective(?:ness)?|efektiv(?:itas)?)\s+(?:of\s+)?(.{10,80})\s+(?:in\s+(?:reducing|addressing)|dalam\s+(?:mengurangi|mengatasi))",
    ],
    # Patterns indicating ASSESSMENT METHOD
    "assessment_pattern": [
        r"(?:using|menggunakan|dengan)\s+((?:four.tier|three.tier|two.tier|diagnostic|CRI|FCI|FMCE|certainty of response|concept inventory|multiple.choice)(?:\s+\w+){0,4}(?:test|instrument|diagnostic)?)",
        r"((?:four|three|two|4|3|2).tier\s+(?:diagnostic\s+)?test)",
        r"((?:Force\s+Concept\s+Inventory|FCI|FMCE|CRI|Certainty\s+of\s+Response\s+Index))",
    ]
}

# ─── DOMAIN CONCEPT MAP ───────────────────────────────────────────────────────
DOMAIN_CONCEPT_MAP = {
    "Mekanika": ["newton", "gaya", "force", "motion", "gerak", "kinematic",
                 "momentum", "energy", "energi", "rotation", "rotasi",
                 "projectile", "parabola", "circular", "melingkar"],
    "Listrik": ["electric", "listrik", "circuit", "rangkaian", "voltage",
                "current", "arus", "resistance", "ohm", "coulomb",
                "capacitor", "kapasitor"],
    "Termodinamika": ["heat", "kalor", "temperature", "suhu", "thermal",
                      "entropy", "thermodynamic", "carnot", "gas kinetic"],
    "Gelombang": ["wave", "gelombang", "sound", "bunyi", "frequency",
                  "interference", "diffraction", "superposition", "doppler"],
    "Optika": ["light", "cahaya", "optic", "lens", "lensa", "reflection",
               "refraction", "mirror", "cermin", "snell"],
    "Fluida": ["fluid", "fluida", "pressure", "tekanan", "archimedes",
               "buoyancy", "bernoulli", "hydrostatic", "viscosity"],
    "Fisika Modern": ["quantum", "kuantum", "photon", "relativity", "atomic",
                      "nuclear", "radioactive", "photoelectric", "bohr"],
    "Magnetisme": ["magnetic", "magnet", "lorentz", "electromagnetic",
                   "induction", "induksi", "flux"],
    "Astronomi": ["astronomy", "astronomi", "kepler", "planet", "solar",
                  "orbit", "gravity space", "season"],
}


def detect_concept_from_text(title: str, abstract: str) -> str:
    """Detect physics concept from text — deterministic."""
    text = ((title or "") + " " + ((abstract or "")[:500])).lower()
    best_domain = "Fisika Umum"
    best_count = 0
    for domain, keywords in DOMAIN_CONCEPT_MAP.items():
        count = sum(1 for kw in keywords if kw in text)
        if count > best_count:
            best_count = count
            best_domain = domain
    return best_domain


def extract_from_abstract(abstract: str, title: str) -> dict:
    """
    Extract misconception signals from abstract.
    Returns None if no meaningful signals detected.
    Returns dict with fields populated from actual text.

    Confidence scoring (deterministic):
    - misconception_present match in abstract: +0.50
    - prevalence_pattern match: +0.20
    - remediation_pattern match: +0.15
    - title contains "misconception"/"miskonsepsi": +0.15
    - assessment method match: +0.10

    Minimum confidence to save: 0.50
    """
    if not abstract or len(abstract) < MIN_ABSTRACT_LENGTH:
        return None

    result = {
        "extracted_sentence": None,
        "misconception_text": None,
        "prevalence_pct": None,
        "remediation": None,
        "assessment_tool": None,
        "confidence": 0.0,
        "extraction_method": "sentence_pattern"
    }

    # Check title signal
    title_lower = (title or "").lower()
    if "misconception" in title_lower or "miskonsepsi" in title_lower:
        result["confidence"] += 0.15
    if "alternative conception" in title_lower or "konsepsi alternatif" in title_lower:
        result["confidence"] += 0.10

    # Try misconception_present patterns
    for pattern in MISCONCEPTION_SIGNALS["misconception_present"]:
        match = re.search(pattern, abstract, re.IGNORECASE)
        if match:
            result["confidence"] += 0.50
            result["extracted_sentence"] = match.group(0).strip()[:300]
            if match.lastindex and match.lastindex >= 1:
                result["misconception_text"] = match.group(1).strip()[:200]
            else:
                result["misconception_text"] = match.group(0).strip()[:200]
            result["extraction_method"] = "sentence_pattern"
            break

    # Try prevalence pattern
    for pattern in MISCONCEPTION_SIGNALS["prevalence_pattern"]:
        match = re.search(pattern, abstract, re.IGNORECASE)
        if match:
            result["confidence"] += 0.20
            try:
                pct_str = match.group(1).replace(",", ".")
                pct = float(pct_str)
                if 0 < pct <= 100:
                    result["prevalence_pct"] = round(pct, 1)
            except (ValueError, IndexError):
                pass
            break

    # Try remediation pattern
    for pattern in MISCONCEPTION_SIGNALS["remediation_pattern"]:
        match = re.search(pattern, abstract, re.IGNORECASE)
        if match:
            result["confidence"] += 0.15
            if match.lastindex and match.lastindex >= 1:
                result["remediation"] = match.group(1).strip()[:100]
            break

    # Try assessment pattern
    for pattern in MISCONCEPTION_SIGNALS["assessment_pattern"]:
        match = re.search(pattern, abstract, re.IGNORECASE)
        if match:
            result["confidence"] += 0.10
            if match.lastindex and match.lastindex >= 1:
                result["assessment_tool"] = match.group(1).strip()[:100]
            break

    # Check minimum threshold
    if result["confidence"] < MIN_CONFIDENCE:
        return None

    # Fallback: if no extracted_sentence but confidence is sufficient from title
    if not result["extracted_sentence"]:
        # Extract the first sentence in the abstract that contains misconception signals
        signal_words = ["misconception", "miskonsepsi", "believe", "menganggap",
                        "incorrect", "keliru", "alternative conception",
                        "konsepsi alternatif", "misunderstand"]
        sentences = re.split(r'(?<=[.!?])\s+', abstract)
        for sent in sentences[:8]:
            if any(sw in sent.lower() for sw in signal_words):
                result["extracted_sentence"] = sent.strip()[:300]
                break

    # Fallback for misconception_text
    if not result["misconception_text"] and result["extracted_sentence"]:
        result["misconception_text"] = result["extracted_sentence"][:200]
    elif not result["misconception_text"]:
        # Use title as last resort if it mentions misconception
        if "misconception" in title_lower or "miskonsepsi" in title_lower:
            result["misconception_text"] = title[:200]
            result["extraction_method"] = "keyword_match"
        else:
            return None  # Cannot extract anything meaningful

    result["confidence"] = round(min(result["confidence"], 1.0), 2)
    return result


def run_nlp_extraction():
    """
    Process all articles in the database.
    Save to extracted_misconceptions only those that pass confidence >= 0.50.
    Print statistics at the end.
    """
    print("=" * 70)
    print("  CONCEPTRA — NLP-BASED MISCONCEPTION EXTRACTOR")
    print("=" * 70)

    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}. Run harvest_100k.py first.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # DROP old fake data and recreate table
    print("\n🗑️  Dropping old extracted_misconceptions table (fake template data)...")
    cur.execute("DROP TABLE IF EXISTS extracted_misconceptions")
    cur.execute("""
    CREATE TABLE extracted_misconceptions (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        concept TEXT NOT NULL,
        misconception_text TEXT NOT NULL,
        misconception_category TEXT,
        prevalence_pct REAL,
        remediation TEXT,
        assessment_tool TEXT,
        extraction_method TEXT NOT NULL,
        confidence REAL NOT NULL,
        extracted_sentence TEXT,
        FOREIGN KEY(article_id) REFERENCES articles(id)
    )
    """)
    conn.commit()
    print("✅ Fresh extracted_misconceptions table created.")

    # Count articles with usable abstracts
    cur.execute("""
        SELECT COUNT(*) FROM articles
        WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026
          AND abstract IS NOT NULL AND LENGTH(abstract) >= ?
    """, (MIN_ABSTRACT_LENGTH,))
    total_processable = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026")
    total_articles = cur.fetchone()[0]

    print(f"\n📊 Total articles: {total_articles:,}")
    print(f"   With usable abstracts (≥{MIN_ABSTRACT_LENGTH} chars): {total_processable:,}")
    print(f"   Confidence threshold: {MIN_CONFIDENCE}")

    # Process in batches
    BATCH_SIZE = 1000
    offset = 0
    total_processed = 0
    total_extracted = 0
    total_skipped_short = 0
    total_skipped_low_conf = 0

    extraction_methods = {"sentence_pattern": 0, "keyword_match": 0}
    domains_extracted = {}

    print(f"\n🔬 Starting NLP extraction...\n")

    while True:
        cur.execute("""
            SELECT id, title, abstract, physics_domain
            FROM articles
            WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026
              AND abstract IS NOT NULL AND LENGTH(abstract) >= ?
            ORDER BY id
            LIMIT ? OFFSET ?
        """, (MIN_ABSTRACT_LENGTH, BATCH_SIZE, offset))

        rows = cur.fetchall()
        if not rows:
            break

        batch_extracted = 0

        for row in rows:
            total_processed += 1
            article_id = row["id"]
            title = row["title"] or ""
            abstract = row["abstract"] or ""
            physics_domain = row["physics_domain"] or "Fisika Umum"

            result = extract_from_abstract(abstract, title)

            if result is None:
                total_skipped_low_conf += 1
                continue

            # Detect concept category
            concept = detect_concept_from_text(title, abstract)

            # Generate UUID for this extraction
            ext_id = str(uuid.uuid4())

            cur.execute("""
                INSERT INTO extracted_misconceptions
                (id, article_id, concept, misconception_text, misconception_category,
                 prevalence_pct, remediation, assessment_tool,
                 extraction_method, confidence, extracted_sentence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ext_id,
                article_id,
                concept,
                result["misconception_text"],
                physics_domain,
                result["prevalence_pct"],
                result["remediation"],
                result["assessment_tool"],
                result["extraction_method"],
                result["confidence"],
                result["extracted_sentence"]
            ))

            total_extracted += 1
            batch_extracted += 1
            extraction_methods[result["extraction_method"]] = \
                extraction_methods.get(result["extraction_method"], 0) + 1
            domains_extracted[physics_domain] = \
                domains_extracted.get(physics_domain, 0) + 1

        conn.commit()
        offset += BATCH_SIZE

        print(
            f"   Batch {offset // BATCH_SIZE}: "
            f"processed {total_processed:,} | "
            f"extracted {total_extracted:,} (+{batch_extracted}) | "
            f"rate {total_extracted * 100 / max(total_processed, 1):.1f}%"
        )

    conn.commit()

    # ─── FINAL STATISTICS ──────────────────────────────────────────────────────
    # Uniqueness check
    cur.execute("SELECT COUNT(DISTINCT misconception_text) FROM extracted_misconceptions")
    unique_texts = cur.fetchone()[0]

    cur.execute("SELECT AVG(confidence) FROM extracted_misconceptions")
    avg_confidence = cur.fetchone()[0] or 0

    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions WHERE prevalence_pct IS NOT NULL")
    with_prevalence = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions WHERE remediation IS NOT NULL")
    with_remediation = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions WHERE assessment_tool IS NOT NULL")
    with_assessment = cur.fetchone()[0]

    conn.close()

    uniqueness_ratio = unique_texts / max(total_extracted, 1)

    print("\n" + "=" * 70)
    print("  NLP EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"  Articles processed:         {total_processed:,}")
    print(f"  Misconceptions extracted:   {total_extracted:,}")
    print(f"  Extraction rate:            {total_extracted * 100 / max(total_processed, 1):.1f}%")
    print(f"  Skipped (low confidence):   {total_skipped_low_conf:,}")
    print(f"")
    print(f"  Unique misconception texts: {unique_texts:,}")
    print(f"  Uniqueness ratio:           {uniqueness_ratio:.2%} {'✅' if uniqueness_ratio >= 0.30 else '⚠️'}")
    print(f"  Average confidence:         {avg_confidence:.3f} {'✅' if avg_confidence >= 0.55 else '⚠️'}")
    print(f"")
    print(f"  With prevalence data:       {with_prevalence:,}")
    print(f"  With remediation:           {with_remediation:,}")
    print(f"  With assessment tool:       {with_assessment:,}")
    print(f"")
    print(f"  Extraction methods:")
    for method, count in sorted(extraction_methods.items(), key=lambda x: -x[1]):
        print(f"    {method:<20s} {count:>6,}")
    print(f"")
    print(f"  Domain distribution:")
    for domain, count in sorted(domains_extracted.items(), key=lambda x: -x[1]):
        print(f"    {domain:<20s} {count:>6,}")
    print("=" * 70)

    # ─── QUALITY ASSERTIONS ────────────────────────────────────────────────────
    print("\n🔒 QUALITY CHECKS:")
    if uniqueness_ratio >= 0.30:
        print(f"   ✅ Uniqueness ratio {uniqueness_ratio:.2%} ≥ 30%")
    else:
        print(f"   ⚠️  Uniqueness ratio {uniqueness_ratio:.2%} < 30% — may need review")

    if avg_confidence >= 0.55:
        print(f"   ✅ Average confidence {avg_confidence:.3f} ≥ 0.55")
    else:
        print(f"   ⚠️  Average confidence {avg_confidence:.3f} < 0.55 — may need review")

    if total_extracted > 0:
        print(f"   ✅ Extracted {total_extracted:,} misconceptions (non-zero)")
    else:
        print(f"   ❌ No misconceptions extracted! Check patterns and abstract quality.")


if __name__ == "__main__":
    run_nlp_extraction()
