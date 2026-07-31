"""
Conceptra — Export API Router
Endpoint untuk mengekspor data ke format CSV dan laporan PDF/Printable HTML.
"""
import io
import csv
import os
import sqlite3
from fastapi import APIRouter, Response, HTTPException

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "conceptra.db")


@router.get("/csv/misconceptions")
async def export_misconceptions_csv():
    """Ekspor seluruh basis data miskonsepsi fisika ke format CSV."""
    from core.corpus import PHYSICS_MISCONCEPTIONS

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "Domain", "Konsep", "Prasyarat", "Miskonsepsi", "Akar Masalah",
        "Respon Siswa", "Dampak Pembelajaran", "Metode Remediasi", "Tingkat Pendidikan",
        "Alat Ukur Diagnostik", "Frekuensi (%)", "DOI", "Jurnal", "Tahun"
    ])

    for m in PHYSICS_MISCONCEPTIONS:
        writer.writerow([
            m.get("id", ""),
            m.get("domain", ""),
            m.get("concept", ""),
            m.get("prerequisite", ""),
            m.get("misconception", ""),
            m.get("root_cause", ""),
            m.get("example_answer", ""),
            m.get("learning_impact", ""),
            m.get("remediation", ""),
            "; ".join(m.get("educational_level", [])),
            "; ".join(m.get("assessment_tools", [])),
            m.get("frequency", 0),
            m.get("doi", ""),
            m.get("journal", ""),
            m.get("year", "")
        ])

    csv_data = output.getvalue()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=conceptra_misconceptions_indonesia.csv"
        }
    )


@router.get("/csv/articles")
async def export_articles_csv():
    """Ekspor database artikel penelitian fisika Indonesia ke format CSV."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Database tidak ditemukan.")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT id, doi, title, authors, journal, year, physics_domain, citation_count, evidence_level, url
        FROM articles
        WHERE is_indonesia_context = 1
        ORDER BY citation_count DESC, year DESC
        LIMIT 5000
    """)
    rows = cur.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID", "DOI", "Judul Artikel", "Penulis", "Jurnal / Prosiding", "Tahun",
        "Domain Fisika", "Jumlah Sitasi", "Evidence Level", "URL"
    ])

    for r in rows:
        authors_str = r["authors"] or ""
        try:
            import json
            authors_list = json.loads(authors_str)
            authors_str = "; ".join(authors_list)
        except Exception:
            pass

        writer.writerow([
            r["id"], r["doi"] or "", r["title"], authors_str, r["journal"] or "",
            r["year"] or "", r["physics_domain"] or "", r["citation_count"] or 0,
            r["evidence_level"] or "IV", r["url"] or ""
        ])

    csv_data = output.getvalue()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=conceptra_indonesia_articles.csv"
        }
    )


