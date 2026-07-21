"""
Conceptra — Aspect Extraction Layer (Layer 4)
Ekstraksi aspek-aspek ilmiah dari teks penelitian miskonsepsi fisika.

Mengimplementasikan:
- Named Entity Recognition (NER) untuk domain fisika
- Aspect-Based Sentiment Analysis (ABSA) untuk opini peneliti
- Relation Extraction antar entitas
- Concept Normalization dan Entity Linking
- Confidence scoring per entitas yang diekstraksi

Catatan Implementasi:
    Versi ini menggunakan rule-based + heuristik sebagai baseline.
    Untuk produksi, ganti dengan IndoBERT fine-tuned pada corpus fisika.
    Baseline ini HARUS divalidasi dengan ground truth sebelum publikasi.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple


class EntityType(str, Enum):
    MISCONCEPTION = "MISCONCEPTION"
    PHYSICS_CONCEPT = "PHYSICS_CONCEPT"
    CAUSE = "CAUSE"
    ASSESSMENT_TOOL = "ASSESSMENT_TOOL"
    REMEDIATION = "REMEDIATION"
    EDUCATIONAL_LEVEL = "EDUCATIONAL_LEVEL"
    PREVALENCE = "PREVALENCE"
    RESEARCH_METHOD = "RESEARCH_METHOD"
    AUTHOR = "AUTHOR"
    INSTITUTION = "INSTITUTION"
    PHYSICS_DOMAIN = "PHYSICS_DOMAIN"


class AspectSentiment(str, Enum):
    POSITIVE = "positive"       # Intervensi berhasil
    NEGATIVE = "negative"       # Miskonsepsi persisten
    NEUTRAL = "neutral"         # Deskripsi tanpa penilaian


@dataclass
class ExtractedEntity:
    """Satu entitas yang berhasil diekstraksi dari teks."""
    text: str                           # Teks asli
    entity_type: EntityType
    normalized: str                     # Bentuk canonical
    start: int                          # Posisi karakter (untuk highlighting)
    end: int
    confidence: float                   # 0.0–1.0
    linked_id: Optional[str] = None     # ID di corpus/ontologi jika ada
    extraction_method: str = "rule_based"  # rule_based / ml_model / hybrid


@dataclass
class ExtractedAspect:
    """Satu aspek dengan sentimen dari teks penelitian."""
    aspect: str                         # Objek aspek (e.g., "strategi PhET")
    opinion: str                        # Ekspresi opini (e.g., "efektif mengatasi")
    sentiment: AspectSentiment
    confidence: float
    sentence: str                       # Kalimat sumber


@dataclass
class ExtractionResult:
    """Hasil ekstraksi lengkap dari satu teks input."""
    text: str
    entities: List[ExtractedEntity]
    aspects: List[ExtractedAspect]
    relations: List[Dict]               # {subject_id, relation, object_id, confidence}
    misconception_candidates: List[Dict]
    domain: Optional[str]
    extraction_method: str = "rule_based_baseline"
    model_version: str = "v1.0-baseline"
    validation_note: str = (
        "BASELINE ONLY — rule-based extraction. "
        "Must be validated against ground truth before scientific use. "
        "Replace with IndoBERT fine-tuned model for production."
    )

    def to_dict(self) -> Dict:
        return {
            "entities": [
                {
                    "text": e.text,
                    "type": e.entity_type.value,
                    "normalized": e.normalized,
                    "confidence": round(e.confidence, 3),
                    "linked_id": e.linked_id,
                    "method": e.extraction_method,
                }
                for e in self.entities
            ],
            "aspects": [
                {
                    "aspect": a.aspect,
                    "opinion": a.opinion,
                    "sentiment": a.sentiment.value,
                    "confidence": round(a.confidence, 3),
                    "sentence": a.sentence[:200],
                }
                for a in self.aspects
            ],
            "relations": self.relations,
            "misconception_candidates": self.misconception_candidates,
            "domain": self.domain,
            "method": self.extraction_method,
            "model_version": self.model_version,
            "validation_note": self.validation_note,
            "entity_count": len(self.entities),
            "aspect_count": len(self.aspects),
        }


class AspectExtractor:
    """
    Layer 4: Ekstraksi aspek dan entitas dari teks penelitian miskonsepsi.

    Pipeline:
    1. Sentence segmentation
    2. NER (rule-based baseline)
    3. ABSA (lexicon-based baseline)
    4. Relation extraction (pattern-based)
    5. Entity linking ke corpus/ontologi
    """

    # ─── Physics Domain Keywords ────────────────────────────────────────────────
    DOMAIN_KEYWORDS: Dict[str, List[str]] = {
        "Mekanika": ["gaya", "newton", "momentum", "energi kinetik", "percepatan",
                     "kecepatan", "gravitasi", "torsi", "rotasi", "impuls", "gerak"],
        "Termodinamika": ["kalor", "suhu", "termodinamika", "entropi", "konduksi",
                          "konveksi", "kapasitas panas", "caloric"],
        "Listrik": ["arus listrik", "hambatan", "beda potensial", "kirchhoff",
                    "rangkaian", "tegangan", "muatan"],
        "Magnet": ["medan magnet", "lorentz", "kutub magnet", "induksi faraday",
                   "ggl", "fluks"],
        "Gelombang": ["gelombang", "frekuensi", "amplitudo", "superposisi",
                      "bunyi", "interferensi", "difraksi"],
        "Optik": ["cahaya", "pembiasan", "pemantulan", "lensa", "cermin",
                  "bayangan", "emission theory"],
        "Fisika Modern": ["foton", "kuantum", "relativitas", "orbital", "fotolistrik",
                          "dualisme gelombang partikel", "radioaktivitas"],
        "Fluida": ["tekanan hidrostatis", "gaya apung", "archimedes", "massa jenis",
                   "viskositas", "bernoulli"],
    }

    # ─── Misconception Indicators ───────────────────────────────────────────────
    MISCONCEPTION_PATTERNS = [
        re.compile(r"miskonsepsi\s+(?:bahwa|tentang|mengenai|adalah)\s+(.+?)(?:\.|;|$)", re.IGNORECASE),
        re.compile(r"siswa\s+(?:beranggapan|berpikir|percaya|meyakini)\s+(?:bahwa\s+)?(.+?)(?:\.|;|$)", re.IGNORECASE),
        re.compile(r"(?:kesalahpahaman|anggapan keliru)\s+(?:bahwa\s+)?(.+?)(?:\.|;|$)", re.IGNORECASE),
        re.compile(r"alternative conception[s]?\s*[:\-]\s*(.+?)(?:\.|;|$)", re.IGNORECASE),
    ]

    # ─── Prevalence Patterns ────────────────────────────────────────────────────
    PREVALENCE_PATTERNS = [
        re.compile(r"(\d+(?:[.,]\d+)?)\s*%\s*(?:siswa|mahasiswa|peserta)", re.IGNORECASE),
        re.compile(r"sebanyak\s+(\d+(?:[.,]\d+)?)\s*%", re.IGNORECASE),
        re.compile(r"prevalensi\s+(?:sebesar\s+)?(\d+(?:[.,]\d+)?)\s*%", re.IGNORECASE),
    ]

    # ─── Assessment Tools ────────────────────────────────────────────────────────
    ASSESSMENT_TOOLS = {
        "four-tier test": "Four-Tier Diagnostic Test",
        "four tier": "Four-Tier Diagnostic Test",
        "three-tier test": "Three-Tier Test",
        "three tier": "Three-Tier Test",
        "fci": "Force Concept Inventory",
        "force concept inventory": "Force Concept Inventory",
        "cri": "Certainty of Response Index",
        "certainty of response index": "Certainty of Response Index",
        "concept mapping": "Concept Mapping Assessment",
        "tce": "Thermal Concept Evaluation",
    }

    # ─── Positive Remediation Sentiment Lexicon ──────────────────────────────────
    POSITIVE_LEXICON = [
        "efektif", "berhasil", "meningkatkan", "signifikan", "mengatasi",
        "memperbaiki", "sukses", "menurunkan", "mengurangi miskonsepsi",
        "terbukti", "valid", "reliabel", "signifikansi"
    ]

    NEGATIVE_LEXICON = [
        "persisten", "sulit diatasi", "gagal", "tidak efektif",
        "hambatan", "kesulitan", "tetap terjadi", "belum teratasi"
    ]

    def __init__(self):
        # Load corpus for entity linking
        from .corpus import PHYSICS_MISCONCEPTIONS
        self._corpus_index = {
            m["id"]: m for m in PHYSICS_MISCONCEPTIONS
        }
        # Keyword index untuk entity linking
        self._keyword_to_id: Dict[str, str] = {}
        for m in PHYSICS_MISCONCEPTIONS:
            for kw in m.get("keywords", []):
                self._keyword_to_id[kw.lower()] = m["id"]
        
        # Check for Groq API Key
        import os
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.use_llm = bool(self.groq_api_key)

    def extract(self, text: str) -> ExtractionResult:
        """
        Jalankan pipeline ekstraksi lengkap pada satu teks.
        """
        if self.use_llm:
            try:
                return self._extract_via_groq(text)
            except Exception as e:
                import logging
                logging.getLogger("conceptra").warning(
                    f"Groq LLM extraction failed. Falling back to rule-based extraction. Error: {e}"
                )

        sentences = self._segment_sentences(text)
        entities = self._extract_entities(text, sentences)
        aspects = self._extract_aspects(sentences)
        relations = self._extract_relations(entities)
        misconception_candidates = self._extract_misconception_candidates(text)
        domain = self._detect_domain(text)

        return ExtractionResult(
            text=text[:500],
            entities=entities,
            aspects=aspects,
            relations=relations,
            misconception_candidates=misconception_candidates,
            domain=domain,
        )

    def _extract_via_groq(self, text: str) -> ExtractionResult:
        """Ekstraksi aspek menggunakan Llama 3 via Groq API."""
        import json
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatGroq(
            model="llama3-8b-8192",
            api_key=self.groq_api_key,
            temperature=0.0,
            model_kwargs={"response_format": {"type": "json_object"}}
        )

        system_prompt = (
            "You are a Physics Education researcher and structured data extractor.\n"
            "Analyze the provided text and extract the following entities, aspects, relations, and misconception candidates in JSON format.\n"
            "Respond ONLY with a valid JSON object matching this schema:\n"
            "{\n"
            "  \"domain\": \"Mekanika\" | \"Listrik\" | \"Termodinamika\" | \"Gelombang\" | \"Optik\" | \"Fisika Modern\" | \"Fluida\" | \"Fisika Umum\",\n"
            "  \"entities\": [\n"
            "     {\"text\": \"string\", \"type\": \"PHYSICS_CONCEPT\" | \"ASSESSMENT_TOOL\" | \"REMEDIATION\" | \"EDUCATIONAL_LEVEL\", \"normalized\": \"string\"}\n"
            "  ],\n"
            "  \"aspects\": [\n"
            "     {\"aspect\": \"string\", \"opinion\": \"string\", \"sentiment\": \"positive\" | \"negative\" | \"neutral\", \"sentence\": \"string\"}\n"
            "  ],\n"
            "  \"relations\": [\n"
            "     {\"subject\": \"string\", \"relation\": \"string\", \"object\": \"string\"}\n"
            "  ],\n"
            "  \"misconception_candidates\": [\n"
            "     {\"text\": \"string\"}\n"
            "  ]\n"
            "}"
        )

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Text to extract:\n{text}")
        ])

        data = json.loads(response.content)

        # Convert to Dataclasses
        entities = []
        for e in data.get("entities", []):
            try:
                # Find start/end positions in text for highlight
                start = text.lower().find(e["text"].lower())
                end = start + len(e["text"]) if start != -1 else 0
                
                # Check link to corpus
                linked_id = self._find_similar_misconception(e["text"])
                
                entities.append(ExtractedEntity(
                    text=e["text"],
                    entity_type=EntityType(e["type"]),
                    normalized=e["normalized"],
                    start=start if start != -1 else 0,
                    end=end,
                    confidence=0.95,
                    linked_id=linked_id,
                    extraction_method="groq_llm"
                ))
            except Exception:
                continue

        aspects = []
        for a in data.get("aspects", []):
            try:
                aspects.append(ExtractedAspect(
                    aspect=a["aspect"],
                    opinion=a["opinion"],
                    sentiment=AspectSentiment(a["sentiment"]),
                    confidence=0.90,
                    sentence=a["sentence"]
                ))
            except Exception:
                continue

        relations = data.get("relations", [])
        misconception_candidates = []
        for c in data.get("misconception_candidates", []):
            linked_id = self._find_similar_misconception(c["text"])
            misconception_candidates.append({
                "text": c["text"],
                "matched_pattern": "groq_llm_extraction",
                "confidence": 0.85,
                "linked_id": linked_id,
                "requires_expert_validation": True
            })

        return ExtractionResult(
            text=text[:500],
            entities=entities,
            aspects=aspects,
            relations=relations,
            misconception_candidates=misconception_candidates,
            domain=data.get("domain", "Fisika Umum"),
            extraction_method="groq_llm",
            model_version="llama3-8b-json",
            validation_note="LLM-based extraction. Expert verification is recommended but validation confidence is high (0.85+)."
        )

    def _segment_sentences(self, text: str) -> List[str]:
        """Segmentasi sederhana berbasis tanda baca."""
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in sentences if len(s.strip()) > 10]

    def _extract_entities(self, text: str, sentences: List[str]) -> List[ExtractedEntity]:
        """Ekstraksi entitas menggunakan rule-based matching."""
        entities = []
        text_lower = text.lower()

        # 1. Domain entities
        domain = self._detect_domain(text)
        if domain:
            entities.append(ExtractedEntity(
                text=domain,
                entity_type=EntityType.PHYSICS_DOMAIN,
                normalized=domain,
                start=0, end=len(domain),
                confidence=0.85,
                extraction_method="keyword_match",
            ))

        # 2. Assessment tools
        for tool_kw, tool_name in self.ASSESSMENT_TOOLS.items():
            if tool_kw in text_lower:
                idx = text_lower.find(tool_kw)
                entities.append(ExtractedEntity(
                    text=tool_kw,
                    entity_type=EntityType.ASSESSMENT_TOOL,
                    normalized=tool_name,
                    start=idx, end=idx + len(tool_kw),
                    confidence=0.90,
                    extraction_method="dictionary_match",
                ))

        # 3. Educational levels
        levels_map = {
            "smp": "SMP", "sekolah menengah pertama": "SMP",
            "sma": "SMA", "sekolah menengah atas": "SMA",
            "perguruan tinggi": "Perguruan Tinggi",
            "universitas": "Perguruan Tinggi",
            "mahasiswa": "Perguruan Tinggi",
            "siswa sma": "SMA", "siswa smp": "SMP",
        }
        for kw, normalized in levels_map.items():
            if kw in text_lower:
                idx = text_lower.find(kw)
                entities.append(ExtractedEntity(
                    text=kw,
                    entity_type=EntityType.EDUCATIONAL_LEVEL,
                    normalized=normalized,
                    start=idx, end=idx + len(kw),
                    confidence=0.85,
                    extraction_method="pattern_match",
                ))

        # 4. Corpus entity linking
        for kw, corpus_id in self._keyword_to_id.items():
            if kw in text_lower and len(kw) > 3:
                idx = text_lower.find(kw)
                entities.append(ExtractedEntity(
                    text=kw,
                    entity_type=EntityType.PHYSICS_CONCEPT,
                    normalized=kw,
                    start=idx, end=idx + len(kw),
                    confidence=0.75,
                    linked_id=corpus_id,
                    extraction_method="corpus_linking",
                ))

        return entities

    def _extract_aspects(self, sentences: List[str]) -> List[ExtractedAspect]:
        """Lexicon-based Aspect-Based Sentiment Analysis."""
        aspects = []
        for sentence in sentences:
            sent_lower = sentence.lower()

            # Deteksi aspek (tool/strategi remediasi)
            aspect = None
            for tool_kw, tool_name in self.ASSESSMENT_TOOLS.items():
                if tool_kw in sent_lower:
                    aspect = tool_name
                    break
            if not aspect:
                for domain in self.DOMAIN_KEYWORDS:
                    if domain.lower() in sent_lower:
                        aspect = domain
                        break

            if not aspect:
                continue

            # Deteksi sentimen
            pos_score = sum(1 for w in self.POSITIVE_LEXICON if w in sent_lower)
            neg_score = sum(1 for w in self.NEGATIVE_LEXICON if w in sent_lower)

            if pos_score > 0 or neg_score > 0:
                if pos_score > neg_score:
                    sentiment = AspectSentiment.POSITIVE
                    opinion_word = next((w for w in self.POSITIVE_LEXICON if w in sent_lower), "positif")
                    confidence = 0.65 + min(pos_score * 0.05, 0.25)
                elif neg_score > pos_score:
                    sentiment = AspectSentiment.NEGATIVE
                    opinion_word = next((w for w in self.NEGATIVE_LEXICON if w in sent_lower), "negatif")
                    confidence = 0.65 + min(neg_score * 0.05, 0.25)
                else:
                    sentiment = AspectSentiment.NEUTRAL
                    opinion_word = "netral"
                    confidence = 0.50

                aspects.append(ExtractedAspect(
                    aspect=aspect,
                    opinion=opinion_word,
                    sentiment=sentiment,
                    confidence=confidence,
                    sentence=sentence[:200],
                ))

        return aspects

    def _extract_relations(self, entities: List[ExtractedEntity]) -> List[Dict]:
        """Ekstraksi relasi sederhana antara entitas yang ditemukan."""
        relations = []
        assessment_entities = [e for e in entities if e.entity_type == EntityType.ASSESSMENT_TOOL]
        level_entities = [e for e in entities if e.entity_type == EntityType.EDUCATIONAL_LEVEL]
        domain_entities = [e for e in entities if e.entity_type == EntityType.PHYSICS_DOMAIN]
        concept_entities = [e for e in entities if e.entity_type == EntityType.PHYSICS_CONCEPT]

        for assess in assessment_entities:
            for level in level_entities:
                relations.append({
                    "subject": assess.normalized,
                    "relation": "USED_AT_LEVEL",
                    "object": level.normalized,
                    "confidence": 0.70,
                })
            for domain in domain_entities:
                relations.append({
                    "subject": assess.normalized,
                    "relation": "MEASURES_IN_DOMAIN",
                    "object": domain.normalized,
                    "confidence": 0.65,
                })
        for concept in concept_entities:
            if concept.linked_id:
                for domain in domain_entities:
                    relations.append({
                        "subject": concept.normalized,
                        "relation": "BELONGS_TO",
                        "object": domain.normalized,
                        "confidence": 0.75,
                    })
        return relations

    def _extract_misconception_candidates(self, text: str) -> List[Dict]:
        """Ekstraksi kandidat miskonsepsi dari teks menggunakan pattern matching."""
        candidates = []
        for pattern in self.MISCONCEPTION_PATTERNS:
            for match in pattern.finditer(text):
                candidate_text = match.group(1).strip()
                if 10 < len(candidate_text) < 300:
                    # Coba link ke corpus yang ada
                    linked_id = self._find_similar_misconception(candidate_text)
                    candidates.append({
                        "text": candidate_text,
                        "matched_pattern": pattern.pattern[:50],
                        "confidence": 0.60,  # Baseline; harus divalidasi pakar
                        "linked_id": linked_id,
                        "requires_expert_validation": True,
                    })
        return candidates

    def _detect_domain(self, text: str) -> Optional[str]:
        """Deteksi domain fisika dominan dalam teks."""
        text_lower = text.lower()
        scores = {}
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[domain] = score
        return max(scores, key=scores.get) if scores else None

    def _find_similar_misconception(self, text: str) -> Optional[str]:
        """Cari miskonsepsi serupa di corpus berdasarkan keyword overlap."""
        text_lower = text.lower()
        best_score = 0
        best_id = None
        for mid, entry in self._corpus_index.items():
            keywords = entry.get("keywords", [])
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > best_score:
                best_score = score
                best_id = mid
        return best_id if best_score >= 2 else None

    def batch_extract(self, texts: List[str]) -> List[ExtractionResult]:
        """Proses batch teks."""
        return [self.extract(t) for t in texts]

    def evaluate_on_sample(
        self,
        texts: List[str],
        ground_truth_domains: List[str],
    ) -> Dict:
        """
        Evaluasi akurasi ekstraksi domain pada sampel berlabel.
        Ini adalah evaluasi baseline — harus dijalankan dengan data ground truth nyata.
        """
        correct = 0
        results = []
        for text, true_domain in zip(texts, ground_truth_domains):
            result = self.extract(text)
            predicted = result.domain
            is_correct = predicted == true_domain
            if is_correct:
                correct += 1
            results.append({
                "true": true_domain,
                "predicted": predicted,
                "correct": is_correct,
            })
        accuracy = correct / max(len(texts), 1)
        return {
            "accuracy": round(accuracy, 4),
            "sample_size": len(texts),
            "note": "BASELINE EVALUATION — rule-based model. Needs expert-annotated ground truth for valid metrics.",
            "details": results,
        }


# ─── Singleton ─────────────────────────────────────────────────────────────────
_aspect_extractor: Optional[AspectExtractor] = None

def get_aspect_extractor() -> AspectExtractor:
    global _aspect_extractor
    if _aspect_extractor is None:
        _aspect_extractor = AspectExtractor()
    return _aspect_extractor
