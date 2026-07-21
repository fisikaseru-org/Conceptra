"""Conceptra — Knowledge Graph API Router"""
from fastapi import APIRouter, Query
from typing import Optional
from core.ontology import get_ontology

router = APIRouter()

@router.get("/")
async def get_full_graph():
    """Ambil seluruh knowledge graph (nodes + edges)."""
    ontology = get_ontology()
    return ontology.get_graph_data()

@router.get("/stats")
async def get_graph_stats():
    """Statistik knowledge graph."""
    ontology = get_ontology()
    data = ontology.get_graph_data()
    
    # Count by type
    type_counts = {}
    for node in data["nodes"]:
        t = node["type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    
    relation_counts = {}
    for edge in data["edges"]:
        r = edge["relation"]
        relation_counts[r] = relation_counts.get(r, 0) + 1
    
    return {
        "total_nodes": data["stats"]["total_nodes"],
        "total_edges": data["stats"]["total_edges"],
        "nodes_by_type": type_counts,
        "edges_by_relation": relation_counts,
        "misconception_count": data["stats"]["misconception_count"],
        "domain_count": data["stats"]["domain_count"]
    }

@router.get("/misconceptions/{concept_id}")
async def get_misconceptions_for_concept(concept_id: str):
    """Ambil semua miskonsepsi yang mendistorsi sebuah konsep."""
    ontology = get_ontology()
    related = ontology.query_related_misconceptions(concept_id)
    return {"concept_id": concept_id, "misconceptions": related}

@router.get("/remediation/{misconception_id}")
async def get_remediation_path(misconception_id: str):
    """Temukan path remediasi terbaik untuk sebuah miskonsepsi."""
    ontology = get_ontology()
    path = ontology.get_remediation_path(misconception_id)
    return {"misconception_id": misconception_id, "remediation_path": path}

@router.get("/filter")
async def filter_graph(
    entity_type: Optional[str] = Query(None),
    relation_type: Optional[str] = Query(None)
):
    """Filter graph berdasarkan tipe entitas atau relasi."""
    ontology = get_ontology()
    data = ontology.get_graph_data()
    
    nodes = data["nodes"]
    edges = data["edges"]
    
    if entity_type:
        nodes = [n for n in nodes if n["type"] == entity_type]
        node_ids = {n["id"] for n in nodes}
        edges = [e for e in edges if e["source"] in node_ids or e["target"] in node_ids]
    
    if relation_type:
        edges = [e for e in edges if e["relation"] == relation_type]
        node_ids = {e["source"] for e in edges} | {e["target"] for e in edges}
        nodes = [n for n in nodes if n["id"] in node_ids]
    
    return {"nodes": nodes, "edges": edges, "filtered": True}
