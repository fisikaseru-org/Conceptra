#!/usr/bin/env python3
import os
import json
import sqlite3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "data", "conceptra.db")
CORPUS_PATH = os.path.join(BACKEND_DIR, "core", "corpus.py")

def export_all():
    print("Exporting all misconceptions from DB to corpus.py...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("""
        SELECT e.*, a.doi, a.title, a.authors, a.journal, a.year, a.physics_domain, a.evidence_level, a.scopus_id
        FROM extracted_misconceptions e
        JOIN articles a ON e.article_id = a.id
        WHERE (a.is_indonesia_context = 1 OR a.is_indonesia_context IS NULL) AND a.year >= 1996 AND a.year <= 2026
        ORDER BY e.confidence DESC, a.citation_count DESC
    """)
    rows = cur.fetchall()
    
    entries = []
    domain_counters = {}
    
    for row in rows:
        authors_str = row["authors"]
        authors_list = []
        if authors_str:
            try:
                authors_list = json.loads(authors_str)
            except Exception:
                authors_list = [authors_str]

        # Use title as reference
        refs = [row["title"]] if row["title"] else []
        
        domain_name = row["physics_domain"] or "Fisika Umum"
        prefix_map = {
            "Mekanika": "MEC", "Listrik": "ELE", "Termodinamika": "THM",
            "Gelombang": "WAV", "Optika": "OPT", "Optik": "OPT",
            "Fisika Modern": "MOD", "Magnetisme": "MAG", "Magnet": "MAG",
            "Fluida": "FLU", "Astronomi": "AST", "Nuklir": "NUC",
            "Fisika Digital": "DIG", "Fisika Umum": "GEN"
        }
        prefix = prefix_map.get(domain_name, domain_name[:3].upper())
        domain_counters[prefix] = domain_counters.get(prefix, 0) + 1
        nice_id = f"{prefix}-{domain_counters[prefix]:04d}"
        
        entry = {
            "id": nice_id,
            "domain": domain_name,
            "concept": row["concept"] or "Konsep Umum",
            "prerequisite": "Pengetahuan Dasar Fisika",
            "misconception": row["misconception_text"],
            "root_cause": row["extracted_sentence"] or "Berdasarkan analisis abstrak",
            "example_answer": "Siswa menunjukkan konsepsi alternatif ini",
            "learning_impact": "Dapat menghambat pemahaman materi lanjutan",
            "remediation": row["remediation"] or "Pembelajaran konseptual aktif",
            "educational_level": ["SMA", "Perguruan Tinggi"],
            "assessment_tools": [row["assessment_tool"]] if row["assessment_tool"] else ["Diagnostic Test"],
            "years_active": [row["year"]] if row["year"] else [2024],
            "frequency": int(row["prevalence_pct"]) if row["prevalence_pct"] else 10,
            "keywords": [row["concept"]] if row["concept"] else [],
            "references": refs,
            "doi": row["doi"],
            "scopus_id": row["scopus_id"],
            "source": "openalex",
            "frequency_methodology": row["extraction_method"],
            "evidence_level": row["evidence_level"] or "IV",
            "authors": authors_list,
            "journal": row["journal"],
            "year": row["year"]
        }
        entries.append(entry)
        
    conn.close()
    
    print(f"Generated {len(entries)} entries.")
    
    # Read corpus.py
    with open(CORPUS_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        
    start_marker = "PHYSICS_MISCONCEPTIONS: List[MisconceptionEntry] = "
    start_idx = content.find(start_marker)
    
    end_markers = ["# Domain statistics", "# Research gap", "DOMAIN_STATS",
                   "# Research interventions", "REMEDIATION_TOOLS",
                   "AUTHOR_NETWORK", "# ─── SCIENTOMETRICS"]
    end_idx = len(content)
    for marker in end_markers:
        idx = content.find(marker, start_idx + len(start_marker))
        if idx != -1 and idx < end_idx:
            end_idx = idx

    json_str = json.dumps(entries, indent=4, ensure_ascii=False)
    python_str = (json_str
                  .replace(": true", ": True")
                  .replace(": false", ": False")
                  .replace(": null", ": None"))
                  
    new_list_str = start_marker + python_str + "\n\n"
    
    new_content = content[:start_idx] + new_list_str + content[end_idx:]
    
    with open(CORPUS_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    print("Successfully updated corpus.py")

if __name__ == "__main__":
    export_all()
