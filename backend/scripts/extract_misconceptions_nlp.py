#!/usr/bin/env python3
"""
Conceptra — NLP-Based Misconception Extractor (v2 — sentence-level multi-extraction)
======================================================================================

PRINSIP v2:
- Setiap kalimat relevan dari abstrak yang membahas miskonsepsi → 1 baris tersendiri di DB
- Tidak hanya satu per artikel; satu artikel bisa menghasilkan banyak baris
- Teks miskonsepsi = kalimat LENGKAP + kalimat sebelum/sesudahnya sebagai konteks
- Confidence berdasarkan kekuatan sinyal linguistik per kalimat
- Tidak ada hard truncation pada teks

PERUBAHAN dari v1:
- v1: satu per artikel, break setelah match pertama, hard [:200]/[:300] cut
- v2: semua kalimat relevan, teks penuh, konteks kalimat tetangga tersedia
"""
import os
import sys
import re
import sqlite3
import uuid

# ─── PATHS ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "data", "conceptra.db")

# ─── THRESHOLDS ───────────────────────────────────────────────────────────────
MIN_ABSTRACT_LENGTH = 80
MIN_CONFIDENCE = 0.50

# ─── SENTENCE-LEVEL SIGNALS ───────────────────────────────────────────────────
# (pattern, base_confidence)
SENTENCE_SIGNALS = [
    # High confidence — explicit misconception terms
    (re.compile(r"\bmisconception(s)?\b", re.I), 0.70),
    (re.compile(r"\bmiskonsepsi\b", re.I), 0.70),
    (re.compile(r"\balternative conception(s)?\b", re.I), 0.65),
    (re.compile(r"\bkonsepsi alternatif\b", re.I), 0.65),
    (re.compile(r"\bnaive conception(s)?\b", re.I), 0.60),
    (re.compile(r"\bpreconception(s)?\b", re.I), 0.55),
    (re.compile(r"\bprakonsepsi\b", re.I), 0.55),
    # Medium confidence — student belief / error framing
    (re.compile(r"\bstudents?\s+(still\s+)?(believe|think|assume|consider)\b", re.I), 0.55),
    (re.compile(r"\b(siswa|mahasiswa|peserta\s+didik)\s+(masih\s+)?(menganggap|berpikir|percaya|beranggapan)\b", re.I), 0.55),
    (re.compile(r"\b(incorrect|wrong|erroneous|false)\s+(understanding|belief|conception|idea)\b", re.I), 0.55),
    (re.compile(r"\b(kesalahan|kekeliruan)\s+(konsep|pemahaman|konsepsi)\b", re.I), 0.55),
    (re.compile(r"\bstudents?\s+(fail|unable)\s+to\s+(understand|distinguish|differentiate)\b", re.I), 0.52),
    (re.compile(r"\b(confuse|conflate)\b", re.I), 0.50),
    (re.compile(r"\bsalah\s+(paham|konsep|kaprah)\b", re.I), 0.50),
    (re.compile(r"\bmisunderstand(ing)?\b", re.I), 0.50),
    (re.compile(r"\b(keliru|kekeliruan)\b", re.I), 0.50),
]

# ─── PREVALENCE PATTERNS ──────────────────────────────────────────────────────
PREVALENCE_PATTERNS = [
    re.compile(r"(\d{1,3}(?:[.,]\d+)?)\s*%\s+(?:of\s+)?(?:students?|siswa|respondents?|participants?|learners?)", re.I),
    re.compile(r"(\d{1,3}(?:[.,]\d+)?)\s*%\s+(?:misconception|miskonsepsi)", re.I),
    re.compile(r"(?:as\s+(?:high|much)\s+as|mencapai|sebesar)\s+(\d{1,3}(?:[.,]\d+)?)\s*%", re.I),
    re.compile(r"(\d{1,3}(?:[.,]\d+)?)\s*%\s+(?:of\s+)?(?:them|respondents?|subjects?)", re.I),
]

# ─── REMEDIATION PATTERNS ─────────────────────────────────────────────────────
REMEDIATION_PATTERNS = [
    re.compile(
        r"(?:using|dengan|melalui|menggunakan|applying|menerapkan|through)\s+"
        r"((?:phet|cbt|poe|inquiry|cognitive conflict|conceptual change|"
        r"four.tier|three.tier|cri|fci|demonstration|demonstrasi|simulation|simulasi|"
        r"predict.observe.explain|problem.based|project.based|animation|video|"
        r"collaborative|cooperative|guided|direct instruction|e.learning|"
        r"blended|flipped classroom|analogy|virtual lab|augmented reality|ar\b)(?:\s+\w+){0,6})",
        re.I
    ),
    re.compile(
        r"(?:effective(?:ness)?|efektiv(?:itas)?)\s+of\s+(.{10,80})\s+"
        r"(?:in|pada|dalam)\s+(?:reducing|addressing|overcoming|mengurangi|mengatasi|mereduksi)",
        re.I
    ),
]

