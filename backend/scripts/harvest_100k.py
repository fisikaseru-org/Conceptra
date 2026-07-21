#!/usr/bin/env python3
"""
Conceptra — 100K Production Harvester
=============================================
Harvest 100,000 artikel unik dari OpenAlex yang relevan dengan miskonsepsi fisika
dan pendidikan fisika Indonesia (2010–2026).

PRINSIP:
- Setiap record berasal dari OpenAlex API response aktual.
- Tidak ada data yang di-generate, di-hallucinate, atau di-hardcode.
- Resumable: cursor state disimpan ke DB, bisa di-interrupt dan dilanjutkan.
- Idempotent: INSERT OR IGNORE — aman dijalankan ulang.

Estimasi runtime: 4-8 jam (100k artikel @ 150ms/batch × ~500 batch)
"""
import os
import sys
import time
import json
import sqlite3
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple

# ─── CONFIGURATION ─────────────────────────────────────────────────────────────
OPENALEX_EMAIL = "muhamad_1302622084@mhs.unj.ac.id"
OPENALEX_KEY = "AVbzk4ToanOL7Bxs4D0Kx3"
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "conceptra.db")
TARGET_TOTAL = 100_000
BATCH_SIZE = 200        # OpenAlex max per-page
RATE_LIMIT_SLEEP = 0.15 # 150ms between requests (polite pool)
COMMIT_EVERY = 500      # Commit to SQLite every N records

