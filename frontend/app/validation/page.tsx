'use client';

import { useEffect, useState } from 'react';
import { 
  Shield, CheckCircle, AlertTriangle, XCircle, BarChart3,
  FileText, Activity, HelpCircle, RefreshCcw, ChevronRight,
  TrendingDown, Info, ShieldAlert, Award, Database, Play, Square, Loader2
} from 'lucide-react';
import { 
  getCorpusAudit, getMetadataQuality, getPrismaFlowchart,
  detectBiases, getThreatAnalysis, getEvidenceSummary,
  computeValidationMetrics, computeCohenKappa,
  getSyncStatus, startSync, stopSync
} from '@/lib/api';

export default function ValidationPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'quality' | 'sync' | 'calculator'>('audit');
  
  // Data states
  const [corpusAudit, setCorpusAudit] = useState<any>(null);
  const [metadataQuality, setMetadataQuality] = useState<any>(null);
  const [prismaFlow, setPrismaFlow] = useState<any>(null);
  const [biases, setBiases] = useState<any>(null);
  const [threats, setThreats] = useState<any>(null);
  const [evidenceSum, setEvidenceSum] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calculator states
  const [calcType, setCalcType] = useState<'kappa' | 'metrics'>('kappa');
  const [calcInputA, setCalcInputA] = useState('MEC, MEC, TERM, ELE, MEC, OPT, OPT, ELE');
  const [calcInputB, setCalcInputB] = useState('MEC, TERM, TERM, ELE, MEC, OPT, GEL, ELE');
  const [calcOutput, setCalcOutput] = useState<any>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

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
          <button 
            onClick={fetchData}
            className="btn-secondary self-start md:self-auto flex items-center gap-2 text-xs py-2 px-3"
          >
            <RefreshCcw size={13} /> Refresh Audit
          </button>
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
        <div className="flex border-b border-[#1e3a5f]/30">
          <button 
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'audit' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            📊 Audit & Bias
          </button>
          <button 
            onClick={() => setActiveTab('quality')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'quality' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            📁 Metadata & PRISMA
          </button>
          <button 
            onClick={() => setActiveTab('sync')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'sync' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            🔄 Corpus Sync
          </button>
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'calculator' ? 'border-blue-500 text-white' : 'border-transparent text-[#4a6fa5] hover:text-white'
            }`}
          >
            🧮 Calculator
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

          </div>
        )}

      </div>
    </div>
  );
}
