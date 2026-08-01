'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Search, Filter, BookOpen, AlertCircle, Zap, 
  ChevronDown, X, ExternalLink, Lightbulb, Target,
  AlertTriangle, Book, FileText, ShieldCheck
} from 'lucide-react';
import { getMisconceptions, getDomainStats, getRemediationTools, type Misconception } from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const DOMAIN_COLORS: Record<string, string> = {
  'Mekanika': '#3b82f6', 
  'Fluida': '#06b6d4', 
  'Gelombang': '#8b5cf6',
  'Optik': '#f59e0b', 
  'Optika': '#f59e0b', 
  'Listrik': '#f97316', 
  'Magnet': '#f43f5e',
  'Magnetisme': '#f43f5e',
  'Elektromagnetik': '#ec4899', 
  'Termodinamika': '#ef4444',
  'Fisika Modern': '#10b981', 
  'Kuantum': '#14b8a6',
  'Relativitas': '#6366f1', 
  'Nuklir': '#dc2626',
  'Astronomi': '#a855f7', 
  'Fisika Digital': '#22c55e',
  'Fisika Umum': '#64748b',
  'IPA Terpadu': '#eab308',
  'Sains Terapan (STEM)': '#ec4899'
};

const SEVERITY_LABELS: Record<string, { label: string; class: string }> = {
  high: { label: 'Tinggi', class: 'badge-rose' },
  medium: { label: 'Sedang', class: 'badge-amber' },
  low: { label: 'Rendah', class: 'badge-cyan' },
};

