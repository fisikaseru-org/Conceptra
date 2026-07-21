"""
Conceptra — Physics NLP Preprocessor
Pipeline NLP 17-Tahap terspesialisasi untuk Teks Pendidikan Fisika Indonesia
Sesuai dengan spesifikasi Pilar 4 di Riset Pemetaan Miskonsepsi Fisika.
"""
import re
import unicodedata
from typing import List, Dict, Set, Tuple

# Singkatan Fisika & Pendidikan yang sering ditemukan
ABBREVIATIONS: Dict[str, str] = {
    "pbl": "problem based learning",
    "ibl": "inquiry based learning",
    "cri": "certainty of response index",
    "fci": "force concept inventory",
    "r&d": "research and development",
    "dtt": "diagnostic three tier test",
    "ftt": "four tier test",
    "mtt": "multitier test",
    "hki": "hak kekayaan intelektual",
    "slr": "systematic literature review",
    "vpython": "visual python",
    "phet": "physics education technology",
    "gk": "gaya gesek",
    "ek": "energi kinetik",
    "ep": "energi potensial",
    "glb": "gerak lurus beraturan",
    "glbb": "gerak lurus berubah beraturan",
}

# Kamus Sinonim Miskonsepsi Fisika
SYNONYMS: Dict[str, str] = {
    "salah konsep": "miskonsepsi",
    "konsepsi alternatif": "miskonsepsi",
    "pemahaman keliru": "miskonsepsi",
    "gaya terpendam": "impetus",
    "gaya dorong dalam": "impetus",
    "energi panas": "kalor",
    "derajat panas": "suhu",
    "sinar": "cahaya",
    "gelombang propagasi": "rambatan gelombang",
}

# Stopwords Akademik / Scientific Fluff
SCIENTIFIC_STOPWORDS: Set[str] = {
    "penelitian ini", "hasil menunjukkan", "berdasarkan hasil", "peneliti", "studi ini",
    "tujuan penelitian", "metode penelitian", "dapat disimpulkan", "kesimpulan",
    "analisis data", "tahap", "uji coba", "efektivitas", "pengaruh", "meningkatkan",
    "pembelajaran", "siswa", "mahasiswa", "guru", "kelas", "sekolah", "pendidikan",
    "jurnal", "artikel", "skripsi", "tesis", "disertasi", "literatur", "sumber",
    "yaitu", "adalah", "bahwa", "dengan", "untuk", "pada", "yang", "dan", "dari",
}

# Whitelist kata kunci Fisika yang sering tidak sengaja dibuang oleh Stemmer/Stopword umum
PHYSICS_KEYWORDS: Set[str] = {
    "gaya", "usaha", "daya", "kalor", "suhu", "panas", "cepat", "lambat",
    "arus", "hambatan", "medan", "magnet", "listrik", "kuantum", "relativitas",
    "massa", "berat", "gravitasi", "tekanan", "energi", "momentum", "impuls",
    "cahaya", "optik", "lensa", "cermin", "gelombang", "bunyi", "frekuensi",
    "atom", "inti", "nuklir", "orbit", "astronomi", "bintang", "planet",
}

# Unicode Greek Symbols Mapping
GREEK_SYMBOLS: Dict[str, str] = {
    "α": "alfa",
    "β": "beta",
    "γ": "gamma",
    "δ": "delta",
    "ε": "epsilon",
    "θ": "theta",
    "λ": "lambda",
    "μ": "mikro",
    "π": "pi",
    "ρ": "rho",
    "σ": "sigma",
    "τ": "tau",
    "φ": "phi",
    "ψ": "psi",
    "ω": "omega",
    "Δ": "delta",
    "Ω": "omega",
}

