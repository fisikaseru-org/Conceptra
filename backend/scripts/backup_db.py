"""
Conceptra — Database Backup Utility
Membuat snapshot berkas SQLite conceptra.db yang terkompresi (.gz) dengan stempel waktu.
"""
import os
import gzip
import shutil
import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "conceptra.db")
BACKUP_DIR = os.path.join(BASE_DIR, "data", "backups")

def run_backup():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database file not found at: {DB_PATH}")
        return False

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"conceptra_backup_{timestamp}.db.gz"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    print(f"[INFO] Creating database backup snapshot: {backup_filename} ...")
    with open(DB_PATH, 'rb') as f_in:
        with gzip.open(backup_path, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    size_mb = os.path.getsize(backup_path) / (1024 * 1024)
    print(f"[SUCCESS] Backup saved successfully! ({size_mb:.2f} MB) -> {backup_path}")
    return True

if __name__ == "__main__":
    run_backup()
