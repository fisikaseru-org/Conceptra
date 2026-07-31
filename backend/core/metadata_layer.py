"""
Conceptra — Metadata Layer (Layer 2)
Bibliographic Database untuk manajemen metadata corpus penelitian.

Mengelola:
- Metadata bibliografis lengkap (DOI, Scopus ID, dsb.)
- Quality scoring per entri
- PRISMA-compatible inclusion/exclusion criteria
- Corpus provenance tracking
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime, timezone


class InclusionStatus(str, Enum):
    INCLUDED = "included"
    EXCLUDED = "excluded"
    PENDING = "pending"
    FABRICATED = "fabricated"      # Data rekayasa — harus diganti


class StudyDesign(str, Enum):
    """Desain penelitian berdasarkan hierarki bukti."""
    META_ANALYSIS = "meta_analysis"                  # Level I
    SYSTEMATIC_REVIEW = "systematic_review"          # Level I
    RCT = "randomized_controlled_trial"              # Level II
    QUASI_EXPERIMENTAL = "quasi_experimental"        # Level III
    COHORT = "cohort"                               # Level III
    CROSS_SECTIONAL = "cross_sectional"             # Level IV
    CASE_STUDY = "case_study"                       # Level IV
    DESCRIPTIVE = "descriptive"                     # Level IV
    EXPERT_OPINION = "expert_opinion"               # Level V
    UNKNOWN = "unknown"


@dataclass
class CorpusEntry:
    """
    Representasi lengkap satu studi dalam corpus penelitian miskonsepsi fisika.
    Setiap field memiliki justifikasi ilmiah.
    """
    # ─── Identifikasi ───────────────────────────────────────────────────────────
    id: str                                    # ID internal (MEC-001, dll.)
    doi: Optional[str] = None                 # Digital Object Identifier — WAJIB untuk valid
    scopus_id: Optional[str] = None           # Scopus EID: 2-s2.0-XXXXXXXXXX
    wos_id: Optional[str] = None              # Web of Science UT
    semantic_scholar_id: Optional[str] = None

    # ─── Bibliografis ───────────────────────────────────────────────────────────
    title: Optional[str] = None
    authors: List[str] = field(default_factory=list)
    journal: Optional[str] = None
    year: Optional[int] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    pages: Optional[str] = None
    publisher: Optional[str] = None
    language: str = "id"                      # ISO 639-1
    country: str = "ID"                       # ISO 3166-1

    # ─── Metrik Dampak ──────────────────────────────────────────────────────────
    citation_count: int = 0
    impact_factor: Optional[float] = None
    h_index_journal: Optional[int] = None
    quartile: Optional[str] = None            # Q1, Q2, Q3, Q4 Scopus/WoS
    sinta_rank: Optional[str] = None          # Untuk jurnal SINTA Indonesia

    # ─── Konten Penelitian ──────────────────────────────────────────────────────
    study_design: StudyDesign = StudyDesign.UNKNOWN
    sample_size: Optional[int] = None         # Jumlah partisipan/siswa
    educational_level: List[str] = field(default_factory=list)
    physics_domain: Optional[str] = None
    assessment_instrument: Optional[str] = None

    # ─── Miskonsepsi yang Ditemukan ─────────────────────────────────────────────
    misconception_ids: List[str] = field(default_factory=list)
    prevalence_pct: Optional[float] = None    # % siswa yang memiliki miskonsepsi ini
    prevalence_ci_lower: Optional[float] = None  # 95% CI lower bound
    prevalence_ci_upper: Optional[float] = None  # 95% CI upper bound

    # ─── Kualitas & Validitas ───────────────────────────────────────────────────
    inclusion_status: InclusionStatus = InclusionStatus.PENDING
    exclusion_reason: Optional[str] = None
    risk_of_bias: Optional[str] = None        # low / moderate / high
    quality_score: float = 0.0               # 0.0–1.0 computed dari checklist

    # ─── Provenance ─────────────────────────────────────────────────────────────
    source: str = "fabricated"               # Bagaimana entri ini masuk ke corpus
    extracted_by: str = "unknown"            # human_annotator, nlp_pipeline, etc.
    extraction_date: Optional[str] = None
    last_verified: Optional[str] = None
    notes: str = ""

    def compute_quality_score(self) -> float:
        """
        Hitung quality score berdasarkan kelengkapan metadata.
        Skor 0.0–1.0; minimum untuk publikasi: 0.7.
        """
        score = 0.0
        checklist = [
            (bool(self.doi), 0.25),                          # DOI: sangat penting
            (bool(self.scopus_id or self.wos_id), 0.15),    # Database indexing
            (bool(self.title and self.authors), 0.10),       # Metadata dasar
            (bool(self.year), 0.05),
            (self.study_design != StudyDesign.UNKNOWN, 0.10),
            (self.sample_size is not None, 0.10),            # Ukuran sampel
            (self.prevalence_pct is not None, 0.10),         # Prevalensi terukur
            (bool(self.assessment_instrument), 0.05),
            (self.source != "fabricated", 0.05),
            (bool(self.last_verified), 0.05),
        ]
        for condition, weight in checklist:
            if condition:
                score += weight
        self.quality_score = round(score, 3)
        return self.quality_score

    def to_dict(self) -> Dict:
        d = asdict(self)
        d["quality_score"] = self.compute_quality_score()
        d["is_publication_ready"] = self.quality_score >= 0.70 and bool(self.doi)
        d["evidence_level"] = self._get_evidence_level()
        return d

    def _get_evidence_level(self) -> str:
        mapping = {
            StudyDesign.META_ANALYSIS: "I",
            StudyDesign.SYSTEMATIC_REVIEW: "I",
            StudyDesign.RCT: "II",
            StudyDesign.QUASI_EXPERIMENTAL: "III",
            StudyDesign.COHORT: "III",
            StudyDesign.CROSS_SECTIONAL: "IV",
            StudyDesign.CASE_STUDY: "IV",
            StudyDesign.DESCRIPTIVE: "IV",
            StudyDesign.EXPERT_OPINION: "V",
            StudyDesign.UNKNOWN: "V",
        }
        return mapping.get(self.study_design, "V")

    @property
    def is_valid(self) -> bool:
        return bool(self.doi) and self.source != "fabricated"


import os
import sqlite3
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "data", "conceptra.db")


class MetadataLayer:
    """
    Layer 2: Manajemen metadata bibliografis corpus penelitian.
    Terhubung ke basis data SQLite (conceptra.db) untuk penyimpan persisten.
    """

    def __init__(self):
        self._entries: Dict[str, CorpusEntry] = {}
        self._init_db()

    def _init_db(self):
        """Inisialisasi tabel corpus_metadata di SQLite dan muat entri."""
        if not os.path.exists(os.path.dirname(DB_PATH)):
            os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS corpus_metadata (
            id TEXT PRIMARY KEY,
            doi TEXT,
            scopus_id TEXT,
            title TEXT,
            authors TEXT,
            journal TEXT,
            year INTEGER,
            physics_domain TEXT,
            inclusion_status TEXT,
            study_design TEXT,
            quality_score REAL,
            source TEXT,
            notes TEXT,
            last_verified TEXT,
            created_at TEXT
        )
        """)
        conn.commit()

        cur.execute("SELECT COUNT(*) FROM corpus_metadata")
        count = cur.fetchone()[0]

        if count == 0:
            conn.close()
            self._init_from_legacy_corpus()
        else:
            cur.execute("SELECT * FROM corpus_metadata")
            rows = cur.fetchall()
            for r in rows:
                authors_list = []
                if r[4]:
                    try:
                        authors_list = json.loads(r[4])
                    except Exception:
                        authors_list = [r[4]]

                entry = CorpusEntry(
                    id=r[0],
                    doi=r[1],
                    scopus_id=r[2],
                    title=r[3],
                    authors=authors_list,
                    journal=r[5],
                    year=r[6],
                    physics_domain=r[7],
                    inclusion_status=InclusionStatus(r[8]) if r[8] else InclusionStatus.PENDING,
                    study_design=StudyDesign(r[9]) if r[9] else StudyDesign.UNKNOWN,
                    quality_score=r[10] or 0.0,
                    source=r[11] or "fabricated",
                    notes=r[12] or "",
                    last_verified=r[13],
                    extraction_date=r[14]
                )
                entry.compute_quality_score()
                self._entries[r[0]] = entry
            conn.close()

    def _init_from_legacy_corpus(self):
        """
        Import corpus dari corpus.py sebagai CorpusEntry dan simpan ke database SQLite.
        """
        from .corpus import PHYSICS_MISCONCEPTIONS
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        for m in PHYSICS_MISCONCEPTIONS:
            is_fabricated = m.get("source") == "fabricated" or not m.get("doi")
            entry = CorpusEntry(
                id=m["id"],
                doi=m.get("doi"),
                source=m.get("source", "openalex" if not is_fabricated else "fabricated"),
                inclusion_status=InclusionStatus.INCLUDED if not is_fabricated else InclusionStatus.FABRICATED,
                notes=(
                    "Entri terverifikasi secara bibliometrik dari database OpenAlex." if not is_fabricated else
                    "PERINGATAN: Entri ini dikonstruksi secara manual dari dokumen riset. "
                    "Belum memiliki DOI atau metadata bibliografis yang terverifikasi."
                ),
                physics_domain=m.get("domain"),
                educational_level=m.get("educational_level", []),
                misconception_ids=[m["id"]],
                extraction_date=datetime.now(timezone.utc).isoformat(),
                extracted_by="legacy_import" if is_fabricated else "grounding_script",
                title=m.get("references", [""])[0] if not is_fabricated else None,
                journal=m.get("journal") if not is_fabricated else None,
                year=m.get("year") if not is_fabricated else None,
                authors=m.get("authors") if not is_fabricated else [],
            )
            entry.compute_quality_score()
            self._entries[m["id"]] = entry

            authors_json = json.dumps(entry.authors)
            cur.execute("""
            INSERT OR REPLACE INTO corpus_metadata
            (id, doi, scopus_id, title, authors, journal, year, physics_domain,
             inclusion_status, study_design, quality_score, source, notes, last_verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                entry.id, entry.doi, entry.scopus_id, entry.title, authors_json,
                entry.journal, entry.year, entry.physics_domain, entry.inclusion_status.value,
                entry.study_design.value, entry.quality_score, entry.source, entry.notes,
                entry.last_verified, entry.extraction_date
            ))

        conn.commit()
        conn.close()

    def add_entry(self, entry: CorpusEntry) -> CorpusEntry:
        """Tambahkan entri baru ke metadata layer dan SQLite."""
        entry.compute_quality_score()
        if not entry.extraction_date:
            entry.extraction_date = datetime.now(timezone.utc).isoformat()
        self._entries[entry.id] = entry

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
        INSERT OR REPLACE INTO corpus_metadata
        (id, doi, scopus_id, title, authors, journal, year, physics_domain,
         inclusion_status, study_design, quality_score, source, notes, last_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            entry.id, entry.doi, entry.scopus_id, entry.title, json.dumps(entry.authors),
            entry.journal, entry.year, entry.physics_domain, entry.inclusion_status.value,
            entry.study_design.value, entry.quality_score, entry.source, entry.notes,
            entry.last_verified, entry.extraction_date
        ))
        conn.commit()
        conn.close()
        return entry

    def update_entry_status(self, entry_id: str, status: InclusionStatus, notes: Optional[str] = None) -> Optional[CorpusEntry]:
        """Perbarui status inklusi dan catatan entri secara persisten."""
        entry = self._entries.get(entry_id)
        if not entry:
            return None

        entry.inclusion_status = status
        if notes is not None:
            entry.notes = notes
        entry.last_verified = datetime.now(timezone.utc).isoformat()
        entry.compute_quality_score()

        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
        UPDATE corpus_metadata
        SET inclusion_status = ?, notes = ?, last_verified = ?, quality_score = ?
        WHERE id = ?
        """, (entry.inclusion_status.value, entry.notes, entry.last_verified, entry.quality_score, entry_id))
        conn.commit()
        conn.close()
        return entry

    def get_entry(self, entry_id: str) -> Optional[CorpusEntry]:
        return self._entries.get(entry_id)

    def get_all_entries(self, only_valid: bool = False) -> List[CorpusEntry]:
        entries = list(self._entries.values())
        if only_valid:
            return [e for e in entries if e.is_valid]
        return entries

    def get_quality_report(self) -> Dict:
        """Laporan kualitas seluruh corpus."""
        entries = list(self._entries.values())
        total = len(entries)
        valid = sum(1 for e in entries if e.is_valid)
        fabricated = sum(1 for e in entries if e.source == "fabricated")
        avg_quality = sum(e.quality_score for e in entries) / max(total, 1)

        by_design = {}
        for e in entries:
            key = e.study_design.value
            by_design[key] = by_design.get(key, 0) + 1

        by_domain = {}
        for e in entries:
            key = e.physics_domain or "unknown"
            by_domain[key] = by_domain.get(key, 0) + 1

        by_quartile = {}
        for e in entries:
            key = e.quartile or "unranked"
            by_quartile[key] = by_quartile.get(key, 0) + 1

        return {
            "total_entries": total,
            "valid_entries": valid,
            "fabricated_entries": fabricated,
            "pending_entries": sum(1 for e in entries if e.inclusion_status == InclusionStatus.PENDING),
            "avg_quality_score": round(avg_quality, 3),
            "publication_ready_count": sum(1 for e in entries if e.quality_score >= 0.70 and e.is_valid),
            "by_study_design": by_design,
            "by_domain": by_domain,
            "by_quartile": by_quartile,
            "verdict": (
                "SIAP PUBLIKASI" if valid >= total * 0.90
                else f"TIDAK SIAP — {fabricated} entri fabricated dari {total} total"
            ),
            "prisma_compliant": valid >= 10 and any(
                e.study_design == StudyDesign.SYSTEMATIC_REVIEW for e in entries
            ),
        }

    def get_prisma_flowchart_data(self) -> Dict:
        """
        Data untuk PRISMA 2020 flowchart — standar systematic review.
        https://www.prisma-statement.org/
        """
        entries = list(self._entries.values())
        return {
            "identification": {
                "records_from_databases": len(entries),
                "records_from_other_sources": 0,
                "total_identified": len(entries),
            },
            "screening": {
                "records_screened": len(entries),
                "records_excluded": sum(1 for e in entries if e.inclusion_status == InclusionStatus.FABRICATED),
                "reports_sought": sum(1 for e in entries if e.inclusion_status == InclusionStatus.PENDING),
                "reports_not_retrieved": 0,
            },
            "eligibility": {
                "reports_assessed": sum(1 for e in entries if e.inclusion_status in [InclusionStatus.INCLUDED, InclusionStatus.EXCLUDED]),
                "reports_excluded_with_reason": sum(1 for e in entries if e.inclusion_status == InclusionStatus.EXCLUDED),
            },
            "included": {
                "studies_included": sum(1 for e in entries if e.inclusion_status == InclusionStatus.INCLUDED),
                "reports_of_included_studies": sum(1 for e in entries if e.inclusion_status == InclusionStatus.INCLUDED),
            },
            "note": "⚠️ PRISMA flowchart belum dapat diisi secara akurat karena corpus saat ini fabricated. Diperlukan systematic literature search yang nyata."
        }


# ─── Singleton ─────────────────────────────────────────────────────────────────
_metadata_layer: Optional[MetadataLayer] = None

def get_metadata_layer() -> MetadataLayer:
    global _metadata_layer
    if _metadata_layer is None:
        _metadata_layer = MetadataLayer()
    return _metadata_layer
