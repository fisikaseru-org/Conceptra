"""
Conceptra — Knowledge Graph Ontology
Implementasi ontologi Pilar 3 dokumen riset.
TBox (Terminological Box) + ABox (Assertional Box) + Relationships
"""
from dataclasses import dataclass, field
from typing import List, Dict, Set, Tuple, Optional, Any
from enum import Enum
import networkx as nx
import json

# ─── TBOX: Entity Types ────────────────────────────────────────────────────────
class EntityType(str, Enum):
    CONCEPT = "Concept"
    MISCONCEPTION = "Misconception"
    CAUSE = "Cause"
    LEARNING_MODEL = "Learning_Model"
    LEARNING_MEDIA = "Learning_Media"
    ASSESSMENT = "Assessment"
    RESEARCH_METHOD = "Research_Method"
    EDUCATIONAL_LEVEL = "Educational_Level"
    COUNTRY = "Country"
    PHYSICS_DOMAIN = "Physics_Domain"
    LEARNING_OUTCOME = "Learning_Outcome"
    KEYWORD = "Keyword"

# ─── TBOX: Relationship Types ──────────────────────────────────────────────────
class RelationType(str, Enum):
    PART_OF = "PART_OF"
    PREREQUISITE_OF = "PREREQUISITE_OF"
    DISTORTS = "DISTORTS"
    CAUSED_BY = "CAUSED_BY"
    APPEARS_IN = "APPEARS_IN"
    MEASURES = "MEASURES"
    TREATED_BY = "TREATED_BY"
    REDUCES = "REDUCES"
    DELIVERS = "DELIVERS"
    EVALUATES = "EVALUATES"
    CONTRADICTS = "CONTRADICTS"
    IMPROVES = "IMPROVES"

@dataclass
class Node:
    id: str
    label: str
    type: EntityType
    properties: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type.value,
            "properties": self.properties
        }

@dataclass
class Edge:
    source: str
    target: str
    relation: RelationType
    weight: float = 1.0
    confidence: float = 0.95
    
    def to_dict(self):
        return {
            "source": self.source,
            "target": self.target,
            "relation": self.relation.value,
            "weight": self.weight,
            "confidence": self.confidence
        }


