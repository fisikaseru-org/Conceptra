const API_BASE = process.env.NEXT_PUBLIC_API_URL !== undefined
  ? process.env.NEXT_PUBLIC_API_URL
  : (typeof window !== 'undefined' ? '' : 'http://localhost:8000');

export interface Misconception {
  id: string;
  domain: string;
  concept: string;
  prerequisite: string;
  misconception: string;
  root_cause: string;
  example_answer: string;
  learning_impact: string;
  remediation: string;
  educational_level: string[];
  assessment_tools: string[];
  years_active: number[];
  frequency: number;
  keywords: string[];
  references: string[];
  doi?: string | null;
  scopus_id?: string | null;
  source?: string | null;
  frequency_methodology?: string | null;
  evidence_level?: string | null;
  authors?: string[] | null;
  journal?: string | null;
  year?: number | null;
  contextual_literatures?: any[] | null;
}

export interface GraphData {
  nodes: { id: string; label: string; type: string; properties: Record<string, unknown> }[];
  edges: { source: string; target: string; relation: string; weight: number; confidence: number }[];
  stats: { total_nodes: number; total_edges: number; domain_count: number; misconception_count: number };
}

export interface ChatResponse {
  answer: string;
  sources: { id: string; domain: string; similarity: number }[];
  kg_nodes_used: string[];
  confidence: number;
  mode: string;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
}

// Misconceptions
export const getMisconceptions = (params?: { domain?: string; level?: string; year?: number }) => {
  const query = new URLSearchParams();
  if (params?.domain) query.set('domain', params.domain);
  if (params?.level) query.set('level', params.level);
  if (params?.year) query.set('year', String(params.year));
  query.set('limit', '10000');
  return fetchAPI<{ data: Misconception[]; total: number }>(`/api/misconceptions?${query}`);
};

export const getDomainStats = () =>
  fetchAPI<{ data: Array<{ domain: string; count: number; total_frequency: number; avg_frequency: number; misconceptions: Misconception[] }> }>('/api/misconceptions/domains');

export const searchMisconceptions = (q: string, semantic = false) =>
  fetchAPI<{ query: string; results: Misconception[] }>(`/api/misconceptions/search?q=${encodeURIComponent(q)}&use_semantic=${semantic}`);

export const getRemediationTools = () =>
  fetchAPI<{ data: Array<{ tool: string; misconceptions_handled: number; misconceptions: Misconception[] }> }>('/api/misconceptions/remediation-tools');

// Topics
export const getTopicOverview = () =>
  fetchAPI<{ yearly_summary: unknown[]; lda_topics: unknown[]; burst_events: unknown[] }>('/api/topics');

export const getHeatmap = () =>
  fetchAPI<{ data: unknown[]; domains: string[]; years: number[] }>('/api/topics/heatmap');

export const getTrends = () =>
  fetchAPI<{ trends: unknown[]; burst_events: unknown[] }>('/api/topics/trends');

export const getCovidImpact = () =>
  fetchAPI<unknown>('/api/topics/covid-impact');

// Knowledge Graph
export const getGraphData = () =>
  fetchAPI<GraphData>('/api/graph');

export const getGraphStats = () =>
  fetchAPI<unknown>('/api/graph/stats');

export const filterGraph = (entityType?: string, relationType?: string) => {
  const query = new URLSearchParams();
  if (entityType) query.set('entity_type', entityType);
  if (relationType) query.set('relation_type', relationType);
  return fetchAPI<GraphData>(`/api/graph/filter?${query}`);
};

// Chat
export const sendChatMessage = (message: string, mode = 'socratic', domainFilter?: string) =>
  fetchAPI<ChatResponse>('/api/chat/', {
    method: 'POST',
    body: JSON.stringify({ message, mode, domain_filter: domainFilter }),
  });

export const getChatSuggestions = () =>
  fetchAPI<{ suggestions: string[] }>('/api/chat/suggestions');

export const resetChat = () =>
  fetchAPI<{ status: string }>('/api/chat/reset', { method: 'POST' });

// Analytics
export const getOverview = () =>
  fetchAPI<{
    total_articles: number;
    total_misconceptions: number;
    total_domains: number;
    total_frequency: number;
    years_covered: string;
    avg_frequency: number;
    highest_frequency: number;
    highest_frequency_domain: string;
    level_distribution: Record<string, number>;
    total_remediation_tools: number;
    post_covid_new_domains: string[];
    research_trend: string;
  }>('/api/analytics/overview');