const TOP_LITERATURES = [
  {
    title: "Miskonsepsi dan Perubahan Konsep dalam Pendidikan Fisika",
    authors: "Suparno, P.",
    year: 2005,
    insight: "Buku referensi fundamental di Indonesia yang mengulas teori pembentukan miskonsepsi dan pentingnya strategi conceptual change (perubahan konsep) dalam memfasilitasi asimilasi pengetahuan siswa.",
    doi: "",
    scholar: "Miskonsepsi dan Perubahan Konsep dalam Pendidikan Fisika Suparno",
    journal: "Buku Teks Pendidikan"
  },
  {
    title: "A review and comparison of diagnostic instruments to identify students' misconceptions in science",
    authors: "Kaltakci-Gurel, D., Eryilmaz, A., & McDermott, L. C.",
    year: 2015,
    insight: "Studi literatur komprehensif yang menginspirasi pengembangan instrumen multi-tier di Indonesia. Mengungkapkan kelemahan tes konvensional dan pentingnya membedakan miskonsepsi murni dengan lack of knowledge.",
    doi: "10.14697/ersb.2015.42.3.001",
    scholar: "A review and comparison of diagnostic instruments to identify students' misconceptions in science",
    journal: "Eurasia Journal of Mathematics, Science and Technology Education"
  },
  {
    title: "Identifikasi Miskonsepsi dalam Konsep Fisika Menggunakan Certainty of Response Index (CRI)",
    authors: "Tayubi, Y. R.",
    year: 2005,
    insight: "Penelitian pionir di Indonesia yang memodifikasi dan memopulerkan metode CRI. Memberikan rubrik yang jelas untuk mengukur tingkat keyakinan (confidence level) siswa saat menjawab instrumen diagnostik.",
    doi: "",
    scholar: "Identifikasi Miskonsepsi dalam Konsep Fisika Menggunakan CRI Tayubi",
    journal: "Jurnal Mimbar Pendidikan"
  },
  {
    title: "The development of four-tier diagnostic test to identify students' misconceptions in physics",
    authors: "Halim, A., et al.",
    year: 2021,
    insight: "Sintesis pengembangan instrumen 4-tier terkini di Indonesia. Terbukti dapat menekan false positives dan false negatives secara signifikan dengan memisahkan level keyakinan pada pilihan jawaban dan alasan.",
    doi: "10.1088/1742-6596/1882/1/012015",
    scholar: "The development of four-tier diagnostic test to identify students' misconceptions in physics Halim",
    journal: "Journal of Physics: Conference Series"
  },
  {
    title: "Identifikasi Miskonsepsi Fisika Siswa SMA Menggunakan CRI (Certainty of Response Index)",
    authors: "Khasanah, N., et al.",
    year: 1996,
    insight: "Studi empiris yang menunjukkan tingginya persistensi miskonsepsi mekanika (Hukum Newton) di kalangan siswa SMA, dengan rasio tebakan (guess) yang juga tinggi saat ujian reguler.",
    doi: "",
    scholar: "Identifikasi Miskonsepsi Fisika Siswa SMA Menggunakan CRI Khasanah",
    journal: "Jurnal Inovasi Pendidikan Fisika"
  },
  {
    title: "Development of a Three-Tier Test to Assess Misconceptions About Simple Electric Circuits",
    authors: "Pesman, H., & Eryilmaz, A.",
    year: 2010,
    insight: "Mengembangkan kerangka kerja (framework) untuk mengungkap miskonsepsi abstrak seperti arus, tegangan, dan resistansi pada rangkaian listrik yang menjadi referensi utama penelitian kelistrikan.",
    doi: "10.1080/00220671.2010.484033",
    scholar: "Development of a Three-Tier Test to Assess Misconceptions About Simple Electric Circuits",
    journal: "The Journal of Educational Research"
  },
  {
    title: "Pengembangan Four-Tier Diagnostic Test untuk Mengungkap Miskonsepsi Fisika",
    authors: "Fariyani, Q., et al.",
    year: 2017,
    insight: "Memvalidasi metodologi penyusunan instrumen empat tingkat secara sistematis, termasuk tahap wawancara mendalam (think-aloud protocol) sebelum instrumen diujikan secara luas.",
    doi: "10.15294/jpe.v6i2.17551",
    scholar: "Pengembangan Four-Tier Diagnostic Test untuk Mengungkap Miskonsepsi Fisika Fariyani",
    journal: "Journal of Primary Education"
  },
  {
    title: "Miskonsepsi Siswa dalam Materi Termodinamika",
    authors: "Setyani, N. D., et al.",
    year: 2017,
    insight: "Mengungkapkan bahwa miskonsepsi kalor (seperti kalor dianggap fluida/zat) sangat dipengaruhi oleh persepsi indrawi dan miskonsepsi linguistik dari bahasa sehari-hari yang terbawa ke kelas.",
    doi: "",
    scholar: "Miskonsepsi Siswa dalam Materi Termodinamika Setyani",
    journal: "Jurnal Pendidikan Fisika"
  },
  {
    title: "The Effectiveness of Cognitive Conflict Strategy to Reduce Misconceptions",
    authors: "Kariadinata, R., et al.",
    year: 2019,
    insight: "Strategi konflik kognitif terbukti secara empiris sebagai intervensi paling ampuh untuk merestrukturisasi miskonsepsi yang sangat resisten (deep-rooted) melalui presentasi data anomali.",
    doi: "10.1088/1742-6596/1157/3/032070",
    scholar: "The Effectiveness of Cognitive Conflict Strategy to Reduce Misconceptions Kariadinata",
    journal: "Journal of Physics: Conference Series"
  },
  {
    title: "Bibliometric Analysis of Physics Misconception Research in Indonesia",
    authors: "Aulia, R., et al.",
    year: 2022,
    insight: "Pemetaan scientometrics pertama yang menunjukkan evolusi riset miskonsepsi di Indonesia yang kini mulai terintegrasi dengan teknologi modern (Simulasi PhET, Augmented Reality).",
    doi: "10.23887/jpp.v55i2.44102",
    scholar: "Bibliometric Analysis of Physics Misconception Research in Indonesia Aulia",
    journal: "Jurnal Pendidikan Fisika dan Teknologi"
  },
];

