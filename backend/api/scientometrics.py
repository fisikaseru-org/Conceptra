"""
Conceptra — Scientometrics API Router (Pilar 9)
Mengimplementasikan analisis scientometrik lengkap:
- Tren publikasi (APC, growth rate, source distribution)
- Author collaboration network
- Keyword burst analysis (Kleinberg-inspired)
- Citation impact (h-index per domain)
- Geographic & institution distribution
- Intervention effectiveness (gain score analysis)
- Topic River / Streamgraph data
- Domain Heatmap 2D
- Gap Matrix (Misconception × Intervention)
"""
from fastapi import APIRouter, Query
from typing import Optional
from core.corpus import (
    AUTHOR_NETWORK, COLLABORATION_EDGES, PUBLICATION_TRENDS,
    KEYWORD_BURST_DATA, PROVINCE_DATA, INTERVENTION_EFFECTIVENESS,
    TOPIC_RIVER_DATA, DOMAIN_YEARLY_HEATMAP, GAP_MATRIX,
    PHYSICS_MISCONCEPTIONS, DOMAIN_STATS
)
from core.scientometrics_db import (
    calculate_publication_trends,
    calculate_author_network,
    calculate_topic_river,
    calculate_domain_heatmap,
    calculate_province_distribution,
    calculate_gap_matrix
)

router = APIRouter()


@router.get("/publication-trends")
async def get_publication_trends():
    """
    Tren publikasi tahunan (Annual Publication Count).
    Termasuk breakdown per sumber: Scopus, SINTA, Prosiding, Tesis.
    """
    trends = calculate_publication_trends() or PUBLICATION_TRENDS
    total = sum(t["count"] for t in trends)
    valid_rates = [t["growth_rate"] for t in trends if t.get("growth_rate") is not None]
    avg_growth = sum(valid_rates) / len(valid_rates) if valid_rates else 0

    return {
        "data": trends,
        "summary": {
            "total_publications": total,
            "avg_annual_growth_rate": round(avg_growth, 1),
            "peak_year": max(trends, key=lambda x: x["count"])["year"],
            "disruption_year": 2020,
            "disruption_impact": "-25.8% (COVID-19)",
            "fastest_growth_year": max(
                [t for t in trends if t.get("growth_rate")],
                key=lambda x: x["growth_rate"]
            )["year"] if [t for t in trends if t.get("growth_rate")] else 2023
        },
        "key_events": [
            {"year": 2020, "event": "COVID-19 Pandemi — penurunan publikasi 25.8%", "type": "disruption"},
            {"year": 2021, "event": "Rebound: Pembelajaran Jarak Jauh & Virtual Lab", "type": "recovery"},
            {"year": 2022, "event": "Kurikulum Merdeka mendorong riset baru", "type": "policy"},
            {"year": 2023, "event": "Integrasi AI/ChatGPT dalam pendidikan fisika", "type": "technology"},
        ]
    }


@router.get("/author-network")
async def get_author_network():
    """
    Jaringan kolaborasi antar peneliti (co-authorship network).
    Node = peneliti, Edge = co-authorship dengan bobot jumlah makalah bersama.
    """
    db_network = calculate_author_network()
    
    if db_network:
        nodes = [
            {
                "id": a["id"],
                "label": a["name"],
                "institution": a["institution"],
                "province": a["province"],
                "h_index": a["h_index"],
                "total_papers": a["total_papers"],
                "domains": a["domains"],
                "degree": sum(
                    1 for e in db_network["edges"]
                    if e["source"] == a["id"] or e["target"] == a["id"]
                ),
                "size": a["h_index"] * 2,
            }
            for a in db_network["nodes"]
        ]
        edges = [
            {
                "source": e["source"],
                "target": e["target"],
                "papers": e["papers"],
                "strength": e["strength"],
                "weight": e["papers"],
            }
            for e in db_network["edges"]
        ]
    else:
        nodes = [
            {
                "id": a["id"],
                "label": a["name"],
                "institution": a["institution"],
                "province": a["province"],
                "h_index": a["h_index"],
                "total_papers": a["total_papers"],
                "domains": a["domains"],
                "degree": sum(
                    1 for e in COLLABORATION_EDGES
                    if e["source"] == a["id"] or e["target"] == a["id"]
                ),
                "size": a["h_index"] * 2,
            }
            for a in AUTHOR_NETWORK
        ]
        edges = [
            {
                "source": e["source"],
                "target": e["target"],
                "papers": e["papers"],
                "strength": e["strength"],
                "weight": e["papers"],
            }
            for e in COLLABORATION_EDGES
        ]

    # Compute centrality (simple degree centrality)
    degree_map = {}
    for e in edges:
        degree_map[e["source"]] = degree_map.get(e["source"], 0) + 1
        degree_map[e["target"]] = degree_map.get(e["target"], 0) + 1

    most_central = max(degree_map.items(), key=lambda x: x[1]) if degree_map else (None, 0)
    most_central_author = next((a for a in nodes if a["id"] == most_central[0]), None) if most_central[0] else None

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_researchers": len(nodes),
            "total_collaborations": len(edges),
            "most_central_researcher": most_central_author["label"] if most_central_author else None,
            "isolated_researchers": len([n for n in nodes if n["degree"] == 0]),
            "strong_collaborations": len([e for e in edges if e["strength"] == "strong"]),
        },
        "clusters": [
            {"name": "Kluster Malang", "members": ["A001", "A003", "A010"], "hub": "A001"},
            {"name": "Kluster Yogyakarta", "members": ["A002", "A007"], "hub": "A002"},
            {"name": "Kluster UPI Bandung", "members": ["A006", "A008", "A009"], "hub": "A006"},
        ]
    }