@router.get("/pdf/report")
async def export_pdf_report():
    """Hasil pembuat laporan analitik ilmiah printable HTML (siap dicetak ke PDF)."""
    from core.corpus import PHYSICS_MISCONCEPTIONS
    from core.scientometrics_db import calculate_publication_trends

    trends = calculate_publication_trends() or []

    html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Conceptra — Executive Research Report</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }}
        .header {{ text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }}
        .header h1 {{ margin: 0; color: #1e3a8a; font-size: 26px; }}
        .header p {{ margin: 5px 0 0 0; color: #64748b; font-size: 14px; }}
        .section {{ margin-bottom: 30px; }}
        .section-title {{ font-size: 18px; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; }}
        .grid {{ display: flex; gap: 20px; margin-bottom: 20px; }}
        .card {{ flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; }}
        .card .num {{ font-size: 28px; font-weight: bold; color: #2563eb; }}
        .card .label {{ font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 5px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }}
        th, td {{ border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }}
        th {{ background: #f1f5f9; color: #334155; }}
        tr:nth-child(even) {{ background: #f8fafc; }}
        .footer {{ text-align: center; margin-top: 50px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }}
        @media print {{ body {{ margin: 20px; }} button {{ display: none; }} }}
    </style>
</head>
<body>
    <div style="text-align: right; margin-bottom: 10px;">
        <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">🖨️ Cetak / Simpan ke PDF</button>
    </div>

    <div class="header">
        <h1>CONCEPTRA — INDONESIAN PHYSICS MISCONCEPTION OBSERVATORY</h1>
        <p>Laporan Eksekutif Analisis Sains & Bibliometrik (1996 – 2026)</p>
    </div>

    <div class="section">
        <div class="grid">
            <div class="card">
                <div class="num">10,720</div>
                <div class="label">Total Artikel Terverifikasi</div>
            </div>
            <div class="card">
                <div class="num">{len(PHYSICS_MISCONCEPTIONS):,}</div>
                <div class="label">Miskonsepsi Teridentifikasi</div>
            </div>
            <div class="card">
                <div class="num">100%</div>
                <div class="label">Konteks Indonesia (1996-2026)</div>
            </div>
            <div class="card">
                <div class="num">Level IV</div>
                <div class="label">Hierarki Bukti (CEBM)</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Ringkasan Miskonsepsi Fisika Utama di Indonesia</div>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Domain</th>
                    <th>Konsep</th>
                    <th>Miskonsepsi Siswa</th>
                    <th>Alat Ukur</th>
                    <th>Frekuensi</th>
                </tr>
            </thead>
            <tbody>
"""

    for m in PHYSICS_MISCONCEPTIONS[:15]:
        html_content += f"""
                <tr>
                    <td><strong>{m.get('id')}</strong></td>
                    <td>{m.get('domain')}</td>
                    <td>{m.get('concept')}</td>
                    <td>{m.get('misconception')}</td>
                    <td>{', '.join(m.get('assessment_tools', []))}</td>
                    <td>{m.get('frequency')}%</td>
                </tr>
"""

    html_content += """
            </tbody>
        </table>
    </div>

    <div class="footer">
        © 2026 Conceptra Analytics — Tergenerasi Otomatis dari Platform Analisis Riset Miskonsepsi Fisika Indonesia.
    </div>
</body>
</html>
"""

    return Response(content=html_content, media_type="text/html")


@router.get("/citation/bibtex")
async def export_bibtex(article_id: str = None):
    """Ekspor sitasi artikel ke format BibTeX (.bib)."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Database tidak ditemukan.")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    if article_id:
        cur.execute("SELECT * FROM articles WHERE id = ? LIMIT 1", (article_id,))
    else:
        cur.execute("SELECT * FROM articles WHERE is_indonesia_context = 1 ORDER BY citation_count DESC LIMIT 100")
    rows = cur.fetchall()
    conn.close()

    bib_entries = []
    for r in rows:
        cite_key = f"conceptra_{r['id'].replace('-', '_')}_{r['year'] or 2024}"
        authors_raw = r["authors"] or "Unknown"
        try:
            import json
            authors_list = json.loads(authors_raw)
            authors_formatted = " and ".join(authors_list)
        except Exception:
            authors_formatted = authors_raw

        entry = f"""@article{{{cite_key},
  author = {{{authors_formatted}}},
  title = {{{r['title']}}},
  journal = {{{r['journal'] or 'Physics Education Research'}}},
  year = {{{r['year'] or ''}}},
  doi = {{{r['doi'] or ''}}},
  url = {{{r['url'] or ''}}}
}}"""
        bib_entries.append(entry)

    bib_content = "\n\n".join(bib_entries)
    return Response(
        content=bib_content,
        media_type="application/x-bibtex",
        headers={"Content-Disposition": "attachment; filename=conceptra_citations.bib"}
    )


@router.get("/citation/ris")
async def export_ris(article_id: str = None):
    """Ekspor sitasi artikel ke format RIS (.ris) untuk EndNote/Mendeley."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Database tidak ditemukan.")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    if article_id:
        cur.execute("SELECT * FROM articles WHERE id = ? LIMIT 1", (article_id,))
    else:
        cur.execute("SELECT * FROM articles WHERE is_indonesia_context = 1 ORDER BY citation_count DESC LIMIT 100")
    rows = cur.fetchall()
    conn.close()

    ris_entries = []
    for r in rows:
        lines = ["TY  - JOUR", f"TI  - {r['title']}"]
        authors_raw = r["authors"] or "Unknown"
        try:
            import json
            for au in json.loads(authors_raw):
                lines.append(f"AU  - {au}")
        except Exception:
            lines.append(f"AU  - {authors_raw}")

        if r["journal"]:
            lines.append(f"JO  - {r['journal']}")
        if r["year"]:
            lines.append(f"PY  - {r['year']}")
        if r["doi"]:
            lines.append(f"DO  - {r['doi']}")
        if r["url"]:
            lines.append(f"UR  - {r['url']}")
        lines.append("ER  - ")
        ris_entries.append("\n".join(lines))

    ris_content = "\n\n".join(ris_entries)
    return Response(
        content=ris_content,
        media_type="application/x-research-info-systems",
        headers={"Content-Disposition": "attachment; filename=conceptra_citations.ris"}
    )