# ─── ASSESSMENT TOOL PATTERNS ─────────────────────────────────────────────────
ASSESSMENT_PATTERNS = [
    re.compile(r"((?:four|three|two|4|3|2).tier\s+(?:diagnostic\s+)?test)", re.I),
    re.compile(r"\b(Force\s+Concept\s+Inventory|FCI|FMCE)\b", re.I),
    re.compile(r"\b(Certainty\s+of\s+Response\s+Index|CRI)\b", re.I),
    re.compile(r"((?:diagnostic|multiple.choice)\s+(?:test|instrument|questionnaire))", re.I),
    re.compile(r"(concept\s+(?:mapping|inventory|test))", re.I),
    re.compile(r"\b(Thermal\s+Concept\s+Evaluation|TCE)\b", re.I),
]

# ─── DOMAIN MAP ───────────────────────────────────────────────────────────────
DOMAIN_CONCEPT_MAP = {
    "Mekanika": ["newton", "gaya", "force", "motion", "gerak", "kinematic",
                 "momentum", "energy", "energi", "rotation", "rotasi",
                 "projectile", "parabola", "circular", "melingkar", "gravity",
                 "gravitasi", "torque", "acceleration", "percepatan", "work", "impuls"],
    "Listrik": ["electric", "listrik", "circuit", "rangkaian", "voltage",
                "current", "arus", "resistance", "ohm", "coulomb",
                "capacitor", "kapasitor", "inductor"],
    "Termodinamika": ["heat", "kalor", "temperature", "suhu", "thermal",
                      "entropy", "thermodynamic", "carnot", "gas kinetic",
                      "specific heat", "kapasitas panas", "conduction",
                      "convection", "radiation", "boiling", "freezing"],
    "Gelombang": ["wave", "gelombang", "sound", "bunyi", "frequency",
                  "interference", "diffraction", "superposition", "doppler",
                  "amplitude", "wavelength", "resonance"],
    "Optika": ["light", "cahaya", "optic", "lens", "lensa", "reflection",
               "refraction", "mirror", "cermin", "snell"],
    "Fluida": ["fluid", "fluida", "pressure", "tekanan", "archimedes",
               "buoyancy", "bernoulli", "hydrostatic", "viscosity",
               "density", "massa jenis", "pascal"],
    "Fisika Modern": ["quantum", "kuantum", "photon", "relativity", "atomic",
                      "nuclear", "radioactive", "photoelectric", "bohr",
                      "electron", "orbital", "dualisme"],
    "Magnetisme": ["magnetic", "magnet", "lorentz", "electromagnetic",
                   "induction", "induksi", "flux", "solenoid"],
    "Astronomi": ["astronomy", "astronomi", "kepler", "planet", "solar",
                  "orbit", "season", "eclipse"],
    "IPA Terpadu": ["ipa", "sains", "science", "integrated", "terpadu"],
    "Sains Terapan (STEM)": ["stem", "engineering", "technology", "applied",
                              "robotics", "coding", "programming"],
}


def detect_concept(title: str, abstract: str) -> str:
    text = ((title or "") + " " + (abstract or "")[:600]).lower()
    best, best_n = "Fisika Umum", 0
    for domain, kws in DOMAIN_CONCEPT_MAP.items():
        n = sum(1 for kw in kws if kw in text)
        if n > best_n:
            best_n = n
            best = domain
    return best


def split_sentences(text: str) -> list:
    """
    Split text into complete sentences.
    Handles both English and Indonesian text, numbered lists, and newlines.
    """
    # Normalize whitespace but preserve sentence structure
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{2,}', '. ', text)

    # Standard sentence split: end punctuation followed by space and capital
    raw = re.split(r'(?<=[.!?;])\s+', text.strip())

    # Further handle colons that introduce lists
    result = []
    for chunk in raw:
        chunk = chunk.strip()
        if not chunk or len(chunk) < 15:
            continue
        # If chunk contains numbered sub-items like "1) ... 2) ... 3)"
        sub = re.split(r'(?<=\))\s+(?=\d+\))', chunk)
        if len(sub) > 1:
            result.extend([s.strip() for s in sub if len(s.strip()) >= 15])
        else:
            result.append(chunk)

    return [s for s in result if len(s) >= 15]


