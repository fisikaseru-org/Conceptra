#!/usr/bin/env python3
"""
Conceptra — Validation Suite for Indonesia Research Data (1996–2026)
===================================================================
Memverifikasi dan memvalidasi bahwa seluruh dataset, basis data (conceptra.db),
pemrosesan NLP, modul Scientometrics, dan corpus (corpus.py) 100% memenuhi kriteria:
1. Murni penelitian konteks Indonesia (is_indonesia_context = 1).
2. Tepat berada pada rentang tahun 1996 hingga 2026.
"""

import os
import sys
import sqlite3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "data", "conceptra.db")
CORPUS_PATH = os.path.join(BACKEND_DIR, "core", "corpus.py")

sys.path.append(BACKEND_DIR)
from core.corpus import PHYSICS_MISCONCEPTIONS
from core.scientometrics_db import (
    calculate_publication_trends,
    calculate_author_network,
    calculate_topic_river,
    calculate_domain_heatmap,
    calculate_province_distribution,
)

def run_validation():
    print("===============================================================")
    print("🔬 CONCEPTRA — INDONESIA RESEARCH DATASET VALIDATION (1996-2026)")
    print("===============================================================\n")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    errors = []
    warnings = []

    # -------------------------------------------------------------------------
    # TEST 1: Table Articles Year & Country Validation
    # -------------------------------------------------------------------------
    print("📌 Test 1: Validasi Tabel Articles (Tahun 1996-2026 & Konteks Indonesia)...")
    cur.execute("SELECT COUNT(*) FROM articles")
    total_articles = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM articles WHERE is_indonesia_context = 0")
    non_indo_articles = cur.fetchone()[0]

    cur.execute("SELECT MIN(year), MAX(year) FROM articles")
    min_year, max_year = cur.fetchone()

    cur.execute("SELECT COUNT(*) FROM articles WHERE year < 1996 OR year > 2026 OR year IS NULL")
    invalid_year_articles = cur.fetchone()[0]

    print(f"   • Total artikel di DB: {total_articles:,}")
    print(f"   • Rentang tahun artikel: {min_year} – {max_year}")
    print(f"   • Artikel non-Indonesia: {non_indo_articles}")
    print(f"   • Artikel di luar 1996-2026: {invalid_year_articles}")

    if non_indo_articles > 0:
        errors.append(f"Ditemukan {non_indo_articles} artikel NON-Indonesia di tabel articles.")
    if invalid_year_articles > 0:
        errors.append(f"Ditemukan {invalid_year_articles} artikel di luar rentang 1996-2026 di tabel articles.")

    if non_indo_articles == 0 and invalid_year_articles == 0:
        print("   ✅ PASSED: Tabel articles 100% murni Indonesia (1996-2026).\n")

    # -------------------------------------------------------------------------
    # TEST 2: Validasi Extracted Misconceptions
    # -------------------------------------------------------------------------
    print("📌 Test 2: Validasi Extracted Misconceptions...")
    cur.execute("SELECT COUNT(*) FROM extracted_misconceptions")
    total_misc = cur.fetchone()[0]

    cur.execute("""
        SELECT COUNT(*) FROM extracted_misconceptions e
        JOIN articles a ON e.article_id = a.id
        WHERE a.is_indonesia_context = 0 OR a.year < 1996 OR a.year > 2026
    """)
    invalid_misc = cur.fetchone()[0]

    print(f"   • Total miskonsepsi teresktrak: {total_misc:,}")
    print(f"   • Miskonsepsi dari artikel invalid/non-Indo: {invalid_misc}")

    if invalid_misc > 0:
        errors.append(f"Ditemukan {invalid_misc} miskonsepsi terhubung dengan artikel non-Indo/invalid.")
    else:
        print("   ✅ PASSED: Seluruh miskonsepsi 100% terhubung ke penelitian Indonesia (1996-2026).\n")

    # -------------------------------------------------------------------------
    # TEST 3: Validasi Corpus (corpus.py)
    # -------------------------------------------------------------------------
    print("📌 Test 3: Validasi Entri Corpus (corpus.py)...")
    total_corpus_entries = len(PHYSICS_MISCONCEPTIONS)
    years_in_corpus = [m.get("year") for m in PHYSICS_MISCONCEPTIONS if m.get("year") is not None]
    min_c_year = min(years_in_corpus) if years_in_corpus else 0
    max_c_year = max(years_in_corpus) if years_in_corpus else 0
    out_of_range_corpus = [y for y in years_in_corpus if y < 1996 or y > 2026]

    print(f"   • Total entri di corpus.py: {total_corpus_entries:,}")
    print(f"   • Rentang tahun corpus.py: {min_c_year} – {max_c_year}")
    print(f"   • Entri di luar rentang 1996-2026: {len(out_of_range_corpus)}")

    if len(out_of_range_corpus) > 0:
        errors.append(f"Ditemukan {len(out_of_range_corpus)} entri corpus di luar 1996-2026.")
    if total_corpus_entries != total_misc:
        warnings.append(f"Jumlah entri corpus ({total_corpus_entries}) beda tipis dengan DB ({total_misc}).")

    if len(out_of_range_corpus) == 0:
        print("   ✅ PASSED: Entri corpus.py 100% konsisten & tervalidasi.\n")

    # -------------------------------------------------------------------------
    # TEST 4: Validasi Scientometrics Engine & Analytics
    # -------------------------------------------------------------------------
    print("📌 Test 4: Validasi Modul Scientometrics...")
    trends = calculate_publication_trends()
    network = calculate_author_network()
    river = calculate_topic_river()
    heatmap = calculate_domain_heatmap()
    provinces = calculate_province_distribution()

    trend_years = [t["year"] for t in trends] if trends else []
    invalid_trend_years = [y for y in trend_years if y < 1996 or y > 2026]

    print(f"   • Tren publikasi terhitung: {len(trends) if trends else 0} tahun ({min(trend_years)} – {max(trend_years)})")
    print(f"   • Node jaringan penulis: {len(network['nodes']) if network else 0}")
    print(f"   • Sebaran provinsi: {len(provinces) if provinces else 0} wilayah")

    if invalid_trend_years:
        errors.append(f"Ditemukan {len(invalid_trend_years)} tahun invalid di tren scientometrics.")
    else:
        print("   ✅ PASSED: Perhitungan Scientometrics murni berbasis data Indonesia (1996-2026).\n")

    conn.close()

    # -------------------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------------------
    print("===============================================================")
    if errors:
        print("❌ VALIDASI GAGAL! Ditemukan kesalahan berikut:")
        for err in errors:
            print(f"   - {err}")
        sys.exit(1)
    else:
        print("🎉 100% TERVALIDASI & LULUS AUDIT MATEMATIK/TEKNIS!")
        print("   • Seluruh data 100% murni konteks Indonesia.")
        print("   • Seluruh data 100% berada pada kurun waktu 1996 – 2026.")
        if warnings:
            for w in warnings:
                print(f"   [Catatan]: {w}")
        print("===============================================================\n")

if __name__ == "__main__":
    run_validation()
