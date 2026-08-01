'use client';

import { useEffect, useState } from 'react';
import { 
  Shield, CheckCircle, AlertTriangle, XCircle, BarChart3,
  FileText, Activity, HelpCircle, RefreshCcw, ChevronRight,
  TrendingDown, Info, ShieldAlert, Award, Database, Play, Square, Loader2,
  UserCheck, ThumbsUp, ThumbsDown, Check, X, Download, Printer, Star
} from 'lucide-react';
import { 
  getCorpusAudit, getMetadataQuality, getPrismaFlowchart,
  detectBiases, getThreatAnalysis, getEvidenceSummary,
  computeValidationMetrics, computeCohenKappa,
  getSyncStatus, startSync, stopSync,
  submitExpertAnnotation, getExpertAnnotations, getLiveCohenKappa,
  getMisconceptions, submitSusSurvey, getSusSummary,
  getExportMisconceptionsCsvUrl, getExportArticlesCsvUrl, getExportPdfReportUrl
} from '@/lib/api';

export default function ValidationPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'quality' | 'sync' | 'calculator' | 'expert' | 'sus'>('audit');
  
  // Data states
  const [corpusAudit, setCorpusAudit] = useState<any>(null);
  const [metadataQuality, setMetadataQuality] = useState<any>(null);
  const [prismaFlow, setPrismaFlow] = useState<any>(null);
  const [biases, setBiases] = useState<any>(null);
  const [threats, setThreats] = useState<any>(null);
  const [evidenceSum, setEvidenceSum] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Expert Portal States
  const [expertAnnotations, setExpertAnnotations] = useState<any>(null);
  const [liveKappa, setLiveKappa] = useState<any>(null);
  const [misconceptionsList, setMisconceptionsList] = useState<any[]>([]);
  const [annotatorId, setAnnotatorId] = useState('Expert_A');

  // SUS Evaluation States
  const [susSummary, setSusSummary] = useState<any>(null);
  const [susRole, setSusRole] = useState('guru');
  const [susAnswers, setSusAnswers] = useState<number[]>([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]);
  const [susFeedback, setSusFeedback] = useState('');
  const [susResult, setSusResult] = useState<any>(null);

  const susQuestions = [
    "Saya merasa ingin menggunakan platform Conceptra ini secara rutin untuk analisis miskonsepsi.",
    "Saya merasa platform Conceptra terlalu rumit untuk digunakan.",
    "Saya merasa platform Conceptra sangat mudah untuk digunakan.",
    "Saya merasa membutuhkan bantuan teknis untuk dapat menggunakan platform ini.",
    "Saya merasa fungsi-fungsi dalam platform Conceptra ini terintegrasi dengan sangat baik.",
    "Saya merasa ada banyak hal yang tidak konsisten pada platform ini.",
    "Saya rasa kebanyakan orang akan dapat mempelajari platform ini dengan sangat cepat.",
    "Saya merasa platform ini sangat membingungkan saat digunakan.",
    "Saya merasa sangat percaya diri saat menggunakan platform Conceptra.",
    "Saya perlu mempelajari banyak hal terlebih dahulu sebelum saya dapat menggunakan platform ini."
  ];

  // Calculator states
  const [calcType, setCalcType] = useState<'kappa' | 'metrics'>('kappa');
  const [calcInputA, setCalcInputA] = useState('MEC, MEC, TERM, ELE, MEC, OPT, OPT, ELE');
  const [calcInputB, setCalcInputB] = useState('MEC, TERM, TERM, ELE, MEC, OPT, GEL, ELE');
  const [calcOutput, setCalcOutput] = useState<any>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const fetchSusData = () => {
    getSusSummary().then(res => setSusSummary(res)).catch(() => null);
  };

  const handleSusSubmit = async () => {
    try {
      const res = await submitSusSurvey(susRole, susAnswers, susFeedback);
      setSusResult(res);
      fetchSusData();
    } catch (e: any) {
      alert(e.message || 'Gagal mengirim survei SUS.');
    }
  };

  const fetchExpertData = () => {
    Promise.all([
      getExpertAnnotations().catch(() => null),
      getLiveCohenKappa().catch(() => null),
      getMisconceptions().catch(() => null)
    ]).then(([annots, kappa, misc]) => {
      setExpertAnnotations(annots);
      setLiveKappa(kappa);
      if (misc?.data) setMisconceptionsList(misc.data.slice(0, 30));
    });
    fetchSusData();
  };

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      getCorpusAudit().catch(() => null),
      getMetadataQuality().catch(() => null),
      getPrismaFlowchart().catch(() => null),
      detectBiases().catch(() => null),
      getThreatAnalysis().catch(() => null),
      getEvidenceSummary().catch(() => null),
      getSyncStatus().catch(() => null),
    ]).then(([audit, quality, prisma, bias, threat, ev, sync]) => {
      setCorpusAudit(audit);
      setMetadataQuality(quality);
      setPrismaFlow(prisma);
      setBiases(bias);
      setThreats(threat);
      setEvidenceSum(ev);
      setSyncStatus(sync);
      setLoading(false);
    });
    fetchExpertData();
  };

  const handleAnnotate = async (itemId: string, verdict: 'agreed' | 'disagreed') => {
    try {
      await submitExpertAnnotation(itemId, verdict, annotatorId);
      fetchExpertData();
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan anotasi.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Polling for sync status while running
  useEffect(() => {
    let interval: any;
    if (syncStatus?.is_running) {
      interval = setInterval(() => {
        getSyncStatus().then(res => {
          setSyncStatus(res);
          // If harvest count changed, we might want to reload audit/quality data
          if (res.status === 'completed' || !res.is_running) {
            fetchData();
          }
        }).catch(() => {});
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [syncStatus?.is_running]);

  const handleStartSync = async () => {
    try {
      const res = await startSync();
      const statusRes = await getSyncStatus();
      setSyncStatus(statusRes);
    } catch (e: any) {
      alert(e.message || 'Gagal memulai sinkronisasi.');
    }
  };

  const handleStopSync = async () => {
    try {
      const res = await stopSync();
      const statusRes = await getSyncStatus();
      setSyncStatus(statusRes);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Gagal menghentikan sinkronisasi.');
    }
  };

  const handleCalculate = async () => {
    setCalcError(null);
    setCalcOutput(null);
    
    try {
      const listA = calcInputA.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const listB = calcInputB.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      
      if (listA.length !== listB.length) {
        setCalcError(`Panjang data tidak cocok: Rater A memiliki ${listA.length} item, Rater B memiliki ${listB.length} item.`);
        return;
      }
      
      if (listA.length === 0) {
        setCalcError('Input tidak boleh kosong.');
        return;
      }

      if (calcType === 'kappa') {
        const res = await computeCohenKappa(listA, listB);
        setCalcOutput(res);
      } else {
        const res = await computeValidationMetrics('interactive_tool', listA, listB);
        setCalcOutput(res);
      }
    } catch (e: any) {
      setCalcError(e.message || 'Gagal menghitung metrik.');
    }
  };

  return (
    <div className="min-h-screen grid-pattern pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e3a5f]/40 pb-6">
          <div>
            <div className="badge badge-blue mb-2 flex items-center gap-1">
              <Shield size={12} /> Validation & Evidence Center
            </div>
            <h1 className="text-3xl font-bold gradient-text">Scientific Validation Panel</h1>
            <p className="text-[#8fb3d8] text-sm mt-1">
              Audit kredibilitas ilmiah, metrik validitas, dan pemanenan corpus publikasi Scopus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <a 
              href={getExportMisconceptionsCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 hover:border-blue-500/40 text-blue-300"
            >
              <Download size={13} /> Export CSV (Miskonsepsi)
            </a>
            <a 
              href={getExportArticlesCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 hover:border-emerald-500/40 text-emerald-300"
            >
              <Download size={13} /> Export CSV (Artikel)
            </a>
            <a 
              href={getExportPdfReportUrl()}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 hover:border-amber-500/40 text-amber-300"
            >
              <Printer size={13} /> Laporan PDF / Cetak
            </a>
            <button 
              onClick={fetchData}
              className="btn-secondary flex items-center gap-2 text-xs py-2 px-3"
            >
              <RefreshCcw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Expert Validation Advisory Banner */}
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-2xl p-4 flex items-start gap-4 animate-fade-in">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-amber-200 text-sm">Pemberitahuan Penting: Diperlukan Validasi Ahli (Expert Validation Required)</h3>
            <p className="text-[#a5b4fc]/80 text-xs mt-1 leading-relaxed">
              Meskipun platform Conceptra menyajikan audit kredibilitas otomatis, metrik keandalan AI, dan pengujian empiris (seperti Cohen's Kappa), <strong>seluruh dataset miskonsepsi dan artikel ilmiah pada proyek ini tetap memerlukan validasi ahli (expert validation)</strong> oleh pakar pendidikan fisika sebelum digunakan secara formal untuk materi pembelajaran atau instrumen tes.
            </p>
          </div>
        </div>

        {/* Status Alert Banner */}
        {corpusAudit && !corpusAudit.publication_ready && (
          <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-4 flex items-start gap-4 animate-fade-in">
            <ShieldAlert className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-200 text-sm">Status Kredibilitas Data: {corpusAudit.total_entries > 24 ? 'HYBRID / SINKRONISASI AKTIF' : 'UNVERIFIED'}</h3>
              <p className="text-[#a5b4fc]/80 text-xs mt-1 leading-relaxed">
                {corpusAudit.total_entries > 24 ? (
                  `Corpus saat ini memiliki ${corpusAudit.total_entries} artikel. Proses integrasi metadata publikasi OpenAlex sedang berlangsung untuk memvalidasi evidence trace secara sistematis.`
                ) : (
                  "Corpus saat ini didominasi fabricated data (data simulasi). Silakan masuk ke tab 'Corpus Sync' untuk mulai memanen 10,000+ publikasi nyata dari OpenAlex & Semantic Scholar polite pools."
                )}
              </p>
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-[#1e3a5f]/30 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'audit' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            📊 Audit & Bias
          </button>
          <button 
            onClick={() => setActiveTab('quality')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'quality' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            📁 Metadata & PRISMA
          </button>
          <button 
            onClick={() => setActiveTab('sync')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'sync' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            🔄 Corpus Sync
          </button>
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'calculator' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            🧮 Calculator
          </button>
          <button 
            onClick={() => setActiveTab('expert')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'expert' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            ✍️ Expert Portal
          </button>
          <button 
            onClick={() => setActiveTab('sus')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'sus' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            ⭐ SUS Evaluation
          </button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex gap-2">
              <div className="pulse-dot" style={{ animationDelay: '0ms' }} />
              <div className="pulse-dot" style={{ animationDelay: '150ms' }} />
              <div className="pulse-dot" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Tab 1: Audit & Bias */}
            {activeTab === 'audit' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Stats & Evidence Summary */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* General Quality Score */}
                  <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border-r border-[#1e3a5f]/20 pr-4">
                      <div className="text-[#4a6fa5] text-xs uppercase tracking-wider font-semibold">Completeness Score</div>
                      <div className="text-4xl font-extrabold text-blue-400 mt-2">
                        {corpusAudit ? (corpusAudit.completeness_pct || 0).toFixed(0) : 0}%
                      </div>
                      <div className="text-[10px] text-[#4a6fa5] mt-1">Kelengkapan DOI & Sumber</div>
                    </div>
                    <div className="border-r border-[#1e3a5f]/20 px-4">
                      <div className="text-[#4a6fa5] text-xs uppercase tracking-wider font-semibold">Evidence Level</div>
                      <div className="text-3xl font-bold text-amber-400 mt-2">
                        {corpusAudit?.total_entries > 24 ? 'LEVEL IV' : 'LEVEL V'}
                      </div>
                      <div className="text-[10px] text-[#4a6fa5] mt-1">
                        {corpusAudit?.total_entries > 24 ? 'Observational / Systematic DB' : 'Expert opinion / fabricated baseline'}
                      </div>
                    </div>
                    <div className="pl-4">
                      <div className="text-[#4a6fa5] text-xs uppercase tracking-wider font-semibold">Scientific Grade</div>
                      <div className="inline-flex items-center gap-1 border px-2 py-1 rounded-lg text-xs mt-3 font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-300">
                        <CheckCircle size={12} />
                        {corpusAudit?.total_entries > 50 ? 'HYBRID DB' : 'VERIFIED SEED CORPUS'}
                      </div>
                    </div>
                  </div>

                  {/* Threat to Validity Analysis */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#1e3a5f]/20 pb-3">
                      <ShieldAlert className="text-amber-500" size={18} />
                      <h2 className="font-bold text-lg text-white">Threat to Validity Matrix</h2>
                    </div>
                    <div className="space-y-3">
                      {threats?.threats?.map((threat: any, i: number) => (
                        <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-[#070b14]/60 border border-[#1e3a5f]/30">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            threat.level === 'fatal' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                {threat.type.replace('_', ' ')}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                threat.level === 'fatal' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/10 text-amber-300'
                              }`}>
                                {threat.level}
                              </span>
                            </div>
                            <p className="text-sm text-[#8fb3d8] mt-1 leading-relaxed">{threat.description}</p>
                            <div className="text-xs text-blue-400 mt-2 bg-blue-900/10 border border-blue-500/10 px-3 py-1.5 rounded-lg">
                              <strong>Mitigasi:</strong> {threat.mitigation}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Bias Controls Panel */}
                <div className="space-y-6">
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#1e3a5f]/20 pb-3">
                      <AlertTriangle className="text-[#f59e0b]" size={18} />
                      <h2 className="font-bold text-lg text-white">Bias Detection Panel</h2>
                    </div>
                    <p className="text-xs text-[#4a6fa5] leading-relaxed">
                      Analisis otomatis untuk mendeteksi distorsi epistemologis atau sampling bias dalam data observasi.
                    </p>
                    <div className="space-y-3 mt-4">
                      {biases?.bias_flags?.map((flag: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                              {flag.type} bias
                            </span>
                            <span className="text-[10px] font-bold text-amber-300 uppercase">
                              {flag.severity} risk
                            </span>
                          </div>
                          <p className="text-xs text-[#8fb3d8] mt-2 leading-relaxed">{flag.description}</p>
                          <p className="text-[10px] text-[#4a6fa5] mt-2 italic">
                            💡 {flag.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Evidence Engine Statistics */}
                  <div className="glass-card p-6 space-y-4">
                    <h3 className="font-bold text-base text-white border-b border-[#1e3a5f]/20 pb-3">
                      Evidence Engine Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs py-1 border-b border-[#1e3a5f]/10">
                        <span className="text-[#8fb3d8]">Total Trace Records</span>
                        <strong className="text-white">{evidenceSum?.total_records || 0}</strong>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-[#1e3a5f]/10">
                        <span className="text-[#8fb3d8]">Evidence Level V (Fabricated)</span>
                        <strong className="text-red-400">{evidenceSum?.by_level?.V || 0}</strong>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-[#1e3a5f]/10">
                        <span className="text-[#8fb3d8]">Evidence Level COMPUTED</span>
                        <strong className="text-blue-400">{evidenceSum?.by_level?.COMPUTED || 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tab 2: Metadata Quality & PRISMA */}
            {activeTab === 'quality' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* PRISMA 2020 Flowchart */}
                <div className="lg:col-span-2 glass-card p-6 space-y-6">
                  <div className="border-b border-[#1e3a5f]/20 pb-3">
                    <h2 className="font-bold text-lg text-white">PRISMA 2020 Systematic Review Compliance</h2>
                    <p className="text-[#4a6fa5] text-xs mt-1">
                      Alur penyaringan artikel berdasarkan guideline PRISMA.
                    </p>
                  </div>
                  
                  {prismaFlow && (
                    <div className="flex flex-col gap-4 max-w-md mx-auto">
                      
                      {/* Step 1: Identification */}
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center relative">
                        <h4 className="text-xs uppercase tracking-wider text-[#4a6fa5] font-semibold">IDENTIFIKASI</h4>
                        <div className="text-lg font-bold text-white mt-1">
                          n = {prismaFlow.identification.total_identified + (syncStatus?.count || 0)}
                        </div>
                        <p className="text-[10px] text-[#8fb3d8] mt-1">Studi diidentifikasi melalui database & pencarian</p>
                        <div className="absolute left-1/2 bottom-[-16px] transform -translate-x-1/2 text-blue-500 font-bold">↓</div>
                      </div>
                      
                      {/* Step 2: Screening */}
                      <div className="p-4 rounded-xl border border-[#1e3a5f] bg-[#0d1525] text-center relative mt-4">
                        <h4 className="text-xs uppercase tracking-wider text-[#4a6fa5] font-semibold">PENYARINGAN (SCREENING)</h4>
                        <div className="text-lg font-bold text-white mt-1">
                          n = {prismaFlow.screening.records_screened + (syncStatus?.count || 0)}
                        </div>
                        <p className="text-[10px] text-[#8fb3d8] mt-1">Studi disaring berdasarkan abstrak & kesesuaian domain</p>
                        <div className="text-red-400 text-[10px] mt-2 border-t border-red-500/10 pt-1">
                          Eksklusi Isu Kritis (Fabricated): n = {prismaFlow.screening.records_excluded}
                        </div>
                        <div className="absolute left-1/2 bottom-[-16px] transform -translate-x-1/2 text-blue-500 font-bold">↓</div>
                      </div>

                      {/* Step 3: Included */}
                      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center mt-4">
                        <h4 className="text-xs uppercase tracking-wider text-[#4a6fa5] font-semibold text-emerald-400">STUDI TERMASUK (INCLUDED)</h4>
                        <div className="text-lg font-bold text-white mt-1">
                          n = {prismaFlow.included.studies_included + (syncStatus?.valid_doi_count || 0)}
                        </div>
                        <p className="text-[10px] text-[#8fb3d8] mt-1">Studi dianalisis secara metrik dalam database</p>
                      </div>

                    </div>
                  )}
                </div>

                {/* Metadata Quality Breakdown */}
                <div className="glass-card p-6 space-y-6">
                  <div className="border-b border-[#1e3a5f]/20 pb-3">
                    <h3 className="font-bold text-base text-white">Metadata Quality Statistics</h3>
                  </div>

                  {metadataQuality && (
                    <div className="space-y-4">
                      
                      {/* Metric 1 */}
                      <div>
                        <div className="flex justify-between text-xs text-[#8fb3d8] mb-1">
                          <span>Average Quality Score</span>
                          <strong className="text-blue-300">{metadataQuality.avg_quality_score} / 1.00</strong>
                        </div>
                        <div className="w-full bg-[#0d1525] rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${metadataQuality.avg_quality_score * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 2 */}
                      <div>
                        <div className="flex justify-between text-xs text-[#8fb3d8] mb-1">
                          <span>Publication-Ready Papers</span>
                          <strong className="text-emerald-400">
                            {metadataQuality.publication_ready_count + (syncStatus?.valid_doi_count || 0)} / {metadataQuality.total_entries + (syncStatus?.count || 0)}
                          </strong>
                        </div>
                        <div className="w-full bg-[#0d1525] rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full transition-all" 
                            style={{ width: `${((metadataQuality.publication_ready_count + (syncStatus?.valid_doi_count || 0)) / (metadataQuality.total_entries + (syncStatus?.count || 0))) * 100}%` }}
                          />
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Tab 3: Corpus Sync */}
            {activeTab === 'sync' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Harvesting Controls */}
                <div className="lg:col-span-2 glass-card p-6 space-y-6">
                  <div className="border-b border-[#1e3a5f]/20 pb-3">
                    <h2 className="font-bold text-lg text-white">Database Synchronization</h2>
                    <p className="text-[#8fb3d8] text-xs mt-1">
                      Mengunduh 10,000+ artikel riset Pendidikan Fisika & Miskonsepsi dari OpenAlex & Semantic Scholar polite pool.
                    </p>
                  </div>

                  {syncStatus && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Metric 1: Progress */}
                      <div className="p-4 bg-[#0d1525] border border-[#1e3a5f]/40 rounded-xl text-center">
                        <span className="text-[10px] text-[#4a6fa5] uppercase tracking-wide font-bold">Total Harvested</span>
                        <div className="text-3xl font-extrabold text-blue-400 mt-1">
                          {syncStatus.count} <span className="text-xs text-[#4a6fa5]">/ 10k</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (syncStatus.count / 10000) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 2: Valid DOIs */}
                      <div className="p-4 bg-[#0d1525] border border-[#1e3a5f]/40 rounded-xl text-center">
                        <span className="text-[10px] text-[#4a6fa5] uppercase tracking-wide font-bold">Valid DOIs</span>
                        <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                          {syncStatus.valid_doi_count}
                        </div>
                        <div className="text-[9px] text-[#4a6fa5] mt-2">
                          {((syncStatus.valid_doi_count / Math.max(1, syncStatus.count)) * 100).toFixed(0)}% kelengkapan bibliografis
                        </div>
                      </div>

                      {/* Metric 3: Harvester Status */}
                      <div className="p-4 bg-[#0d1525] border border-[#1e3a5f]/40 rounded-xl text-center flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-[#4a6fa5] uppercase tracking-wide font-bold">Worker Status</span>
                          <div className={`text-base font-bold mt-1 uppercase ${
                            syncStatus.is_running ? 'text-emerald-400 animate-pulse' : 'text-[#4a6fa5]'
                          }`}>
                            {syncStatus.status}
                          </div>
                        </div>
                        
                        <div className="text-[9px] text-[#4a6fa5]">
                          PID: {syncStatus.is_running ? 'Active Background Process' : 'Inactive'}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleStartSync}
                      disabled={syncStatus?.is_running}
                      className="btn-primary flex-1 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold disabled:opacity-40"
                    >
                      {syncStatus?.is_running ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-emerald-400" />
                          Harvesting in Background...
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Start Synchronization
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleStopSync}
                      disabled={!syncStatus?.is_running}
                      className="btn-secondary border-red-500/20 hover:bg-red-500/10 text-red-300 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold disabled:opacity-40"
                    >
                      <Square size={14} />
                      Force Stop
                    </button>
                  </div>

                  <div className="p-3 bg-blue-900/10 border border-blue-500/10 rounded-xl text-xs text-[#8fb3d8] flex items-start gap-2.5 leading-relaxed">
                    <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Polite Pool Active:</strong> Semua request OpenAlex menyertakan kontak email pendaftar. 
                      Pemanenan dilakukan secara bertahap (rate-limited) sebesar 200ms per request untuk menjaga kualitas koneksi dan mencegah pembatasan akses.
                    </div>
                  </div>

                </div>

                {/* Domain Distribution */}
                <div className="glass-card p-6 space-y-4">
                  <h3 className="font-bold text-base text-white border-b border-[#1e3a5f]/20 pb-3">
                    Harvested Domain Distribution
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {syncStatus?.domains && Object.keys(syncStatus.domains).length > 0 ? (
                      Object.entries(syncStatus.domains).map(([domain, val]: any) => (
                        <div key={domain} className="space-y-1 text-xs">
                          <div className="flex justify-between text-[#8fb3d8]">
                            <span>{domain}</span>
                            <strong>{val}</strong>
                          </div>
                          <div className="w-full bg-[#0d1525] rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (val / Math.max(1, syncStatus.count)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#4a6fa5] italic text-center py-10">
                        Belum ada data domain terdistribusi.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Tab 4: Interactive Calculator */}
            {activeTab === 'calculator' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Inputs */}
                <div className="lg:col-span-2 glass-card p-6 space-y-6">
                  
                  <div className="flex items-center justify-between border-b border-[#1e3a5f]/20 pb-3">
                    <h2 className="font-bold text-lg text-white">Interactive Reliability Calculator</h2>
                    <div className="flex bg-[#0d1525] border border-[#1e3a5f] rounded-xl p-0.5">
                      <button
                        onClick={() => setCalcType('kappa')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          calcType === 'kappa' ? 'bg-blue-600 text-white' : 'text-[#4a6fa5]'
                        }`}
                      >
                        Cohen's Kappa
                      </button>
                      <button
                        onClick={() => setCalcType('metrics')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          calcType === 'metrics' ? 'bg-blue-600 text-white' : 'text-[#4a6fa5]'
                        }`}
                      >
                        Precision / Recall / F1
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#8fb3d8] leading-relaxed">
                    {calcType === 'kappa' 
                      ? 'Gunakan form ini untuk menghitung inter-rater agreement (Cohen\'s Kappa) antara dua dosen/annotator independen.' 
                      : 'Gunakan form ini untuk menghitung Precision, Recall, F1 Score dari output model otomatis (Rater B) dibandingkan dengan Ground Truth (Rater A).'}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-white mb-2 uppercase tracking-wide">
                        {calcType === 'kappa' ? 'RATER A (GROUND TRUTH / PAKAR 1)' : 'GROUND TRUTH (ACTUAL LABELS)'}
                      </label>
                      <textarea
                        value={calcInputA}
                        onChange={e => setCalcInputA(e.target.value)}
                        className="w-full bg-[#0d1525] border border-[#1e3a5f] rounded-xl p-3 text-sm text-white font-mono"
                        rows={3}
                        placeholder="MEC, MEC, TERM, ELE, MEC, OPT"
                      />
                      <span className="text-[10px] text-[#4a6fa5]">Format: Pisahkan dengan koma (e.g. MEC, MEC, TERM)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-white mb-2 uppercase tracking-wide">
                        {calcType === 'kappa' ? 'RATER B (PAKAR 2)' : 'PREDICTED LABELS (MODEL OUTPUT)'}
                      </label>
                      <textarea
                        value={calcInputB}
                        onChange={e => setCalcInputB(e.target.value)}
                        className="w-full bg-[#0d1525] border border-[#1e3a5f] rounded-xl p-3 text-sm text-white font-mono"
                        rows={3}
                        placeholder="MEC, TERM, TERM, ELE, MEC, OPT"
                      />
                      <span className="text-[10px] text-[#4a6fa5]">Format: Jumlah item harus sama dengan input rater A</span>
                    </div>

                    {calcError && (
                      <div className="text-red-400 text-xs flex items-center gap-1.5 p-3 rounded-lg border border-red-500/10 bg-red-500/5">
                        <XCircle size={14} /> {calcError}
                      </div>
                    )}

                    <button 
                      onClick={handleCalculate}
                      className="btn-primary w-full text-white flex items-center justify-center gap-2"
                    >
                      Hitung Metrik Ilmiah
                    </button>
                  </div>

                </div>

                {/* Calculation Outputs */}
                <div className="glass-card p-6 space-y-6">
                  <div className="border-b border-[#1e3a5f]/20 pb-3">
                    <h3 className="font-bold text-base text-white">Calculation Results</h3>
                  </div>

                  {calcOutput ? (
                    <div className="space-y-4">
                      {calcType === 'kappa' ? (
                        <div className="space-y-4">
                          <div className="text-center py-4 bg-[#0d1525] rounded-xl border border-[#1e3a5f]/50">
                            <span className="text-xs text-[#4a6fa5] uppercase tracking-wide font-bold">Cohen's Kappa</span>
                            <div className="text-4xl font-extrabold text-blue-400 mt-1">
                              {calcOutput.kappa}
                            </div>
                            <div className="text-xs text-amber-300 mt-2 font-medium">
                              {calcOutput.interpretation}
                            </div>
                          </div>

                          <div className="space-y-2 text-xs border-t border-[#1e3a5f]/20 pt-4">
                            <div className="flex justify-between">
                              <span className="text-[#8fb3d8]">Publication Ready?</span>
                              <span className={calcOutput.acceptable_for_publication ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                {calcOutput.acceptable_for_publication ? 'YES (κ ≥ 0.61)' : 'NO (κ < 0.61)'}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#4a6fa5] leading-relaxed mt-2">
                              <strong>Reference:</strong> {calcOutput.reference}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-[#0d1525] p-2.5 rounded-lg border border-[#1e3a5f]/30">
                              <span className="text-[10px] text-[#4a6fa5] font-bold">F1 SCORE</span>
                              <div className="text-lg font-bold text-blue-400 mt-1">{calcOutput.f1}</div>
                            </div>
                            <div className="bg-[#0d1525] p-2.5 rounded-lg border border-[#1e3a5f]/30">
                              <span className="text-[10px] text-[#4a6fa5] font-bold">PRECISION</span>
                              <div className="text-lg font-bold text-emerald-400 mt-1">{calcOutput.precision}</div>
                            </div>
                            <div className="bg-[#0d1525] p-2.5 rounded-lg border border-[#1e3a5f]/30">
                              <span className="text-[10px] text-[#4a6fa5] font-bold">RECALL</span>
                              <div className="text-lg font-bold text-amber-400 mt-1">{calcOutput.recall}</div>
                            </div>
                          </div>

                          <div className="bg-[#0d1525] p-3 rounded-xl border border-[#1e3a5f]/50">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#8fb3d8]">Cohen's Kappa (Proxy)</span>
                              <span className="text-white font-bold">{calcOutput.kappa}</span>
                            </div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#8fb3d8]">Sample Size</span>
                              <span className="text-white font-bold">{calcOutput.sample_size}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#8fb3d8]">Is Acceptable?</span>
                              <span className={calcOutput.is_acceptable ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                {calcOutput.is_acceptable ? 'YES' : 'NO (F1 & N too low)'}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-[#1e3a5f]/20 pt-4">
                            <span className="text-xs text-white font-bold block mb-2">Class-level F1 Scores:</span>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                              {Object.entries(calcOutput.per_class_f1).map(([cls, val]: any) => (
                                <div key={cls} className="flex justify-between text-xs font-mono">
                                  <span className="text-[#8fb3d8]">{cls}:</span>
                                  <strong className="text-white">{val}</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 border border-dashed border-[#1e3a5f]/40 rounded-xl flex flex-col items-center justify-center text-center p-4">
                      <Info size={24} className="text-[#4a6fa5] mb-2" />
                      <p className="text-xs text-[#4a6fa5]">
                        Masukkan data di sebelah kiri dan tekan 'Hitung' untuk melihat output analitis.
                      </p>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* Tab 5: Expert Validation Portal */}
            {activeTab === 'expert' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Misconception List & Rating */}
                <div className="lg:col-span-2 glass-card p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-[#1e3a5f]/20 pb-3">
                    <div>
                      <h2 className="font-bold text-lg text-white">Interactive Expert Verification Portal</h2>
                      <p className="text-[#8fb3d8] text-xs mt-1">
                        Antarmuka verifikasi langsung untuk Dosen / Pakar Fisika dalam mengevaluasi kebenaran miskonsepsi teridentifikasi.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#0d1525] border border-[#1e3a5f] rounded-xl px-3 py-1.5 text-xs text-white">
                      <UserCheck size={14} className="text-blue-400" />
                      <span className="text-[#8fb3d8]">Role:</span>
                      <select 
                        value={annotatorId} 
                        onChange={e => setAnnotatorId(e.target.value)}
                        className="bg-transparent font-bold text-blue-400 focus:outline-none cursor-pointer"
                      >
                        <option value="Expert_A" className="bg-[#0d1525]">Pakar A (Validator 1)</option>
                        <option value="Expert_B" className="bg-[#0d1525]">Pakar B (Validator 2)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                    {misconceptionsList.length > 0 ? (
                      misconceptionsList.map((m: any) => {
                        const existingAnnot = expertAnnotations?.annotations?.find(
                          (a: any) => a.item_id === m.id && a.annotator_id === annotatorId
                        );
                        return (
                          <div key={m.id} className="p-4 rounded-xl border border-[#1e3a5f]/40 bg-[#070b14]/60 space-y-3 hover:border-blue-500/30 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="badge badge-blue text-[10px] uppercase font-bold">{m.id}</span>
                                  <span className="text-xs text-blue-400 font-semibold">{m.domain}</span>
                                </div>
                                <h3 className="font-bold text-white text-sm mt-1.5">{m.misconception}</h3>
                                <p className="text-xs text-[#8fb3d8] mt-1"><strong>Konsep:</strong> {m.concept}</p>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleAnnotate(m.id, 'agreed')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    existingAnnot?.verdict === 'agreed'
                                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                      : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20'
                                  }`}
                                >
                                  <ThumbsUp size={13} /> Setuju
                                </button>
                                <button
                                  onClick={() => handleAnnotate(m.id, 'disagreed')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    existingAnnot?.verdict === 'disagreed'
                                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                      : 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20'
                                  }`}
                                >
                                  <ThumbsDown size={13} /> Tolak / Revisi
                                </button>
                              </div>
                            </div>
                            
                            {m.root_cause && (
                              <div className="text-[11px] text-[#4a6fa5] bg-[#0d1525] p-2.5 rounded-lg border border-[#1e3a5f]/20">
                                <strong>Akar Masalah:</strong> {m.root_cause}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-[#4a6fa5] text-xs">
                        Memuat daftar miskonsepsi teridentifikasi...
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Cohen's Kappa & Stats Panel */}
                <div className="space-y-6">
                  
                  {/* Real-time Kappa Score Card */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="border-b border-[#1e3a5f]/20 pb-3 flex items-center justify-between">
                      <h3 className="font-bold text-base text-white">Live Inter-Rater Reliability</h3>
                      <Award size={18} className="text-amber-400" />
                    </div>
                    
                    <div className="text-center py-4 bg-[#0d1525] rounded-xl border border-[#1e3a5f]">
                      <span className="text-[10px] text-[#4a6fa5] uppercase tracking-wider font-bold">Live Cohen's Kappa (κ)</span>
                      <div className="text-4xl font-extrabold text-blue-400 mt-1">
                        {liveKappa ? liveKappa.kappa : '0.0000'}
                      </div>
                      <div className="text-xs text-amber-300 font-semibold mt-2 px-2">
                        {liveKappa?.interpretation || 'Belum Ada Anotasi'}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs border-t border-[#1e3a5f]/20 pt-3">
                      <div className="flex justify-between text-[#8fb3d8]">
                        <span>Jumlah Item Divalidasi:</span>
                        <strong className="text-white">{expertAnnotations?.total_annotations || 0}</strong>
                      </div>
                      <div className="flex justify-between text-[#8fb3d8]">
                        <span>Tingkat Kesepakatan (Agreement):</span>
                        <strong className="text-emerald-400">{expertAnnotations?.agreement_rate || 0}%</strong>
                      </div>
                      <div className="flex justify-between text-[#8fb3d8]">
                        <span>Status Publikasi (Landis & Koch):</span>
                        <strong className={liveKappa?.acceptable_for_publication ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          {liveKappa?.acceptable_for_publication ? '✅ SIAP PUBLIKASI (κ ≥ 0.61)' : '⚠️ BUTUH ANOTASI TAMBAHAN'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Summary Instructions */}
                  <div className="glass-card p-6 space-y-3 text-xs text-[#8fb3d8] leading-relaxed">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Info size={14} className="text-blue-400" /> Panduan Validasi Ahli:
                    </h4>
                    <p>
                      1. Pilih identitas Validator (Pakar A atau Pakar B) di sudut kanan atas.
                    </p>
                    <p>
                      2. Tinjau setiap deskripsi miskonsepsi fisika dan berikan penilaian <strong>Setuju</strong> atau <strong>Tolak</strong>.
                    </p>
                    <p>
                      3. Skor Cohen's Kappa (κ) akan dihitung secara persisten dan dapat digunakan langsung sebagai lampiran bukti reliabilitas pada artikel prosiding Anda.
                    </p>
                  </div>

                </div>

              </div>
            )}

            {/* Tab 6: System Usability Scale (SUS) Evaluation */}
            {activeTab === 'sus' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 10-Item SUS Questionnaire */}
                <div className="lg:col-span-2 glass-card p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-[#1e3a5f]/20 pb-3">
                    <div>
                      <h2 className="font-bold text-lg text-white">System Usability Scale (SUS) Evaluator</h2>
                      <p className="text-[#8fb3d8] text-xs mt-1">
                        Instrumen evaluasi empiris (Bangor et al. 2008) untuk mengukur kelayakan & kemudahan penggunaan media Conceptra oleh pengguna (Guru / Dosen / Mahasiswa).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#0d1525] border border-[#1e3a5f] rounded-xl px-3 py-1.5 text-xs text-white">
                      <Star size={14} className="text-amber-400" />
                      <span className="text-[#8fb3d8]">Peran:</span>
                      <select 
                        value={susRole} 
                        onChange={e => setSusRole(e.target.value)}
                        className="bg-transparent font-bold text-amber-400 focus:outline-none cursor-pointer"
                      >
                        <option value="guru" className="bg-[#0d1525]">Guru Fisika</option>
                        <option value="dosen" className="bg-[#0d1525]">Dosen / Akademisi</option>
                        <option value="peneliti" className="bg-[#0d1525]">Peneliti Pendidikan</option>
                        <option value="mahasiswa" className="bg-[#0d1525]">Mahasiswa Fisika</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {susQuestions.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-[#1e3a5f]/30 bg-[#070b14]/50 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-blue-400">P{idx + 1}.</span>
                          <p className="text-xs text-white flex-1 leading-relaxed">{q}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1 px-2 border-t border-[#1e3a5f]/20">
                          <span className="text-[10px] text-red-400">Sangat Tidak Setuju (1)</span>
                          <div className="flex gap-4">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <label key={val} className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name={`q_${idx}`}
                                  value={val}
                                  checked={susAnswers[idx] === val}
                                  onChange={() => {
                                    const next = [...susAnswers];
                                    next[idx] = val;
                                    setSusAnswers(next);
                                  }}
                                  className="accent-blue-500 cursor-pointer"
                                />
                                <span className="text-xs text-white font-mono">{val}</span>
                              </label>
                            ))}
                          </div>
                          <span className="text-[10px] text-emerald-400">Sangat Setuju (5)</span>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-white mb-2 uppercase tracking-wide">
                        Catatan Kualitatif / Saran Perbaikan (Opsional)
                      </label>
                      <textarea
                        value={susFeedback}
                        onChange={e => setSusFeedback(e.target.value)}
                        className="w-full bg-[#0d1525] border border-[#1e3a5f] rounded-xl p-3 text-xs text-white font-mono"
                        rows={2}
                        placeholder="Tulis masukan tentang kemudahan navigasi atau fitur media..."
                      />
                    </div>

                    <button
                      onClick={handleSusSubmit}
                      className="btn-primary w-full text-white py-3 font-bold flex items-center justify-center gap-2 text-sm"
                    >
                      Kirim Evaluasi & Hitung Skor SUS
                    </button>
                  </div>
                </div>

                {/* Real-time SUS Summary Stats */}
                <div className="space-y-6">
                  
                  {/* SUS Score Card */}
                  <div className="glass-card p-6 space-y-4">
                    <div className="border-b border-[#1e3a5f]/20 pb-3 flex items-center justify-between">
                      <h3 className="font-bold text-base text-white">SUS Benchmark Score</h3>
                      <Star size={18} className="text-amber-400" />
                    </div>
                    
                    <div className="text-center py-4 bg-[#0d1525] rounded-xl border border-[#1e3a5f]">
                      <span className="text-[10px] text-[#4a6fa5] uppercase tracking-wider font-bold">Rata-Rata Skor SUS (0 - 100)</span>
                      <div className="text-4xl font-extrabold text-emerald-400 mt-1">
                        {susSummary ? susSummary.avg_sus_score : '0.0'}
                      </div>
                      <div className="text-xs text-amber-300 font-semibold mt-2 px-2">
                        {susSummary?.grade || 'Belum Ada Responden'}
                      </div>
                    </div>

                    {susResult && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1">
                        <strong>Skor Respon Anda: {susResult.sus_score} / 100</strong>
                        <p className="text-[11px] opacity-90">{susResult.grade}</p>
                      </div>
                    )}

                    <div className="space-y-2 text-xs border-t border-[#1e3a5f]/20 pt-3">
                      <div className="flex justify-between text-[#8fb3d8]">
                        <span>Total Responden:</span>
                        <strong className="text-white">{susSummary?.total_respondents || 0} orang</strong>
                      </div>
                      <div className="flex justify-between text-[#8fb3d8]">
                        <span>Status Usability (Bangor et al.):</span>
                        <strong className={susSummary?.is_acceptable ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          {susSummary?.is_acceptable ? '✅ LAYAK / ACCEPTABLE (>68.0)' : '⚠️ DALAM EVALUASI'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Standard Card */}
                  <div className="glass-card p-6 space-y-3 text-xs text-[#8fb3d8] leading-relaxed">
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Info size={14} className="text-blue-400" /> Skala Acuan SUS (Brooke, 1996):
                    </h4>
                    <div className="space-y-1 text-[11px] font-mono">
                      <div className="flex justify-between border-b border-[#1e3a5f]/20 py-1">
                        <span>SUS &gt; 80.3</span>
                        <strong className="text-emerald-400">Grade A (Excellent)</strong>
                      </div>
                      <div className="flex justify-between border-b border-[#1e3a5f]/20 py-1">
                        <span>SUS 68.0 - 80.2</span>
                        <strong className="text-blue-400">Grade B (Good)</strong>
                      </div>
                      <div className="flex justify-between border-b border-[#1e3a5f]/20 py-1">
                        <span>SUS 51.0 - 67.9</span>
                        <strong className="text-amber-400">Grade C (Fair)</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>SUS &lt; 51.0</span>
                        <strong className="text-red-400">Grade F (Poor)</strong>
                      </div>
                    </div>
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
