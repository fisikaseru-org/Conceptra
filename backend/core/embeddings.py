"""
Conceptra — Embeddings & Vector Store
Sentence-Transformers + ChromaDB + FAISS untuk RAG system.
"""
import os
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

from .corpus import PHYSICS_MISCONCEPTIONS

# ─── Configuration ─────────────────────────────────────────────────────────────
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
PERSIST_DIR = Path(__file__).parent.parent / "data" / "vectorstore"
COLLECTION_NAME = "physics_misconceptions"

class EmbeddingEngine:
    """
    Engine embedding untuk miskonsepsi fisika.
    Menggunakan multilingual model untuk support Bahasa Indonesia + Inggris.
    """
    
    def __init__(self):
        self._model: Optional[SentenceTransformer] = None
        self._chroma_client: Optional[chromadb.Client] = None
        self._collection = None
        self._initialized = False
    
    def _load_model(self):
        """Lazy-load model untuk menghemat memory."""
        if self._model is None:
            print(f"[Embeddings] Loading model: {MODEL_NAME}")
            self._model = SentenceTransformer(MODEL_NAME)
            print(f"[Embeddings] Model loaded successfully")
    
    def _init_chromadb(self):
        """Initialize ChromaDB persistent client."""
        PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        self._chroma_client = chromadb.PersistentClient(
            path=str(PERSIST_DIR),
            settings=Settings(anonymized_telemetry=False)
        )
    
    def _build_document_texts(self) -> List[Tuple[str, str, Dict]]:
        """
        Konversi corpus miskonsepsi menjadi dokumen untuk indexing.
        Returns: list of (doc_id, text, metadata)
        """
        documents = []
        for entry in PHYSICS_MISCONCEPTIONS:
            # Gabungkan semua field relevan menjadi satu teks kaya
            full_text = (
                f"Domain: {entry['domain']}. "
                f"Konsep: {entry['concept']}. "
                f"Miskonsepsi: {entry['misconception']}. "
                f"Penyebab: {entry['root_cause']}. "
                f"Contoh jawaban siswa: {entry['example_answer']}. "
                f"Dampak pembelajaran: {entry['learning_impact']}. "
                f"Remediasi: {entry['remediation']}. "
                f"Kata kunci: {', '.join(entry['keywords'])}."
            )
            
            metadata = {
                "id": entry["id"],
                "domain": entry["domain"],
                "concept": entry["concept"],
                "misconception": entry["misconception"],
                "remediation": entry["remediation"],
                "frequency": entry["frequency"],
                "levels": ", ".join(entry["educational_level"]),
                "years": json.dumps(entry["years_active"]),
                "keywords": ", ".join(entry["keywords"]),
            }
            
            documents.append((entry["id"], full_text, metadata))
        
        return documents
    
    def initialize(self, force_rebuild: bool = False):
        """
        Build atau load vector store dari cache.
        """
        if self._initialized and not force_rebuild:
            return
        
        print("[Embeddings] Initializing vector store...")
        self._load_model()
        self._init_chromadb()
        
        # Check apakah collection sudah ada
        existing = [c.name for c in self._chroma_client.list_collections()]
        
        if COLLECTION_NAME in existing and not force_rebuild:
            self._collection = self._chroma_client.get_collection(COLLECTION_NAME)
            print(f"[Embeddings] Loaded existing collection: {self._collection.count()} documents")
        else:
            if COLLECTION_NAME in existing:
                self._chroma_client.delete_collection(COLLECTION_NAME)
            
            self._collection = self._chroma_client.create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            
            # Build dan index semua dokumen
            documents = self._build_document_texts()
            texts = [d[1] for d in documents]
            ids = [d[0] for d in documents]
            metadatas = [d[2] for d in documents]
            
            print(f"[Embeddings] Encoding {len(texts)} documents...")
            embeddings = self._model.encode(texts, show_progress_bar=True).tolist()
            
            self._collection.add(
                documents=texts,
                embeddings=embeddings,
                ids=ids,
                metadatas=metadatas
            )
            print(f"[Embeddings] Indexed {len(texts)} documents successfully")
        
        self._initialized = True
    
    def search(self, query: str, n_results: int = 5, domain_filter: Optional[str] = None) -> List[Dict]:
        """
        Semantic search dalam vector store.
        """
        if not self._initialized:
            self.initialize()
        
        self._load_model()
        query_embedding = self._model.encode([query]).tolist()
        
        where_clause = None
        if domain_filter:
            where_clause = {"domain": {"$eq": domain_filter}}
        
        results = self._collection.query(
            query_embeddings=query_embedding,
            n_results=min(n_results, self._collection.count()),
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )
        
        output = []
        for i in range(len(results["ids"][0])):
            output.append({
                "id": results["ids"][0][i],
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "similarity": 1 - results["distances"][0][i],  # cosine similarity
            })
        
        return output
    
    def get_all_embeddings_for_topic_model(self) -> Tuple[List[str], np.ndarray]:
        """
        Export semua teks dan embedding untuk BERTopic.
        """
        if not self._initialized:
            self.initialize()
        
        documents = self._build_document_texts()
        texts = [d[1] for d in documents]
        
        self._load_model()
        embeddings = self._model.encode(texts, show_progress_bar=False)
        
        return texts, embeddings


# Singleton
_engine_instance: Optional[EmbeddingEngine] = None

def get_embedding_engine() -> EmbeddingEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = EmbeddingEngine()
    return _engine_instance