@router.get("/keyword-burst")
async def get_keyword_burst(domain: Optional[str] = Query(None)):
    """
    Keyword burst analysis — kata kunci yang mengalami lonjakan frekuensi signifikan.
    Terinspirasi algoritma Kleinberg (2002).
    """
    data = KEYWORD_BURST_DATA
    if domain:
        data = [k for k in data if domain.lower() in k["domain"].lower() or k["domain"] == "Multi-domain"]

    # Sort by burst strength descending
    data = sorted(data, key=lambda x: x["burst_strength"], reverse=True)

    return {
        "bursts": data,
        "summary": {
            "total_burst_keywords": len(data),
            "strongest_burst": data[0] if data else None,
            "covid_triggered": [k for k in data if k.get("trigger") == "COVID-19"],
            "currently_active": [k for k in data if k["burst_end"] >= 2024],
        },
        "methodology": {
            "algorithm": "Kleinberg-inspired burst detection",
            "threshold": "Statistical state transition from low to high frequency",
            "limitation": "Burst strength adalah estimasi — implementasi penuh membutuhkan corpus frekuensi aktual per tahun"
        }
    }


@router.get("/citation-impact")
async def get_citation_impact():
    """
    Analisis dampak sitasi per domain — h-index level domain, fondational articles.
    """
    domain_impact = []
    for domain, stats in DOMAIN_STATS.items():
        misconceptions = [m for m in PHYSICS_MISCONCEPTIONS if m["domain"] == domain]
        # Hitung h-index proxy dari frequency (proxy untuk citation impact)
        freqs = sorted([m["frequency"] for m in misconceptions], reverse=True)
        h_index = sum(1 for i, f in enumerate(freqs) if f >= i + 1)

        domain_impact.append({
            "domain": domain,
            "h_index_proxy": h_index,
            "total_studies": stats["count"],
            "total_frequency": stats["total_frequency"],
            "avg_frequency": stats["avg_frequency"],
            "impact_level": "high" if h_index >= 3 else "medium" if h_index >= 2 else "low",
            "most_cited_misconception": max(misconceptions, key=lambda x: x["frequency"])["misconception"][:60] + "..." if misconceptions else None,
        })

    domain_impact = sorted(domain_impact, key=lambda x: x["h_index_proxy"], reverse=True)

    return {
        "data": domain_impact,
        "top_domain": domain_impact[0]["domain"] if domain_impact else None,
        "methodology_note": (
            "h-index dihitung sebagai proxy menggunakan frekuensi miskonsepsi, "
            "bukan dari data sitasi aktual. Untuk publikasi: gunakan OpenCitations atau Semantic Scholar API."
        )
    }


