"""Conceptra — Topics API Router"""
from fastapi import APIRouter, Query
from typing import Optional
from core.topic_model import get_topic_analyzer

router = APIRouter()

@router.get("/")
async def get_topic_overview():
    """Overview topik dan analisis temporal."""
    analyzer = get_topic_analyzer()
    return {
        "yearly_summary": analyzer.get_yearly_summary(),
        "lda_topics": analyzer.get_lda_topics(),
        "burst_events": analyzer.get_burst_events(),
    }

@router.get("/heatmap")
async def get_heatmap():
    """Data heatmap domain × tahun."""
    return get_topic_analyzer().get_domain_heatmap()

@router.get("/trends")
async def get_trends():
    """Trend temporal per domain fisika."""
    analyzer = get_topic_analyzer()
    return {
        "trends": analyzer.get_topic_trends(),
        "burst_events": analyzer.get_burst_events()
    }

@router.get("/covid-impact")
async def get_covid_impact():
    """Analisis dampak COVID-19 pada penelitian miskonsepsi."""
    return get_topic_analyzer().get_covid_impact_analysis()

@router.get("/yearly/{year}")
async def get_year_data(year: int):
    """Data topik untuk tahun tertentu."""
    if year < 2016 or year > 2025:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Tahun harus antara 2016-2025")
    summary = get_topic_analyzer().get_yearly_summary()
    year_data = next((d for d in summary if d["year"] == year), None)
    if not year_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Data untuk tahun {year} tidak ditemukan")
    return year_data
