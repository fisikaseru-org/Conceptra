'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, Map, TrendingUp, Network, Shield, Binary, Search, Database, Layers,
  AlertTriangle, BarChart3, Zap, ArrowRight, Activity,
  GraduationCap, FlaskConical, BookOpen, Star, FileText, Info
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { getOverview, getTimeline, getDomainStats } from '@/lib/api';

const DOMAIN_COLORS: Record<string, string> = {
  'Fisika Umum': '#64748b',
  'Mekanika': '#3b82f6',
  'IPA Terpadu': '#eab308',
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
  'Sains Terapan (STEM)': '#ec4899',
};

const NAV_CARDS = [
  {
    href: '/misconceptions',
    icon: Map,
    title: 'Peta Miskonsepsi',
    desc: 'Jelajahi seluruh miskonsepsi terdokumentasi di berbagai domain fisika',
    color: '#3b82f6',
    gradient: 'from-blue-600/20 to-blue-800/5',
  },
  {
    href: '/explorer',
    icon: Database,
    title: 'Research Explorer',
    desc: 'Telusuri 10.720 artikel penelitian fisika konteks Indonesia dengan filter domain, tahun, dan bahasa',
    color: '#06b6d4',
    gradient: 'from-cyan-600/20 to-cyan-800/5',
  },
  {
    href: '/analytics',
    icon: Layers,
    title: 'Analitik Saintometrik',
    desc: 'Heatmap domain×tahun, citation impact, dan lanskap publikasi fisika',
    color: '#8b5cf6',
    gradient: 'from-purple-600/20 to-purple-800/5',
  },
  {
    href: '/topics',
    icon: TrendingUp,
    title: 'Evolusi Topik',
    desc: 'Temporal analysis BERTopic & Kleinberg Burst 1996–2026',
    color: '#8b5cf6',
    gradient: 'from-purple-600/20 to-purple-800/5',
  },
  {
    href: '/research-insights',
    icon: Search,
    title: 'Wawasan Penelitian',
    desc: 'Identifikasi area penelitian yang kurang tersentuh & efektivitas intervensi',
    color: '#f59e0b',
    gradient: 'from-amber-600/20 to-amber-800/5',
  },
  {
    href: '/tools',
    icon: Binary,
    title: 'NLP Tools',
    desc: 'Scientific Aspect Extractor & visualisasi 17-tahap NLP Pipeline',
    color: '#ec4899',
    gradient: 'from-pink-600/20 to-pink-800/5',
  },
  {
    href: '/knowledge-graph',
    icon: Network,
    title: 'Knowledge Graph',
    desc: 'Ontologi TBox/ABox dengan 80+ nodes dan 60+ relasi semantik',
    color: '#06b6d4',
    gradient: 'from-cyan-600/20 to-cyan-800/5',
  },
  {
    href: '/validation',
    icon: Shield,
    title: 'Validation Panel',
    desc: 'Metrik validitas ilmiah: Kappa, Precision/Recall, ECE, Audit bias',
    color: '#10b981',
    gradient: 'from-emerald-600/20 to-emerald-800/5',
  },
];

