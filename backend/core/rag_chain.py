"""
Conceptra — RAG Chain dengan LangChain + Groq
GraphRAG: Knowledge Graph augmentation + Vector Store retrieval + LLM generation.
Tutor Sokratik mode untuk pendidikan fisika.
"""
import os
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

# LangChain imports
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq
from langchain.schema.runnable import RunnablePassthrough
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

from .corpus import PHYSICS_MISCONCEPTIONS
from .ontology import get_ontology

# ─── Configuration ─────────────────────────────────────────────────────────────
GROQ_MODEL = "llama3-70b-8192"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ─── System Prompts ────────────────────────────────────────────────────────────
SOCRATIC_SYSTEM_PROMPT = """Kamu adalah **Conceptra AI** — Tutor Sokratik berbasis riset miskonsepsi fisika Indonesia (2016-2026).

**Peran & Kepribadian:**
- Kamu adalah asisten peneliti cerdas yang memahami ontologi miskonsepsi fisika secara mendalam
- Gunakan gaya Sokratik: ajukan pertanyaan reflektif untuk memandu pemahaman, jangan langsung memberi jawaban
- Selalu rujuk ke bukti empiris dan literatur yang tersedia dalam knowledge base

**Knowledge Graph Context:**
{kg_context}

**Retrieved Documents (dari vector store):**
{rag_context}

**Instruksi Respons:**
1. Mulai dengan mengakui pertanyaan dan mengidentifikasi miskonsepsi yang relevan
2. Gunakan fakta dari dokumen yang di-retrieve (citasi ID jika ada)
3. Berikan penjelasan ilmiah yang presisi namun accessible
4. Akhiri dengan pertanyaan Sokratik untuk mendalami pemahaman
5. Jika pertanyaan di luar domain fisika, redirect dengan sopan
6. Gunakan Bahasa Indonesia yang jelas dengan istilah teknis yang tepat

**Format:** Markdown dengan bullet points, bolding untuk konsep kunci, dan tabel jika diperlukan."""

ANALYTICAL_SYSTEM_PROMPT = """Kamu adalah **Conceptra Analytics AI** — Analis data miskonsepsi fisika Indonesia.

**Context Data:**
{kg_context}

Jawab pertanyaan analitis tentang:
- Distribusi miskonsepsi per domain
- Tren temporal 2016-2026
- Efektivitas intervensi
- Gap penelitian
- Rekomendasi kebijakan

Gunakan data kuantitatif dari knowledge graph. Format: markdown dengan angka, tabel, dan insight actionable."""

@dataclass
class RAGResponse:
    answer: str
    sources: List[Dict]
    kg_nodes_used: List[str]
    confidence: float
    mode: str