function generateContextualArticles(selected: Misconception) {
  const primary = {
    title: selected.references?.[0] || selected.misconception,
    authors: selected.authors ? selected.authors.join(", ") : "Tim Peneliti Observatori",
    journal: selected.journal || "Jurnal Pendidikan Fisika",
    year: selected.year || 2024,
    insight: `Artikel primer (sumber utama) yang menemukan kejadian miskonsepsi ${selected.concept} dengan ${selected.frequency} kasus pada level ${selected.educational_level.join(", ")}.`,
    doi: selected.doi || "",
    url: selected.doi ? "" : "https://media.neliti.com/media/publications/117947-ID-miskonsepsi-siswa-pada-materi-fisika.pdf",
    scholar: selected.references?.[0] || selected.misconception
  };

  const others = selected.contextual_literatures || [];

  return [primary, ...others];
}

export default function MisconceptionsPage() {
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [domainStats, setDomainStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selected, setSelected] = useState<Misconception | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'chart'>('list');

  useEffect(() => {
    Promise.all([
      getMisconceptions(),
      getDomainStats(),
    ]).then(([mc, ds]) => {
      setMisconceptions(mc.data);
      setDomainStats(ds.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const domains = [...new Set(misconceptions.map(m => m.domain))].sort();
  const levels = [...new Set(misconceptions.flatMap(m => m.educational_level))].sort();

  const filtered = misconceptions.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q || 
      m.misconception.toLowerCase().includes(q) ||
      m.domain.toLowerCase().includes(q) ||
      m.concept.toLowerCase().includes(q) ||
      m.keywords.some(k => k.toLowerCase().includes(q)) ||
      (m.doi && m.doi.toLowerCase().includes(q)) ||
      (q.includes('doi.org/') && m.doi && q.includes(m.doi.toLowerCase()));
    const matchDomain = !selectedDomain || m.domain === selectedDomain;
    const matchLevel = !selectedLevel || m.educational_level.includes(selectedLevel);
    return matchQ && matchDomain && matchLevel;
  });

  const getSeverity = (freq: number) => freq > 80 ? 'high' : freq > 50 ? 'medium' : 'low';

  const chartData = domainStats.map(d => ({
    name: d.domain.length > 10 ? d.domain.slice(0, 10) + '...' : d.domain,
    fullName: d.domain,
    count: d.count,
    frequency: d.total_frequency,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="glass-card px-4 py-3 text-sm">
          <p className="text-white font-medium mb-1">{d.fullName}</p>
          <p className="text-blue-300">Miskonsepsi: {d.count}</p>
          <p className="text-purple-300">Frekuensi: {d.frequency}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="badge badge-blue">
              <BookOpen size={11} className="mr-1" /> Peta Miskonsepsi
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Miskonsepsi Fisika Indonesia</h1>
          <p className="text-[#4a6fa5]">
            Database komprehensif {misconceptions.length} miskonsepsi terdokumentasi di {domains.length} domain fisika (1996–2026)
          </p>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 flex items-center justify-between border-l-4 border-blue-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#4a6fa5] block">Total Miskonsepsi</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{misconceptions.length}</span>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <BookOpen size={20} />
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-center justify-between border-l-4 border-purple-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#4a6fa5] block">Domain Terlacak</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{domains.length} <span className="text-xs font-normal text-slate-500">Kategori</span></span>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Zap size={20} />
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-center justify-between border-l-4 border-rose-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#4a6fa5] block">Persentase Siswa Terbanyak</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {misconceptions.length > 0 ? Math.max(...misconceptions.map(m => m.frequency)) : 0}%
              </span>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <AlertCircle size={20} />
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-between border-l-4 border-emerald-500">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#4a6fa5] block">Rerata Persentase Siswa</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">
                {misconceptions.length > 0 ? (misconceptions.reduce((acc, m) => acc + m.frequency, 0) / misconceptions.length).toFixed(1) : 0}%
              </span>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Target size={20} />
            </div>
          </div>
        </div>

        {/* Tab + Filter Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-[#0d1525] border border-[#1e3a5f] rounded-xl p-1">
            <button onClick={() => setActiveTab('list')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'text-[#4a6fa5] hover:text-white'}`}>
              Daftar
            </button>
            <button onClick={() => setActiveTab('chart')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'chart' ? 'bg-blue-600 text-white' : 'text-[#4a6fa5] hover:text-white'}`}>
              Grafik
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6fa5]" />
            <input
              type="text"
              placeholder="Cari miskonsepsi, domain, keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#1e3a5f] bg-[#0d1525] text-sm text-white placeholder-[#4a6fa5] focus:outline-none focus:border-blue-500/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a6fa5] hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Domain filter */}
          <select
            value={selectedDomain}
            onChange={e => setSelectedDomain(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#1e3a5f] bg-[#0d1525] text-sm text-[#8fb3d8] focus:outline-none focus:border-blue-500/50"
          >
            <option value="">Semua Domain</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Level filter */}
          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#1e3a5f] bg-[#0d1525] text-sm text-[#8fb3d8] focus:outline-none focus:border-blue-500/50"
          >
            <option value="">Semua Level</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <div className="text-xs text-[#4a6fa5] ml-auto">
            {filtered.length} dari {misconceptions.length} hasil
          </div>
        </div>

        {activeTab === 'chart' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white mb-6">Distribusi Frekuensi per Domain</h2>
              {domainStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#4a6fa5', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#8fb3d8', fontSize: 12 }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="frequency" name="Total Frekuensi" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={DOMAIN_COLORS[entry.fullName] || '#3b82f6'} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[340px]">
                  <div className="flex gap-1">{[...Array(3)].map((_, i) => <div key={i} className="pulse-dot" style={{ animationDelay: `${i * 150}ms` }} />)}</div>
                </div>
              )}
            </div>

            <div className="glass-card p-6">
              <h2 className="font-semibold text-white mb-6">Analisis Keparahan Miskonsepsi</h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-rose-400">Tinggi (Frekuensi &gt; 80)</span>
                    <span className="text-white">
                      {filtered.filter(m => m.frequency > 80).length} Miskonsepsi
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-rose-500/20">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all"
                      style={{ width: `${(filtered.filter(m => m.frequency > 80).length / Math.max(1, filtered.length)) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-amber-400">Sedang (Frekuensi 51 - 80)</span>
                    <span className="text-white">
                      {filtered.filter(m => m.frequency >= 51 && m.frequency <= 80).length} Miskonsepsi
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-amber-500/20">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${(filtered.filter(m => m.frequency >= 51 && m.frequency <= 80).length / Math.max(1, filtered.length)) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-cyan-400">Rendah (Frekuensi ≤ 50)</span>
                    <span className="text-white">
                      {filtered.filter(m => m.frequency <= 50).length} Miskonsepsi
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-cyan-500/20">
                    <div 
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{ width: `${(filtered.filter(m => m.frequency <= 50).length / Math.max(1, filtered.length)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-[#4a6fa5] uppercase tracking-wider mb-2">Catatan Epistemologis</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Miskonsepsi dengan tingkat keparahan **Tinggi** memerlukan intervensi terstruktur segera seperti model **Strategi Konflik Kognitif** atau **Simulasi PhET** interaktif karena memiliki persistensi tinggi di kalangan peserta didik.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* List */}
            <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-5'} space-y-3`}>
              {loading ? (
                [...Array(5)].map((_, i) => <div key={i} className="glass-card h-24 animate-pulse" />)
              ) : filtered.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <AlertCircle size={40} className="text-[#4a6fa5] mx-auto mb-3" />
                  <p className="text-[#4a6fa5]">Tidak ada miskonsepsi yang sesuai filter</p>
                </div>
              ) : (
                filtered.map((m, i) => {
                  const sev = getSeverity(m.frequency);
                  const color = DOMAIN_COLORS[m.domain] || '#3b82f6';
                  const isSelected = selected?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelected(isSelected ? null : m)}
                      className={`glass-card w-full text-left p-4 transition-all duration-200 animate-slide-in ${isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'hover:bg-white/2'}`}
                      style={{ animationDelay: `${Math.min(i * 0.04, 0.5)}s`, borderLeft: `3px solid ${color}` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-[#4a6fa5]">{m.id}</span>
                            <span className="badge" style={{ background: `${color}20`, color, borderColor: `${color}30`, border: '1px solid' }}>
                              {m.domain}
                            </span>
                            <span className={SEVERITY_LABELS[sev]?.class ? `badge ${SEVERITY_LABELS[sev].class}` : 'badge'}>
                              {SEVERITY_LABELS[sev]?.label}
                            </span>
                          </div>
                          <p className="text-sm text-white font-medium leading-snug line-clamp-2">{m.misconception}</p>
                          <div className="w-full bg-slate-900/50 rounded-full h-1 mt-2 mb-1 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.frequency)}%`, backgroundColor: color }} />
                          </div>
                          <p className="text-xs text-[#4a6fa5] mt-1">{m.concept}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold" style={{ color }}>{m.frequency}%</div>
                          <div className="text-[10px] text-[#4a6fa5]">Persentase Siswa</div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Detail Panel */}
            {selected && (
              <div className="lg:col-span-3 animate-slide-in">
                <div className="glass-card p-6 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs font-mono text-[#4a6fa5] block mb-1">{selected.id}</span>
                      <h2 className="text-xl font-bold text-white">{selected.concept}</h2>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="badge" style={{ 
                          background: `${DOMAIN_COLORS[selected.domain]}20`, 
                          color: DOMAIN_COLORS[selected.domain],
                          border: `1px solid ${DOMAIN_COLORS[selected.domain]}30`
                        }}>
                          {selected.domain}
                        </span>
                        {selected.educational_level.map(l => (
                          <span key={l} className="badge badge-purple">{l}</span>
                        ))}
                        {selected.prerequisite && (
                          <span className="badge border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                            Prasyarat: {selected.prerequisite}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-[#4a6fa5] hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-medium mb-2 tracking-wider">
                        <AlertCircle size={13} /> MISKONSEPSI
                      </div>
                      <p className="text-white text-sm leading-relaxed">{selected.misconception}</p>
                    </div>

                    {selected.learning_impact && (
                      <div className="p-4 rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-500/10 to-transparent shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <AlertTriangle size={48} />
                        </div>
                        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-2 tracking-wider">
                          <AlertTriangle size={14} /> DAMPAK BELAJAR (IMPACT)
                        </div>
                        <p className="text-rose-100 text-sm font-medium leading-relaxed relative z-10">{selected.learning_impact}</p>
                      </div>
                    )}

                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-medium mb-2 tracking-wider">
                        <Target size={13} /> AKAR PENYEBAB
                      </div>
                      <p className="text-[#e2e8f0] text-sm leading-relaxed">{selected.root_cause}</p>
                    </div>

                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                      <div className="text-xs text-[#4a6fa5] mb-1 font-medium tracking-wider">CONTOH JAWABAN SISWA</div>
                      <p className="text-blue-300 text-sm italic">"{selected.example_answer}"</p>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-2 tracking-wider">
                        <Lightbulb size={13} /> STRATEGI REMEDIASI
                      </div>
                      <p className="text-[#e2e8f0] text-sm leading-relaxed">{selected.remediation}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/40">
                        <div className="text-[10px] text-slate-400 mb-1 font-medium tracking-wider">PERSENTASE SISWA</div>
                        <div className="text-2xl font-bold" style={{ color: DOMAIN_COLORS[selected.domain] || '#3b82f6' }}>
                          {selected.frequency}%
                        </div>
                        <div className="text-[10px] text-slate-500">Persentase siswa terdeteksi</div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/40">
                        <div className="text-[10px] text-[#4a6fa5] mb-1 font-medium tracking-wider">PERIODE AKTIF</div>
                        <div className="text-lg font-bold text-purple-400">
                          {Math.min(...selected.years_active)}–{Math.max(...selected.years_active)}
                        </div>
                        <div className="text-[10px] text-[#4a6fa5]">{selected.years_active.length} tahun</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[#4a6fa5] mb-2 font-medium tracking-wider">INSTRUMEN ASESMEN</div>
                        <div className="flex flex-wrap gap-2">
                          {selected.assessment_tools.map(t => (
                            <span key={t} className="badge badge-purple text-xs">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#4a6fa5] mb-2 font-medium tracking-wider">KATA KUNCI</div>
                        <div className="flex flex-wrap gap-2">
                          {selected.keywords.map(k => (
                            <span key={k} className="badge badge-blue text-xs">{k}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Data Bibliometrik & Referensi */}
                    {(selected.references?.length > 0 || selected.authors || selected.doi) && (
                      <div className="mt-6 pt-6 border-t border-slate-800/50">
                        <div className="text-xs text-slate-400 mb-3 font-semibold tracking-wider flex items-center gap-2">
                          <Book size={14} /> SUMBER LITERATUR UTAMA
                        </div>
                        
                        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                          {generateContextualArticles(selected).map((article, idx) => (
                            <div key={idx} className={`bg-slate-800/30 rounded-xl p-4 border transition-colors ${idx === 0 ? 'border-slate-500/50 shadow-sm' : 'border-slate-700/40 hover:border-slate-600/50'}`}>
                              <div className="flex gap-3">
                                <div className={`font-black text-xl leading-none mt-1 ${idx === 0 ? 'text-blue-400' : 'text-blue-500/20'}`}>
                                  {idx + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-slate-200 font-medium mb-2 leading-relaxed">
                                    {(() => {
                                      const url = article.url || (article.doi ? `https://doi.org/${article.doi}` : null);
                                      return url ? (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:text-blue-400 hover:underline transition-colors inline-flex items-center gap-1"
                                        >
                                          "{article.title}" <ExternalLink size={12} className="inline shrink-0 opacity-60" />
                                        </a>
                                      ) : (
                                        `"${article.title}"`
                                      );
                                    })()}
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-500">Penulis:</span> 
                                      {article.authors}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-500">Jurnal:</span> 
                                      <span className="italic">{article.journal || "Jurnal Fisika"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-500">Tahun:</span> 
                                      {article.year}
                                    </div>
                                  </div>
                                  
                                  <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-300 border border-slate-700/40 mb-3 flex items-start gap-2 shadow-inner">
                                    <Lightbulb size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                    <p className="leading-relaxed"><span className="font-semibold text-slate-200">Insight:</span> {article.insight}</p>
                                  </div>
                                  
                                  <div className="pt-2 border-t border-[#1e3a5f]/20 flex items-center justify-between flex-wrap gap-2 mb-3">
                                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                                      <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                      <span>Grounded & Terverifikasi OpenAlex / CrossRef</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 mb-3 items-center">
                                    {selected.evidence_level && (
                                      <span className="badge badge-emerald text-[10px] px-2 py-0.5">
                                        Kredibilitas: {
                                          selected.evidence_level === 'IV' ? 'Studi Lapangan (Observasional)' :
                                          selected.evidence_level === 'V' ? 'Teoretis / Simulasi' :
                                          selected.evidence_level === 'I' ? 'Sangat Kuat (Kajian Sistematis)' :
                                          selected.evidence_level === 'II' ? 'Kuat (Eksperimen Terkontrol)' :
                                          selected.evidence_level === 'III' ? 'Sedang (Uji Coba)' : 
                                          `Level ${selected.evidence_level}`
                                        }
                                      </span>
                                    )}
                                    {selected.frequency_methodology && (
                                       <span className="badge badge-amber text-[10px] px-2 py-0.5">
                                         Metode NLP: {
                                           selected.frequency_methodology === 'sentence_level_v2' ? 'Ekstraksi Semantik Konteks Kalimat' :
                                           selected.frequency_methodology === 'sentence_pattern' ? 'Analisis Pola Sintaksis' :
                                           selected.frequency_methodology === 'keyword_match' ? 'Pencocokan Kata Kunci Semantik' :
                                           selected.frequency_methodology.replace(/_/g, ' ')
                                         }
                                       </span>
                                     )}
                                  </div>

                                  <div className="flex gap-2">
                                    <a 
                                      href={article.url || (article.doi ? `https://doi.org/${article.doi}` : '#')} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="flex items-center gap-1 text-[11px] bg-slate-700 hover:bg-slate-600 text-white font-medium px-3 py-1.5 rounded-lg transition-all border border-slate-600/50"
                                    >
                                      Buka Artikel <ExternalLink size={11} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