def score_sentence(sentence: str) -> float:
    """Confidence score for a sentence being a misconception statement."""
    best = 0.0
    for pattern, base_conf in SENTENCE_SIGNALS:
        if pattern.search(sentence):
            length_bonus = min(len(sentence) / 500, 0.12)
            score = base_conf + length_bonus
            if score > best:
                best = score
    return round(min(best, 1.0), 3)


def extract_prevalence(text: str):
    for pat in PREVALENCE_PATTERNS:
        m = pat.search(text)
        if m:
            try:
                val = float(m.group(1).replace(",", "."))
                if 0 < val <= 100:
                    return round(val, 1)
            except (ValueError, IndexError):
                pass
    return None


def extract_remediation(text: str):
    for pat in REMEDIATION_PATTERNS:
        m = pat.search(text)
        if m and m.lastindex and m.lastindex >= 1:
            return m.group(1).strip()[:150]
    return None


def extract_assessment_tool(text: str):
    for pat in ASSESSMENT_PATTERNS:
        m = pat.search(text)
        if m and m.lastindex and m.lastindex >= 1:
            return m.group(1).strip()[:100]
    return None


def extract_all_from_abstract(abstract: str, title: str) -> list:
    """
    Extract ALL misconception-relevant sentences from an abstract.
    Returns list of dicts, one per relevant sentence.
    Each sentence is COMPLETE — never truncated mid-word.
    The source_sentence includes the sentence itself + its neighbors for full context.
    """
    if not abstract or len(abstract) < MIN_ABSTRACT_LENGTH:
        return []

    title_lower = (title or "").lower()
    title_bonus = 0.0
    if "misconception" in title_lower or "miskonsepsi" in title_lower:
        title_bonus = 0.12
    elif "alternative conception" in title_lower or "konsepsi alternatif" in title_lower:
        title_bonus = 0.08
    elif "diagnosis" in title_lower or "identifikasi" in title_lower or "analisis" in title_lower:
        title_bonus = 0.05

    sentences = split_sentences(abstract)
    if not sentences:
        return []

    results = []
    seen = set()

    for idx, sent in enumerate(sentences):
        conf = score_sentence(sent) + title_bonus
        if conf < MIN_CONFIDENCE:
            continue

        # Deduplicate near-identical sentences
        key = re.sub(r'\W+', '', sent.lower())[:70]
        if key in seen:
            continue
        seen.add(key)

        # Context: up to 1 sentence before and after
        ctx_before = sentences[idx - 1].strip() if idx > 0 else None
        ctx_after  = sentences[idx + 1].strip() if idx < len(sentences) - 1 else None

        # source_sentence = previous + this + next (full reading context)
        parts = []
        if ctx_before and len(ctx_before) > 20:
            parts.append(ctx_before)
        parts.append(sent)
        if ctx_after and len(ctx_after) > 20:
            parts.append(ctx_after)
        source_sentence = " ".join(parts)

        # Extract ancillary info from local window
        local = " ".join(filter(None, [ctx_before, sent, ctx_after]))
        prevalence    = extract_prevalence(local)
        remediation   = extract_remediation(local)
        assess_tool   = extract_assessment_tool(local)

        # Small confidence boosts for richer evidence
        if prevalence:
            conf = round(min(conf + 0.10, 1.0), 3)
        if assess_tool:
            conf = round(min(conf + 0.07, 1.0), 3)
        if remediation:
            conf = round(min(conf + 0.05, 1.0), 3)

        results.append({
            "misconception_text": sent,
            "source_sentence":    source_sentence,
            "confidence":         conf,
            "prevalence_pct":     prevalence,
            "remediation":        remediation,
            "assessment_tool":    assess_tool,
            "extraction_method":  "sentence_level_v2",
        })

    return results


