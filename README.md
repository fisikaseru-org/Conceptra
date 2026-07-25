<div align="center">
  <img src="https://raw.githubusercontent.com/farrelfz/conceptra/main/frontend/public/favicon.ico" width="80" alt="Conceptra Logo" style="border-radius: 20%;" />
  <h1 align="center">Conceptra</h1>
  <p align="center">
    <strong>The Indonesian Physics Misconception Observatory (1996–2026)</strong>
  </p>

  <p align="center">
    <a href="https://github.com/farrelfz/conceptra/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge&color=8b5cf6" alt="License: MIT" />
    </a>
    <a href="https://nextjs.org/">
      <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    </a>
    <a href="https://fastapi.tiangolo.com/">
      <img src="https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    </a>
    <a href="https://www.sqlite.org/index.html">
      <img src="https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite" alt="SQLite" />
    </a>
  </p>
  
  <p align="center">
    <em>Sebuah platform analitik sains terintegrasi untuk memetakan, mendiagnosis, dan merekam evolusi miskonsepsi fisika dari 17.755 literatur ilmiah Indonesia.</em>
  </p>
</div>

<br/>

## 🎯 Project Overview

**Conceptra** adalah platform analitik dan repositori ilmiah riset miskonsepsi fisika pertama di Indonesia. Melalui integrasi *Natural Language Processing* (NLP) dan *Bibliometric Analysis*, platform ini membedah ribuan literatur akademik dari tahun 1996 hingga 2026 untuk menyajikan profil miskonsepsi yang terstruktur secara semantik.

Database kami memproses **17.755 artikel penelitian terverifikasi** dan telah berhasil menyaring **1.002 varian miskonsepsi fisika** lengkap dengan akar masalah (*root cause*), rekam jejak evolusi, dan rekomendasi intervensi pedagogisnya.

---

## 🚀 Key Features

Conceptra dibangun dengan arsitektur multi-layer yang menyediakan 8 modul analitik utama:

1. 🔍 **Research Explorer (`/explorer`)**  
   Mesin pencari interaktif yang menjelajahi 17.755 literatur fisika. Dilengkapi dengan filter semantik, pemetaan domain, sitasi, serta *Evidence Level*.
2. 📊 **Analytics Dashboard (`/analytics`)**  
   Analisis multi-dimensi untuk 12 domain fisika (Mekanika, Listrik, Termodinamika, Kuantum, dll). Menampilkan *Radar Chart* kompetensi dan *Timeline* riset historis.
3. 🗺️ **Peta Miskonsepsi (`/misconceptions`)**  
   Katalog komprehensif miskonsepsi fisika. Mengidentifikasi pola pemikiran alternatif siswa, contoh miskonsepsi klasik, dan memetakan instrumen diagnostik (misal: CRI, Tier-Test).
4. 📈 **Topic Evolution (`/topics`)**  
   Menganalisis pergeseran paradigma riset sebelum dan sesudah pandemi (Pre vs Post-COVID) menggunakan *Dynamic Topic Modeling* dan deteksi *Kleinberg Burst*.
5. 🕸️ **Knowledge Graph (`/knowledge-graph`)**  
   Representasi ontologi TBox/ABox dari ekosistem pembelajaran fisika.
6. 🛡️ **Validation Panel (`/validation`)**  
   Sistem audit transparan yang menampilkan metrik validitas ekstraksi (Cohen's Kappa, Precision/Recall, PRISMA flowchart, dan Bias Audit).
7. 🧠 **Aspect Extractor (`/tools/extraction`)**  
   Modul ekstraksi NLP untuk melakukan *Named Entity Recognition* (NER) dan *Aspect-Based Sentiment Analysis* (ABSA) pada abstrak jurnal baru.
8. 💡 **Research Insights (`/research-insights`)**  
   Pemetaan kekosongan literatur (*Gap Finder*) dan tinjauan keefektifan model intervensi remediasi (WebAR, PhET, Blended Learning).

---

## 🛠️ Technology Stack

Sistem ini didesain dengan prinsip *Separation of Concerns* (SoC), memisahkan klien analitik berkecepatan tinggi dengan mesin pemroses komputasi.

### Frontend (Client-Side)
- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS v4, Framer Motion (Micro-animations)
- **Data Visualization**: Recharts (Custom Dual-Axis & Stacked Charts)
- **Icons**: Lucide React

### Backend (Server-Side & Data Layer)
- **Framework**: FastAPI (Python 3.12)
- **Database**: SQLite3 (`conceptra.db` - *Single Source of Truth*)
- **Data Processing**: Pandas, NumPy
- **NLP & Network**: Sentence-Transformers, NetworkX

---

## 💻 Local Development Setup

Untuk menjalankan Conceptra di mesin lokal Anda, ikuti langkah-langkah berikut:

### 1. Clone Repository
```bash
git clone https://github.com/farrelfz/conceptra.git
cd conceptra
```

### 2. Setup Backend (FastAPI)
```bash
cd backend

# Buat dan aktifkan Virtual Environment
python -m venv venv
source venv/bin/activate  # Untuk Linux/macOS
# .\venv\Scripts\activate # Untuk Windows

# Install dependensi
pip install -r requirements.txt

# Jalankan server pengembangan
bash start.sh
# Atau manual: python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API akan berjalan di `http://localhost:8000`. Dokumentasi Swagger tersedia di `/docs`.

### 3. Setup Frontend (Next.js)
Buka terminal baru:
```bash
cd frontend

# Install dependensi Node.js
npm install

# Jalankan server
npm run dev
```
Dashboard Conceptra sekarang dapat diakses melalui `http://localhost:3000`.

---

## ☁️ Cloud Deployment Guide

Conceptra didesain untuk **Split Deployment**, di mana *Frontend* di-hosting pada jaringan Edge (Vercel) dan *Backend* berjalan pada kontainer/VPS (Render/Railway) karena besarnya basis data SQLite.

### Tahap 1: Deploy Backend (Render / Railway)
*Karena GitHub menolak file >100MB, file database raksasa `conceptra.db` (106MB) telah dikompres secara internal menjadi `conceptra.db.gz` (26MB) dan masuk dalam repositori. Backend telah dirancang untuk otomatis merakit ulang (decompress) database tersebut saat server menyala pertama kali.*

1. Buat web service baru di [Render.com](https://render.com).
2. Sambungkan repo GitHub Anda.
3. Konfigurasi:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Dapatkan URL backend Anda (misal: `https://conceptra-backend.onrender.com`).

### Tahap 2: Deploy Frontend (Vercel)
1. Buka [Vercel](https://vercel.com/new) dan *import* repositori GitHub ini.
2. Atur **Root Directory** ke `frontend`.
3. Pada bagian **Environment Variables**, tambahkan:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://conceptra-backend.onrender.com` *(URL Render Anda, tanpa garis miring `/` di akhir)*.
4. Klik **Deploy**.

---

<div align="center">
  <p>Didesain dengan ❤️ untuk Kemajuan Pendidikan Sains Indonesia.</p>
  <p><strong>© 2026 Conceptra Analytics</strong></p>
</div>