# ─── HARVEST QUERIES ───────────────────────────────────────────────────────────
HARVEST_QUERIES = [
    # BATCH 1: Core misconception queries (~25k)
    {
        "id": "q_misconception_en",
        "search": "physics misconception",
        "year_range": "1996-2026",
        "target": 10000,
        "note": "Core: English misconception research"
    },
    {
        "id": "q_misconception_id",
        "search": "miskonsepsi fisika",
        "year_range": "1996-2026",
        "target": 8000,
        "note": "Core: Indonesian language misconception"
    },
    {
        "id": "q_konsep_fisika",
        "search": "pemahaman konsep fisika",
        "year_range": "1996-2026",
        "target": 8000,
        "note": "Core: Pemahaman konsep"
    },
    # BATCH 2: PER domain queries (~30k)
    {
        "id": "q_per_general",
        "search": "physics education research",
        "year_range": "1996-2026",
        "target": 10000,
        "note": "PER: General physics education research"
    },
    {
        "id": "q_conceptual_change",
        "search": "conceptual change physics",
        "year_range": "1996-2026",
        "target": 8000,
        "note": "PER: Conceptual change"
    },
    {
        "id": "q_alternative_conception",
        "search": "alternative conception physics",
        "year_range": "1996-2026",
        "target": 6000,
        "note": "PER: Alternative conceptions"
    },
    {
        "id": "q_diagnostic_test",
        "search": "diagnostic test physics student",
        "year_range": "1996-2026",
        "target": 8000,
        "note": "PER: Diagnostic assessment"
    },
    # BATCH 3: Domain-specific physics queries (~25k)
    {
        "id": "q_newton_student",
        "search": "newton law student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Domain: Newton's Laws"
    },
    {
        "id": "q_electricity_misconception",
        "search": "electricity circuit misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Domain: Electricity"
    },
    {
        "id": "q_thermodynamics_student",
        "search": "thermodynamics heat temperature student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Domain: Thermodynamics"
    },
    {
        "id": "q_quantum_student",
        "search": "quantum mechanics student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Domain: Quantum"
    },
    {
        "id": "q_wave_optics",
        "search": "wave optics student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Domain: Wave & Optics"
    },
    # BATCH 4: Indonesia-specific + intervention (~20k)
    {
        "id": "q_phet_indonesia",
        "search": "phet simulation physics learning",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: PhET interventions"
    },
    {
        "id": "q_indonesia_fci",
        "search": "force concept inventory student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Assessment: FCI"
    },
    {
        "id": "q_indonesia_cri",
        "search": "certainty response index misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Assessment: CRI"
    },
    {
        "id": "q_kurikulum_merdeka",
        "search": "kurikulum merdeka fisika",
        "year_range": "1996-2026",
        "target": 3000,
        "note": "Indonesia: Kurikulum Merdeka"
    },
    {
        "id": "q_covid_physics",
        "search": "online learning physics misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Post-COVID: Online learning impact"
    },
    {
        "id": "q_inquiry_physics",
        "search": "inquiry based learning physics",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Intervention: IBL"
    },
    # BATCH 5: Broader Science & STEM Education (Expansion)
    {
        "id": "q_science_education",
        "search": "science education misconception",
        "year_range": "1996-2026",
        "target": 8000,
        "note": "Science: Global science education"
    },
    {
        "id": "q_ipa_misconception",
        "search": "miskonsepsi ipa",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Science: Indonesian IPA Terpadu"
    },
    {
        "id": "q_stem_education",
        "search": "stem education conceptual understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "STEM: Conceptual understanding"
    },
    {
        "id": "q_chemistry_misconception",
        "search": "chemistry misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Chemistry: Overlap with atoms/thermo"
    },
    {
        "id": "q_astronomy_education",
        "search": "astronomy education",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Astronomy: Overlap with gravity/mechanics"
    },
    # BATCH 6: Expanded Physics Misconceptions & Concepts (New additions)
    {
        "id": "q_forces_understanding",
        "search": "student understanding force",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: understanding forces"
    },
    {
        "id": "q_kinematics_graphs",
        "search": "kinematics graphs misconception student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: Kinematics graphing"
    },
    {
        "id": "q_projectile_motion",
        "search": "projectile motion misconception student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: Projectile motion"
    },
    {
        "id": "q_circular_motion",
        "search": "circular motion student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: Circular motion"
    },
    {
        "id": "q_gravity_mechanics",
        "search": "gravity orbital misconception student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: Gravity and orbits"
    },
    {
        "id": "q_work_energy",
        "search": "work energy theorem student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: Work, Energy, Power"
    },
    {
        "id": "q_conservation_momentum",
        "search": "conservation of momentum student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: Conservation of momentum"
    },
    {
        "id": "q_rotational_dynamics",
        "search": "rotational dynamics student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Mechanics: Rotational dynamics"
    },
    {
        "id": "q_fluid_pressure",
        "search": "fluid pressure student misconception archimedes",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Fluida: Pressure and Archimedes"
    },
    {
        "id": "q_bernoulli_principle",
        "search": "bernoulli principle student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Fluida: Bernoulli's principle"
    },
    {
        "id": "q_thermal_conduction",
        "search": "heat transfer student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Thermodynamics: Heat transfer"
    },
    {
        "id": "q_entropy_student",
        "search": "entropy thermodynamic student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Thermodynamics: Entropy concept"
    },
    {
        "id": "q_kinetic_gas",
        "search": "kinetic theory of gases student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Thermodynamics: Kinetic gas theory"
    },
    {
        "id": "q_ideal_gas",
        "search": "ideal gas law student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Thermodynamics: Ideal gas law"
    },
    {
        "id": "q_electrostatics_charges",
        "search": "electrostatics charge student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Electricity: Electrostatics"
    },
    {
        "id": "q_electric_field",
        "search": "electric field student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Electricity: Electric fields"
    },
    {
        "id": "q_magnetic_induction",
        "search": "magnetic induction faraday student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Magnetism: Faraday's law of induction"
    },
    {
        "id": "q_sound_propagation",
        "search": "sound propagation student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Waves: Sound propagation"
    },
    {
        "id": "q_wave_particle",
        "search": "wave particle duality student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Modern Physics: Wave-particle duality"
    },
    {
        "id": "q_photoelectric_effect",
        "search": "photoelectric effect student understanding",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Modern Physics: Photoelectric effect"
    },
    {
        "id": "q_special_relativity",
        "search": "special relativity student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Modern Physics: Special relativity"
    },
    {
        "id": "q_nuclear_physics",
        "search": "nuclear physics student understanding radioactivity",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Modern Physics: Radioactivity"
    },
    # BATCH 7: Pedagogical & Classroom Interventions (New additions)
    {
        "id": "q_concept_map_physics",
        "search": "concept mapping physics student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Concept maps"
    },
    {
        "id": "q_argumentation_physics",
        "search": "scientific argumentation physics student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Scientific argumentation"
    },
    {
        "id": "q_inquiry_labs",
        "search": "inquiry lab physics student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Inquiry labs"
    },
    {
        "id": "q_flipped_classroom_physics",
        "search": "flipped classroom physics learning",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Flipped classroom"
    },
    {
        "id": "q_gamification_physics",
        "search": "gamified physics learning student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Gamified learning"
    },
    {
        "id": "q_augmented_reality_physics",
        "search": "augmented reality physics teaching",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Augmented reality"
    },
    {
        "id": "q_virtual_lab_physics",
        "search": "virtual laboratory physics simulation",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Virtual lab simulations"
    },
    {
        "id": "q_physics_modeling_instruction",
        "search": "modeling instruction physics high school",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Modeling instruction"
    },
    {
        "id": "q_active_learning_physics",
        "search": "active learning physics student performance",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Active learning"
    },
    {
        "id": "q_peer_instruction_physics",
        "search": "peer instruction physics concept test",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Peer instruction"
    },
    {
        "id": "q_pbl_physics",
        "search": "problem based learning physics concept",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: PBL"
    },
    {
        "id": "q_socratic_dialogue_physics",
        "search": "socratic dialogue physics misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Socratic dialogue"
    },
    {
        "id": "q_cognitive_conflict_physics",
        "search": "cognitive conflict strategy physics student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Pedagogy: Cognitive conflict strategy"
    },
    # BATCH 8: Indonesia-focused physics education research (New additions)
    {
        "id": "q_conceptual_understanding_indonesia",
        "search": "pemahaman konsep fisika siswa sma",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: Pemahaman konsep SMA"
    },
    {
        "id": "q_hasil_belajar_fisika",
        "search": "hasil belajar fisika model pembelajaran",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: Hasil belajar & model"
    },
    {
        "id": "q_kemampuan_berpikir_kritis",
        "search": "kemampuan berpikir kritis fisika",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: Critical thinking"
    },
    {
        "id": "q_literasi_sains_fisika",
        "search": "literasi sains fisika siswa",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: Science literacy"
    },
    {
        "id": "q_phet_simulasi_fisika",
        "search": "phet simulation media pembelajaran fisika",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: PhET media"
    },
    {
        "id": "q_e_learning_fisika",
        "search": "e-learning fisika pemahaman konsep",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: E-learning concept"
    },
    {
        "id": "q_lkpd_fisika_miskonsepsi",
        "search": "lkpd fisika miskonsepsi",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: Student worksheet (LKPD) misconceptions"
    },
    {
        "id": "q_modul_ajar_fisika",
        "search": "modul ajar fisika konsep",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: Modul Ajar (Teaching modules)"
    },
    {
        "id": "q_misconception_sinta",
        "search": "miskonsepsi fisika sinta jurnal",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: SINTA journals"
    },
    {
        "id": "q_fisika_sma_miskonsepsi",
        "search": "miskonsepsi fisika sekolah menengah",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Indonesia: High school physics misconceptions"
    },
    # BATCH 9: Teacher & Miscellaneous (New additions)
    {
        "id": "q_preconception_physics",
        "search": "preconceptions physics students",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "General: Preconceptions"
    },
    {
        "id": "q_pedagogical_content_knowledge_physics",
        "search": "pedagogical content knowledge physics teacher",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Teachers: PCK physics"
    },
    {
        "id": "q_physics_teacher_misconception",
        "search": "physics teacher misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Teachers: Teacher misconceptions"
    },
    {
        "id": "q_misconception_gravity",
        "search": "gravity misconception classroom",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Domain: Gravity classroom misconceptions"
    },
    {
        "id": "q_misconception_optical_instruments",
        "search": "optical instrument student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Domain: Optical instruments"
    },
    {
        "id": "q_tpack_physics",
        "search": "tpack physics teacher education",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Teachers: TPACK physics"
    },
    {
        "id": "q_stem_project_physics",
        "search": "stem project based learning physics",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "STEM: Project based learning"
    },
    {
        "id": "q_misconception_astronomy_phases",
        "search": "moon phases student misconception",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "Astronomy: Moon phases misconceptions"
    },
    {
        "id": "q_self_regulation_physics",
        "search": "self regulated learning physics student",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "General: Self-regulated learning"
    },
    {
        "id": "q_physics_identity",
        "search": "physics identity student self efficacy",
        "year_range": "1996-2026",
        "target": 5000,
        "note": "General: Physics identity"
    },
]