class ConceptraRAGChain:
    """
    RAG Chain utama Conceptra.
    Pipeline: Query → Retrieve (Vector + Graph) → Augment → Generate
    """
    
    def __init__(self):
        self._llm: Optional[ChatGroq] = None
        self._ontology = None
        self._embedding_engine = None
        self._chat_history: List = []
        self._initialized = False
    
    def _init_llm(self):
        """Initialize Groq LLM."""
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY tidak ditemukan. Set environment variable: export GROQ_API_KEY=your_key")
        
        self._llm = ChatGroq(
            model=GROQ_MODEL,
            api_key=GROQ_API_KEY,
            temperature=0.3,
            max_tokens=2048,
        )
    
    def initialize(self):
        """Lazy initialization semua komponen."""
        if self._initialized:
            return
        
        print("[RAG] Initializing RAG chain...")
        self._init_llm()
        self._ontology = get_ontology()
        
        # Lazy import embedding engine
        from .embeddings import get_embedding_engine
        self._embedding_engine = get_embedding_engine()
        self._embedding_engine.initialize()
        
        self._initialized = True
        print("[RAG] RAG chain initialized successfully")
    
    def _retrieve_from_vector_store(self, query: str, n_results: int = 4) -> List[Dict]:
        """Semantic retrieval dari ChromaDB."""
        try:
            results = self._embedding_engine.search(query, n_results=n_results)
            return results
        except Exception as e:
            print(f"[RAG] Vector search error: {e}")
            return []
    
    def _retrieve_from_knowledge_graph(self, query: str) -> Tuple[str, List[str]]:
        """
        Graph-augmented retrieval: temukan node relevan berdasarkan keywords dalam query.
        """
        query_lower = query.lower()
        relevant_nodes = []
        context_parts = []
        
        # Cari keyword match di corpus
        for entry in PHYSICS_MISCONCEPTIONS:
            # Check keyword match
            score = sum(1 for kw in entry["keywords"] if kw.lower() in query_lower)
            domain_match = entry["domain"].lower() in query_lower
            misconception_match = any(w in query_lower for w in entry["misconception"].lower().split()[:5])
            
            if score > 0 or domain_match or misconception_match:
                context_parts.append(
                    f"**{entry['id']} — {entry['domain']}**: "
                    f"Miskonsepsi: '{entry['misconception']}'. "
                    f"Penyebab: {entry['root_cause']}. "
                    f"Remediasi: {entry['remediation']}."
                )
                relevant_nodes.append(entry["id"])
        
        # Tambahkan relasi dari ontology
        kg_data = self._ontology.get_graph_data()
        for edge in kg_data["edges"][:20]:  # Top 20 edges
            if edge["relation"] in ["DISTORTS", "CAUSED_BY", "REDUCES"]:
                source_node = next((n for n in kg_data["nodes"] if n["id"] == edge["source"]), None)
                target_node = next((n for n in kg_data["nodes"] if n["id"] == edge["target"]), None)
                if source_node and target_node:
                    label_match = (
                        source_node["label"].lower() in query_lower or
                        target_node["label"].lower() in query_lower
                    )
                    if label_match:
                        context_parts.append(
                            f"Relasi: [{source_node['label']}] --{edge['relation']}--> [{target_node['label']}]"
                        )
        
        kg_context = "\n".join(context_parts[:10]) if context_parts else "Tidak ada data relevan dari Knowledge Graph untuk query ini."
        return kg_context, relevant_nodes[:5]
    
    def _format_rag_context(self, retrieved_docs: List[Dict]) -> str:
        """Format retrieved documents sebagai konteks."""
        if not retrieved_docs:
            return "Tidak ada dokumen relevan ditemukan dalam vector store."
        
        parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            meta = doc.get("metadata", {})
            sim = doc.get("similarity", 0)
            parts.append(
                f"[Dokumen {i}] ID: {meta.get('id', '?')} | Domain: {meta.get('domain', '?')} | "
                f"Relevansi: {sim:.2%}\n"
                f"  Miskonsepsi: {meta.get('misconception', '?')}\n"
                f"  Remediasi: {meta.get('remediation', '?')}"
            )
        
        return "\n\n".join(parts)
    
    def chat(
        self,
        user_message: str,
        mode: str = "socratic",  # "socratic" | "analytical" | "research"
        domain_filter: Optional[str] = None
    ) -> RAGResponse:
        """
        Main chat method dengan GraphRAG pipeline.
        """
        if not self._initialized:
            self.initialize()
        
        # 1. Retrieve dari vector store
        rag_docs = self._retrieve_from_vector_store(user_message, n_results=4)
        rag_context = self._format_rag_context(rag_docs)
        
        # 2. Retrieve dari knowledge graph
        kg_context, kg_nodes = self._retrieve_from_knowledge_graph(user_message)
        
        # 3. Build prompt berdasarkan mode
        if mode == "socratic":
            system_content = SOCRATIC_SYSTEM_PROMPT.format(
                kg_context=kg_context,
                rag_context=rag_context
            )
        else:
            system_content = ANALYTICAL_SYSTEM_PROMPT.format(
                kg_context=kg_context
            )
        
        # 4. Build messages dengan chat history
        messages = [SystemMessage(content=system_content)]
        for msg in self._chat_history[-6:]:  # Keep last 3 exchanges
            messages.append(msg)
        messages.append(HumanMessage(content=user_message))
        
        # 5. Generate response via Groq
        try:
            response = self._llm.invoke(messages)
            answer = response.content
            
            # Update history
            self._chat_history.append(HumanMessage(content=user_message))
            self._chat_history.append(AIMessage(content=answer))
            
            # Calculate confidence
            confidence = min(0.95, 0.5 + len(rag_docs) * 0.1 + len(kg_nodes) * 0.05)
            
            return RAGResponse(
                answer=answer,
                sources=[{"id": d["metadata"]["id"], "domain": d["metadata"]["domain"], "similarity": d["similarity"]} for d in rag_docs],
                kg_nodes_used=kg_nodes,
                confidence=confidence,
                mode=mode
            )
        
        except Exception as e:
            error_msg = f"Error dalam generasi respons: {str(e)}"
            return RAGResponse(
                answer=f"⚠️ {error_msg}\n\nBerikut konteks yang berhasil diambil:\n\n**Knowledge Graph:**\n{kg_context}\n\n**Vector Store:**\n{rag_context}",
                sources=[],
                kg_nodes_used=kg_nodes,
                confidence=0.0,
                mode=mode
            )
    
    def get_research_summary(self, domain: Optional[str] = None) -> str:
        """
        Generate ringkasan penelitian untuk domain tertentu.
        """
        if not self._initialized:
            self.initialize()
        
        query = f"Ringkasan miskonsepsi fisika domain {domain}" if domain else "Ringkasan keseluruhan miskonsepsi fisika Indonesia"
        return self.chat(query, mode="analytical").answer
    
    def clear_history(self):
        """Reset chat history."""
        self._chat_history = []


