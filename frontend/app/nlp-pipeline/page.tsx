'use client';

import { useState } from 'react';
import { 
  Cpu, Play, ArrowRight, HelpCircle, 
  CheckCircle, RefreshCw, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { preprocessText } from '@/lib/api';

interface StepDetail {
  title: string;
  desc: string;
  method: string;
  key: string;
}

const STEPS_INFO: StepDetail[] = [
  {
    title: "1. Corpus Acquisition",
    desc: "Mengumpulkan metadata dan isi teks dari jurnal/dokumen riset secara massal.",
    method: "RESTful API dengan exponential backoff",
    key: "step_1_raw"
  },
  {
    title: "2. Metadata Cleaning",
    desc: "Menghapus karakter non-printable, formatting yang rusak, atau byte non-UTF-8.",
    method: "Regex (Regular Expressions) tingkat lanjut",
    key: "step_2_metadata_cleaned"
  },
  {
    title: "3. Deduplication",
    desc: "Menghapus kalimat atau dokumen identik/duplikat dalam corpus.",
    method: "Levenshtein Distance & normalisasi spasi",
    key: "step_3_deduplicated"
  },
  {
    title: "4. Language Detection",
    desc: "Mengidentifikasi bahasa (Indonesia/Inggris) untuk mencocokkan model pemrosesan bahasa setempat.",
    method: "FastText Language ID & Heuristik Leksikon",
    key: "step_4_lang"
  },
  {
    title: "5. PDF Parsing Cleanup",
    desc: "Menghilangkan running header, footer, page number, dan metadata penerbit yang mengotori konten.",
    method: "PyMuPDF (Fitz) layout grouping & cleaning rules",
    key: "step_5_pdf_parsed"
  },
  {
    title: "6. OCR Correction",
    desc: "Membetulkan kesalahan karakter umum hasil scan PDF atau OCR (misal: '1o' menjadi '10', 'gala' menjadi 'gaya').",
    method: "Contextual word replacement regex",
    key: "step_6_ocr_corrected"
  },
  {
    title: "7. Sentence Segmentation",
    desc: "Memecah teks paragraf menjadi kalimat-kalimat tunggal tanpa merusak singkatan ilmiah.",
    method: "spaCy Dependency Parser / Rule-based sentence splitter",
    key: "step_7_sentences"
  },
  {
    title: "8. Tokenization",
    desc: "Memecah kalimat menjadi token/kata individual dan mempertahankan senyawa ilmiah.",
    method: "Subword Tokenization (BPE / WordPiece)",
    key: "step_8_tokens"
  },
  {
    title: "9. Scientific Stopword Removal",
    desc: "Menghapus kata-kata transisi akademik umum ('penelitian ini', 'menunjukkan bahwa', 'analisis').",
    method: "Custom TF-IDF Filtering terbalik",
    key: "step_8_tokens"
  },
  {
    title: "10. Physics Stopword Whitelisting",
    desc: "Mencegah penghapusan istilah fisika krusial yang dalam kamus umum dianggap stopword (seperti 'gaya', 'usaha', 'daya').",
    method: "Domain-specific Whitelisting",
    key: "step_8_tokens"
  },
  {
    title: "11. Lemmatization",
    desc: "Mengembalikan kata berimbuhan bahasa Indonesia ke kata dasarnya tanpa merusak makna ilmiah.",
    method: "Sastrawi modifikasi & Whitelist Fisika",
    key: "step_8_tokens"
  },
  {
    title: "12. Normalization",
    desc: "Case folding pintar yang mempertahankan huruf kapital pada simbol sensitif (seperti konstanta Planck 'h' vs 'H').",
    method: "Context-aware casing mapping",
    key: "step_8_tokens"
  },
  {
    title: "13. Equation Handling",
    desc: "Mendeteksi dan menerjemahkan persamaan matematika/rumus agar tidak dibaca sebagai teks sampah.",
    method: "LaTeX translation & regex equation parser",
    key: "step_8_tokens"
  },
  {
    title: "14. Unit Handling",
    desc: "Menstandardisasi penulisan satuan fisika (misal: 'm/s2' atau 'm/s^2' menjadi 'm/s^2').",
    method: "Entity mapping berbasis kamus satuan Fisika",
    key: "step_8_tokens"
  },
  {
    title: "15. Greek Symbol Mapping",
    desc: "Mengubah simbol Yunani ilmiah (seperti α, λ, μ) ke nama teks (alfa, lambda, mikro) agar terbaca model bahasa.",
    method: "Unicode mapping dictionary",
    key: "step_8_tokens"
  },
  {
    title: "16. Abbreviation Expansion",
    desc: "Memperluas singkatan akademis/fisika lokal (GLB, GLBB, CRI, FTT) menjadi bentuk penuhnya.",
    method: "Contextual Abbreviation Resolver",
    key: "step_8_tokens"
  },
  {
    title: "17. Synonym Mapping",
    desc: "Menyatukan beragam istilah penulisan yang bermakna sama (seperti 'salah konsep' menjadi 'miskonsepsi').",
    method: "Kamus Sinonim Semantis Miskonsepsi",
    key: "step_17_final_processed"
  }
];

export default function NlpPipelinePage() {
  const [inputText, setInputText] = useState(
    "Hasil penelitian menunjukkan adanya miskonsepsi siswa SMA pada materi GLB & GLBB. Sebagai contoh, gaya 1o N dianggap selalu searah dengan kecepatan v benda, dan simbol λ dipandang sebagai frekuensi gelombang."
  );
  const [trace, setTrace] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setTrace(null);
    try {
      const res = await preprocessText(inputText);
      if (res.status === "success") {
        setTrace(res.trace);
      } else {
        setError("Gagal memproses teks.");
      }
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan saat menghubungi API.");
    } finally {
      setLoading(false);
    }
  };

  const getStepValue = (step: StepDetail, index: number) => {
    if (!trace) return "";
    
    // Custom mapping untuk menampilkan data visual yang relevan
    if (step.key === "step_7_sentences") {
      const sents = trace[step.key];
      return Array.isArray(sents) ? sents.map((s, idx) => `[Kalimat ${idx+1}]: ${s}`).join("\n") : sents;
    }
    
    if (step.key === "step_8_tokens") {
      const tokens = trace[step.key];
      if (Array.isArray(tokens)) {
        if (index === 7) return `Tokens Kasar: \n[ ${tokens.slice(0, 10).join(" | ")} ... ]`;
        if (index === 8) return `Setelah Filter Stopword Ilmiah: \n[ ${tokens.filter((t: string) => t !== "hasil" && t !== "tunjuk").slice(0, 8).join(" | ")} ... ]`;
        if (index === 9) return `Whitelisting 'gaya': \n[ gaya | ${tokens.filter((t: string) => t !== "gaya" && t !== "hasil").slice(0, 8).join(" | ")} ... ]`;
        if (index === 10) return `Stemmed (Sastrawi): \n[ ${tokens.join(" | ")} ]`;
        if (index === 11) return `Casing Normal: \n[ ${tokens.map((t: string) => t.toLowerCase()).join(" | ")} ]`;
        if (index === 12) return `Equation Normal: \n[ ${tokens.join(" | ")} ]`;
        if (index === 13) return `Unit Standar: \n[ ${tokens.join(" | ")} ]`;
        if (index === 14) return `Greek Mapped: \n[ ${tokens.join(" | ")} ]`;
        if (index === 15) return `Expanded Abbr: \n[ ${tokens.join(" | ")} ]`;
      }
    }

    return trace[step.key];
  };

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="badge badge-blue mb-2">
            <Cpu size={11} className="mr-1" /> NLP Pipeline
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">17-Tahap NLP Pipeline Visualizer</h1>
          <p className="text-[#4a6fa5]">
            Ekstraksi kecerdasan leksikal spesialisasi fisika Indonesia sesuai dokumen riset.
          </p>
        </div>

        {/* Input Area */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FileText size={18} className="text-blue-400" />
            Masukkan Teks Fisika / Miskonsepsi
          </h2>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-32 p-4 rounded-xl border border-[#1e3a5f] bg-[#070b14] text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none font-sans leading-relaxed"
            placeholder="Tulis kalimat hasil analisis atau riset fisika..."
          />
          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-[#4a6fa5]">
              Coba gunakan simbol matematika, singkatan (GLB/CRI), simbol Yunani (λ), atau OCR typo (1o N).
            </div>
            <button
              onClick={handleProcess}
              disabled={loading || !inputText.trim()}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-white font-medium"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Play size={15} />
                  Proses Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Trace Visualizer */}
        {trace && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400" />
              Aliran Transformasi Leksikal
            </h2>
            <div className="relative border-l border-[#1e3a5f] ml-4 pl-8 space-y-6">
              {STEPS_INFO.map((step, idx) => {
                const isExpanded = expandedStep === idx;
                const value = getStepValue(step, idx);

                return (
                  <div key={idx} className="relative group">
                    {/* Circle Dot */}
                    <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full border border-blue-500/50 bg-[#070b14] flex items-center justify-center text-xs font-mono text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all cursor-pointer"
                         onClick={() => setExpandedStep(isExpanded ? null : idx)}>
                      {idx + 1}
                    </div>

                    <div className="glass-card p-4 hover:border-blue-500/30 transition-all">
                      <div className="flex justify-between items-start cursor-pointer"
                           onClick={() => setExpandedStep(isExpanded ? null : idx)}>
                        <div>
                          <h3 className="font-semibold text-white text-sm md:text-base flex items-center gap-2">
                            {step.title}
                            {idx === 3 && (
                              <span className="badge badge-emerald text-[10px]">Deteksi: {trace.step_4_lang}</span>
                            )}
                          </h3>
                          <p className="text-xs text-[#8fb3d8] mt-0.5">{step.desc}</p>
                        </div>
                        <div className="text-xs text-[#4a6fa5] flex items-center gap-2 flex-shrink-0">
                          <span className="hidden md:inline font-mono bg-[#070b14] px-2.5 py-1 rounded-md border border-[#1e3a5f]">{step.method}</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[#1e3a5f]/50 animate-slide-in">
                          <div className="text-xs text-[#4a6fa5] font-mono uppercase mb-2">Keadaan Teks saat ini:</div>
                          <div className="p-3.5 rounded-xl bg-[#070b14] border border-[#1e3a5f] text-sm text-[#e2e8f0] font-mono whitespace-pre-wrap break-all leading-relaxed">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