def run_nlp_extraction():
    print("=" * 70)
    print("  CONCEPTRA — NLP EXTRACTOR v2  (sentence-level, multi-row per article)")
    print("=" * 70)

    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("\n🗑️  Rebuilding extracted_misconceptions table...")
    cur.execute("DROP TABLE IF EXISTS extracted_misconceptions")
    cur.execute("""
        CREATE TABLE extracted_misconceptions (
            id                   TEXT PRIMARY KEY,
            article_id           TEXT NOT NULL,
            concept              TEXT NOT NULL,
            misconception_text   TEXT NOT NULL,
            source_sentence      TEXT,
            misconception_category TEXT,
            prevalence_pct       REAL,
            remediation          TEXT,
            assessment_tool      TEXT,
            extraction_method    TEXT NOT NULL,
            confidence           REAL NOT NULL,
            extracted_sentence   TEXT,
            FOREIGN KEY(article_id) REFERENCES articles(id)
        )
    """)
    conn.commit()
    print("✅ Table ready.\n")

    cur.execute("""
        SELECT COUNT(*) FROM articles
        WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL)
        AND year >= 1996 AND year <= 2026
        AND abstract IS NOT NULL AND LENGTH(abstract) >= ?
    """, (MIN_ABSTRACT_LENGTH,))
    total_processable = cur.fetchone()[0]
    print(f"📊 Articles with usable abstracts : {total_processable:,}")
    print(f"   Confidence threshold           : {MIN_CONFIDENCE}")
    print(f"\n🔬 Starting extraction...\n")

    BATCH_SIZE = 1000
    offset = 0
    total_processed = 0
    total_rows = 0

    while True:
        cur.execute("""
            SELECT id, title, abstract, physics_domain
            FROM articles
            WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL)
            AND year >= 1996 AND year <= 2026
            AND abstract IS NOT NULL AND LENGTH(abstract) >= ?
            ORDER BY id
            LIMIT ? OFFSET ?
        """, (MIN_ABSTRACT_LENGTH, BATCH_SIZE, offset))

        rows = cur.fetchall()
        if not rows:
            break

        batch_rows = 0
        for row in rows:
            total_processed += 1
            article_id    = row["id"]
            title         = row["title"] or ""
            abstract      = row["abstract"] or ""
            physics_domain = row["physics_domain"] or "Fisika Umum"
            concept       = detect_concept(title, abstract)

            extractions = extract_all_from_abstract(abstract, title)
            for ext in extractions:
                cur.execute("""
                    INSERT INTO extracted_misconceptions
                    (id, article_id, concept, misconception_text, source_sentence,
                     misconception_category, prevalence_pct, remediation, assessment_tool,
                     extraction_method, confidence, extracted_sentence)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    str(uuid.uuid4()),
                    article_id,
                    concept,
                    ext["misconception_text"],
                    ext["source_sentence"],
                    physics_domain,
                    ext["prevalence_pct"],
                    ext["remediation"],
                    ext["assessment_tool"],
                    ext["extraction_method"],
                    ext["confidence"],
                    ext["source_sentence"],   # backward compat
                ))
                total_rows += 1
                batch_rows += 1

        conn.commit()
        offset += BATCH_SIZE
        print(f"   Batch {offset // BATCH_SIZE:>2}: processed {total_processed:>6,} | rows {total_rows:>6,} (+{batch_rows})")

    conn.commit()

    # ─── STATS ────────────────────────────────────────────────────────────────
    cur.execute("SELECT COUNT(DISTINCT article_id) FROM extracted_misconceptions")
    art_covered = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions")
    tot_ext = cur.fetchone()[0]
    cur.execute("SELECT AVG(confidence) FROM extracted_misconceptions")
    avg_conf = cur.fetchone()[0] or 0
    cur.execute("SELECT AVG(length(misconception_text)) FROM extracted_misconceptions")
    avg_len = cur.fetchone()[0] or 0
    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions WHERE prevalence_pct IS NOT NULL")
    w_prev = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions WHERE assessment_tool IS NOT NULL")
    w_assess = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions WHERE remediation IS NOT NULL")
    w_rem = cur.fetchone()[0]
    cur.execute("SELECT concept, COUNT(*) c FROM extracted_misconceptions GROUP BY concept ORDER BY c DESC LIMIT 12")
    by_concept = cur.fetchall()
    conn.close()

    print("\n" + "=" * 70)
    print("  EXTRACTION COMPLETE (v2)")
    print("=" * 70)
    print(f"  Articles processed:         {total_processed:,}")
    print(f"  Articles with extractions:  {art_covered:,}  ({art_covered*100/max(total_processed,1):.1f}%)")
    print(f"  Total rows extracted:       {tot_ext:,}")
    print(f"  Avg rows per covered art.:  {tot_ext/max(art_covered,1):.1f}")
    print(f"  Avg sentence length:        {avg_len:.0f} chars")
    print(f"  Avg confidence:             {avg_conf:.3f}")
    print(f"  With prevalence data:       {w_prev:,}")
    print(f"  With assessment tool:       {w_assess:,}")
    print(f"  With remediation:           {w_rem:,}")
    print(f"\n  Domain distribution:")
    for r in by_concept:
        print(f"    {r['concept']:<25s} {r['c']:>6,}")
    print("=" * 70)
    print(f"\n🔒 QUALITY:")
    print(f"   {'✅' if avg_conf >= 0.55 else '⚠️ '} Avg confidence: {avg_conf:.3f}")
    print(f"   {'✅' if tot_ext > 0 else '❌'} Total rows: {tot_ext:,}")
    print(f"   {'✅' if art_covered > 1000 else '⚠️ '} Coverage: {art_covered:,} articles")


if __name__ == "__main__":
    run_nlp_extraction()