# ─── DOMAIN DETECTION v2 ──────────────────────────────────────────────────────
DOMAIN_KEYWORDS = {
    "Mekanika": {
        "high": ["misconception newton", "miskonsepsi gaya", "impetus theory",
                 "force motion", "newton law student", "kinematic misconception",
                 "momentum misconception", "gaya gesek miskonsepsi"],
        "medium": ["force", "gaya", "motion", "gerak", "newton", "velocity",
                   "kecepatan", "acceleration", "percepatan", "momentum",
                   "gravity", "gravitasi", "friction", "gesek"],
        "low": ["mekanika", "mechanics", "dynamics", "kinematic"]
    },
    "Termodinamika": {
        "high": ["heat temperature misconception", "kalor suhu miskonsepsi",
                 "thermal misconception", "entropy student"],
        "medium": ["heat", "kalor", "temperature", "suhu", "thermodynamic",
                   "entropy", "entropi", "thermal", "termal"],
        "low": ["termodinamika", "thermodynamics"]
    },
    "Listrik": {
        "high": ["electric circuit misconception", "miskonsepsi listrik",
                 "current voltage misconception", "ohm law student"],
        "medium": ["electricity", "current", "arus", "voltage", "tegangan",
                   "circuit", "sirkuit", "resistance", "hambatan", "coulomb"],
        "low": ["listrik", "electric", "electrical"]
    },
    "Gelombang": {
        "high": ["wave misconception", "miskonsepsi gelombang",
                 "sound wave student", "wave interference student"],
        "medium": ["wave", "gelombang", "sound", "bunyi", "vibration",
                   "getaran", "frequency", "frekuensi", "amplitude"],
        "low": ["gelombang", "wave optics"]
    },
    "Optika": {
        "high": ["light misconception", "miskonsepsi cahaya", "optics student",
                 "lens misconception", "reflection refraction student"],
        "medium": ["light", "cahaya", "lens", "lensa", "mirror", "cermin",
                   "reflection", "pemantulan", "refraction", "pembiasan"],
        "low": ["optika", "optics", "optical"]
    },
    "Fluida": {
        "high": ["archimedes misconception", "hydrostatic misconception",
                 "buoyancy student", "bernoulli student misconception"],
        "medium": ["pressure", "tekanan", "buoyancy", "apung", "archimedes",
                   "fluid", "fluida", "viscosity", "viskositas"],
        "low": ["fluida", "fluid dynamics", "hydrostatic"]
    },
    "Fisika Modern": {
        "high": ["quantum misconception", "miskonsepsi kuantum",
                 "photoelectric student", "wave particle duality student"],
        "medium": ["quantum", "kuantum", "photon", "foton", "relativity",
                   "relativitas", "photoelectric", "fotolistrik", "atomic model"],
        "low": ["fisika modern", "modern physics", "nuclear", "nuklir"]
    },
    "Magnetisme": {
        "high": ["magnetic field misconception", "miskonsepsi magnet",
                 "lorentz force student"],
        "medium": ["magnetic", "magnet", "lorentz", "flux", "fluks",
                   "electromagnetic induction", "induksi"],
        "low": ["magnetisme", "magnetism"]
    },
    "Astronomi": {
        "high": ["astronomy misconception", "miskonsepsi astronomi",
                 "planetary motion student", "solar system misconception"],
        "medium": ["astronomy", "astronomi", "planet", "solar system",
                   "tata surya", "moon phase", "fase bulan", "eclipse"],
        "low": ["astrophysics", "earth science"]
    },
    "IPA Terpadu": {
        "high": ["miskonsepsi ipa", "science misconception", "science education misconception",
                 "miskonsepsi sains"],
        "medium": ["ipa terpadu", "science education", "pendidikan ipa", "sains"],
        "low": ["ipa", "science"]
    },
    "Sains Terapan (STEM)": {
        "high": ["stem education misconception", "stem conceptual understanding"],
        "medium": ["stem education", "pendidikan stem", "engineering design process"],
        "low": ["stem"]
    },
}