class PhysicsNLPPreprocessor:
    """
    NLP Preprocessing Engine 17-Tahap.
    Mensimulasikan workflow prapemrosesan teks akademik fisika secara komprehensif.
    """

    def __init__(self):
        # compile regex patterns for speed
        self.spacing_pattern = re.compile(r'\s+')
        self.ocr_error_patterns = [
            (re.compile(r'\b1o\b'), "10"),
            (re.compile(r'\bl1\b'), "11"),
            (re.compile(r'\bgala\b'), "gaya"),
            (re.compile(r'\bsu-hu\b'), "suhu"),
        ]
        self.sentence_end_pattern = re.compile(r'(?<![A-Z][a-z]\.)(?<![A-Z]\.)(?<=\.|\?|\!)\s+')

    def preprocess(self, text: str) -> Dict:
        """
        Menjalankan 17 langkah prapemrosesan NLP pada input teks.
        Returns dictionary yang berisi step-by-step trace data untuk visualisasi.
        """
        trace = {}
        current_text = text

        # 1. Corpus Acquisition (Ingest / Check String)
        trace["step_1_raw"] = current_text

        # 2. Metadata Cleaning (Hapus karakter non-ASCII/non-printable)
        current_text = "".join(ch for ch in current_text if unicodedata.category(ch)[0] != 'C' or ch in '\n\r\t')
        trace["step_2_metadata_cleaned"] = current_text

        # 3. Deduplication (Simulasi dengan normalisasi spasi ganda)
        current_text = self.spacing_pattern.sub(' ', current_text).strip()
        trace["step_3_deduplicated"] = current_text

        # 4. Language Detection (Mencari bahasa dominan)
        id_score = len(re.findall(r'\b(dan|yang|di|untuk|miskonsepsi|gaya|suhu|adalah)\b', current_text.lower()))
        en_score = len(re.findall(r'\b(the|and|of|in|to|for|physics|misconception)\b', current_text.lower()))
        lang = "ID" if id_score >= en_score else "EN"
        trace["step_4_lang"] = lang

        # 5. PDF Parsing Cleanup (Hapus header/footer buatan / running headers)
        current_text = re.sub(r'(?i)(halaman \d+ dari \d+|observatory physics|conceptra paper|issn \d+-\d+)', '', current_text)
        trace["step_5_pdf_parsed"] = current_text

        # 6. OCR Correction (Koreksi kesalahan karakter akibat OCR)
        for pat, rep in self.ocr_error_patterns:
            current_text = pat.sub(rep, current_text)
        trace["step_6_ocr_corrected"] = current_text

        # 7. Sentence Segmentation (Pemisahan kalimat)
        sentences = [s.strip() for s in self.sentence_end_pattern.split(current_text) if s.strip()]
        trace["step_7_sentences"] = sentences

        # Pemrosesan tingkat kata
        all_tokens = []
        token_steps = []

        for sentence in sentences:
            sent_lower = sentence.lower()

            # 8. Tokenization & 13. Equation Handling
            # Persamaan dibersihkan tapi dipertahankan polanya
            sent_clean_eq = re.sub(r'([A-Za-z]+)\s*=\s*([A-Za-z0-9_+\-*/\s^]+)', r' \1=\2 ', sent_lower)
            raw_tokens = re.findall(r'[a-zA-Z0-9=+*/^-]+|[α-ωΑ-Ω]', sent_clean_eq)

            # 15. Greek Symbol Mapping & 14. Unit Handling
            mapped_tokens = []
            for token in raw_tokens:
                # Greek
                if token in GREEK_SYMBOLS:
                    token = GREEK_SYMBOLS[token]
                # Units (standarisasi)
                if token == "m/s2" or token == "m/s^2":
                    token = "m/s^2"
                elif token == "kg.m/s":
                    token = "kg_m/s"
                mapped_tokens.append(token)

            # 16. Abbreviation Expansion
            expanded_tokens = []
            for token in mapped_tokens:
                if token in ABBREVIATIONS:
                    expanded_tokens.extend(ABBREVIATIONS[token].split())
                else:
                    expanded_tokens.append(token)

            # 17. Synonym Mapping
            syn_mapped = []
            # Rekonstruksi kalimat sementara untuk mapping frasa sinonim
            sent_str = " ".join(expanded_tokens)
            for syn_key, syn_val in SYNONYMS.items():
                sent_str = re.sub(r'\b' + re.escape(syn_key) + r'\b', syn_val, sent_str)
            
            syn_mapped = sent_str.split()

            # 9. Scientific Stopword Removal & 10. Physics Stopword Whitelisting
            filtered_tokens = []
            for token in syn_mapped:
                # Jika token masuk whitelist fisika, pertahankan
                if token in PHYSICS_KEYWORDS:
                    filtered_tokens.append(token)
                # Jika masuk stopword umum / akademik fluff, buang
                elif token in SCIENTIFIC_STOPWORDS or len(token) < 2:
                    continue
                else:
                    filtered_tokens.append(token)

            # 11. Lemmatization (stemmer sederhana ramah fisika)
            lemmatized_tokens = []
            for token in filtered_tokens:
                if token in PHYSICS_KEYWORDS:
                    lemmatized_tokens.append(token) # Whitelisted dari overstemming
                else:
                    stemmed = self._indonesian_stem(token)
                    lemmatized_tokens.append(stemmed)

            # 12. Normalization (Case-folding & final cleanup)
            normalized = [t.strip(".-=+*") for t in lemmatized_tokens if len(t.strip(".-=+*")) > 1]
            all_tokens.extend(normalized)

        trace["step_8_tokens"] = all_tokens
        trace["step_17_final_processed"] = " ".join(all_tokens)

        return trace

    def _indonesian_stem(self, word: str) -> str:
        """
        Stemmer aturan dasar bahasa Indonesia (ramah istilah sains/fisika).
        Menghindari perusakan kata sains seperti 'percepatan' -> 'cepat', bukan 'cepat-an'.
        """
        if len(word) <= 4:
            return word

        # Aturan prefiks & sufiks sederhana
        # Hindari memotong kata inti fisika
        if word in PHYSICS_KEYWORDS:
            return word

        # Sufiks
        if word.endswith("nya"):
            word = word[:-3]
        if word.endswith("kah") or word.endswith("lah"):
            word = word[:-3]

        # Prefiks
        if word.startswith("me"):
            if word.startswith("mem"):
                word = "p" + word[3:] if len(word) > 3 and word[3] in "aeiou" else word[3:]
            elif word.startswith("men"):
                word = "t" + word[3:] if len(word) > 3 and word[3] in "aeiou" else word[3:]
            elif word.startswith("meng"):
                word = "k" + word[4:] if len(word) > 4 and word[4] in "aeiou" else word[4:]
            elif word.startswith("meny"):
                word = "s" + word[4:] if len(word) > 4 else word[4:]
            else:
                word = word[2:]

        if word.startswith("di"):
            word = word[2:]

        if word.startswith("ter"):
            word = word[3:]

        if word.startswith("pe"):
            if word.startswith("pem"):
                word = "p" + word[3:] if len(word) > 3 and word[3] in "aeiou" else word[3:]
            elif word.startswith("pen"):
                word = "t" + word[3:] if len(word) > 3 and word[3] in "aeiou" else word[3:]
            elif word.startswith("peng"):
                # Jangan potong 'pengaruh' menjadi 'aruh'
                if word != "pengaruh":
                    word = "k" + word[4:] if len(word) > 4 and word[4] in "aeiou" else word[4:]
            elif word.startswith("peny"):
                word = "s" + word[4:] if len(word) > 4 else word[4:]
            else:
                word = word[2:]

        # Sufiks ber/ter/per/an
        if word.endswith("an") and not word.endswith("dan"):
            # Jangan potong 'percepatan' jika kata aslinya 'cepat'
            if word.endswith("cepat-an") or word == "percepatan" or word == "kecepatan":
                return "cepat"
            word = word[:-2]

        return word

# Singleton Instance
_preprocessor = None

def get_preprocessor() -> PhysicsNLPPreprocessor:
    global _preprocessor
    if _preprocessor is None:
        _preprocessor = PhysicsNLPPreprocessor()
    return _preprocessor