interface Overview {
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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-4 py-3 text-sm border border-slate-700/50 shadow-2xl">
        <p className="text-slate-400 mb-2 font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <p className="text-slate-200">
              {entry.name}: <span className="font-semibold text-white">{entry.value}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function HomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [domainData, setDomainData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOverview().catch(() => null),
      getTimeline().catch(() => null),
      getDomainStats().catch(() => null),
    ]).then(([ov, tl, ds]) => {
      if (ov) setOverview(ov);
      if (tl?.yearly_data) {
        setTimelineData((tl.yearly_data as any[]).map(d => ({
          year: d.year,
          active: d.total_active,
          freq: d.cumulative_frequency,
          covid: d.post_covid ? 1 : 0,
        })));
      }
      if (ds?.data) {
        setDomainData((ds.data as any[]).slice(0, 8).map(d => ({
          name: d.domain,
          value: d.total_frequency,
          count: d.count,
        })));
      }
      setLoading(false);
    });
  }, []);

  const stats = overview ? [
    {
      label: 'Total Miskonsepsi',
      value: overview.total_misconceptions,
      icon: AlertTriangle,
      color: '#ef4444',
      suffix: '',
      desc: 'Jumlah temuan kasus miskonsepsi fisika spesifik yang diidentifikasi dari artikel ilmiah.',
      link: '/misconceptions'
    },
    {
      label: 'Total Artikel',
      value: overview.total_articles,
      icon: FileText,
      color: '#f59e0b',
      suffix: '',
      desc: 'Jumlah seluruh publikasi dan jurnal ilmiah riset miskonsepsi fisika di Indonesia (1996–2026).',
      link: '/validation'
    },
    {
      label: 'Total Frekuensi',
      value: overview.total_frequency,
      icon: Activity,
      color: '#10b981',
      suffix: '',
      desc: 'Akumulasi total siswa atau responden yang terdeteksi mengalami miskonsepsi.',
      link: '/misconceptions'
    },
    {
      label: 'Domain Fisika',
      value: overview.total_domains,
      icon: BarChart3,
      color: '#8b5cf6',
      suffix: '',
      desc: 'Jumlah sub-materi/cabang materi fisika yang dianalisis (Mekanika, Termodinamika, Listrik, dll).',
      link: '/knowledge-graph'
    },
    {
      label: 'Tahun Penelitian',
      value: 30,
      icon: BookOpen,
      color: '#eab308',
      suffix: ' thn',
      desc: 'Rentang waktu publikasi riset pemetaan miskonsepsi fisika dari tahun 1996 hingga 2026.',
      link: '/topics'
    },
    {
      label: 'Alat Remediasi',
      value: overview.total_remediation_tools,
      icon: FlaskConical,
      color: '#06b6d4',
      suffix: '',
      desc: 'Jumlah alat/metode intervensi atau diagnostik yang digunakan (PhET, Four-Tier, CRI, VR/AR, dll).',
      link: '/gap-finder'
    },
    {
      label: 'Level Pendidikan',
      value: Object.keys(overview.level_distribution).length,
      icon: GraduationCap,
      color: '#f43f5e',
      suffix: '',
      desc: 'Jenjang pendidikan yang diteliti: Dua level (SMA dan Perguruan Tinggi).',
      details: Object.keys(overview.level_distribution),
      link: '/topics'
    },
  ] : [];

  const levelData = overview ? Object.entries(overview.level_distribution).map(([name, value]) => ({
    name, value
  })) : [];

  const LEVEL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-6 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700/50 bg-slate-800/40 text-sm text-slate-300 mb-8 backdrop-blur-md shadow-sm">
            <Zap size={14} className="text-blue-400" />
            <span className="font-medium">Physics Misconception Observatory · Indonesia 1996–2026</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500 drop-shadow-sm">
              Conceptra
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-6 font-light max-w-3xl mx-auto">
            Peta Pengetahuan Miskonsepsi Fisika Indonesia
          </p>

          <p className="text-slate-400 max-w-2xl mx-auto mb-6 text-lg leading-relaxed">
            Platform AI berbasis <strong className="text-slate-200 font-semibold">NLP</strong>, <strong className="text-slate-200 font-semibold">Knowledge Graph</strong>,
            dan <strong className="text-slate-200 font-semibold">GraphRAG</strong> untuk memetakan, menganalisis, dan meremediasi
            miskonsepsi fisika selama 3 dekade terakhir.
          </p>

          <div className="max-w-2xl mx-auto mb-10 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-200 text-xs md:text-sm flex items-start md:items-center gap-3 backdrop-blur-md shadow-lg shadow-amber-500/5">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5 md:mt-0" size={18} />
            <p className="text-left md:text-center leading-relaxed">
              <strong>Pemberitahuan:</strong> Seluruh dataset dan hasil analisis AI pada proyek observatori ini <strong>tetap memerlukan validasi ahli</strong> (pakar pendidikan fisika) sebelum digunakan untuk keperluan akademis atau praktis.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link href="/misconceptions">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-semibold flex items-center gap-3 transition-all shadow-lg shadow-white/5 border border-transparent"
              >
                <Map size={18} />
                Jelajahi Miskonsepsi
                <ArrowRight size={16} />
              </motion.button>
            </Link>
            <Link href="/validation">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 font-medium flex items-center gap-3 transition-all backdrop-blur-md"
              >
                <Shield size={18} />
                Metrik Validasi AI
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-32 space-y-8">

        {/* Stats Grid - Bento Style */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-4">
            {/* 3 Large Cards */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="col-span-2 md:col-span-2 lg:col-span-4 glass-card p-6 animate-pulse h-36" />
            ))}
            {/* 4 Small Cards */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="col-span-1 md:col-span-2 lg:col-span-3 glass-card p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-4"
          >
            {stats.map(({ label, value, icon: Icon, color, suffix, desc, details, link }, i) => {
              const isLarge = i < 3;
              const colSpan = isLarge
                ? "col-span-2 md:col-span-2 lg:col-span-4"
                : "col-span-1 md:col-span-2 lg:col-span-3";
              return (
                <Link href={link} key={i} className={`${colSpan} block focus:outline-none`}>
                  <motion.div
                    variants={itemVariants}
                    className={`glass-card p-6 group flex flex-col justify-between h-full relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div
                        className="p-2 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${color}15`, color: color }}
                      >
                        <Icon size={isLarge ? 24 : 20} />
                      </div>
                    </div>

                    <div>
                      <div className={`font-extrabold tracking-tight text-white mb-1.5 flex items-baseline ${isLarge ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-3xl'
                        }`}>
                        {value.toLocaleString('id-ID')}
                        {suffix && <span className="text-lg text-slate-400 font-normal ml-1">{suffix}</span>}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                        {label}
                      </div>

                      {/* Short explanation text added below the label instead of tooltip */}
                      <p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-h-0 group-hover:max-h-20 overflow-hidden">
                        {desc}
                      </p>


                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </motion.div>
        )}

        {/* Charts Bento Layout */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Main Timeline Chart - Spans 8 cols */}
          <div className="glass-card p-6 lg:col-span-8 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-semibold text-xl text-white tracking-tight">Timeline Penelitian 1996–2026</h2>
                <p className="text-slate-400 text-sm mt-1">Evolusi frekuensi miskonsepsi secara kumulatif</p>
              </div>
              <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">
                1 Dekade
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="active"
                      name="Miskonsepsi Aktif"
                      stroke="#3b82f6"
                      fill="url(#colorActive)"
                      strokeWidth={3}
                      dot={{ fill: '#0f172a', stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-pulse flex gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animation-delay-200"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animation-delay-400"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Level Distribution Pie - Spans 4 cols */}
          <div className="glass-card p-6 lg:col-span-4 flex flex-col h-[400px]">
            <div className="mb-2">
              <h2 className="font-semibold text-xl text-white tracking-tight">Level Pendidikan</h2>
              <p className="text-slate-400 text-sm mt-1">Distribusi target audiens</p>
            </div>

            <div className="flex-1 w-full min-h-0 flex items-center justify-center">
              {levelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={levelData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1500}
                    >
                      {levelData.map((_, index) => (
                        <Cell key={index} fill={LEVEL_COLORS[index % LEVEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span className="text-slate-300 font-medium text-sm ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Domain Frequency Bar Chart - Spans 5 cols */}
          <div className="glass-card p-6 lg:col-span-5 flex flex-col h-[350px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-lg text-white tracking-tight">Frekuensi Domain</h2>
                <p className="text-slate-400 text-sm mt-1">Top 8 domain fisika</p>
              </div>
              <Link href="/misconceptions" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-blue-400 transition-colors">
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="flex-1 w-full min-h-0">
              {domainData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="value" name="Total Frekuensi" radius={[0, 4, 4, 0]} barSize={16} animationDuration={1500}>
                      {domainData.map((entry, index) => (
                        <Cell key={index} fill={DOMAIN_COLORS[entry.name] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-pulse w-full space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-4 bg-slate-800 rounded w-full" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Research highlight - Spans 7 cols */}
          {overview && (
            <div className="glass-card p-8 lg:col-span-7 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-6">
                  <AlertTriangle size={14} />
                  Temuan Utama Riset
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
                  Domain <span className="text-blue-400">{overview.highest_frequency_domain}</span> mencatat frekuensi tertinggi dengan {overview.highest_frequency} kasus teridentifikasi.
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-slate-700/50">
                  <div>
                    <div className="text-slate-400 text-sm mb-1">Tren Penelitian Global</div>
                    <div className="text-lg font-semibold text-emerald-400">{overview.research_trend}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-sm mb-1">Fokus Pasca-COVID</div>
                    <div className="text-lg font-semibold text-amber-300">
                      {overview.post_covid_new_domains.length > 0 ? overview.post_covid_new_domains.join(', ') : 'Distribusi merata'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation Cards Bento */}
        <div className="pt-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Star size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Modul Observatory</h2>
              <p className="text-slate-400 text-sm">Akses cepat ke kapabilitas platform</p>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {NAV_CARDS.map(({ href, icon: Icon, title, desc, color, gradient }, i) => (
              <motion.div key={href} variants={itemVariants} className="h-full">
                <Link
                  href={href}
                  className={`block glass-card p-6 h-full bg-gradient-to-br ${gradient} group relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${color}20, transparent)`, border: `1px solid ${color}30` }}>
                        <Icon size={24} style={{ color }} />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center -translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight size={14} className="text-white" />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <h3 className="text-xl font-bold text-white mb-2 transition-all duration-300 group-hover:translate-x-1">
                        {title}
                      </h3>
                      <div className="h-[2px] w-8 rounded-full mb-3 opacity-0 transition-all duration-500 group-hover:w-16 group-hover:opacity-100" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}80` }} />
                      <p className="text-slate-400 text-sm leading-relaxed font-medium">
                        {desc}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
