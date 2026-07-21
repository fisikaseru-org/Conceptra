# Conceptra — Physics Misconception Observatory

**Conceptra** adalah platform analitik dan repositori ilmiah riset miskonsepsi fisika Indonesia (1996–2026). Platform ini memproses 17.755 artikel penelitian terverifikasi dan 1.002 miskonsepsi fisika terstruktur.

---

## 🚀 Fitur Utama Dashboard

1. **Research Explorer (`/explorer`)**: Browser interaktif 17.755 artikel penelitian fisika Indonesia dengan pencarian kata kunci, filter domain, tahun, bahasa, dan evidence level.
2. **Domain Intelligence (`/domain-intel`)**: Analysis multi-dimensi 12 domain fisika (Mekanika, Listrik, Termodinamika, Optika, Gelombang, Fluida, Astronomi, Fisika Modern, dll), heatmap temporal 1996–2026, dan citation impact.
3. **Peta Miskonsepsi (`/misconceptions`)**: Katalog miskonsepsi fisika lengkap dengan akar penyebab (root cause), contoh jawaban salah siswa, serta instrumen remedi (PhET, CBT, POE, dsb).
4. **Evolusi Topik (`/topics`)**: Analisis tren temporal BERTopic & Kleinberg Burst 1996–2026.
5. **Knowledge Graph (`/knowledge-graph`)**: Visualisasi graph ontologi semantik TBox/ABox.
6. **Validation Panel (`/validation`)**: Metrik validitas ilmiah (Cohen's Kappa, Precision/Recall, ECE, Audit Bias, PRISMA flowchart).
7. **Aspect Extractor (`/extraction`)**: Ekstraksi entitas & aspek (NER & ABSA) dari abstrak penelitian.
8. **Gap Finder (`/gap-finder`)**: Identifikasi area penelitian fisika yang kurang tersentuh.

---

## 🛠️ Stack Teknologi

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS v4, Recharts, Framer Motion, Lucide React
- **Backend**: FastAPI (Python 3.12), SQLite3 (`conceptra.db`), Sentence-Transformers, ChromaDB, NetworkX
- **Database**: SQLite3 (`backend/data/conceptra.db`) - Single Source of Truth 100% data Indonesia 1996–2026

---

## 📦 Panduan Jalankan Lokal

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Server backend akan berjalan di `http://localhost:8000`.

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Buka browser di `http://localhost:3000`.

---

## 🌐 Deploy ke Vercel

### Langkah 1: Push Repository ke GitHub
```bash
git init
git remote add origin https://github.com/farrelfz/conceptra.git
git add .
git commit -m "feat: complete Conceptra observatory with 17.755 verified articles, Research Explorer, and Vercel setup"
git branch -M main
git push -u origin main --force
```

### Langkah 2: Deploy di Vercel
1. Buka [Vercel Dashboard](https://vercel.com/new).
2. Import repository `farrelfz/conceptra`.
3. Di bagian **Framework Preset**, pilih **Next.js**.
4. Jika backend FastAPI di-host terpisah (misalnya di Railway/Render/VPS), tambahkan Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://url-backend-anda.com`
5. Klik **Deploy**.