def determine_domain_v2(title: str, abstract: str) -> Tuple[str, float]:
    """
    Returns (domain, confidence_score).
    Scoring: high keyword match = 1.0, medium = 0.7, low = 0.4
    Deterministik — tidak ada random.
    """
    text = ((title or "") + " " + (abstract or "")).lower()
    scores: Dict[str, float] = {}
    for domain, kw_groups in DOMAIN_KEYWORDS.items():
        score = 0.0
        for kw in kw_groups.get("high", []):
            if kw in text:
                score += 1.0
        for kw in kw_groups.get("medium", []):
            if kw in text:
                score += 0.7
        for kw in kw_groups.get("low", []):
            if kw in text:
                score += 0.4
        if score > 0:
            scores[domain] = score

    if not scores:
        return "Fisika Umum", 0.3

    best_domain = max(scores, key=scores.get)
    confidence = min(scores[best_domain] / 3.0, 1.0)
    return best_domain, round(confidence, 2)


def detect_indonesia_context(title: str, abstract: str, journal: str) -> bool:
    """Deteksi apakah artikel dalam konteks Indonesia."""
    text = ((title or "") + " " + (abstract or "") + " " + (journal or "")).lower()
    indonesia_markers = [
        "indonesia", "indonesian", "sma", "smp", "smk", "sekolah menengah",
        "madrasah", "peserta didik", "siswa", "mahasiswa", "mts",
        "universitas", "institut teknologi", "unj", "unm", "unsri",
        "miskonsepsi", "pemahaman konsep", "kurikulum", "pendidikan fisika"
    ]
    return any(marker in text for marker in indonesia_markers)


def detect_language(title: str, abstract: str) -> str:
    """Deteksi bahasa dominan artikel."""
    text = ((title or "") + " " + ((abstract or "")[:200])).lower()
    id_markers = ["siswa", "mahasiswa", "pembelajaran", "miskonsepsi",
                  "pemahaman", "konsep", "fisika", "peserta", "didik", "sekolah"]
    id_count = sum(1 for m in id_markers if m in text)
    if id_count >= 3:
        return "id"
    elif id_count >= 1:
        return "mixed"
    return "en"