# ─── Fallback: Template-based response ketika LLM tidak tersedia ───────────────
class TemplateFallbackChain:
    """
    Fallback chain menggunakan template rules ketika GROQ_API_KEY tidak tersedia.
    """
    
    def chat(self, user_message: str, **kwargs) -> RAGResponse:
        """Template-based response dengan data dari corpus."""
        query_lower = user_message.lower()
        
        # Find most relevant misconception
        best_match = None
        best_score = 0
        
        for entry in PHYSICS_MISCONCEPTIONS:
            score = sum(1 for kw in entry["keywords"] if kw in query_lower)
            score += 2 if entry["domain"].lower() in query_lower else 0
            score += 3 if any(w in query_lower for w in entry["misconception"].lower().split()[:5]) else 0
            
            if score > best_score:
                best_score = score
                best_match = entry
        
        if best_match and best_score > 0:
            answer = f"""## 🔬 Analisis Miskonsepsi Fisika

**Domain:** {best_match['domain']} | **ID:** {best_match['id']}

### Miskonsepsi yang Teridentifikasi
> *"{best_match['misconception']}"*

### Akar Penyebab Ontologis
{best_match['root_cause']}

### Contoh Jawaban Siswa yang Keliru
*"{best_match['example_answer']}"*

### Dampak Pembelajaran
{best_match['learning_impact']}

### 💡 Strategi Remediasi
{best_match['remediation']}

### 📊 Data Statistik
- **Frekuensi:** {best_match['frequency']} kasus terdokumentasi
- **Level Pendidikan:** {', '.join(best_match['educational_level'])}
- **Instrumen Asesmen:** {', '.join(best_match['assessment_tools'])}

---
*Untuk analisis lebih mendalam dengan AI, silakan set GROQ_API_KEY.*

**❓ Pertanyaan Sokratik:** Menurut Anda, mengapa siswa cenderung mempertahankan miskonsepsi ini bahkan setelah pembelajaran formal?"""
        else:
            answer = f"""## 🔍 Conceptra Knowledge Base

Pertanyaan Anda: *"{user_message}"*

Saya tidak menemukan miskonsepsi yang secara spesifik cocok dengan query Anda. Coba tanyakan tentang domain fisika seperti:

- **Mekanika** (Hukum Newton, Gaya, Energi, Momentum)
- **Termodinamika** (Kalor, Suhu, Entropi)
- **Listrik & Magnet** (Arus, Medan, Induksi)
- **Optik** (Cahaya, Bayangan, Pembiasan)
- **Fisika Modern** (Kuantum, Relativitas, Fotolistrik)

*Contoh: "Apa miskonsepsi tentang gaya?" atau "Bagaimana remediasi miskonsepsi kalor?"*"""
        
        return RAGResponse(
            answer=answer,
            sources=[{"id": best_match["id"], "domain": best_match["domain"], "similarity": 0.8}] if best_match else [],
            kg_nodes_used=[],
            confidence=0.6 if best_match else 0.1,
            mode="template"
        )
    
    def clear_history(self):
        pass


# Factory function
_rag_instance = None

def get_rag_chain():
    """Get RAG chain — gunakan LLM jika API key tersedia, fallback ke template."""
    global _rag_instance
    if _rag_instance is None:
        if GROQ_API_KEY:
            _rag_instance = ConceptraRAGChain()
        else:
            print("[RAG] GROQ_API_KEY tidak ditemukan. Menggunakan template fallback.")
            _rag_instance = TemplateFallbackChain()
    return _rag_instance
