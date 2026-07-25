'use client';

import { useState } from 'react';
import { 
  Binary, Play, AlertCircle, Info, ArrowRight,
  Database, Activity, FileText, CheckCircle, HelpCircle
} from 'lucide-react';
import { extractAspects, extractMisconceptions } from '@/lib/api';

export function ExtractionView() {
  const [inputText, setInputText] = useState(
    'Siswa beranggapan bahwa benda bergerak memiliki gaya di dalamnya (Impetus). ' +
    'Penelitian menggunakan Four-Tier Diagnostic Test menunjukkan prevalensi sebesar 67% siswa SMA mengalami miskonsepsi ini. ' +
    'Strategi remedial dengan PhET Interactive Simulations terbukti efektif untuk mereduksi miskonsepsi tersebut.'
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [candidates, setCandidates] = useState<any>(null);

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setError('Masukkan teks abstrak atau artikel terlebih dahulu.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    setCandidates(null);

    try {
      const res = await extractAspects(inputText);
      const cand = await extractMisconceptions(inputText);
      
      setResult(res);
      setCandidates(cand);
    } catch (e: any) {
      setError(e.message || 'Gagal mengekstraksi informasi. Pastikan backend berjalan.');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (type: number) => {
    if (type === 1) {
      setInputText(
        'Banyak siswa meyakini bahwa di ruang hampa udara (luar angkasa) tidak ada gaya gravitasi sama sekali (zero gravity). ' +
        'Menggunakan Force Concept Inventory (FCI), peneliti mengidentifikasi miskonsepsi ini pada tingkat mahasiswa universitas. ' +
        'Thought experiment terbukti gagal mereduksi miskonsepsi secara signifikan.'
      );
    } else {
      setInputText(
        'Siswa cenderung menganggap baterai adalah tangki muatan konstan dan arus dikonsumsi oleh lampu. ' +
        'Three-Tier Test menunjukkan bahwa miskonsepsi sirkuit seri ini persisten di jenjang SMP. ' +
        'Metode Cognitive Conflict terbukti sukses meminimalisir kesalahan pemahaman ini.'
      );
    }
  };

  return (
    <div className="min-h-screen grid-pattern pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-[#1e3a5f]/40 pb-6">
          <div className="badge badge-purple mb-2 flex items-center gap-1">
            <Binary size={12} /> Layer 4: Aspect Extraction Layer
          </div>
          <h1 className="text-3xl font-bold gradient-text">Scientific Aspect Extractor</h1>
          <p className="text-[#8fb3d8] text-sm mt-1">
            Ekstraksi aspek, entitas fisik (NER), sentimen remediasi (ABSA), dan pencarian kandidat miskonsepsi dari abstrak riset.
          </p>
        </div>

        {/* Input & Output Column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Input Form */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1e3a5f]/20 pb-3">
              <h2 className="font-semibold text-white text-base">Input Artikel / Abstrak</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => loadSample(1)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/20 px-2 py-1 rounded bg-blue-500/5"
                >
                  Sampel Gravitasi
                </button>
                <button 
                  onClick={() => loadSample(2)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/20 px-2 py-1 rounded bg-blue-500/5"
                >
                  Sampel Listrik
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4a6fa5] mb-2 uppercase tracking-wider">Teks Abstrak Akademik</label>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full bg-[#0d1525]/80 border border-[#1e3a5f] rounded-xl p-4 text-sm text-white leading-relaxed focus:outline-none focus:border-blue-500"
                  rows={8}
                  placeholder="Paste abstract here..."
                />
              </div>

              {error && (
                <div className="text-red-400 text-xs flex items-center gap-1.5 p-3 rounded-lg border border-red-500/10 bg-red-500/5">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button
                onClick={handleExtract}
                disabled={loading}
                className="btn-primary w-full text-white flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-1">
                    <span className="pulse-dot" style={{ animationDelay: '0ms' }} />
                    <span className="pulse-dot" style={{ animationDelay: '150ms' }} />
                    <span className="pulse-dot" style={{ animationDelay: '300ms' }} />
                    Mengekstraksi...
                  </span>
                ) : (
                  <>
                    <Play size={15} /> Jalankan Ekstraksi Ilmiah
                  </>
                )}
              </button>
            </div>

            {/* Validation warning */}
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
              <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-[#a5b4fc]/80 leading-relaxed">
                <strong>Metodologi Baseline:</strong> Ekstraksi ini menggunakan parser rule-based + lexicon sentimen yang belum di-fine-tune dengan model deep learning spesifik. Seluruh entitas dan relasi yang diekstrak bersifat kandidat dan **wajib** divalidasi oleh panel ahli sebelum dimasukkan ke corpus utama.
              </p>
            </div>
          </div>

          {/* Right: Extraction Results */}
          <div className="glass-card p-6 space-y-6">
            <div className="border-b border-[#1e3a5f]/20 pb-3">
              <h2 className="font-semibold text-white text-base">Hasil Ekstraksi & Ontologi Linking</h2>
            </div>

            {result ? (
              <div className="space-y-6 animate-fade-in">
                
                {/* Physics Domain & Meta */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <span className="badge badge-blue text-xs uppercase font-bold tracking-wider">
                      Domain: {result.domain || 'Tidak Terdeteksi'}
                    </span>
                    <span className="badge badge-purple text-xs font-mono">
                      {result.model_version}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle size={10} /> Baseline Processed
                  </span>
                </div>

                {/* Named Entities (NER) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6fa5]">Identified Entities (NER)</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.entities.length > 0 ? (
                      result.entities.map((ent: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1e3a5f] bg-[#0d1525]/60">
                          <span className="text-xs font-bold text-white">{ent.text}</span>
                          <span className="text-[9px] font-mono uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                            {ent.type}
                          </span>
                          {ent.linked_id && (
                            <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">
                              Linked: {ent.linked_id}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[#4a6fa5] italic">Tidak ada entitas terdeteksi.</span>
                    )}
                  </div>
                </div>

                {/* ABSA Sentiments */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6fa5]">Aspect-Based Sentiments (ABSA)</h3>
                  <div className="space-y-2">
                    {result.aspects.length > 0 ? (
                      result.aspects.map((asp: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl border border-[#1e3a5f] bg-[#070b14]/40 text-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <strong className="text-white">{asp.aspect}</strong>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              asp.sentiment === 'positive' 
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                                : asp.sentiment === 'negative'
                                ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                                : 'bg-[#0d1525] text-[#8fb3d8]'
                            }`}>
                              {asp.sentiment === 'positive' ? 'Remediasi Sukses' : asp.sentiment === 'negative' ? 'Persisten/Gagal' : 'Neutral'}
                            </span>
                          </div>
                          <p className="text-[#8fb3d8] italic">"{asp.sentence}"</p>
                          <div className="text-[10px] text-[#4a6fa5] mt-1.5">
                            Opini: <span className="text-blue-300">{asp.opinion}</span> · Confidence: {(asp.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[#4a6fa5] italic">Tidak ada aspek keefektifan instrumen yang terdeteksi.</span>
                    )}
                  </div>
                </div>

                {/* Misconception Candidates */}
                {candidates && candidates.misconception_candidates && (
                  <div className="space-y-3 border-t border-[#1e3a5f]/20 pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#4a6fa5] flex items-center gap-1">
                      <Database size={12} className="text-amber-400" /> Kandidat Miskonsepsi Baru
                    </h3>
                    <div className="space-y-2">
                      {candidates.misconception_candidates.length > 0 ? (
                        candidates.misconception_candidates.map((cand: any, i: number) => (
                          <div key={i} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-2">
                            <p className="text-amber-200 font-medium leading-relaxed">"{cand.text}"</p>
                            <div className="flex items-center justify-between text-[9px] text-[#4a6fa5]">
                              <span>Pattern Match: {cand.matched_pattern}</span>
                              {cand.linked_id ? (
                                <span className="text-purple-300">Similiar to: {cand.linked_id}</span>
                              ) : (
                                <span className="text-amber-300">Kandidat Unik Baru</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-[#4a6fa5] italic">Tidak ada pola kalimat miskonsepsi yang terdeteksi.</span>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-64 border border-dashed border-[#1e3a5f]/40 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                <Info size={30} className="text-[#4a6fa5] mb-2" />
                <p className="text-xs text-[#4a6fa5] max-w-xs leading-relaxed">
                  Masukkan abstrak riset di panel kiri dan klik 'Jalankan Ekstraksi' untuk menganalisis secara ilmiah.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
