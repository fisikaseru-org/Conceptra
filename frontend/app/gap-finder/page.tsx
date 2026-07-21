'use client';

import { useEffect, useState } from 'react';
import { Search, AlertTriangle, TrendingUp, BarChart3, Zap, CheckCircle, ArrowRight, Grid } from 'lucide-react';
import { getGapAnalysis, getAssessmentEffectiveness, getTimeline, getGapMatrix } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';

const PRIORITY_CONFIG: Record<string, { color: string; label: string; bgClass: string; badge: string }> = {
  high: { color: '#f43f5e', label: 'Gap Tinggi', bgClass: 'border-rose-500/20 bg-rose-500/5', badge: 'badge-rose' },
  medium: { color: '#f59e0b', label: 'Gap Sedang', bgClass: 'border-amber-500/20 bg-amber-500/5', badge: 'badge-amber' },
  low: { color: '#10b981', label: 'Gap Rendah', bgClass: 'border-emerald-500/20 bg-emerald-500/5', badge: 'badge-emerald' },
};

const TOOL_METRICS: Record<string, { label: string; desc: string; rating: string; iconColor: string }> = {
  'Four-Tier Diagnostic Test': {
    label: 'Standard Emas',
    desc: 'Memisahkan pilihan jawaban, alasan, serta keyakinan untuk membedakan miskonsepsi murni dengan tebakan secara akurat.',
    rating: 'Akurasi Maksimal (Tier 4)',
    iconColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  },
  'Four-Tier Test': {
    label: 'Standard Emas',
    desc: 'Memisahkan pilihan jawaban, alasan, serta keyakinan untuk membedakan miskonsepsi murni dengan tebakan secara akurat.',
    rating: 'Akurasi Maksimal (Tier 4)',
    iconColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  },
  'Three-Tier Test': {
    label: 'Rekomendasi Utama',
    desc: 'Menambahkan satu tingkat alasan di bawah pilihan ganda untuk menelusuri logika berpikir siswa.',
    rating: 'Akurasi Tinggi (Tier 3)',
    iconColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10'
  },
  'Certainty of Response Index (CRI)': {
    label: 'Praktis & Cepat',
    desc: 'Menggunakan skala keyakinan 0-5 berdampingan dengan soal ujian reguler untuk mengukur tingkat keraguan siswa.',
    rating: 'Akurasi Sedang',
    iconColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  },
  'Force Concept Inventory': {
    label: 'Standar Global',
    desc: 'Soal pilihan ganda terstandardisasi internasional khusus untuk mengukur miskonsepsi pada bidang Mekanika Newton.',
    rating: 'Terstandardisasi',
    iconColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10'
  },
  'Concept Mapping Assessment': {
    label: 'Kualitatif',
    desc: 'Menggambar peta hubungan antar konsep untuk menilai struktur kognitif siswa secara holistik.',
    rating: 'Analisis Struktur',
    iconColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
  },
  'Thermal Concept Evaluation': {
    label: 'Spesifik Bidang',
    desc: 'Instrumen terstandardisasi khusus untuk mendeteksi miskonsepsi termal dan termodinamika.',
    rating: 'Fokus Termal',
    iconColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const fullName = payload[0].payload.fullName || label;
    return (
      <div className="glass-card px-4 py-3 text-sm">
        <p className="text-white font-medium mb-1">{fullName}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs">
            {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function GapFinderPage() {
  const [gaps, setGaps] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any>(null);
  const [gapMatrix, setGapMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gaps' | 'matrix' | 'assessments' | 'events'>('gaps');

  useEffect(() => {
    Promise.all([
      getGapAnalysis(),
      getAssessmentEffectiveness(),
      getTimeline(),
      getGapMatrix().catch(() => null),
    ]).then(([g, a, t, gm]) => {
      setGaps(g.gaps as any[]);
      setAssessments(a.data as any[]);
      setTimeline(t);
      if (gm) setGapMatrix(gm);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const radarData = gaps.slice(0, 8).map(g => ({
    domain: g.domain?.length > 12 ? g.domain.slice(0, 12) + '..' : g.domain,
    fullDomain: g.domain,
    coverage: g.research_coverage_pct,
    gap: parseFloat((g.gap_score * 100).toFixed(1)),
  }));

  const assessmentChartData = assessments.map(a => ({
    tool: a.tool.length > 15 ? a.tool.slice(0, 15) + '...' : a.tool,
    fullName: a.tool,
    misconceptions_detected: a.misconceptions_detected,
    domains_covered: a.domains_covered
  }));

  const keyEvents = (timeline?.key_events || []) as any[];

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="badge badge-amber mb-2">
            <Search size={11} className="mr-1" /> Gap Finder
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Analisis Gap Penelitian</h1>
          <p className="text-[#4a6fa5]">
            Identifikasi domain miskonsepsi yang kurang diteliti, sparsity graph, dan rekomendasi prioritas riset
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-[#0d1525] border border-[#1e3a5f] rounded-xl p-1 mb-6 w-fit">
          {[
            { id: 'gaps', label: 'Domain Gaps', icon: AlertTriangle },
            { id: 'matrix', label: 'Gap Matrix', icon: Grid },
            { id: 'assessments', label: 'Efektivitas Asesmen', icon: BarChart3 },
            { id: 'events', label: 'Timeline Events', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? 'bg-amber-600 text-white' : 'text-[#4a6fa5] hover:text-white'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-64 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Gap Matrix Tab — GMD §8.2 Halaman 5 */}
            {activeTab === 'matrix' && gapMatrix && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-white mb-1">Gap Matrix — Miskonsepsi Domain × Intervensi</h2>
                    <p className="text-slate-400 text-sm">Setiap sel menunjukkan kedalaman riset: Hijau = Banyak diteliti · Kuning = Terbatas · Oranye = Sangat Terbatas · Merah = GAP (belum ada studi)</p>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {Object.entries(gapMatrix.color_map || {}).map(([level, color]: [string, any]) => (
                      <div key={level} className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: color + '60', border: `1px solid ${color}` }} />
                        <span className="text-xs text-slate-400 capitalize">{level.replace('-', ' ')}</span>
                      </div>
                    ))}
                  </div>
                  {/* Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left text-slate-400 font-medium p-2 text-xs w-28">Domain</th>
                          {gapMatrix.interventions?.map((iv: string) => (
                            <th key={iv} className="text-center p-2 text-xs text-slate-400 font-medium min-w-[80px]">
                              {gapMatrix.intervention_labels?.[iv] || iv}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gapMatrix.data?.map((row: any) => (
                          <tr key={row.domain} className="border-t border-slate-800/50">
                            <td className="p-2 text-slate-300 text-xs font-medium">{row.domain}</td>
                            {gapMatrix.interventions?.map((iv: string) => {
                              const level = row[iv] || 'none';
                              const color = gapMatrix.color_map?.[level] || '#ef4444';
                              return (
                                <td key={iv} className="p-1.5 text-center">
                                  <div
                                    className="rounded-lg py-1.5 px-1 text-[10px] font-semibold mx-auto"
                                    style={{ backgroundColor: color + '25', color, border: `1px solid ${color}40` }}
                                    title={`${row.domain} × ${iv}: ${level}`}
                                  >
                                    {level === 'well-studied' ? '●●●' : level === 'moderate' ? '●●' : level === 'limited' ? '●' : '○'}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total GAP Kritis', value: gapMatrix.summary?.critical_gaps, sublabel: `${gapMatrix.summary?.critical_gap_percentage}% dari semua sel`, color: '#ef4444' },
                    { label: 'Domain Paling Terabaikan', value: gapMatrix.summary?.most_neglected_domain, sublabel: 'Sedikit penelitian intervensi', color: '#f97316' },
                    { label: 'Domain Terbaik Diteliti', value: gapMatrix.summary?.best_covered_domain, sublabel: 'Coverage intervensi tinggi', color: '#10b981' },
                  ].map(({ label, value, sublabel, color }) => (
                    <div key={label} className="glass-card p-5" style={{ borderLeft: `3px solid ${color}` }}>
                      <p className="text-xs text-slate-400 mb-1">{label}</p>
                      <p className="text-xl font-bold" style={{ color }}>{value}</p>
                      <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps Tab */}
            {activeTab === 'gaps' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Radar Chart */}
                <div className="glass-card p-6 lg:col-span-1">
                  <h2 className="font-semibold text-white mb-4">Radar Gap Score vs Coverage</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1e3a5f" />
                      <PolarAngleAxis dataKey="domain" tick={{ fill: '#4a6fa5', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4a6fa5', fontSize: 10 }} />
                      <Radar name="Coverage %" dataKey="coverage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                      <Radar name="Gap Score" dataKey="gap" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} strokeWidth={2} />
                      <Legend formatter={(v) => <span className="text-xs text-[#8fb3d8]">{v}</span>} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Gap Cards */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-[#4a6fa5] mb-1">
                    <Zap size={14} className="text-amber-400" />
                    Domain diurutkan berdasarkan prioritas gap penelitian
                  </div>
                  {gaps.map((g: any, i: number) => {
                    const cfg = PRIORITY_CONFIG[g.priority] || PRIORITY_CONFIG.low;
                    return (
                      <div key={i} className={`glass-card p-4 border ${cfg.bgClass} animate-slide-in`}
                           style={{ animationDelay: `${i * 0.04}s` }}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white">{g.domain}</h3>
                              <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                            </div>
                            <p className="text-xs text-[#4a6fa5]">{g.recommendation}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-bold" style={{ color: cfg.color }}>
                              {(g.gap_score * 100).toFixed(0)}
                            </div>
                            <div className="text-[10px] text-[#4a6fa5]">gap score</div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div>
                            <span className="text-[#4a6fa5]">Coverage: </span>
                            <span className="text-[#8fb3d8]">{g.research_coverage_pct}%</span>
                          </div>
                          <div>
                            <span className="text-[#4a6fa5]">Miskonsepsi: </span>
                            <span className="text-[#8fb3d8]">{g.misconception_count}</span>
                          </div>
                          <div>
                            <span className="text-[#4a6fa5]">Alat asesmen: </span>
                            <span className="text-[#8fb3d8]">{g.remediation_tool_diversity}</span>
                          </div>
                        </div>
                        {/* Coverage bar */}
                        <div className="mt-3 h-1.5 bg-[#0a0f1e] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ 
                                 width: `${g.research_coverage_pct}%`,
                                 background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`
                               }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assessments Tab */}
            {activeTab === 'assessments' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="font-semibold text-white mb-2">Efektivitas Instrumen Asesmen</h2>
                  <p className="text-[#4a6fa5] text-sm mb-6">
                    Seberapa banyak miskonsepsi yang dapat dideteksi oleh setiap instrumen
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={assessmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="tool" tick={{ fill: '#4a6fa5', fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: '#4a6fa5', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="misconceptions_detected" name="Miskonsepsi Terdeteksi" fill="#6366f1" opacity={0.85} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="domains_covered" name="Domain Tercakup" fill="#10b981" opacity={0.85} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(assessments as any[]).map((a: any, i: number) => {
                    const pct = a.coverage_breadth_pct || a.coverage_breadth || 0;
                    const info = TOOL_METRICS[a.tool] || {
                      label: 'Instrumen Tes',
                      desc: 'Digunakan untuk mendeteksi miskonsepsi spesifik dalam riset fisika.',
                      rating: 'Deteksi Standar',
                      iconColor: 'text-slate-400 border-slate-500/30 bg-slate-500/10'
                    };
                    const isGold = a.tool.includes("Four-Tier") || a.tool.includes("four-tier");

                    return (
                      <div key={i} className={`glass-card p-5 border relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${isGold ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]' : 'border-slate-800'}`}>
                        {isGold && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-slate-900 font-extrabold text-[9px] px-2 py-0.5 rounded-bl uppercase tracking-wider">
                            Standard Emas
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">{info.label}</span>
                            <h3 className="font-bold text-white text-base leading-snug">{a.tool}</h3>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[40px]">{info.desc}</p>
                        
                        <div className="space-y-2 pt-3 border-t border-slate-800/60">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#4a6fa5]">Klasifikasi Asesmen</span>
                            <span className="text-slate-300 font-semibold">{info.rating}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[#4a6fa5]">Miskonsepsi Terdeteksi</span>
                            <span className="text-purple-400 font-bold">{a.misconceptions_detected}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[#4a6fa5]">Cakupan Domain</span>
                            <span className="text-emerald-400 font-bold">{a.domains_covered} Kategori</span>
                          </div>
                          <div className="flex justify-between text-xs items-center pt-1">
                            <span className="text-[#4a6fa5]">Luas Cakupan (Breadth)</span>
                            <span className="text-blue-400 font-bold">{pct}%</span>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 bg-[#0a0f1e] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isGold ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                               style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Workflow Asesmen Diagnostik */}
                <div className="glass-card p-6 mt-6">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Zap size={18} className="text-amber-400 font-bold" />
                    Alur &amp; Tahapan Konstruksi Asesmen Diagnostik Efektif
                  </h3>
                  <p className="text-[#4a6fa5] text-sm mb-6">
                    Metodologi ilmiah terstandar untuk membangun instrumen tes diagnostik multi-tier fisika yang valid dan bebas bias.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative">
                    {/* Progress Connecting Line */}
                    <div className="hidden md:block absolute top-7 left-12 right-12 h-0.5 bg-slate-800 z-0" />
                    
                    {[
                      { step: 1, name: "Pemetaan Konsep", desc: "Menganalisis kurikulum, memetakan konsep fisika dasar, dan hubungan prasyarat.", color: "#3b82f6" },
                      { step: 2, name: "Studi Awal (Wawancara)", desc: "Wawancara semi-terstruktur pada siswa untuk menggali pemahaman awal secara kualitatif.", color: "#8b5cf6" },
                      { step: 3, name: "Uji Soal Terbuka", desc: "Mengujikan soal uraian terbuka untuk mengumpulkan ragam alasan jawaban siswa.", color: "#f59e0b" },
                      { step: 4, name: "Penyusunan Distraktor", desc: "Menformulasikan pilihan jawaban &amp; opsi alasan berdasarkan hasil tes terbuka.", color: "#ec4899" },
                      { step: 5, name: "Konstruksi Multi-Tier", desc: "Menyusun draf soal dengan menyisipkan tingkat keyakinan (CRI) di tiap tier.", color: "#10b981" },
                      { step: 6, name: "Validasi Psikometris", desc: "Uji validitas isi oleh pakar, reliabilitas, dan eliminasi false positives.", color: "#06b6d4" },
                    ].map((s, idx) => (
                      <div key={idx} className="relative z-10 text-center flex flex-col items-center">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border-2 shadow-lg mb-3"
                          style={{ 
                            backgroundColor: `${s.color}15`, 
                            borderColor: s.color, 
                            color: s.color 
                          }}
                        >
                          {s.step}
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 mb-1">{s.name}</h4>
                        <p className="text-[10px] text-[#4a6fa5] leading-relaxed px-1">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && keyEvents.length > 0 && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="font-semibold text-white mb-6">Timeline Event Kunci 1996–2026</h2>
                  <div className="relative pl-8">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-amber-500" />
                    {keyEvents.map((evt: any, i: number) => {
                      const typeColors: Record<string, string> = {
                        milestone: '#3b82f6',
                        research: '#8b5cf6',
                        disruption: '#f43f5e',
                        finding: '#f59e0b',
                        technology: '#10b981',
                      };
                      const color = typeColors[evt.type] || '#4a6fa5';
                      return (
                        <div key={i} className="relative mb-6 animate-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                          <div className="absolute -left-[26px] w-4 h-4 rounded-full border-2 border-[#070b14]"
                               style={{ background: color }} />
                          <div className="glass-card p-4" style={{ borderLeft: `3px solid ${color}` }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-bold" style={{ color }}>{evt.year}</span>
                              <span className="badge text-xs" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                                {evt.type}
                              </span>
                            </div>
                            <p className="text-[#e2e8f0] text-sm">{evt.event}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
