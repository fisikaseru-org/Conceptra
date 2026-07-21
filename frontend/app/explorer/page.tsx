'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Search, Filter, BookOpen, ExternalLink, X, ChevronLeft,
  ChevronRight, Download, BarChart3, Globe, BookMarked, TrendingUp,
  Award, Layers, Calendar, Users, FileText, Zap, RefreshCw, Star,
  Link2, Quote, Activity
} from 'lucide-react';
import {
  getExplorerArticles, getExplorerStats, type ArticleSummary, type DbStatsSummary
} from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  'Fisika Umum': '#64748b',
  'Mekanika': '#3b82f6',
  'IPA Terpadu': '#eab308',
  'Listrik': '#f97316',
  'Termodinamika': '#ef4444',
  'Optika': '#f59e0b',
  'Gelombang': '#8b5cf6',
  'Fluida': '#06b6d4',
  'Astronomi': '#a855f7',
  'Magnetisme': '#f43f5e',
  'Fisika Modern': '#10b981',
  'Sains Terapan (STEM)': '#ec4899',
};

const LANG_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en: { label: 'English', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  id: { label: 'Indonesia', color: '#34d399', bg: 'rgba(16,185,129,0.15)' },
  mixed: { label: 'Mixed', color: '#fcd34d', bg: 'rgba(245,158,11,0.15)' },
};

const EVIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  I: { label: 'Systematic Review / Meta-Analysis', color: '#10b981' },
  II: { label: 'RCT', color: '#3b82f6' },
  III: { label: 'Quasi-Experimental', color: '#8b5cf6' },
  IV: { label: 'Descriptive / Survey', color: '#f59e0b' },
};

const DOMAINS = ['all', 'Fisika Umum', 'Mekanika', 'IPA Terpadu', 'Listrik', 'Termodinamika',
  'Optika', 'Gelombang', 'Fluida', 'Astronomi', 'Magnetisme', 'Fisika Modern', 'Sains Terapan (STEM)'];

const LANGUAGES = ['all', 'en', 'id', 'mixed'];
const EVIDENCE_LEVELS = ['all', 'I', 'II', 'III', 'IV'];
const SORT_OPTIONS = [
  { value: 'citation_count', label: 'Sitasi Terbanyak' },
  { value: 'year', label: 'Terbaru' },
  { value: 'quality_score', label: 'Kualitas Tertinggi' },
];

