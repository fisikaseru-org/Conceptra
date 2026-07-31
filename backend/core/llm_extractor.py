"""
Conceptra — Groq LLM & Hybrid NLP Misconception Extractor
Mendukung ekstraksi otomatis miskonsepsi fisika menggunakan Groq Cloud LLM (Llama-3.3-70B)
dengan fallback otomatis ke Rule Engine jika API key tidak tersedia.
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional
try:
    from core.aspect_extractor import get_aspect_extractor
except ImportError:
    from .aspect_extractor import get_aspect_extractor

logger = logging.getLogger("conceptra")

# Sistem Prompt Terstruktur untuk Ekstraksi Miskonsepsi Fisika
EXTRACTION_SYSTEM_PROMPT = """
Anda adalah pakar Pendidikan Fisika dan Peneliti Analisis Miskonsepsi Siswa di Indonesia.
Tugas Anda adalah menganalisis teks abstrak atau literatur riset pendidikan fisika dan mengekstrak entitas miskonsepsi secara ilmiah.

Kembalikan luaran HANYA dalam format JSON terstruktur dengan skema berikut:
{
  "misconceptions": [
    {
      "domain": "Mekanika / Termodinamika / Listrik Magnet / Gelombang & Optik / Fisika Modern",
      "concept": "Nama konsep fisika terkait (misal: Gaya Gesek, Suhu dan Kalor, Rangkaian Listrik)",
      "prerequisite": "Konsep prasyarat yang mendasari (misal: Hukum I Newton, Energi Kinetik)",
      "misconception": "Pernyataan miskonsepsi atau pemahaman siswa yang keliru",
      "root_cause": "Akar masalah atau penyebab miskonsepsi (misal: Intuisi sehari-hari, representasi verbal)",
      "example_answer": "Contoh jawaban atau penjelasan salah dari siswa",
      "learning_impact": "Dampak terhadap pemahaman materi selanjutnya",
      "remediation": "Metode remedi atau strategi pembelajaran yang direkomendasikan",
      "educational_level": ["SMP", "SMA", "Perguruan Tinggi"],
      "assessment_tools": ["Four-Tier Diagnostic Test", "CRI", "Wawancara", "Multiple Choice"],
      "confidence_score": 0.95
    }
  ],
  "extracted_aspects": {
    "concepts": ["Gaya", "Massa"],
    "tools": ["Four-Tier"],
    "methods": ["Remediasi Inquiry"]
  }
}
"""


class GroqMisconceptionExtractor:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = None
        if self.api_key:
            try:
                import groq
                self.client = groq.Groq(api_key=self.api_key)
                logger.info("Groq API Client berhasil diinisialisasi (Llama-3.3-70B).")
            except Exception as e:
                logger.warning(f"Gagal menginisialisasi Groq client: {e}. Menggunakan fallback Rule Engine.")
        else:
            logger.info("GROQ_API_KEY tidak ditemukan. Ekstraksi menggunakan fallback Rule Engine.")

    def extract(self, text: str, model_mode: str = "llm_groq") -> Dict[str, Any]:
        """
        Ekstraksi miskonsepsi dari teks menggunakan Groq LLM jika tersedia,
        atau fallback ke Rule Engine (Regex/Aspect Extractor).
        """
        if model_mode == "llm_groq" and self.client:
            try:
                response = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": f"Ekstrak miskonsepsi fisika dari teks berikut:\n\n{text}"}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=1500
                )
                raw_json = response.choices[0].message.content
                parsed = json.loads(raw_json)
                parsed["extractor_used"] = "Groq Cloud LLM (Llama-3.3-70B)"
                parsed["status"] = "success"
                return parsed
            except Exception as e:
                logger.error(f"Error saat memanggil Groq API: {e}. Beralih ke fallback Rule Engine.")

        # Fallback Rule Engine (Mode: 'rule' atau saat Groq offline/key missing)
        extractor = get_aspect_extractor()
        aspect_res = extractor.extract(text)
        
        cand_text = aspect_res.misconception_candidates[0]["text"] if aspect_res.misconception_candidates else f"Pernyataan teridentifikasi: '{text[:120]}...'"
        concept_text = aspect_res.entities[0].text if aspect_res.entities else "Konsep Fisika"

        simulated_misconception = {
            "id": "EXT-RULE-001",
            "domain": aspect_res.domain or "Mekanika",
            "concept": concept_text,
            "prerequisite": "Hukum Fisika Dasar",
            "misconception": cand_text,
            "root_cause": "Pemahaman intuitif pra-konsepsi siswa",
            "example_answer": "Siswa menganggap benda bergerak selalu memerlukan gaya dorong konstan",
            "learning_impact": "Menghambat pemahaman Hukum Newton",
            "remediation": "Model Pembelajaran Remidiasi Konflik Kognitif",
            "educational_level": ["SMA"],
            "assessment_tools": ["Diagnostic Test"],
            "confidence_score": 0.85
        }

        return {
            "status": "success",
            "extractor_used": "RegEx & Syntactic Rule Engine (Fallback)",
            "misconceptions": [simulated_misconception],
            "extracted_aspects": aspect_res.to_dict()
        }


# Singleton Extractor
_extractor_instance = None

def get_groq_extractor() -> GroqMisconceptionExtractor:
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = GroqMisconceptionExtractor()
    return _extractor_instance