export const getFrequencyDistribution = () =>
  fetchAPI<{ data: unknown[] }>('/api/analytics/frequency-distribution');

export const getDomainRadar = () =>
  fetchAPI<{ data: unknown[] }>('/api/analytics/domain-radar');

export const getGapAnalysis = () =>
  fetchAPI<{ gaps: unknown[]; summary: string }>('/api/analytics/gap-analysis');

export const getAssessmentEffectiveness = () =>
  fetchAPI<{ data: unknown[] }>('/api/analytics/assessment-effectiveness');

export const getTimeline = () =>
  fetchAPI<{ yearly_data: unknown[]; covid_impact: unknown; key_events: unknown[] }>('/api/analytics/timeline');

// NLP Pipeline Preprocess
export const preprocessText = (text: string) =>
  fetchAPI<{ status: string; trace: Record<string, any> }>('/api/nlp/preprocess', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

// L2, L5, L6: Validation & Evidence
export const getCorpusAudit = () =>
  fetchAPI<any>('/api/validation/corpus-audit');

export const getMetadataQuality = () =>
  fetchAPI<any>('/api/validation/metadata-quality');

export const getPrismaFlowchart = () =>
  fetchAPI<any>('/api/validation/prisma-flowchart');

export const computeValidationMetrics = (module: string, y_true: string[], y_pred: string[], confidences?: number[], annotator_a?: string[], annotator_b?: string[]) =>
  fetchAPI<any>('/api/validation/compute-metrics', {
    method: 'POST',
    body: JSON.stringify({ module, y_true, y_pred, confidences, annotator_a, annotator_b }),
  });

export const computeCohenKappa = (annotator_a: string[], annotator_b: string[]) =>
  fetchAPI<any>('/api/validation/cohens-kappa', {
    method: 'POST',
    body: JSON.stringify({ annotator_a, annotator_b }),
  });

export const detectBiases = () =>
  fetchAPI<any>('/api/validation/bias-detection');

export const getThreatAnalysis = () =>
  fetchAPI<any>('/api/validation/threat-analysis');

export const getEvidenceSummary = () =>
  fetchAPI<any>('/api/validation/evidence-summary');

export const submitExpertAnnotation = (itemId: string, verdict: 'agreed' | 'disagreed', annotatorId = 'Expert_A', category?: string, notes?: string) =>
  fetchAPI<any>('/api/validation/annotate', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId, annotator_id: annotatorId, verdict, category, notes }),
  });

export const getExpertAnnotations = () =>
  fetchAPI<any>('/api/validation/annotations');

export const getLiveCohenKappa = () =>
  fetchAPI<any>('/api/validation/live-kappa');

// L4: Aspect & Entity Extraction
export const extractAspects = (text: string, includeRelations = true) =>
  fetchAPI<any>('/api/extraction/extract', {
    method: 'POST',
    body: JSON.stringify({ text, include_relations: includeRelations }),
  });

export const extractMisconceptions = (text: string, modelMode = 'llm_groq') =>
  fetchAPI<any>('/api/extraction/extract-misconceptions', {
    method: 'POST',
    body: JSON.stringify({ text, model_mode: modelMode }),
  });

// L2: Corpus Synchronization
export const getSyncStatus = () =>
  fetchAPI<any>('/api/corpus-sync/status');

export const startSync = () =>
  fetchAPI<any>('/api/corpus-sync/start', { method: 'POST' });

export const stopSync = () =>
  fetchAPI<any>('/api/corpus-sync/stop', { method: 'POST' });

// ─── Scientometrics (Pilar 9) ────────────────────────────────────────────────
export const getPublicationTrends = () =>
  fetchAPI<any>('/api/scientometrics/publication-trends');

export const getAuthorNetwork = () =>
  fetchAPI<any>('/api/scientometrics/author-network');

export const getKeywordBurst = (domain?: string) => {
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : '';
  return fetchAPI<any>(`/api/scientometrics/keyword-burst${query}`);
};

export const getCitationImpact = () =>
  fetchAPI<any>('/api/scientometrics/citation-impact');