// ─── Mini chart tooltip ───────────────────────────────────────────────────────
const MiniTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs border border-slate-700/50">
      <p className="text-slate-300 mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color }}>
          {e.name}: <strong>{e.value?.toLocaleString('id-ID')}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ article, onClick }: { article: ArticleSummary; onClick: () => void }) {
  const domainColor = DOMAIN_COLORS[article.physics_domain || ''] || '#64748b';
  const lang = LANG_LABELS[article.language || 'en'];
  const evidenceConf = EVIDENCE_CONFIG[article.evidence_level || 'IV'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="glass-card p-5 cursor-pointer border border-slate-800/60 hover:border-blue-500/30 transition-all duration-200"
    >
      {/* Domain badge + Language */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          <span className="badge text-xs font-medium" style={{
            background: `${domainColor}20`, color: domainColor, border: `1px solid ${domainColor}40`
          }}>
            {article.physics_domain || 'Fisika Umum'}
          </span>
          {lang && (
            <span className="badge text-xs" style={{ background: lang.bg, color: lang.color, border: `1px solid ${lang.color}30` }}>
              {lang.label}
            </span>
          )}
          {evidenceConf && (
            <span className="badge text-xs" style={{ background: `${evidenceConf.color}15`, color: evidenceConf.color, border: `1px solid ${evidenceConf.color}30` }}>
              EL-{article.evidence_level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-amber-400">
          <Star size={12} fill="#f59e0b" />
          <span className="text-xs font-semibold">{article.citation_count.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-100 leading-snug mb-2 line-clamp-2">
        {article.title}
      </h3>

      {/* Authors + Journal */}
      <div className="text-xs text-slate-500 mb-2">
        {article.authors.slice(0, 3).join(', ')}{article.authors.length > 3 ? ', et al.' : ''} ·{' '}
        <span className="text-slate-400">{article.journal || 'Journal tidak tersedia'}</span> ·{' '}
        <span className="text-slate-400 font-semibold">{article.year}</span>
      </div>

      {/* Abstract preview */}
      {article.abstract_preview && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {article.abstract_preview}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
        <div className="flex gap-2">
          {article.doi && (
            <span className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300" onClick={e => {
              e.stopPropagation();
              window.open(`https://doi.org/${article.doi}`, '_blank');
            }}>
              <Link2 size={10} /> DOI
            </span>
          )}
          {article.open_access_url && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <ExternalLink size={10} /> Open Access
            </span>
          )}
        </div>
        {article.quality_score != null && (
          <span className="text-xs text-slate-500">Q: {article.quality_score.toFixed(1)}</span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────
function StatsPanel({ stats }: { stats: DbStatsSummary }) {
  const [statsTab, setStatsTab] = useState<'domain' | 'year' | 'journal'>('domain');

  const totalCitations = stats.by_domain.reduce((s, d) => s + d.total_citations, 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Artikel', value: stats.total_articles.toLocaleString('id-ID'), icon: FileText, color: '#3b82f6' },
          { label: 'Total Sitasi', value: totalCitations.toLocaleString('id-ID'), icon: Quote, color: '#f59e0b' },
          { label: 'Domain Fisika', value: stats.by_domain.length, icon: Layers, color: '#8b5cf6' },
          { label: 'Rentang Tahun', value: '1996–2026', icon: Calendar, color: '#10b981' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card p-4 border border-slate-800/40">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon size={14} style={{ color: kpi.color }} />
              <span className="text-xs text-slate-500">{kpi.label}</span>
            </div>
            <div className="text-xl font-bold text-white">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Language Pie */}
      <div className="glass-card p-4 border border-slate-800/40">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Globe size={12} /> Distribusi Bahasa
        </h4>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={100}>
            <PieChart>
              <Pie data={stats.by_language} dataKey="count" nameKey="language" innerRadius={25} outerRadius={45} paddingAngle={2}>
                {stats.by_language.map((entry, i) => {
                  const l = LANG_LABELS[entry.language];
                  return <Cell key={i} fill={l?.color || '#64748b'} />;
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 flex-1">
            {stats.by_language.map(l => {
              const conf = LANG_LABELS[l.language] || { label: l.language, color: '#64748b', bg: '' };
              const pct = Math.round(l.count / stats.total_articles * 100);
              return (
                <div key={l.language} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: conf.color }} />
                    <span className="text-xs text-slate-400">{conf.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab charts */}
      <div className="glass-card p-4 border border-slate-800/40">
        <div className="flex gap-1 mb-4">
          {[['domain', 'Domain'], ['year', 'Timeline'], ['journal', 'Jurnal']].map(([k, v]) => (
            <button key={k} onClick={() => setStatsTab(k as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statsTab === k ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
              {v}
            </button>
          ))}
        </div>

        {statsTab === 'domain' && (
          <>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Artikel per Domain</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.by_domain.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis type="category" dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 9 }} width={90} />
                <Tooltip content={<MiniTooltip />} />
                <Bar dataKey="count" name="Artikel" radius={[0, 4, 4, 0]}>
                  {stats.by_domain.slice(0, 10).map((d, i) => (
                    <Cell key={i} fill={DOMAIN_COLORS[d.domain] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {statsTab === 'year' && (
          <>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tren Publikasi (1996–2026)</h4>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.by_year} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 9 }} interval={4} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                <Tooltip content={<MiniTooltip />} />
                <Area type="monotone" dataKey="count" name="Artikel" stroke="#3b82f6" fill="url(#expGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}

        {statsTab === 'journal' && (
          <>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Top 10 Jurnal</h4>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {stats.top_journals.slice(0, 10).map((j, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-slate-600 w-4 shrink-0">{i + 1}</span>
                    <span className="text-xs text-slate-300 truncate">{j.journal}</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-400 shrink-0">{j.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Evidence Level */}
      <div className="glass-card p-4 border border-slate-800/40">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Award size={12} /> Evidence Level (CEBM)
        </h4>
        <div className="space-y-2">
          {stats.by_evidence_level.map(e => {
            const conf = EVIDENCE_CONFIG[e.level] || { label: e.level, color: '#64748b' };
            const pct = Math.round(e.count / stats.total_articles * 100);
            return (
              <div key={e.level}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-slate-400">Level {e.level} – {conf.label.split(' /')[0]}</span>
                  <span className="text-xs font-semibold" style={{ color: conf.color }}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: conf.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Cited */}
      <div className="glass-card p-4 border border-slate-800/40">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp size={12} /> Most Cited
        </h4>
        <div className="space-y-2">
          {stats.top_cited.slice(0, 5).map((a, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-lg font-black text-slate-700 leading-none w-5 shrink-0">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-xs text-slate-300 leading-snug line-clamp-2">{a.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{a.year} · <span className="text-amber-400 font-semibold">{a.citation_count} sitasi</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Article Detail Modal ─────────────────────────────────────────────────────
function ArticleDetailModal({ article, onClose }: { article: ArticleSummary; onClose: () => void }) {
  const domainColor = DOMAIN_COLORS[article.physics_domain || ''] || '#64748b';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="glass-card border border-slate-700/60 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              <span className="badge text-xs" style={{ background: `${domainColor}20`, color: domainColor, border: `1px solid ${domainColor}40` }}>
                {article.physics_domain}
              </span>
              {article.evidence_level && (
                <span className="badge badge-emerald text-xs">EL-{article.evidence_level}</span>
              )}
              <span className="badge badge-blue text-xs">{article.year}</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>

          <h2 className="text-lg font-bold text-white mb-3 leading-snug">{article.title}</h2>

          {/* Authors */}
          {article.authors?.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Users size={13} className="text-slate-500 shrink-0" />
              <p className="text-sm text-slate-400">{article.authors.join(', ')}</p>
            </div>
          )}

          {/* Journal + Year */}
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={13} className="text-slate-500 shrink-0" />
            <p className="text-sm text-slate-400">{article.journal || 'Jurnal tidak tersedia'}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-800/40 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-amber-400">{article.citation_count.toLocaleString('id-ID')}</div>
              <div className="text-xs text-slate-500">Sitasi</div>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{article.evidence_level || 'IV'}</div>
              <div className="text-xs text-slate-500">Evidence Level</div>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{(article.quality_score || 0).toFixed(1)}</div>
              <div className="text-xs text-slate-500">Quality Score</div>
            </div>
          </div>

          {/* Abstract */}
          {article.abstract_preview && (
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Abstrak</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{article.abstract_preview}</p>
            </div>
          )}

          {/* Keywords */}
          {Array.isArray(article.keywords) && article.keywords.length > 0 && (
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {(article.keywords as any[]).map((kw, i) => (
                  <span key={i} className="badge badge-purple text-xs">{typeof kw === 'string' ? kw : kw?.keyword || kw?.display_name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Action links */}
          <div className="flex gap-3 flex-wrap pt-4 border-t border-slate-800">
            {article.doi && (
              <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2 text-xs">
                <ExternalLink size={12} /> Buka DOI
              </a>
            )}
            {article.open_access_url && (
              <a href={article.open_access_url} target="_blank" rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 text-xs">
                <BookMarked size={12} /> Open Access
              </a>
            )}
            {article.url && !article.doi && (
              <a href={article.url} target="_blank" rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 text-xs">
                <Link2 size={12} /> Sumber
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResearchExplorerPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [stats, setStats] = useState<DbStatsSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSummary | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [domain, setDomain] = useState('all');
  const [yearFrom, setYearFrom] = useState<number>(1996);
  const [yearTo, setYearTo] = useState<number>(2026);
  const [language, setLanguage] = useState('all');
  const [evidenceLevel, setEvidenceLevel] = useState('all');
  const [sortBy, setSortBy] = useState('citation_count');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load stats once
  useEffect(() => {
    getExplorerStats().then(s => {
      setStats(s);
      setStatsLoading(false);
    }).catch(() => setStatsLoading(false));
  }, []);

  // Load articles when filters change
  const loadArticles = useCallback(() => {
    setLoading(true);
    getExplorerArticles({
      domain: domain === 'all' ? undefined : domain,
      year_from: yearFrom,
      year_to: yearTo,
      language: language === 'all' ? undefined : language,
      evidence_level: evidenceLevel === 'all' ? undefined : evidenceLevel,
      sort_by: sortBy,
      search: search || undefined,
      page,
      limit: 20,
    }).then(res => {
      setArticles(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [domain, yearFrom, yearTo, language, evidenceLevel, sortBy, search, page]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleSearchChange = (v: string) => {
    setSearchInput(v);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 500);
  };

  const resetFilters = () => {
    setDomain('all');
    setYearFrom(1996);
    setYearTo(2026);
    setLanguage('all');
    setEvidenceLevel('all');
    setSortBy('citation_count');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const activeFiltersCount = [
    domain !== 'all', yearFrom !== 1996, yearTo !== 2026,
    language !== 'all', evidenceLevel !== 'all', !!search
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-[1600px] mx-auto px-6">

        {/* ─── Header ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Database size={18} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Research Explorer</h1>
              <p className="text-sm text-slate-500">Database 17.755 artikel penelitian fisika Indonesia (1996–2026)</p>
            </div>
          </div>

          {/* Quick stats bar */}
          <div className="mt-4 flex flex-wrap gap-3">
            {stats && [
              { label: 'Artikel', value: stats.total_articles.toLocaleString('id-ID'), color: '#3b82f6', icon: FileText },
              { label: 'Bahasa Indonesia', value: (stats.by_language.find(l => l.language === 'id')?.count || 0).toLocaleString('id-ID'), color: '#10b981', icon: Globe },
              { label: 'Terindeks DOI', value: stats.by_domain.filter(d => d.count > 0).length + ' domain', color: '#8b5cf6', icon: Layers },
              { label: 'Jurnal Unik', value: stats.top_journals.length + '+', color: '#f59e0b', icon: BookOpen },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/50">
                <stat.icon size={12} style={{ color: stat.color }} />
                <span className="text-xs text-slate-400">{stat.label}:</span>
                <span className="text-xs font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">

          {/* ─── Left: Stats Panel ──────────────────────────────────────── */}
          <div className="hidden xl:block">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              {statsLoading ? (
                <div className="glass-card p-8 border border-slate-800/40 flex items-center justify-center">
                  <RefreshCw size={24} className="text-slate-600 animate-spin" />
                </div>
              ) : stats ? (
                <StatsPanel stats={stats} />
              ) : null}
            </motion.div>
          </div>

          {/* ─── Right: Articles ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>

            {/* Search + Filter bar */}
            <div className="glass-card p-4 border border-slate-800/40 mb-5">
              <div className="flex gap-3 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Cari judul, abstrak, kata kunci..."
                    className="w-full bg-slate-900/60 border border-slate-700/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  {searchInput && (
                    <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showFilters ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : 'border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600'}`}>
                  <Filter size={14} />
                  Filter
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">{activeFiltersCount}</span>
                  )}
                </button>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-slate-500">Urutkan:</span>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSortBy(opt.value); setPage(1); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${sortBy === opt.value ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                    {opt.label}
                  </button>
                ))}
                <div className="ml-auto text-xs text-slate-500">
                  <span className="font-semibold text-slate-300">{total.toLocaleString('id-ID')}</span> artikel ditemukan
                </div>
              </div>

              {/* Filters expanded */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="pt-4 mt-3 border-t border-slate-800 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                      {/* Domain */}
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Domain</label>
                        <select value={domain} onChange={e => { setDomain(e.target.value); setPage(1); }}
                          className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50">
                          {DOMAINS.map(d => <option key={d} value={d}>{d === 'all' ? 'Semua Domain' : d}</option>)}
                        </select>
                      </div>
                      {/* Bahasa */}
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Bahasa</label>
                        <select value={language} onChange={e => { setLanguage(e.target.value); setPage(1); }}
                          className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50">
                          {LANGUAGES.map(l => <option key={l} value={l}>{l === 'all' ? 'Semua' : LANG_LABELS[l]?.label || l}</option>)}
                        </select>
                      </div>
                      {/* Evidence */}
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Evidence Level</label>
                        <select value={evidenceLevel} onChange={e => { setEvidenceLevel(e.target.value); setPage(1); }}
                          className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50">
                          {EVIDENCE_LEVELS.map(e => <option key={e} value={e}>{e === 'all' ? 'Semua Level' : `Level ${e}`}</option>)}
                        </select>
                      </div>
                      {/* Year From */}
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Dari Tahun</label>
                        <input type="number" min={1996} max={yearTo} value={yearFrom}
                          onChange={e => { setYearFrom(Number(e.target.value)); setPage(1); }}
                          className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50" />
                      </div>
                      {/* Year To */}
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Sampai Tahun</label>
                        <input type="number" min={yearFrom} max={2026} value={yearTo}
                          onChange={e => { setYearTo(Number(e.target.value)); setPage(1); }}
                          className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50" />
                      </div>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button onClick={resetFilters} className="mt-3 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
                        <X size={11} /> Reset semua filter
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Articles Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 border border-slate-800/40 animate-pulse">
                    <div className="h-4 bg-slate-800 rounded mb-3 w-2/3" />
                    <div className="h-3 bg-slate-800 rounded mb-2 w-full" />
                    <div className="h-3 bg-slate-800 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="glass-card p-12 border border-slate-800/40 text-center">
                <Search size={40} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">Tidak ada artikel yang cocok dengan filter yang dipilih.</p>
                <button onClick={resetFilters} className="mt-4 btn-secondary text-xs">Reset Filter</button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={`${domain}-${language}-${evidenceLevel}-${search}-${page}`}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {articles.map(article => (
                    <ArticleCard key={article.id} article={article} onClick={() => setSelectedArticle(article)} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary flex items-center gap-1 text-xs disabled:opacity-40">
                  <ChevronLeft size={14} /> Prev
                </button>
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  const pageNum = page <= 4 ? i + 1 : page + i - 3;
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${pageNum === page ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn-secondary flex items-center gap-1 text-xs disabled:opacity-40">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}

            <p className="text-center text-xs text-slate-600 mt-4">
              Halaman {page} dari {totalPages} · {total.toLocaleString('id-ID')} artikel penelitian Indonesia terverifikasi (1996–2026)
            </p>
          </motion.div>
        </div>
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <ArticleDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