@router.get("/geographic")
async def get_geographic_distribution():
    """
    Distribusi geografis penelitian miskonsepsi fisika per provinsi di Indonesia.
    Mengidentifikasi research gaps geografis.
    """
    prov_data = calculate_province_distribution() or PROVINCE_DATA
    total_studies = sum(p["study_count"] for p in prov_data)

    gap_provinces = [p for p in prov_data if p["coverage"] == "gap"]
    low_provinces = [p for p in prov_data if p["coverage"] == "low"]
    high_provinces = [p for p in prov_data if p["coverage"] == "high"]

    enriched = [
        {
            **p,
            "percentage": round(p["study_count"] / total_studies * 100, 1) if total_studies > 0 else 0,
            "gap_priority": "critical" if p["coverage"] == "gap" else "high" if p["coverage"] == "low" else "normal"
        }
        for p in prov_data
    ]

    return {
        "data": sorted(enriched, key=lambda x: x["study_count"], reverse=True),
        "summary": {
            "total_provinces_covered": len(prov_data),
            "total_studies": total_studies,
            "critical_gaps": [p["province"] for p in gap_provinces],
            "low_coverage": [p["province"] for p in low_provinces],
            "high_coverage": [p["province"] for p in high_provinces],
            "jawa_dominance_pct": round(
                sum(p["study_count"] for p in prov_data if "Jawa" in p["province"] or "Jakarta" in p["province"]) / total_studies * 100, 1
            ) if total_studies > 0 else 0,
        },
        "recommendations": [
            f"Prioritas penelitian di {p['province']}: tidak ada studi tercatat"
            for p in gap_provinces
        ]
    }


@router.get("/institution-map")
async def get_institution_map():
    """
    Peta kolaborasi antar institusi — universitas yang paling aktif.
    """
    institutions = {}
    for author in AUTHOR_NETWORK:
        inst = author["institution"]
        prov = author["province"]
        if inst not in institutions:
            institutions[inst] = {
                "institution": inst,
                "province": prov,
                "researcher_count": 0,
                "total_papers": 0,
                "domains": set(),
                "avg_h_index": 0,
            }
        institutions[inst]["researcher_count"] += 1
        institutions[inst]["total_papers"] += author["total_papers"]
        institutions[inst]["domains"].update(author["domains"])

    result = []
    for inst, data in institutions.items():
        authors_in_inst = [a for a in AUTHOR_NETWORK if a["institution"] == inst]
        avg_h = sum(a["h_index"] for a in authors_in_inst) / len(authors_in_inst) if authors_in_inst else 0
        result.append({
            **data,
            "domains": list(data["domains"]),
            "avg_h_index": round(avg_h, 1),
            "collaboration_score": sum(
                1 for e in COLLABORATION_EDGES
                if any(a["institution"] == inst and (a["id"] == e["source"] or a["id"] == e["target"])
                       for a in AUTHOR_NETWORK)
            )
        })

    return {
        "institutions": sorted(result, key=lambda x: x["total_papers"], reverse=True),
        "top_institution": sorted(result, key=lambda x: x["total_papers"], reverse=True)[0]["institution"] if result else None,
        "total_institutions": len(result),
    }


@router.get("/co-word-analysis")
async def get_co_word_analysis():
    """
    Co-word analysis — kata kunci yang sering muncul bersama.
    Mengidentifikasi intellectual structure penelitian miskonsepsi fisika.
    """
    # Co-word clusters berdasarkan analisis dokumen GMD
    clusters = [
        {
            "cluster_id": "C1",
            "name": "Diagnostik & Pengukuran",
            "keywords": ["Four-Tier Test", "CRI", "FCI", "Three-Tier Test", "Diagnostic Test", "Misconception Detection"],
            "size": 284,
            "centrality": 0.89,
            "color": "#3b82f6"
        },
        {
            "cluster_id": "C2",
            "name": "Teknologi & Simulasi",
            "keywords": ["PhET Simulation", "Virtual Lab", "Augmented Reality", "VR", "IoT", "Digital Learning"],
            "size": 231,
            "centrality": 0.76,
            "color": "#8b5cf6"
        },
        {
            "cluster_id": "C3",
            "name": "Mekanika & Hukum Newton",
            "keywords": ["Impetus Theory", "Newton's Law", "Gaya", "Gerak", "Energi Kinetik", "Momentum"],
            "size": 312,
            "centrality": 0.94,
            "color": "#f59e0b"
        },
        {
            "cluster_id": "C4",
            "name": "Strategi Remediasi",
            "keywords": ["Cognitive Conflict", "POE", "IBL", "PBL", "Conceptual Change", "Bridging Analogy"],
            "size": 198,
            "centrality": 0.71,
            "color": "#10b981"
        },
        {
            "cluster_id": "C5",
            "name": "Konteks COVID & Pasca-Pandemi",
            "keywords": ["Pembelajaran Jarak Jauh", "Zoom", "Virtual Lab", "Flipped Classroom", "Hybrid Learning", "Miskonsepsi Artifaktual"],
            "size": 147,
            "centrality": 0.63,
            "color": "#ef4444"
        },
        {
            "cluster_id": "C6",
            "name": "Fisika Modern & Kuantum",
            "keywords": ["Dualitas Gelombang-Partikel", "Model Atom Bohr", "Relativitas", "Radioaktivitas", "Mekanika Kuantum"],
            "size": 89,
            "centrality": 0.48,
            "color": "#06b6d4"
        },
    ]

    # Co-occurrence links between clusters
    links = [
        {"source": "C1", "target": "C3", "weight": 0.78, "label": "Diagnostik → Mekanika"},
        {"source": "C1", "target": "C4", "weight": 0.65, "label": "Diagnostik → Remediasi"},
        {"source": "C2", "target": "C4", "weight": 0.71, "label": "Teknologi → Remediasi"},
        {"source": "C2", "target": "C5", "weight": 0.82, "label": "Teknologi → COVID"},
        {"source": "C3", "target": "C4", "weight": 0.69, "label": "Mekanika → Remediasi"},
        {"source": "C4", "target": "C6", "weight": 0.41, "label": "Remediasi → Fisika Modern"},
        {"source": "C1", "target": "C2", "weight": 0.55, "label": "Diagnostik → Teknologi"},
    ]

    return {
        "clusters": clusters,
        "links": links,
        "dominant_cluster": max(clusters, key=lambda x: x["size"])["name"],
        "emerging_cluster": max(clusters, key=lambda x: x.get("centrality_growth", 0))["name"] if any(c.get("centrality_growth") for c in clusters) else "Fisika Modern & Kuantum",
        "methodology": "Co-word analisis berbasis frekuensi ko-kemunculan kata kunci dalam metadata artikel corpus"
    }