def determine_evidence_level(title: str, abstract: str) -> str:
    """Menentukan CEBM Evidence Level berdasarkan abstract/title."""
    text = ((title or "") + " " + (abstract or "")).lower()
    if "meta-analysis" in text or "systematic review" in text:
        return "I"
    elif "randomized" in text or "controlled trial" in text or "rct" in text:
        return "II"
    elif "quasi-experimental" in text or "quasi experimental" in text or "cohort" in text:
        return "III"
    elif "survey" in text or "descriptive" in text or "diagnostic test" in text:
        return "IV"
    return "IV"


def compute_quality_score_v2(
    doi: str, abstract: str, year: int,
    citation_count: int, is_indonesia: bool,
    evidence_level: str
) -> float:
    """
    Quality score deterministik berdasarkan metadata nyata.
    Tidak ada random.uniform().
    """
    score = 0.0
    if doi:
        score += 0.20
    if abstract and len(abstract) > 200:
        score += 0.15
    elif abstract and len(abstract) > 50:
        score += 0.08
    if year and year >= 2022:
        score += 0.15
    elif year and year >= 2018:
        score += 0.10
    elif year and year >= 2015:
        score += 0.05
    if citation_count and citation_count >= 50:
        score += 0.20
    elif citation_count and citation_count >= 20:
        score += 0.15
    elif citation_count and citation_count >= 5:
        score += 0.10
    elif citation_count and citation_count >= 1:
        score += 0.05
    if is_indonesia:
        score += 0.15
    evidence_bonus = {"I": 0.15, "II": 0.12, "III": 0.08, "IV": 0.05}
    score += evidence_bonus.get(evidence_level, 0.03)
    return round(min(score, 1.0), 3)


def reconstruct_abstract(inverted_index: Optional[Dict[str, List[int]]]) -> str:
    """Rekonstruksi abstract dari inverted index OpenAlex."""
    if not inverted_index:
        return ""
    try:
        max_idx = 0
        for positions in inverted_index.values():
            if positions:
                m = max(positions)
                if m > max_idx:
                    max_idx = m
        words = [""] * (max_idx + 1)
        for word, positions in inverted_index.items():
            for pos in positions:
                if pos < len(words):
                    words[pos] = word
        return " ".join(w for w in words if w)
    except Exception:
        return ""