class PhysicsMisconceptionOntology:
    """
    Ontologi miskonsepsi fisika berdasarkan dokumen riset Pilar 3.
    Mengimplementasikan TBox (definisi) dan ABox (instance assertions).
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self._nodes: Dict[str, Node] = {}
        self._edges: List[Edge] = []
        self._build_ontology()
    
    def _add_node(self, node: Node):
        self._nodes[node.id] = node
        self.graph.add_node(node.id, **node.to_dict())
    
    def _add_edge(self, edge: Edge):
        self._edges.append(edge)
        self.graph.add_edge(
            edge.source, edge.target,
            relation=edge.relation.value,
            weight=edge.weight,
            confidence=edge.confidence
        )
    
    def _build_ontology(self):
        """Membangun ABox: semua instance entitas dan relasi."""
        self._build_physics_domains()
        self._build_concepts()
        self._build_misconceptions()
        self._build_causes()
        self._build_learning_models()
        self._build_assessments()
        self._build_relationships()
    
    def _build_physics_domains(self):
        domains = [
            ("DOM-MEC", "Mekanika", {"sub_domains": ["Kinematika", "Dinamika", "Energi", "Rotasi"]}),
            ("DOM-FLU", "Fluida", {"sub_domains": ["Statika Fluida", "Dinamika Fluida"]}),
            ("DOM-GEL", "Gelombang", {"sub_domains": ["Gelombang Mekanik", "Superposisi"]}),
            ("DOM-OPT", "Optik", {"sub_domains": ["Geometri Optik", "Optik Fisis"]}),
            ("DOM-ELE", "Listrik", {"sub_domains": ["Listrik Statis", "Listrik Dinamis"]}),
            ("DOM-MAG", "Magnet", {"sub_domains": ["Medan Magnet", "Gaya Magnetik"]}),
            ("DOM-EM", "Elektromagnetik", {"sub_domains": ["Induksi Faraday", "Gelombang EM"]}),
            ("DOM-TERM", "Termodinamika", {"sub_domains": ["Kalor", "Termodinamika Statistik"]}),
            ("DOM-MOD", "Fisika Modern", {"sub_domains": ["Kuantum", "Relativitas", "Nuklir"]}),
            ("DOM-AST", "Astronomi", {"sub_domains": ["Tata Surya", "Kosmologi"]}),
        ]
        for nid, label, props in domains:
            self._add_node(Node(nid, label, EntityType.PHYSICS_DOMAIN, props))
    
    def _build_concepts(self):
        concepts = [
            ("CON-EK", "Energi Kinetik", "DOM-MEC", {}),
            ("CON-GAY", "Gaya", "DOM-MEC", {"vector": True}),
            ("CON-CEP", "Percepatan", "DOM-MEC", {"vector": True}),
            ("CON-KEL", "Kecepatan", "DOM-MEC", {"vector": True}),
            ("CON-MOM", "Momentum", "DOM-MEC", {"vector": True}),
            ("CON-IMP", "Impuls", "DOM-MEC", {}),
            ("CON-TOR", "Torsi", "DOM-MEC", {"vector": True}),
            ("CON-GRA", "Gravitasi", "DOM-MEC", {}),
            ("CON-APU", "Gaya Apung", "DOM-FLU", {}),
            ("CON-TES", "Tekanan", "DOM-FLU", {"scalar": True}),
            ("CON-GEL", "Gelombang Mekanik", "DOM-GEL", {}),
            ("CON-BUN", "Bunyi", "DOM-GEL", {}),
            ("CON-CAH", "Cahaya", "DOM-OPT", {}),
            ("CON-ARU", "Arus Listrik", "DOM-ELE", {}),
            ("CON-POT", "Beda Potensial", "DOM-ELE", {}),
            ("CON-MAG", "Medan Magnet", "DOM-MAG", {}),
            ("CON-FAR", "Induksi Faraday", "DOM-EM", {}),
            ("CON-KAL", "Kalor", "DOM-TERM", {}),
            ("CON-SUH", "Suhu", "DOM-TERM", {"intensive": True}),
            ("CON-FOT", "Foton", "DOM-MOD", {}),
            ("CON-ORB", "Orbital Elektron", "DOM-MOD", {}),
            ("CON-DW", "Dilatasi Waktu", "DOM-MOD", {}),
            ("CON-RAD", "Radioaktivitas", "DOM-MOD", {}),
            ("CON-MUS", "Musim", "DOM-AST", {}),
        ]
        for nid, label, domain_id, props in concepts:
            self._add_node(Node(nid, label, EntityType.CONCEPT, props))
            self._add_edge(Edge(nid, domain_id, RelationType.PART_OF))
    
    def _build_misconceptions(self):
        misconceptions = [
            ("MIS-001", "Impetus Theory (Energi = Gaya)", "MEC-001", {"frequency": 87, "severity": "high"}),
            ("MIS-002", "Posisi = Kecepatan Lebih Besar", "MEC-002", {"frequency": 72, "severity": "medium"}),
            ("MIS-003", "Gaya Diperlukan untuk Gerak Konstan", "MEC-003", {"frequency": 124, "severity": "high"}),
            ("MIS-004", "Momentum = Inersia", "MEC-004", {"frequency": 58, "severity": "medium"}),
            ("MIS-005", "Gaya Besar = Impuls Besar", "MEC-005", {"frequency": 41, "severity": "medium"}),
            ("MIS-006", "Kecepatan Sudut Tepi > Pusat", "MEC-006", {"frequency": 35, "severity": "low"}),
            ("MIS-007", "Zero-G = Tidak Ada Gravitasi", "MEC-007", {"frequency": 95, "severity": "high"}),
            ("MIS-008", "Massa Besar = Tenggelam", "FLU-001", {"frequency": 78, "severity": "high"}),
            ("MIS-009", "Volume = Tekanan Hidrostatis", "FLU-002", {"frequency": 34, "severity": "medium"}),
            ("MIS-010", "Gelombang Memindahkan Partikel", "GEL-001", {"frequency": 67, "severity": "high"}),
            ("MIS-011", "Suara Tidak Butuh Medium", "GEL-002", {"frequency": 52, "severity": "medium"}),
            ("MIS-012", "Mata Memancarkan Sinar (Emission Theory)", "OPT-001", {"frequency": 63, "severity": "high"}),
            ("MIS-013", "Arus Dikonsumsi Komponen", "ELE-001", {"frequency": 108, "severity": "high"}),
            ("MIS-014", "Muatan Netral = Tanpa Muatan", "ELE-002", {"frequency": 45, "severity": "medium"}),
            ("MIS-015", "Kutub Utara = Positif", "MAG-001", {"frequency": 55, "severity": "medium"}),
            ("MIS-016", "GGL = Keberadaan Medan, Bukan Perubahan", "EM-001", {"frequency": 49, "severity": "medium"}),
            ("MIS-017", "Kalor adalah Fluida (Caloric Theory)", "TERM-001", {"frequency": 96, "severity": "high"}),
            ("MIS-018", "Benda Berbeda Suhu dalam Ruangan Sama", "TERM-002", {"frequency": 71, "severity": "high"}),
            ("MIS-019", "Intensitas = Energi Foton", "MOD-001", {"frequency": 74, "severity": "high"}),
            ("MIS-020", "Orbit Melingkar Nyata Elektron (Bohr Literal)", "KUA-001", {"frequency": 42, "severity": "medium"}),
            ("MIS-021", "Dilatasi Waktu = Cacat Jam", "REL-001", {"frequency": 38, "severity": "medium"}),
            ("MIS-022", "Radiasi = Kontaminasi Radioaktif", "NUK-001", {"frequency": 47, "severity": "high"}),
            ("MIS-023", "Perihelion = Musim Panas Belahan Utara", "AST-001", {"frequency": 82, "severity": "high"}),
            ("MIS-024", "Resolusi Simulasi = Batas Fisika", "DIG-001", {"frequency": 29, "severity": "medium"}),
        ]
        for nid, label, corpus_id, props in misconceptions:
            self._add_node(Node(nid, label, EntityType.MISCONCEPTION, {**props, "corpus_id": corpus_id}))
    
    def _build_causes(self):
        causes = [
            ("CAU-INT", "Intuisi Sehari-hari", {"type": "epistemological"}),
            ("CAU-ANL", "Analogi Keliru", {"type": "cognitive"}),
            ("CAU-VIS", "Keterbatasan Visual/Persepsi", {"type": "cognitive"}),
            ("CAU-TER", "Terminologi Ambigu", {"type": "linguistic"}),
            ("CAU-MED", "Media & Fiksi Ilmiah", {"type": "sociocultural"}),
            ("CAU-KUR", "Kurikulum Tidak Tepat", {"type": "pedagogical"}),
            ("CAU-GUR", "Instruksi Guru Tidak Efektif", {"type": "pedagogical"}),
            ("CAU-DIG", "Ketergantungan Simulasi Digital (Post-COVID)", {"type": "technological"}),
            ("CAU-SPA", "Defisit Penalaran Spasial 3D", {"type": "cognitive"}),
            ("CAU-KAL", "Konfusi Besaran Intensif-Ekstensif", {"type": "conceptual"}),
        ]
        for nid, label, props in causes:
            self._add_node(Node(nid, label, EntityType.CAUSE, props))
    
    def _build_learning_models(self):
        models = [
            ("LM-PBL", "Problem-Based Learning", {"evidence_level": "strong"}),
            ("LM-INQ", "Inquiry-Based Learning", {"evidence_level": "strong"}),
            ("LM-CCA", "Cognitive Conflict & Argumentation", {"evidence_level": "strong"}),
            ("LM-POE", "Predict-Observe-Explain (POE)", {"evidence_level": "moderate"}),
            ("LM-STS", "Science-Technology-Society (STS)", {"evidence_level": "moderate"}),
            ("LM-DI", "Direct Instruction + Remediation", {"evidence_level": "moderate"}),
            ("LM-HYB", "Hybrid Learning (Post-COVID)", {"evidence_level": "emerging"}),
            ("LM-AIR", "AI-Assisted Research (RAG/LLM)", {"evidence_level": "emerging"}),
            ("LM-VR", "Virtual Reality Immersive Learning", {"evidence_level": "emerging"}),
            ("LM-ITS", "Intelligent Tutoring System", {"evidence_level": "emerging"}),
        ]
        for nid, label, props in models:
            self._add_node(Node(nid, label, EntityType.LEARNING_MODEL, props))
        
        media = [
            ("LMED-PHET", "PhET Interactive Simulations", {}),
            ("LMED-VR", "Virtual Reality (VR) Lab", {}),
            ("LMED-AR", "Augmented Reality (AR)", {}),
            ("LMED-IOT", "IoT Sensor & Real-time Data", {}),
            ("LMED-VID", "Video High-Speed Camera", {}),
            ("LMED-AI", "AI Chatbot (ChatGPT/Groq)", {}),
            ("LMED-GED", "Gedankenexperiment (Thought Experiment)", {}),
        ]
        for nid, label, props in media:
            self._add_node(Node(nid, label, EntityType.LEARNING_MEDIA, props))
    
    def _build_assessments(self):
        assessments = [
            ("ASS-FCI", "Force Concept Inventory (FCI)", {"type": "standardized", "tiers": 1}),
            ("ASS-4T", "Four-Tier Diagnostic Test", {"type": "diagnostic", "tiers": 4}),
            ("ASS-3T", "Three-Tier Test", {"type": "diagnostic", "tiers": 3}),
            ("ASS-CRI", "Certainty of Response Index (CRI)", {"type": "confidence-based"}),
            ("ASS-CM", "Concept Mapping Assessment", {"type": "formative"}),
            ("ASS-ES", "Essay & Portfolio Analysis", {"type": "qualitative"}),
            ("ASS-TCE", "Thermal Concept Evaluation (TCE)", {"type": "domain-specific"}),
        ]
        for nid, label, props in assessments:
            self._add_node(Node(nid, label, EntityType.ASSESSMENT, props))
    
    def _build_relationships(self):
        """Membangun ABox relationships — relasi semantik antar entitas."""
        # Misconception DISTORTS Concept
        distorts = [
            ("MIS-001", "CON-EK"), ("MIS-001", "CON-GAY"),
            ("MIS-002", "CON-CEP"), ("MIS-002", "CON-KEL"),
            ("MIS-003", "CON-GAY"), ("MIS-004", "CON-MOM"),
            ("MIS-005", "CON-IMP"), ("MIS-006", "CON-TOR"),
            ("MIS-007", "CON-GRA"), ("MIS-008", "CON-APU"),
            ("MIS-009", "CON-TES"), ("MIS-010", "CON-GEL"),
            ("MIS-011", "CON-BUN"), ("MIS-012", "CON-CAH"),
            ("MIS-013", "CON-ARU"), ("MIS-013", "CON-POT"),
            ("MIS-014", "CON-ARU"), ("MIS-015", "CON-MAG"),
            ("MIS-016", "CON-FAR"), ("MIS-017", "CON-KAL"),
            ("MIS-017", "CON-SUH"), ("MIS-018", "CON-KAL"),
            ("MIS-019", "CON-FOT"), ("MIS-020", "CON-ORB"),
            ("MIS-021", "CON-DW"), ("MIS-022", "CON-RAD"),
            ("MIS-023", "CON-MUS"), ("MIS-024", "CON-GAY"),
        ]
        for s, t in distorts:
            self._add_edge(Edge(s, t, RelationType.DISTORTS, weight=1.0))
        
        # Misconception CAUSED_BY Cause
        caused_by = [
            ("MIS-001", "CAU-INT", 0.9), ("MIS-001", "CAU-ANL", 0.7),
            ("MIS-002", "CAU-VIS", 0.8), ("MIS-003", "CAU-INT", 0.95),
            ("MIS-003", "CAU-ANL", 0.6), ("MIS-004", "CAU-TER", 0.8),
            ("MIS-005", "CAU-VIS", 0.75), ("MIS-007", "CAU-INT", 0.9),
            ("MIS-008", "CAU-KAL", 0.85), ("MIS-009", "CAU-VIS", 0.7),
            ("MIS-010", "CAU-VIS", 0.9), ("MIS-011", "CAU-ANL", 0.8),
            ("MIS-012", "CAU-INT", 0.9), ("MIS-013", "CAU-ANL", 0.85),
            ("MIS-015", "CAU-TER", 0.9), ("MIS-016", "CAU-KUR", 0.7),
            ("MIS-017", "CAU-INT", 0.95), ("MIS-018", "CAU-INT", 0.85),
            ("MIS-019", "CAU-ANL", 0.9), ("MIS-020", "CAU-VIS", 0.85),
            ("MIS-021", "CAU-INT", 0.9), ("MIS-022", "CAU-MED", 0.9),
            ("MIS-023", "CAU-SPA", 0.9), ("MIS-024", "CAU-DIG", 0.95),
        ]
        for s, t, w in caused_by:
            self._add_edge(Edge(s, t, RelationType.CAUSED_BY, weight=w))
        
        # Learning Model REDUCES Misconception
        reduces = [
            ("LM-CCA", "MIS-003"), ("LM-INQ", "MIS-008"),
            ("LM-PBL", "MIS-001"), ("LM-POE", "MIS-017"),
            ("LM-VR", "MIS-023"), ("LM-ITS", "MIS-003"),
            ("LM-HYB", "MIS-024"), ("LM-AIR", "MIS-001"),
        ]
        for s, t in reduces:
            self._add_edge(Edge(s, t, RelationType.REDUCES, weight=0.8))
        
        # Assessment MEASURES Misconception
        measures = [
            ("ASS-FCI", "MIS-003"), ("ASS-FCI", "MIS-007"),
            ("ASS-4T", "MIS-001"), ("ASS-4T", "MIS-008"), ("ASS-4T", "MIS-013"),
            ("ASS-4T", "MIS-017"), ("ASS-4T", "MIS-019"), ("ASS-4T", "MIS-023"),
            ("ASS-CRI", "MIS-002"), ("ASS-CRI", "MIS-010"), ("ASS-CRI", "MIS-013"),
            ("ASS-3T", "MIS-002"), ("ASS-3T", "MIS-005"),
            ("ASS-TCE", "MIS-017"), ("ASS-TCE", "MIS-018"),
        ]
        for s, t in measures:
            self._add_edge(Edge(s, t, RelationType.MEASURES, weight=0.9))
        
        # Learning Media DELIVERS Learning Model
        delivers = [
            ("LMED-PHET", "LM-INQ"), ("LMED-PHET", "LM-PBL"),
            ("LMED-VR", "LM-VR"), ("LMED-IOT", "LM-INQ"),
            ("LMED-AI", "LM-AIR"), ("LMED-AI", "LM-ITS"),
            ("LMED-VID", "LM-CCA"),
        ]
        for s, t in delivers:
            self._add_edge(Edge(s, t, RelationType.DELIVERS, weight=0.85))
        
        # Concept PREREQUISITE_OF Concept
        prereqs = [
            ("CON-KEL", "CON-CEP"),  # Kecepatan prasyarat Percepatan
            ("CON-GAY", "CON-MOM"),  # Gaya prasyarat Momentum
            ("CON-MOM", "CON-IMP"),  # Momentum prasyarat Impuls
            ("CON-GRA", "CON-ORB"),  # Gravitasi prasyarat Orbital
            ("CON-SUH", "CON-KAL"),  # Suhu prasyarat Kalor
        ]
        for s, t in prereqs:
            self._add_edge(Edge(s, t, RelationType.PREREQUISITE_OF, weight=0.9))
    
    def get_graph_data(self) -> Dict:
        """Export graph data untuk visualisasi frontend."""
        nodes = []
        for nid, data in self.graph.nodes(data=True):
            nodes.append({
                "id": nid,
                "label": data.get("label", nid),
                "type": data.get("type", "Unknown"),
                "properties": data.get("properties", {})
            })
        
        edges = []
        for s, t, data in self.graph.edges(data=True):
            edges.append({
                "source": s,
                "target": t,
                "relation": data.get("relation", "RELATED"),
                "weight": data.get("weight", 1.0),
                "confidence": data.get("confidence", 0.95)
            })
        
        return {"nodes": nodes, "edges": edges, "stats": {
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges(),
            "domain_count": len([n for n, d in self.graph.nodes(data=True) if d.get("type") == "Physics_Domain"]),
            "misconception_count": len([n for n, d in self.graph.nodes(data=True) if d.get("type") == "Misconception"]),
        }}
    
    def query_related_misconceptions(self, concept_id: str) -> List[str]:
        """Cari semua miskonsepsi yang mendistorsi sebuah konsep."""
        result = []
        for pred in self.graph.predecessors(concept_id):
            edge_data = self.graph[pred][concept_id]
            if edge_data.get("relation") == RelationType.DISTORTS.value:
                result.append(pred)
        return result
    
    def get_remediation_path(self, misconception_id: str) -> Dict:
        """Temukan path remediasi terbaik untuk sebuah miskonsepsi."""
        reducers = []
        for node in self.graph.nodes():
            if self.graph.has_edge(node, misconception_id):
                edge = self.graph[node][misconception_id]
                if edge.get("relation") == RelationType.REDUCES.value:
                    reducers.append({
                        "model": node,
                        "label": self.graph.nodes[node].get("label"),
                        "weight": edge.get("weight", 0)
                    })
        return sorted(reducers, key=lambda x: x["weight"], reverse=True)
    
    def find_misconception_clusters(self) -> Dict:
        """Klasterisasi miskonsepsi berdasarkan konektivitas graf."""
        undirected = self.graph.to_undirected()
        communities = {}
        for i, component in enumerate(nx.connected_components(undirected)):
            communities[f"cluster_{i}"] = list(component)
        return communities


# Singleton instance
_ontology_instance: Optional[PhysicsMisconceptionOntology] = None

def get_ontology() -> PhysicsMisconceptionOntology:
    global _ontology_instance
    if _ontology_instance is None:
        _ontology_instance = PhysicsMisconceptionOntology()
    return _ontology_instance