export const getGeographicDistribution = () =>
  fetchAPI<any>('/api/scientometrics/geographic');

export const getInstitutionMap = () =>
  fetchAPI<any>('/api/scientometrics/institution-map');

export const getCoWordAnalysis = () =>
  fetchAPI<any>('/api/scientometrics/co-word-analysis');

export const getTopicRiver = () =>
  fetchAPI<any>('/api/scientometrics/topic-river');

export const getDomainHeatmap = () =>
  fetchAPI<any>('/api/scientometrics/domain-heatmap');

export const getInterventionEffectiveness = () =>
  fetchAPI<any>('/api/scientometrics/intervention-effectiveness');

export const getGapMatrix = () =>
  fetchAPI<any>('/api/scientometrics/gap-matrix');

// ─── Research Explorer (Article Database) ────────────────────────────────────
export interface ArticleSummary {
  id: string;
  doi?: string | null;
  title: string;
  authors: string[];
  journal?: string | null;
  year?: number | null;
  abstract_preview?: string | null;
  citation_count: number;
  url?: string | null;
  open_access_url?: string | null;
  evidence_level?: string | null;
  quality_score?: number | null;
  physics_domain?: string | null;
  language?: string | null;
  concepts?: any[];
  keywords?: any[];
}

export interface ArticlesResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  data: ArticleSummary[];
}

export interface DbStatsSummary {
  total_articles: number;
  by_domain: Array<{ domain: string; count: number; avg_citation: number; total_citations: number }>;
  by_year: Array<{ year: number; count: number; total_citations: number }>;
  by_language: Array<{ language: string; count: number }>;
  by_evidence_level: Array<{ level: string; count: number }>;
  by_decade: Array<{ decade: string; count: number; avg_citation: number }>;
  top_journals: Array<{ journal: string; count: number; avg_citation: number }>;
  top_cited: Array<{ title: string; journal: string; year: number; citation_count: number; domain: string; doi?: string }>;
}

export const getExplorerArticles = (params?: {
  domain?: string;
  year_from?: number;
  year_to?: number;
  language?: string;
  has_doi?: boolean;
  evidence_level?: string;
  search?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.domain) query.set('domain', params.domain);
  if (params?.year_from) query.set('year_from', String(params.year_from));
  if (params?.year_to) query.set('year_to', String(params.year_to));
  if (params?.language) query.set('language', params.language);
  if (params?.has_doi !== undefined) query.set('has_doi', String(params.has_doi));
  if (params?.evidence_level) query.set('evidence_level', params.evidence_level);
  if (params?.search) query.set('search', params.search);
  if (params?.sort_by) query.set('sort_by', params.sort_by);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  return fetchAPI<ArticlesResponse>(`/api/explorer/articles?${query}`);
};

export const getExplorerStats = () =>
  fetchAPI<DbStatsSummary>('/api/explorer/stats/summary');

export const getExplorerArticleDetail = (articleId: string) =>
  fetchAPI<any>(`/api/explorer/articles/${encodeURIComponent(articleId)}`);

export const getYearlyBreakdown = () =>
  fetchAPI<{ data: any[] }>('/api/explorer/stats/yearly-breakdown');

// ─── SUS Survey & Export Helpers ─────────────────────────────────────────────
export const submitSusSurvey = (userRole: string, answers: number[], feedback?: string) =>
  fetchAPI<any>('/api/validation/sus-survey', {
    method: 'POST',
    body: JSON.stringify({ user_role: userRole, answers, feedback }),
  });

export const getSusSummary = () =>
  fetchAPI<any>('/api/validation/sus-summary');

export const getExportMisconceptionsCsvUrl = () => `${API_BASE}/api/export/csv/misconceptions`;
export const getExportArticlesCsvUrl = () => `${API_BASE}/api/export/csv/articles`;
export const getExportPdfReportUrl = () => `${API_BASE}/api/export/pdf/report`;
export const getExportCitationBibtexUrl = (articleId?: string) =>
  `${API_BASE}/api/export/citation/bibtex${articleId ? `?article_id=${encodeURIComponent(articleId)}` : ''}`;
export const getExportCitationRisUrl = (articleId?: string) =>
  `${API_BASE}/api/export/citation/ris${articleId ? `?article_id=${encodeURIComponent(articleId)}` : ''}`;

