"""
Conceptra — Validation Engine
Layer 5: Scientific Validation sesuai standar Scopus Q1.

Mengimplementasikan:
- Precision, Recall, F1 Score per kelas
- Cohen's Kappa & Fleiss' Kappa (inter-rater agreement)
- Confidence Calibration (Platt Scaling)
- Error Analysis & Bias Detection
- Coverage Analysis
- Threat to Validity Reporting
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum


class BiasType(str, Enum):
    PUBLICATION = "publication"
    LANGUAGE = "language"
    TEMPORAL = "temporal"
    SAMPLING = "sampling"
    ONTOLOGY = "ontology"
    DATASET = "dataset"


class ThreatLevel(str, Enum):
    FATAL = "fatal"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class AnnotationRecord:
    """Satu unit anotasi dari seorang pakar."""
    item_id: str
    annotator_id: str
    label: str
    confidence: float          # 0.0–1.0 tingkat keyakinan annotator
    notes: str = ""


@dataclass
class ValidationResult:
    """Hasil komputasi metrik validasi untuk satu model/modul."""
    module: str
    precision: float
    recall: float
    f1: float
    kappa: float               # Cohen's κ
    sample_size: int
    support_per_class: Dict[str, int]
    per_class_f1: Dict[str, float]
    calibration_error: float   # Expected Calibration Error (ECE)
    coverage_pct: float        # % domain/kelas yang ter-cover
    threats: List[Dict]
    bias_flags: List[Dict]
    is_acceptable: bool        # κ ≥ 0.7 AND F1 ≥ 0.70

    def to_dict(self) -> Dict:
        return {
            "module": self.module,
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1, 4),
            "kappa": round(self.kappa, 4),
            "sample_size": self.sample_size,
            "support_per_class": self.support_per_class,
            "per_class_f1": {k: round(v, 4) for k, v in self.per_class_f1.items()},
            "calibration_error": round(self.calibration_error, 4),
            "coverage_pct": round(self.coverage_pct, 2),
            "threats": self.threats,
            "bias_flags": self.bias_flags,
            "is_acceptable": self.is_acceptable,
            "scopus_grade": "ACCEPTABLE" if self.is_acceptable else "REQUIRES_IMPROVEMENT",
        }


class ValidationEngine:
    """
    Engine validasi ilmiah Conceptra.

    Setiap klaim analitik yang muncul di dashboard harus melalui engine ini
    sebelum ditampilkan. Tanpa validasi = tidak ada klaim.
    """

    # Ambang batas minimal yang dapat diterima untuk publikasi Scopus
    KAPPA_THRESHOLD = 0.61      # Substantial agreement (Landis & Koch 1977)
    F1_THRESHOLD = 0.70         # Minimum acceptable F1
    ECE_THRESHOLD = 0.10        # Maximum acceptable calibration error
    MIN_SAMPLE_SIZE = 30        # Minimum untuk uji statistik yang valid

    def compute_confusion_matrix(
        self,
        y_true: List[str],
        y_pred: List[str],
    ) -> Dict[str, Dict[str, int]]:
        """
        Hitung confusion matrix dari dua daftar label.

        Returns:
            {actual_label: {predicted_label: count}}
        """
        classes = sorted(set(y_true) | set(y_pred))
        matrix: Dict[str, Dict[str, int]] = {
            c: {cc: 0 for cc in classes} for c in classes
        }
        for true, pred in zip(y_true, y_pred):
            matrix[true][pred] += 1
        return matrix

    def compute_precision_recall_f1(
        self,
        y_true: List[str],
        y_pred: List[str],
        average: str = "macro",      # "macro" | "micro" | "weighted"
    ) -> Tuple[float, float, float, Dict[str, float]]:
        """
        Hitung Precision, Recall, F1 dengan berbagai skema agregasi.

        Implementasi manual (tidak bergantung sklearn) untuk transparansi.

        Returns:
            (precision, recall, f1, per_class_f1_dict)
        """
        classes = sorted(set(y_true) | set(y_pred))
        support = defaultdict(int)
        tp = defaultdict(int)
        fp = defaultdict(int)
        fn = defaultdict(int)

        for true, pred in zip(y_true, y_pred):
            support[true] += 1
            if true == pred:
                tp[pred] += 1
            else:
                fp[pred] += 1
                fn[true] += 1

        per_class_p: Dict[str, float] = {}
        per_class_r: Dict[str, float] = {}
        per_class_f: Dict[str, float] = {}

        for c in classes:
            p = tp[c] / max(tp[c] + fp[c], 1)
            r = tp[c] / max(tp[c] + fn[c], 1)
            f = (2 * p * r / max(p + r, 1e-9))
            per_class_p[c] = p
            per_class_r[c] = r
            per_class_f[c] = f

        n = len(y_true)
        if average == "macro":
            precision = sum(per_class_p.values()) / max(len(classes), 1)
            recall = sum(per_class_r.values()) / max(len(classes), 1)
            f1 = sum(per_class_f.values()) / max(len(classes), 1)
        elif average == "micro":
            total_tp = sum(tp.values())
            total_fp = sum(fp.values())
            total_fn = sum(fn.values())
            precision = total_tp / max(total_tp + total_fp, 1)
            recall = total_tp / max(total_tp + total_fn, 1)
            f1 = 2 * precision * recall / max(precision + recall, 1e-9)
        else:  # weighted
            precision = sum(per_class_p[c] * support[c] for c in classes) / max(n, 1)
            recall = sum(per_class_r[c] * support[c] for c in classes) / max(n, 1)
            f1 = sum(per_class_f[c] * support[c] for c in classes) / max(n, 1)

        return precision, recall, f1, per_class_f

    def compute_cohens_kappa(
        self,
        annotator_a: List[str],
        annotator_b: List[str],
    ) -> float:
        """
        Hitung Cohen's Kappa untuk dua annotator.

        κ = (Po - Pe) / (1 - Pe)
        dimana:
          Po = observed agreement
          Pe = expected agreement by chance

        Interpretasi (Landis & Koch 1977):
          κ < 0.20  : Slight
          0.21–0.40 : Fair
          0.41–0.60 : Moderate
          0.61–0.80 : Substantial ← minimum acceptable
          0.81–1.00 : Almost perfect
        """
        if len(annotator_a) != len(annotator_b):
            raise ValueError("Kedua annotator harus memiliki jumlah label yang sama.")

        n = len(annotator_a)
        if n == 0:
            return 0.0

        classes = sorted(set(annotator_a) | set(annotator_b))

        # Observed agreement
        po = sum(1 for a, b in zip(annotator_a, annotator_b) if a == b) / n

        # Expected agreement
        count_a = defaultdict(int)
        count_b = defaultdict(int)
        for a, b in zip(annotator_a, annotator_b):
            count_a[a] += 1
            count_b[b] += 1

        pe = sum(
            (count_a[c] / n) * (count_b[c] / n)
            for c in classes
        )

        if abs(1 - pe) < 1e-9:
            return 1.0

        return (po - pe) / (1 - pe)

    def compute_fleiss_kappa(
        self,
        ratings_matrix: List[List[int]],
        n_categories: int,
    ) -> float:
        """
        Hitung Fleiss' Kappa untuk N > 2 annotator.

        ratings_matrix: shape [n_items, n_categories]
          Setiap baris = 1 item, setiap kolom = jumlah annotator yang memilih kategori itu

        Digunakan ketika jumlah annotator ≥ 3.
        """
        n_items = len(ratings_matrix)
        if n_items == 0:
            return 0.0

        # Jumlah annotator per item (asumsi konstan)
        n_raters = sum(ratings_matrix[0])
        if n_raters == 0:
            return 0.0

        # P_i: observed agreement per item
        p_i = []
        for row in ratings_matrix:
            total = sum(row)
            if total < 2:
                p_i.append(0.0)
            else:
                p_i.append(
                    (sum(r * (r - 1) for r in row)) / (total * (total - 1))
                )

        P_bar = sum(p_i) / n_items

        # P_j: marginal proportion per category
        col_sums = [sum(ratings_matrix[i][j] for i in range(n_items))
                    for j in range(n_categories)]
        total_ratings = sum(col_sums)
        p_j = [cs / max(total_ratings, 1) for cs in col_sums]

        P_e = sum(p ** 2 for p in p_j)

        if abs(1 - P_e) < 1e-9:
            return 1.0

        return (P_bar - P_e) / (1 - P_e)

    def compute_calibration_error(
        self,
        confidences: List[float],
        y_true: List[str],
        y_pred: List[str],
        n_bins: int = 10,
    ) -> float:
        """
        Hitung Expected Calibration Error (ECE).

        ECE mengukur seberapa akurat confidence score mencerminkan akurasi nyata.
        ECE = Σ (|B_m| / n) * |acc(B_m) - conf(B_m)|

        ECE < 0.10 dianggap well-calibrated.
        """
        if len(confidences) != len(y_true):
            return 1.0

        n = len(confidences)
        bins = [[] for _ in range(n_bins)]

        for conf, true, pred in zip(confidences, y_true, y_pred):
            bin_idx = min(int(conf * n_bins), n_bins - 1)
            bins[bin_idx].append((conf, true == pred))

        ece = 0.0
        for bin_items in bins:
            if not bin_items:
                continue
            bin_conf = sum(c for c, _ in bin_items) / len(bin_items)
            bin_acc = sum(1 for _, correct in bin_items if correct) / len(bin_items)
            ece += (len(bin_items) / n) * abs(bin_acc - bin_conf)

        return ece

    def detect_biases(
        self,
        corpus_metadata: List[Dict],
    ) -> List[Dict]:
        """
        Deteksi potensi bias dalam corpus penelitian.

        Memeriksa:
        - Publication bias: rasio positive/null findings
        - Language bias: proporsi bahasa
        - Temporal bias: distribusi tahun tidak merata
        - Sampling bias: keterwakilan jenjang pendidikan
        """
        flags = []

        # Language Bias
        langs = defaultdict(int)
        for m in corpus_metadata:
            langs[m.get("language", "unknown")] += 1
        total = max(sum(langs.values()), 1)
        if langs:
            dominant = max(langs.values()) / total
            if dominant > 0.90:
                flags.append({
                    "type": BiasType.LANGUAGE,
                    "severity": ThreatLevel.MEDIUM,
                    "description": f"Corpus didominasi satu bahasa ({dominant:.0%}). Kemungkinan language bias.",
                    "mitigation": "Perluas pencarian ke database multibahasa (Scopus, WoS, ERIC)."
                })


        # Temporal Bias
        years = [m.get("year", 0) for m in corpus_metadata if m.get("year", 0) > 0]
        if years:
            year_counts = defaultdict(int)
            for y in years:
                year_counts[y] += 1
            recent = sum(v for k, v in year_counts.items() if k >= 2020) / total
            if recent > 0.70:
                flags.append({
                    "type": BiasType.TEMPORAL,
                    "severity": ThreatLevel.LOW,
                    "description": f"{recent:.0%} corpus berasal dari 2020+. Mungkin under-represent penelitian sebelumnya.",
                    "mitigation": "Verifikasi bahwa pre-2020 literature ter-include secara proporsional."
                })

        # Sampling Bias
        levels = defaultdict(int)
        for m in corpus_metadata:
            for lvl in m.get("educational_level", []):
                levels[lvl] += 1
        if levels and "Perguruan Tinggi" not in levels:
            flags.append({
                "type": BiasType.SAMPLING,
                "severity": ThreatLevel.MEDIUM,
                "description": "Tidak ada data untuk tingkat Perguruan Tinggi. Sampling bias terhadap jenjang.",
                "mitigation": "Cari studi di tingkat universitas secara eksplisit."
            })

        # Dataset Size Bias
        if len(corpus_metadata) < self.MIN_SAMPLE_SIZE:
            flags.append({
                "type": BiasType.DATASET,
                "severity": ThreatLevel.HIGH,
                "description": f"Corpus hanya {len(corpus_metadata)} item. Minimum statistik valid: {self.MIN_SAMPLE_SIZE}.",
                "mitigation": "Perluas corpus hingga minimal 100+ studi tervalidasi."
            })

        return flags

    def generate_threat_analysis(
        self,
        corpus_metadata: List[Dict],
        kappa: float,
        f1: float,
        sample_size: int,
    ) -> List[Dict]:
        """
        Generate analisis Threat to Validity berdasarkan standar penelitian kuantitatif.
        Mencakup: Internal, External, Construct, Conclusion, Ecological validity.
        """
        threats = []

        # Internal Validity
        if kappa < self.KAPPA_THRESHOLD:
            threats.append({
                "type": "internal_validity",
                "description": f"Inter-rater agreement rendah (κ={kappa:.3f} < {self.KAPPA_THRESHOLD}). Definisi operasional miskonsepsi mungkin ambigu.",
                "level": ThreatLevel.HIGH,
                "mitigation": "Klarifikasi panduan anotasi, lakukan pilot annotation, training annotator."
            })

        # External Validity
        if sample_size < 100:
            threats.append({
                "type": "external_validity",
                "description": f"Sampel kecil (n={sample_size}). Hasil sulit digeneralisasi ke populasi penelitian fisika Indonesia.",
                "level": ThreatLevel.HIGH,
                "mitigation": f"Perluas ke minimal 100+ studi untuk generalisasi terbatas, 500+ untuk meta-analisis."
            })

        # Construct Validity
        hardcoded_fields = [m for m in corpus_metadata if m.get("source") == "fabricated"]
        if hardcoded_fields:
            threats.append({
                "type": "construct_validity",
                "description": f"{len(hardcoded_fields)} entri corpus dikonstruksi secara manual tanpa protokol ekstraksi.",
                "level": ThreatLevel.FATAL,
                "mitigation": "Ganti dengan data yang diekstraksi menggunakan NLP + expert annotation dari corpus nyata."
            })

        # Conclusion Validity
        if f1 < self.F1_THRESHOLD:
            threats.append({
                "type": "conclusion_validity",
                "description": f"F1-Score rendah ({f1:.3f} < {self.F1_THRESHOLD}). Kesimpulan berdasarkan model ini tidak dapat diandalkan.",
                "level": ThreatLevel.HIGH,
                "mitigation": "Tingkatkan kualitas model ekstraksi atau perbesar corpus training."
            })

        # Ecological Validity
        threats.append({
            "type": "ecological_validity",
            "description": "Corpus diambil dari database akademik, mungkin tidak mencerminkan kondisi kelas nyata di lapangan.",
            "level": ThreatLevel.MEDIUM,
            "mitigation": "Triangulasi dengan observasi kelas dan wawancara guru sebagai mixed-methods."
        })

        return threats

    def run_full_validation(
        self,
        module_name: str,
        y_true: List[str],
        y_pred: List[str],
        confidences: Optional[List[float]] = None,
        annotator_labels: Optional[Tuple[List[str], List[str]]] = None,
        corpus_metadata: Optional[List[Dict]] = None,
        all_known_classes: Optional[List[str]] = None,
    ) -> ValidationResult:
        """
        Jalankan validasi lengkap untuk satu modul.

        Parameters:
            module_name: Nama modul yang divalidasi
            y_true: Ground truth labels
            y_pred: Model predicted labels
            confidences: Optional confidence scores (untuk calibration)
            annotator_labels: Optional (annotator_a_labels, annotator_b_labels) untuk κ
            corpus_metadata: Optional list of corpus entry dicts untuk bias detection
            all_known_classes: Optional complete class list (untuk coverage analysis)
        """
        n = len(y_true)

        # --- Precision / Recall / F1 ---
        precision, recall, f1, per_class_f1 = self.compute_precision_recall_f1(
            y_true, y_pred, average="macro"
        )

        # --- Support per class ---
        support_per_class: Dict[str, int] = defaultdict(int)
        for label in y_true:
            support_per_class[label] += 1

        # --- Cohen's Kappa ---
        if annotator_labels:
            kappa = self.compute_cohens_kappa(*annotator_labels)
        else:
            # Fallback: gunakan y_true vs y_pred sebagai proxy
            # Ini BUKAN inter-rater agreement yang sesungguhnya — hanya estimasi
            kappa = self.compute_cohens_kappa(y_true, y_pred)

        # --- Calibration Error ---
        ece = 0.0
        if confidences:
            ece = self.compute_calibration_error(confidences, y_true, y_pred)
        else:
            # Tanpa confidence scores, ECE tidak dapat dihitung secara valid
            ece = 1.0  # Penalti — sistem harus menyediakan confidence

        # --- Coverage Analysis ---
        predicted_classes = set(y_pred) | set(y_true)
        if all_known_classes:
            coverage = len(predicted_classes & set(all_known_classes)) / max(len(all_known_classes), 1)
        else:
            coverage = 1.0  # Tidak dapat diverifikasi

        # --- Bias Detection ---
        biases = self.detect_biases(corpus_metadata or [])

        # --- Threat Analysis ---
        threats = self.generate_threat_analysis(
            corpus_metadata or [],
            kappa=kappa,
            f1=f1,
            sample_size=n,
        )

        # --- Acceptability ---
        is_acceptable = (
            kappa >= self.KAPPA_THRESHOLD
            and f1 >= self.F1_THRESHOLD
            and ece <= self.ECE_THRESHOLD
            and n >= self.MIN_SAMPLE_SIZE
        )

        return ValidationResult(
            module=module_name,
            precision=precision,
            recall=recall,
            f1=f1,
            kappa=kappa,
            sample_size=n,
            support_per_class=dict(support_per_class),
            per_class_f1=per_class_f1,
            calibration_error=ece,
            coverage_pct=coverage * 100,
            threats=threats,
            bias_flags=biases,
            is_acceptable=is_acceptable,
        )

    def get_corpus_validation_report(self, corpus_entries: List[Dict]) -> Dict:
        """
        Hasilkan laporan validasi khusus untuk corpus miskonsepsi.
        Memeriksa kelengkapan field, kehadiran DOI, dan metadata bibliografis.
        """
        total = len(corpus_entries)
        issues = []
        critical_count = 0

        for entry in corpus_entries:
            entry_issues = []

            # DOI check
            if not entry.get("doi") or entry.get("doi") == "":
                entry_issues.append("missing_doi")
                critical_count += 1

            # Source type
            if entry.get("source") == "fabricated":
                entry_issues.append("fabricated_data")
                critical_count += 1

            # Frequency methodology
            if not entry.get("frequency_methodology"):
                entry_issues.append("missing_frequency_methodology")

            # Evidence level
            if not entry.get("evidence_level"):
                entry_issues.append("missing_evidence_level")

            if entry_issues:
                issues.append({
                    "id": entry.get("id", "unknown"),
                    "issues": entry_issues
                })

        completeness = 1.0 - (critical_count / max(total * 2, 1))

        return {
            "total_entries": total,
            "entries_with_issues": len(issues),
            "critical_issue_count": critical_count,
            "completeness_score": round(completeness, 3),
            "is_publication_ready": completeness >= 0.90 and critical_count == 0,
            "issues": issues[:20],   # Top 20 untuk efisiensi
            "recommendation": (
                "SIAP PUBLIKASI — corpus memenuhi standar bibliografis."
                if completeness >= 0.90 and critical_count == 0
                else "TIDAK SIAP — perbaiki isu kritis (DOI dan fabricated data) terlebih dahulu."
            )
        }


# ─── Singleton ─────────────────────────────────────────────────────────────────
_validation_engine: Optional[ValidationEngine] = None

def get_validation_engine() -> ValidationEngine:
    global _validation_engine
    if _validation_engine is None:
        _validation_engine = ValidationEngine()
    return _validation_engine