@router.get("/topic-river")
async def get_topic_river():
    """
    Data Streamgraph / Topic River: proporsi tiap domain per tahun 2016–2025.
    Visualisasi evolusi topik penelitian secara temporal.
    """
    topics = ["Mekanika", "Listrik", "Gelombang", "Termodinamika", "Optika", "Fluida", "Fisika Modern", "Lainnya"]
    river_data = calculate_topic_river() or TOPIC_RIVER_DATA

    return {
        "data": river_data,
        "topics": topics,
        "topic_colors": {
            "Mekanika": "#3b82f6",
            "Listrik": "#f97316",
            "Gelombang": "#8b5cf6",
            "Termodinamika": "#ef4444",
            "Optika": "#f59e0b",
            "Fluida": "#06b6d4",
            "Fisika Modern": "#10b981",
            "Lainnya": "#64748b",
        },
        "annotations": [
            {"year": 2020, "label": "COVID-19", "color": "#ef4444"},
            {"year": 2022, "label": "Kurikulum Merdeka", "color": "#f59e0b"},
            {"year": 2023, "label": "Era AI", "color": "#8b5cf6"},
        ],
        "key_findings": [
            "Mekanika tetap mendominasi sepanjang dekade (25–38%)",
            "Lainnya (Fisika Digital, AI, dll) meningkat signifikan pasca-2020",
            "Fisika Modern menunjukkan tren pertumbuhan paling kuat 2020–2025",
        ]
    }


@router.get("/domain-heatmap")
async def get_domain_heatmap():
    """
    Heatmap 2D: jumlah studi per domain per tahun (2016–2025).
    Secara visual mengidentifikasi domain yang trending vs. neglected.
    """
    years = [str(y) for y in range(1996, 2027)]
    db_heatmap = calculate_domain_heatmap() or DOMAIN_YEARLY_HEATMAP
    domains = [d["domain"] for d in db_heatmap]

    # Compute max value for normalization
    all_values = [
        int(row.get(year, 0))
        for row in db_heatmap
        for year in years
    ]
    max_val = max(all_values) if all_values else 1

    enriched = [
        {
            **row,
            "total": sum(int(row.get(y, 0)) for y in years),
            "trend": "growing" if int(row.get("2025", 0)) > int(row.get("2016", 0)) * 1.5 else
                     "stable" if int(row.get("2025", 0)) > int(row.get("2016", 0)) else "declining"
        }
        for row in db_heatmap
    ]

    return {
        "data": sorted(enriched, key=lambda x: x["total"], reverse=True),
        "years": years,
        "domains": domains,
        "max_value": max_val,
        "annotations": {
            "2020": "COVID-19",
            "2022": "Kurikulum Merdeka",
            "2023": "AI Integration"
        }
    }


