"""
Conceptra — Corpus Sync API Router
Mengelola background worker untuk memanen artikel dari API eksternal.
"""
from fastapi import APIRouter, HTTPException
import subprocess
import os
import signal
import sqlite3
from typing import Dict, Optional

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "conceptra.db")
SCRIPT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts", "harvest_100k.py")

# Global reference to running harvester process
harvester_process: Optional[subprocess.Popen] = None


@router.get("/status")
async def get_sync_status():
    """Mendapatkan status pemanenan artikel dari database SQLite."""
    if not os.path.exists(DB_PATH):
        return {
            "status": "idle",
            "count": 0,
            "message": "Database belum terinisialisasi. Silakan mulai sinkronisasi data.",
            "is_running": False
        }
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Ambil count
        cursor.execute("SELECT COUNT(*) FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026")
        count = cursor.fetchone()[0]
        
        # Ambil status string
        cursor.execute("SELECT value FROM harvest_status WHERE key='status'")
        row = cursor.fetchone()
        status = row[0] if row else "idle"
        
        # Cari paper valid (yang memiliki DOI nyata)
        cursor.execute("SELECT COUNT(*) FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026 AND doi IS NOT NULL AND doi != ''")
        valid_doi_count = cursor.fetchone()[0]
        
        # Cari distribusi domain
        cursor.execute("SELECT physics_domain, COUNT(*) FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026 GROUP BY physics_domain")
        domains = {r[0]: r[1] for r in cursor.fetchall()}
        
        # Cek apakah proses subprocess python sedang aktif
        global harvester_process
        is_running = harvester_process is not None and harvester_process.poll() is None
        
        # Jika status di DB adalah 'running' tapi proses tidak aktif (misal server restart atau crash),
        # perbarui status di database ke 'stopped' secara otomatis agar sinkron.
        actual_status = status
        if status == "running" and not is_running:
            actual_status = "stopped"
            cursor.execute("INSERT OR REPLACE INTO harvest_status (key, value) VALUES ('status', 'stopped')")
            conn.commit()
        elif is_running and status != "running":
            actual_status = "running"
            cursor.execute("INSERT OR REPLACE INTO harvest_status (key, value) VALUES ('status', 'running')")
            conn.commit()
            
        conn.close()
        
        return {
            "status": actual_status,
            "count": count,
            "valid_doi_count": valid_doi_count,
            "domains": domains,
            "is_running": is_running,
            "message": (
                "Sinkronisasi sedang berlangsung..." if is_running 
                else "Pemanenan selesai." if count >= 10000 
                else "Sinkronisasi idle/terhenti."
            )
        }
    except Exception as e:
        return {
            "status": "error",
            "count": 0,
            "error": str(e),
            "is_running": False
        }
@router.post("/start")
async def start_sync():
    """Memulai pemanenan artikel di background."""
    global harvester_process
    
    # Cek jika sedang berjalan
    if harvester_process is not None and harvester_process.poll() is None:
        return {"status": "already_running", "message": "Proses sinkronisasi sudah berjalan."}
        
    try:
        # Jalankan harvester script dengan redirect output ke file log untuk menghindari pipe buffer penuh (yang menyebabkan freeze)
        log_file_path = os.path.join(os.path.dirname(DB_PATH), "harvester.log")
        log_file = open(log_file_path, "a")
        
        harvester_process = subprocess.Popen(
            ["python3", "-u", SCRIPT_PATH],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid # Agar bisa mematikan seluruh group process jika di-stop
        )
        return {
            "status": "started",
            "message": "Pemanenan artikel dari OpenAlex dimulai di background.",
            "pid": harvester_process.pid
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memulai script pemanen: {str(e)}")


@router.post("/stop")
async def stop_sync():
    """Menghentikan pemanenan artikel yang sedang berjalan secara paksa."""
    global harvester_process
    
    if harvester_process is None or harvester_process.poll() is not None:
        return {"status": "not_running", "message": "Tidak ada proses sinkronisasi yang sedang berjalan."}
        
    try:
        # Kirim SIGTERM ke process group
        os.killpg(os.getpgid(harvester_process.pid), signal.SIGTERM)
        harvester_process = None
        
        # Update status di database ke terhenti
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO harvest_status (key, value) VALUES ('status', 'stopped')")
            conn.commit()
            conn.close()
            
        return {"status": "stopped", "message": "Proses sinkronisasi berhasil dihentikan."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menghentikan proses: {str(e)}")
