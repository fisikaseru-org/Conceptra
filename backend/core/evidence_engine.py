"""
Conceptra — Evidence Engine
Layer 6: Evidence Traceability sesuai standar EBM (Evidence-Based Medicine)
        yang diadaptasi untuk Evidence-Based Education Research.

Setiap insight yang muncul di dashboard WAJIB memiliki:
1. Evidence Source (sumber bukti)
2. Evidence Level (I–V berdasarkan Oxford CEBM hierarchy)
3. Evidence Confidence (0.0–1.0, terkalibrasi)
4. Evidence Trace (jejak komputasi yang dapat direproduksi)
5. Evidence Metadata (bibliografis)
6. Evidence Timestamp (kapan bukti dihasilkan)
7. Evidence Provenance (pipeline apa yang menghasilkan bukti ini)
8. Evidence Explanation (narasi yang dapat dipahami)

Referensi:
    Oxford Centre for Evidence-Based Medicine (CEBM) Levels of Evidence 2011
    https://www.cebm.ox.ac.uk/resources/levels-of-evidence/ocebm-levels-of-evidence
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


class EvidenceLevel(str, Enum):
    """
    Hierarki bukti diadaptasi dari Oxford CEBM untuk penelitian pendidikan.
    Level I adalah yang paling kuat; Level V adalah yang paling lemah.
    """
    LEVEL_I   = "I"    # Systematic Review / Meta-Analysis dari RCT pendidikan
    LEVEL_II  = "II"   # RCT tunggal yang terkontrol baik
    LEVEL_III = "III"  # Quasi-experimental, cohort atau case-control
    LEVEL_IV  = "IV"   # Non-experimental (survei, studi deskriptif)
    LEVEL_V   = "V"    # Expert opinion, anekdot, data fabricated
    COMPUTED  = "COMPUTED"   # Dihasilkan dari komputasi algoritma internal


class EvidenceSource(str, Enum):
    CORPUS_EXTRACTION = "corpus_extraction"       # Diekstraksi dari corpus nyata
    EXPERT_ANNOTATION = "expert_annotation"       # Anotasi langsung oleh pakar
    ALGORITHM_COMPUTED = "algorithm_computed"     # Dihitung oleh algoritma
    KNOWLEDGE_GRAPH = "knowledge_graph"           # Dari relasi ontologi
    USER_PROVIDED = "user_provided"               # Diberikan oleh pengguna
    FABRICATED = "fabricated"                     # Data rekayasa — TIDAK VALID


@dataclass
class BibliographicMetadata:
    """Metadata bibliografis sumber bukti."""
    doi: Optional[str] = None
    scopus_id: Optional[str] = None
    title: Optional[str] = None
    authors: List[str] = field(default_factory=list)
    journal: Optional[str] = None
    year: Optional[int] = None
    volume: Optional[str] = None
    pages: Optional[str] = None
    url: Optional[str] = None
    citation_count: int = 0
    impact_factor: Optional[float] = None

    def is_valid(self) -> bool:
        """Bukti dianggap valid jika minimal memiliki DOI, Scopus ID, URL, atau metadata dasar lengkap."""
        has_id = bool(self.doi or self.scopus_id or self.url)
        has_basic = bool(self.title and self.journal and self.authors)
        return has_id or has_basic

    def to_citation(self) -> str:
        """Format APA-style citation."""
        authors_str = "; ".join(self.authors[:3])
        if len(self.authors) > 3:
            authors_str += " et al."
        parts = [authors_str or "Anonymous"]
        if self.year:
            parts.append(f"({self.year})")
        if self.title:
            parts.append(self.title)
        if self.journal:
            parts.append(self.journal)
        if self.doi:
            parts.append(f"https://doi.org/{self.doi}")
        return ". ".join(filter(None, parts))


@dataclass
class EvidenceRecord:
    """
    Satu unit bukti ilmiah yang terlampir pada sebuah insight/klaim.

    Setiap klaim analitik di dashboard harus meng-attach minimal satu EvidenceRecord.
    """
    evidence_id: str                              # Hash deterministik berdasarkan konten
    claim: str                                    # Klaim yang didukung oleh bukti ini
    source: EvidenceSource
    level: EvidenceLevel
    confidence: float                             # 0.0–1.0, harus terkalibrasi
    trace: Dict[str, Any]                         # Jejak komputasi yang dapat direproduksi
    metadata: BibliographicMetadata
    timestamp: str                                # ISO 8601
    provenance: str                               # Deskripsi pipeline yang menghasilkan bukti
    explanation: str                              # Narasi penjelasan untuk non-expert
    supporting_ids: List[str] = field(default_factory=list)  # ID corpus yang mendukung
    contradicting_ids: List[str] = field(default_factory=list)  # ID yang bertentangan

    @property
    def is_verifiable(self) -> bool:
        """Bukti dapat diverifikasi jika memiliki metadata bibliografis valid."""
        return self.metadata.is_valid() or self.source == EvidenceSource.ALGORITHM_COMPUTED

    @property
    def strength_label(self) -> str:
        if self.level in (EvidenceLevel.LEVEL_I, EvidenceLevel.LEVEL_II):
            return "STRONG"
        elif self.level in (EvidenceLevel.LEVEL_III, EvidenceLevel.LEVEL_IV):
            return "MODERATE"
        elif self.level == EvidenceLevel.COMPUTED:
            return "ALGORITHMIC"
        else:
            return "WEAK"

    def to_dict(self) -> Dict:
        return {
            "evidence_id": self.evidence_id,
            "claim": self.claim,
            "source": self.source.value,
            "level": self.level.value,
            "confidence": round(self.confidence, 4),
            "trace": self.trace,
            "metadata": asdict(self.metadata),
            "timestamp": self.timestamp,
            "provenance": self.provenance,
            "explanation": self.explanation,
            "supporting_ids": self.supporting_ids,
            "contradicting_ids": self.contradicting_ids,
            "is_verifiable": self.is_verifiable,
            "strength": self.strength_label,
            "citation": self.metadata.to_citation(),
        }


class EvidenceEngine:
    """
    Engine untuk membuat, menyimpan, dan melampirkan bukti ilmiah
    pada setiap klaim analitik yang dihasilkan oleh Conceptra.

    Prinsip: TIDAK ADA KLAIM TANPA BUKTI.
    """

    def __init__(self):
        self._registry: Dict[str, EvidenceRecord] = {}

    def _generate_id(self, claim: str, provenance: str) -> str:
        """Hasilkan ID deterministik dari konten bukti."""
        content = f"{claim}|{provenance}"
        return "EVD-" + hashlib.sha256(content.encode()).hexdigest()[:12].upper()

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def create_corpus_evidence(
        self,
        claim: str,
        corpus_ids: List[str],
        biblio: BibliographicMetadata,
        confidence: float,
        provenance: str = "corpus_extraction_pipeline",
    ) -> EvidenceRecord:
        """
        Buat bukti dari ekstraksi corpus nyata.
        Level IV secara default (non-experimental), dapat di-upgrade jika RCT.
        """
        eid = self._generate_id(claim, provenance)
        record = EvidenceRecord(
            evidence_id=eid,
            claim=claim,
            source=EvidenceSource.CORPUS_EXTRACTION,
            level=EvidenceLevel.LEVEL_IV,
            confidence=max(0.0, min(1.0, confidence)),
            trace={
                "corpus_ids": corpus_ids,
                "extraction_method": provenance,
                "n_sources": len(corpus_ids),
            },
            metadata=biblio,
            timestamp=self._now_iso(),
            provenance=provenance,
            explanation=f"Klaim ini didukung oleh {len(corpus_ids)} sumber dari corpus penelitian terverifikasi.",
            supporting_ids=corpus_ids,
        )
        self._registry[eid] = record
        return record

    def create_algorithm_evidence(
        self,
        claim: str,
        algorithm: str,
        parameters: Dict[str, Any],
        input_ids: List[str],
        output_value: Any,
        confidence: float,
    ) -> EvidenceRecord:
        """
        Buat bukti dari output algoritma komputasi (statistik, NLP, graph).
        Ini adalah bukti Level COMPUTED — valid untuk analitik deskriptif
        tetapi TIDAK untuk klaim kausalitas.
        """
        provenance = f"algorithm:{algorithm}"
        eid = self._generate_id(claim, provenance + str(parameters))
        record = EvidenceRecord(
            evidence_id=eid,
            claim=claim,
            source=EvidenceSource.ALGORITHM_COMPUTED,
            level=EvidenceLevel.COMPUTED,
            confidence=max(0.0, min(1.0, confidence)),
            trace={
                "algorithm": algorithm,
                "parameters": parameters,
                "input_ids": input_ids,
                "output": str(output_value)[:200],
            },
            metadata=BibliographicMetadata(),
            timestamp=self._now_iso(),
            provenance=provenance,
            explanation=(
                f"Nilai ini dihitung menggunakan algoritma '{algorithm}' "
                f"dari {len(input_ids)} entri corpus. "
                f"Ini adalah statistik deskriptif, bukan bukti kausalitas."
            ),
            supporting_ids=input_ids,
        )
        self._registry[eid] = record
        return record

    def create_fabricated_flag(
        self,
        claim: str,
        reason: str,
        entry_id: str,
    ) -> EvidenceRecord:
        """
        Tandai sebuah klaim/entri sebagai fabricated (data rekayasa).
        Ini adalah PERINGATAN — klaim dengan bukti ini TIDAK boleh ditampilkan
        sebagai fakta ilmiah.
        """
        provenance = "data_audit"
        eid = self._generate_id(claim, provenance + entry_id)
        record = EvidenceRecord(
            evidence_id=eid,
            claim=claim,
            source=EvidenceSource.FABRICATED,
            level=EvidenceLevel.LEVEL_V,
            confidence=0.0,
            trace={"flagged_entry": entry_id, "reason": reason},
            metadata=BibliographicMetadata(),
            timestamp=self._now_iso(),
            provenance=provenance,
            explanation=(
                f"⚠️ PERINGATAN: Klaim ini berasal dari data yang dikonstruksi secara manual "
                f"({reason}). Tidak dapat digunakan sebagai bukti ilmiah. "
                f"Diperlukan validasi dari corpus nyata."
            ),
        )
        self._registry[eid] = record
        return record

    def attach_evidence_to_insight(
        self,
        insight: Dict,
        evidence_records: List[EvidenceRecord],
    ) -> Dict:
        """
        Lampirkan bukti pada sebuah insight dict yang akan dikirim ke dashboard.

        Setiap insight yang keluar dari backend harus melalui fungsi ini.
        """
        if not evidence_records:
            # Tanpa bukti, insight diberi flag "unverified"
            insight["_evidence"] = {
                "status": "UNVERIFIED",
                "warning": "Insight ini tidak memiliki evidence trace. Tidak dapat dipertanggungjawabkan secara ilmiah.",
                "records": []
            }
            return insight

        records_data = [e.to_dict() for e in evidence_records]
        min_confidence = min(e.confidence for e in evidence_records)
        max_level_num = max(
            ["I", "II", "III", "IV", "V", "COMPUTED"].index(e.level.value)
            if e.level.value in ["I", "II", "III", "IV", "V", "COMPUTED"] else 5
            for e in evidence_records
        )
        level_labels = ["I", "II", "III", "IV", "V", "COMPUTED"]
        weakest_level = level_labels[max_level_num]
        has_fabricated = any(e.source == EvidenceSource.FABRICATED for e in evidence_records)

        insight["_evidence"] = {
            "status": "FABRICATED_DATA" if has_fabricated else "VERIFIED" if min_confidence >= 0.7 else "LOW_CONFIDENCE",
            "record_count": len(records_data),
            "aggregate_confidence": round(min_confidence, 4),
            "weakest_evidence_level": weakest_level,
            "has_doi": any(e.metadata.doi for e in evidence_records),
            "records": records_data,
            "disclaimer": (
                "⚠️ Data ini mengandung entri fabricated dan TIDAK boleh dikutip dalam publikasi ilmiah."
                if has_fabricated
                else None
            )
        }
        return insight

    def audit_corpus_entries(self, corpus: List[Dict]) -> Dict:
        """
        Lakukan audit evidence terhadap seluruh corpus.
        Hasilkan laporan komprehensif tentang kualitas bukti.
        """
        total = len(corpus)
        has_doi = sum(1 for e in corpus if e.get("doi"))
        has_methodology = sum(1 for e in corpus if e.get("frequency_methodology"))
        has_evidence_level = sum(1 for e in corpus if e.get("evidence_level"))
        
        def _check_validity(entry: Dict) -> bool:
            if entry.get("source") == "fabricated": return False
            meta = BibliographicMetadata(
                doi=entry.get("doi"),
                scopus_id=entry.get("scopus_id"),
                url=entry.get("url") or entry.get("open_access_url"),
                title=entry.get("title") or entry.get("references", [""])[0] if entry.get("references") else "",
                journal=entry.get("journal"),
                authors=entry.get("authors") or []
            )
            return meta.is_valid()

        fabricated = sum(1 for e in corpus if not _check_validity(e))
        valid_entries = total - fabricated

        # Buat evidence records untuk setiap entri
        flagged = []
        for entry in corpus:
            issues = []
            if not _check_validity(entry):
                issues.append("missing_verifiable_source")
                self.create_fabricated_flag(
                    claim=f"Entri {entry.get('id')}: {entry.get('misconception', '')[:80]}",
                    reason="Tidak ada DOI/URL/Metadata lengkap — sumber tidak dapat diverifikasi",
                    entry_id=entry.get("id", "unknown")
                )
            if not entry.get("frequency_methodology"):
                issues.append("missing_frequency_methodology")
            if issues:
                flagged.append({"id": entry.get("id"), "issues": issues})

        return {
            "total_entries": total,
            "has_doi": has_doi,
            "has_frequency_methodology": has_methodology,
            "has_evidence_level": has_evidence_level,
            "fabricated_or_unverifiable": fabricated,
            "completeness_pct": round((valid_entries / max(total, 1)) * 100, 1),
            "publication_ready": fabricated == 0 and has_methodology == total,
            "flagged_entries": flagged[:20],
            "total_evidence_records": len(self._registry),
            "verdict": (
                "✅ SIAP PUBLIKASI" if fabricated == 0 and has_methodology == total
                else f"❌ TIDAK SIAP — {fabricated} entri tidak terverifikasi"
            )
        }

    def get_evidence_by_id(self, evidence_id: str) -> Optional[Dict]:
        record = self._registry.get(evidence_id)
        return record.to_dict() if record else None

    def get_all_evidence_summary(self) -> Dict:
        total = len(self._registry)
        by_level = {}
        by_source = {}
        for r in self._registry.values():
            by_level[r.level.value] = by_level.get(r.level.value, 0) + 1
            by_source[r.source.value] = by_source.get(r.source.value, 0) + 1

        return {
            "total_records": total,
            "by_level": by_level,
            "by_source": by_source,
            "fabricated_count": by_source.get("fabricated", 0),
        }


# ─── Singleton ─────────────────────────────────────────────────────────────────
_evidence_engine: Optional[EvidenceEngine] = None

def get_evidence_engine() -> EvidenceEngine:
    global _evidence_engine
    if _evidence_engine is None:
        _evidence_engine = EvidenceEngine()
    return _evidence_engine