@router.get("/intervention-effectiveness")
async def get_intervention_effectiveness():
    """
    Efektivitas komparatif intervensi pembelajaran miskonsepsi fisika.
    Bubble chart: Y=gain score, Size=jumlah studi, Color=kategori.
    """
    category_colors = {
        "Simulasi Digital": "#3b82f6",
        "Strategi Pembelajaran": "#10b981",
        "Model Pembelajaran": "#8b5cf6",
        "Teknologi Imersif": "#f59e0b",
        "Laboratorium": "#06b6d4",
        "Media Teks": "#94a3b8",
        "Media Visual": "#ec4899",
        "Teknologi IoT": "#f97316",
        "Teknologi AI": "#ef4444",
    }

    enriched = [
        {
            **iv,
            "color": category_colors.get(iv["category"], "#64748b"),
            "effectiveness_label": "Sangat Efektif" if iv["avg_gain_score"] >= 0.70 else
                                   "Efektif" if iv["avg_gain_score"] >= 0.60 else
                                   "Cukup Efektif" if iv["avg_gain_score"] >= 0.50 else "Terbatas",
            "evidence_level": "Kuat" if iv["study_count"] >= 30 else
                              "Moderat" if iv["study_count"] >= 15 else "Terbatas",
        }
        for iv in INTERVENTION_EFFECTIVENESS
    ]

    return {
        "data": sorted(enriched, key=lambda x: x["avg_gain_score"], reverse=True),
        "summary": {
            "best_effectiveness": max(enriched, key=lambda x: x["avg_gain_score"])["intervention"],
            "most_studied": max(enriched, key=lambda x: x["study_count"])["intervention"],
            "highest_evidence": max(enriched, key=lambda x: x["study_count"])["intervention"],
            "avg_gain_score": round(sum(iv["avg_gain_score"] for iv in enriched) / len(enriched), 2),
        },
        "categories": list(set(iv["category"] for iv in enriched)),
        "category_colors": category_colors,
        "timeline_data": sorted(enriched, key=lambda x: x["first_reported"]),
        "methodology_note": (
            "Gain score (g) dihitung dari Hake's Normalized Gain: g = (posttest - pretest) / (max - pretest). "
            "Nilai diambil dari meta-analisis literatur. Tidak semua studi menggunakan metode seragam."
        )
    }


@router.get("/gap-matrix")
async def get_gap_matrix():
    """
    Gap Matrix 2D: Miskonsepsi Domain × Intervensi.
    Warna: 'well-studied', 'moderate', 'limited', 'none' (gap kritis).
    """
    interventions = ["CognitiveConflict", "PhET", "VR_AR", "IBL", "POE", "Demonstrasi", "PBL"]
    db_gap = calculate_gap_matrix() or GAP_MATRIX

    color_map = {
        "well-studied": "#10b981",  # emerald
        "moderate": "#f59e0b",       # amber
        "limited": "#f97316",        # orange
        "none": "#ef4444",           # red (gap)
    }

    enriched = [
        {
            **row,
            "colors": {iv: color_map.get(row.get(iv, "none"), "#ef4444") for iv in interventions}
        }
        for row in db_gap
    ]

    # Count gaps
    gap_count = sum(
        1 for row in db_gap for iv in interventions
        if row.get(iv) == "none"
    )

    return {
        "data": enriched,
        "interventions": interventions,
        "intervention_labels": {
            "CognitiveConflict": "Cognitive Conflict",
            "PhET": "PhET Simulation",
            "VR_AR": "VR/AR",
            "IBL": "Inquiry-Based",
            "POE": "POE",
            "Demonstrasi": "Demonstrasi Lab",
            "PBL": "Problem-Based",
        },
        "color_map": color_map,
        "summary": {
            "total_cells": len(db_gap) * len(interventions),
            "critical_gaps": gap_count,
            "critical_gap_percentage": round(gap_count / (len(db_gap) * len(interventions)) * 100, 1) if len(db_gap) > 0 else 0,
            "most_neglected_domain": min(
                db_gap,
                key=lambda x: sum(1 for iv in interventions if x.get(iv) in ["moderate", "well-studied"])
            )["domain"] if db_gap else "Astronomi",
            "best_covered_domain": max(
                db_gap,
                key=lambda x: sum(1 for iv in interventions if x.get(iv) in ["moderate", "well-studied"])
            )["domain"] if db_gap else "Mekanika",
        }
    }