def fetch_json_with_retry(url: str, headers: dict, max_retries: int = 3) -> Optional[dict]:
    """Fetch with exponential backoff."""
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url)
            for k, v in headers.items():
                req.add_header(k, v)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = (2 ** attempt) * 2
                print(f"  ⏳ Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            elif e.code in (500, 502, 503):
                wait = 2 ** attempt
                print(f"  ⚠️ Server error {e.code}. Retry {attempt+1}/{max_retries}...")
                time.sleep(wait)
            else:
                print(f"  ❌ HTTP {e.code} for {url[:100]}")
                return None
        except Exception as e:
            wait = 2 ** attempt
            print(f"  ⚠️ Error: {e}. Retry {attempt+1}/{max_retries} in {wait}s...")
            time.sleep(wait)
    return None


# ─── DATABASE INITIALIZATION ──────────────────────────────────────────────────

def init_db():
    """Drop old tables and create new schema."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("Dropping old tables...")
    cur.execute("DROP TABLE IF EXISTS extracted_misconceptions")
    cur.execute("DROP TABLE IF EXISTS contextual_links")
    cur.execute("DROP TABLE IF EXISTS articles")
    cur.execute("DROP TABLE IF EXISTS harvest_status")

    print("Creating new schema...")
    cur.execute("""
    CREATE TABLE articles (
        id TEXT PRIMARY KEY,
        doi TEXT UNIQUE,
        title TEXT NOT NULL,
        authors TEXT,
        journal TEXT,
        year INTEGER,
        abstract TEXT,
        citation_count INTEGER DEFAULT 0,
        url TEXT,
        scopus_id TEXT,
        evidence_level TEXT,
        quality_score REAL,
        physics_domain TEXT,
        source TEXT DEFAULT 'openalex',
        is_indonesia_context INTEGER DEFAULT 0,
        language TEXT,
        open_access_url TEXT,
        concepts TEXT,
        keywords TEXT,
        is_verified INTEGER DEFAULT 1,
        harvested_at TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE harvest_status (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

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

    cur.execute("""
    CREATE TABLE contextual_links (
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

    # Create indexes for faster querying
    cur.execute("CREATE INDEX IF NOT EXISTS idx_articles_domain ON articles(physics_domain)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_articles_doi ON articles(doi)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_articles_year ON articles(year)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_cl_misc_id ON contextual_links(misconception_id)")

    conn.commit()
    conn.close()
    print("✅ Database schema initialized.")


def get_cursor_state(conn: sqlite3.Connection, query_id: str) -> Tuple[Optional[str], int]:
    """Get the saved cursor and count for a query. Returns (cursor, count)."""
    cur = conn.cursor()
    cur.execute("SELECT value FROM harvest_status WHERE key = ?", (f"cursor_{query_id}",))
    row = cur.fetchone()
    cursor_val = row[0] if row else None

    cur.execute("SELECT value FROM harvest_status WHERE key = ?", (f"count_{query_id}",))
    row = cur.fetchone()
    count_val = int(row[0]) if row else 0

    return cursor_val, count_val


def save_cursor_state(conn: sqlite3.Connection, query_id: str, cursor_val: str, count: int):
    """Save cursor state for resumability."""
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO harvest_status (key, value) VALUES (?, ?)",
                (f"cursor_{query_id}", cursor_val))
    cur.execute("INSERT OR REPLACE INTO harvest_status (key, value) VALUES (?, ?)",
                (f"count_{query_id}", str(count)))
    conn.commit()


def mark_query_done(conn: sqlite3.Connection, query_id: str):
    """Mark a query as completed."""
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO harvest_status (key, value) VALUES (?, ?)",
                (f"done_{query_id}", "1"))
    conn.commit()


def is_query_done(conn: sqlite3.Connection, query_id: str) -> bool:
    """Check if a query has been completed."""
    cur = conn.cursor()
    cur.execute("SELECT value FROM harvest_status WHERE key = ?", (f"done_{query_id}",))
    row = cur.fetchone()
    return row is not None and row[0] == "1"


def get_total_articles(conn: sqlite3.Connection) -> int:
    """Get total unique articles in the database."""
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM articles")
    return cur.fetchone()[0]


def process_work(work: dict) -> Optional[dict]:
    """
    Parse a single OpenAlex work into a database record.
    Returns None if the work is unusable (no title).
    """
    work_id = work.get("id")
    if not work_id:
        return None

    title = work.get("title")
    if not title:
        return None

    # DOI
    doi = work.get("doi")
    if doi and doi.startswith("https://doi.org/"):
        doi = doi.replace("https://doi.org/", "")

    # Authors
    authorships = work.get("authorships") or []
    authors_list = []
    for authorship in authorships:
        if authorship:
            author = authorship.get("author") or {}
            author_name = author.get("display_name")
            if author_name:
                authors_list.append(author_name)
    authors_json = json.dumps(authors_list)

    # Journal/Venue
    primary_location = work.get("primary_location") or {}
    source_info = primary_location.get("source") or {}
    journal = source_info.get("display_name", "") or ""
    year = work.get("publication_year")

    # Abstract
    inverted_index = work.get("abstract_inverted_index")
    abstract = reconstruct_abstract(inverted_index)

    # Citation count
    citation_count = work.get("cited_by_count", 0) or 0

    # URL
    url = primary_location.get("landing_page_url", "") or ""

    # Open access URL
    oa = work.get("open_access") or {}
    open_access_url = oa.get("oa_url", "") or ""

    # Concepts from OpenAlex
    concepts_raw = work.get("concepts") or []
    concepts_list = []
    for c in concepts_raw[:10]:  # Top 10 concepts
        if c.get("display_name"):
            concepts_list.append({
                "name": c["display_name"],
                "score": c.get("score", 0)
            })
    concepts_json = json.dumps(concepts_list)

    # Keywords from OpenAlex
    keywords_raw = work.get("keywords") or []
    keywords_list = [kw.get("keyword") or kw.get("display_name", "") for kw in keywords_raw if kw]
    keywords_json = json.dumps(keywords_list)

    # Derived fields
    domain, _confidence = determine_domain_v2(title, abstract)
    evidence_level = determine_evidence_level(title, abstract)
    is_indonesia = detect_indonesia_context(title, abstract, journal)
    language = detect_language(title, abstract)
    quality_score = compute_quality_score_v2(
        doi, abstract, year or 0, citation_count, is_indonesia, evidence_level
    )

    return {
        "id": work_id,
        "doi": doi,
        "title": title,
        "authors": authors_json,
        "journal": journal,
        "year": year,
        "abstract": abstract,
        "citation_count": citation_count,
        "url": url,
        "scopus_id": None,
        "evidence_level": evidence_level,
        "quality_score": quality_score,
        "physics_domain": domain,
        "source": "openalex",
        "is_indonesia_context": 1 if is_indonesia else 0,
        "language": language,
        "open_access_url": open_access_url,
        "concepts": concepts_json,
        "keywords": keywords_json,
        "is_verified": 1,
        "harvested_at": datetime.now(timezone.utc).isoformat(),
    }


def insert_article(cur: sqlite3.Cursor, record: dict) -> bool:
    """Insert a single article record. Returns True if inserted (not duplicate)."""
    try:
        cur.execute("""
        INSERT OR IGNORE INTO articles
        (id, doi, title, authors, journal, year, abstract, citation_count, url,
         scopus_id, evidence_level, quality_score, physics_domain, source,
         is_indonesia_context, language, open_access_url, concepts, keywords,
         is_verified, harvested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record["id"], record["doi"], record["title"], record["authors"],
            record["journal"], record["year"], record["abstract"],
            record["citation_count"], record["url"], record["scopus_id"],
            record["evidence_level"], record["quality_score"],
            record["physics_domain"], record["source"],
            record["is_indonesia_context"], record["language"],
            record["open_access_url"], record["concepts"], record["keywords"],
            record["is_verified"], record["harvested_at"]
        ))
        return cur.rowcount > 0
    except sqlite3.IntegrityError:
        return False
    except Exception as e:
        print(f"  DB Error for {record['id']}: {e}", file=sys.stderr)
        return False


# ─── MAIN HARVEST LOOP ────────────────────────────────────────────────────────

def run_harvest():
    """
    Harvest 100k articles from OpenAlex.
    Resumable: saves cursor state to DB after every batch.
    Idempotent: INSERT OR IGNORE — safe to re-run.
    """
    print("=" * 70)
    print("  CONCEPTRA — 100K PRODUCTION HARVESTER")
    print(f"  Target: {TARGET_TOTAL:,} unique articles")
    print(f"  Database: {DB_PATH}")
    print(f"  Queries: {len(HARVEST_QUERIES)}")
    print("=" * 70)

    # Check if this is a fresh run or a resume
    if not os.path.exists(DB_PATH):
        print("\n🆕 Fresh start — initializing database...")
        init_db()
    else:
        # Check if schema has the new columns
        conn_check = sqlite3.connect(DB_PATH)
        cur_check = conn_check.cursor()
        cur_check.execute("PRAGMA table_info(articles)")
        columns = [row[1] for row in cur_check.fetchall()]
        conn_check.close()

        if "is_indonesia_context" not in columns:
            print("\n🔄 Schema upgrade required — reinitializing database...")
            init_db()
        else:
            print("\n♻️  Resuming from existing database...")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")  # Better concurrent access
    db_cur = conn.cursor()

    total_in_db = get_total_articles(conn)
    print(f"\n📊 Current articles in database: {total_in_db:,}")

    if total_in_db >= TARGET_TOTAL:
        print(f"✅ Target already reached! ({total_in_db:,} ≥ {TARGET_TOTAL:,})")
        conn.close()
        return

    headers = {
        "User-Agent": f"ConceptraHarvester/3.0 (mailto:{OPENALEX_EMAIL})"
    }

    global_start_time = time.time()
    queries_completed = 0
    queries_skipped = 0

    # Auto-resume failed queries: delete done_* keys where the count is 0
    db_cur.execute("SELECT key FROM harvest_status WHERE key LIKE 'done_%'")
    done_keys = [row[0] for row in db_cur.fetchall()]
    for d_key in done_keys:
        q_id = d_key.replace("done_", "")
        db_cur.execute("SELECT value FROM harvest_status WHERE key = ?", (f"count_{q_id}",))
        cnt_row = db_cur.fetchone()
        if cnt_row is None or int(cnt_row[0]) == 0:
            print(f"♻️  Resetting query {q_id} because count is missing or 0 (probably rate-limited).")
            db_cur.execute("DELETE FROM harvest_status WHERE key = ?", (d_key,))
            db_cur.execute("DELETE FROM harvest_status WHERE key = ?", (f"cursor_{q_id}",))
    conn.commit()

    for qi, query in enumerate(HARVEST_QUERIES, 1):
        query_id = query["id"]
        search_term = query["search"]
        year_range = query["year_range"]
        query_target = query["target"]
        note = query["note"]

        # Check global target
        total_in_db = get_total_articles(conn)
        if total_in_db >= TARGET_TOTAL:
            print(f"\n🎯 Global target reached! ({total_in_db:,} ≥ {TARGET_TOTAL:,})")
            break

        # Check if this query is already done
        if is_query_done(conn, query_id):
            queries_skipped += 1
            print(f"\n⏭️  [{qi}/{len(HARVEST_QUERIES)}] {query_id} — already done, skipping")
            continue

        print(f"\n{'─' * 60}")
        print(f"📥 [{qi}/{len(HARVEST_QUERIES)}] {query_id}")
        print(f"   Search: \"{search_term}\"")
        print(f"   Years: {year_range} | Target: {query_target:,}")
        print(f"   Note: {note}")
        print(f"{'─' * 60}")

        # Resume cursor if available
        saved_cursor, saved_count = get_cursor_state(conn, query_id)
        if saved_cursor:
            cursor_str = saved_cursor
            query_saved = saved_count
            print(f"   ♻️  Resuming from cursor (already saved: {query_saved:,})")
        else:
            cursor_str = "*"
            query_saved = 0

        # Build base URL
        encoded_search = urllib.parse.quote(search_term)
        base_url = (
            f"https://api.openalex.org/works?"
            f"filter=title_and_abstract.search:{encoded_search},"
            f"publication_year:{year_range}"
            f"&per-page={BATCH_SIZE}"
            f"&mailto={OPENALEX_EMAIL}"
        )
        if OPENALEX_KEY:
            base_url += f"&api_key={OPENALEX_KEY}"

        consecutive_empty = 0
        batch_num = 0

        while query_saved < query_target:
            batch_num += 1
            url = f"{base_url}&cursor={urllib.parse.quote(cursor_str)}"

            data = fetch_json_with_retry(url, headers)
            if not data:
                consecutive_empty += 1
                if consecutive_empty >= 3:
                    print(f"   ❌ 3 consecutive failures. Moving to next query.")
                    break
                continue

            consecutive_empty = 0
            results = data.get("results") or []
            meta = data.get("meta") or {}
            total_available = meta.get("count", 0)

            if not results:
                print(f"   📭 No more results. Total available was: {total_available:,}")
                break

            next_cursor = meta.get("next_cursor")
            if not next_cursor or next_cursor == cursor_str:
                print(f"   📭 Reached end of pagination.")
                break
            cursor_str = next_cursor

            # Process batch
            batch_inserted = 0
            for work in results:
                record = process_work(work)
                if record and insert_article(db_cur, record):
                    batch_inserted += 1
                    query_saved += 1

            conn.commit()
            save_cursor_state(conn, query_id, cursor_str, query_saved)

            total_in_db = get_total_articles(conn)
            elapsed = time.time() - global_start_time
            rate = total_in_db / max(elapsed, 1) * 3600  # articles per hour

            print(
                f"   Batch {batch_num}: +{batch_inserted} new | "
                f"Query: {query_saved:,}/{query_target:,} | "
                f"Global: {total_in_db:,}/{TARGET_TOTAL:,} | "
                f"Rate: {rate:,.0f}/hr"
            )

            # Check global target
            if total_in_db >= TARGET_TOTAL:
                break

            # Rate limit
            time.sleep(RATE_LIMIT_SLEEP)

        mark_query_done(conn, query_id)
        queries_completed += 1
        print(f"   ✅ Query {query_id} done: {query_saved:,} articles saved")

    # ─── FINAL REPORT ──────────────────────────────────────────────────────────
    total_in_db = get_total_articles(conn)
    elapsed = time.time() - global_start_time

    db_cur.execute("SELECT COUNT(*) FROM articles WHERE doi IS NOT NULL AND doi != ''")
    with_doi = db_cur.fetchone()[0]

    db_cur.execute("SELECT COUNT(*) FROM articles WHERE abstract IS NOT NULL AND LENGTH(abstract) > 100")
    with_abstract = db_cur.fetchone()[0]

    db_cur.execute("SELECT COUNT(*) FROM articles WHERE is_indonesia_context = 1")
    indonesia_count = db_cur.fetchone()[0]

    db_cur.execute("SELECT physics_domain, COUNT(*) FROM articles GROUP BY physics_domain ORDER BY COUNT(*) DESC")
    domain_dist = db_cur.fetchall()

    conn.close()

    print("\n" + "=" * 70)
    print("  HARVEST COMPLETE")
    print("=" * 70)
    print(f"  Total articles:      {total_in_db:,}")
    print(f"  With DOI:            {with_doi:,} ({with_doi*100//max(total_in_db,1)}%)")
    print(f"  With abstract:       {with_abstract:,} ({with_abstract*100//max(total_in_db,1)}%)")
    print(f"  Indonesia context:   {indonesia_count:,} ({indonesia_count*100//max(total_in_db,1)}%)")
    print(f"  Queries completed:   {queries_completed}")
    print(f"  Queries skipped:     {queries_skipped}")
    print(f"  Total time:          {elapsed/3600:.1f} hours")
    print(f"\n  Domain distribution:")
    for domain, count in domain_dist:
        print(f"    {domain:<20s} {count:>6,}")
    print("=" * 70)


if __name__ == "__main__":
    run_harvest()
