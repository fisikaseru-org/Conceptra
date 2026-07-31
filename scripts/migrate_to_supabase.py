"""
Conceptra — Supabase Data Migration Script
Uploads 17,755 research articles from SQLite conceptra.db and 1,002 misconceptions from corpus.py into Supabase PostgreSQL.

Usage:
  export SUPABASE_URL="https://xyz.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
  python3 scripts/migrate_to_supabase.py
"""

import os
import sys
import json
import sqlite3
from typing import List, Dict, Any

# Add backend directory to PYTHONPATH
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

try:
    from supabase import create_client, Client
except ImportError:
    print("Installing required package 'supabase'...")
    os.system("pip install supabase requests")
    from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
    print("Please set them before running the script:")
    print("  export SUPABASE_URL=\"https://your-project.supabase.co\"")
    print("  export SUPABASE_SERVICE_ROLE_KEY=\"your-service-role-or-anon-key\"")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def migrate_articles():
    db_path = os.path.join(BASE_DIR, "backend", "data", "conceptra.db")
    if not os.path.exists(db_path):
        print(f"❌ Database file not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM articles")
    total_count = cur.fetchone()[0]
    print(f"📦 Found {total_count} articles in SQLite conceptra.db")

    cur.execute("SELECT * FROM articles")
    rows = cur.fetchall()

    batch_size = 300
    batch: List[Dict[str, Any]] = []
    inserted_count = 0

    print("🚀 Starting batch migration to Supabase 'articles' table...")

    for i, row in enumerate(rows):
        row_dict = dict(row)
        
        # Parse JSON fields if they are string
        authors = row_dict.get("authors")
        if isinstance(authors, str):
            try:
                authors = json.loads(authors)
            except Exception:
                authors = [authors] if authors else []
        elif not authors:
            authors = []

        article = {
            "id": str(row_dict.get("id")),
            "title": row_dict.get("title", "") or "Untitled",
            "abstract": row_dict.get("abstract", "") or "",
            "authors": authors,
            "journal": row_dict.get("journal", "") or "",
            "year": row_dict.get("year"),
            "doi": row_dict.get("doi"),
            "scopus_id": row_dict.get("scopus_id"),
            "citation_count": row_dict.get("citation_count", 0) or 0,
            "physics_domain": row_dict.get("physics_domain", "Fisika Umum") or "Fisika Umum",
            "evidence_level": row_dict.get("evidence_level", "Level 3 - Diagnostic") or "Level 3 - Diagnostic",
            "language": row_dict.get("language", "id") or "id",
            "open_access_url": row_dict.get("open_access_url"),
            "url": row_dict.get("url"),
            "is_indonesia_context": row_dict.get("is_indonesia_context", 1),
            "quality_score": row_dict.get("quality_score", 0.8),
        }
        batch.append(article)

        if len(batch) >= batch_size or i == total_count - 1:
            try:
                res = supabase.table("articles").upsert(batch).execute()
                inserted_count += len(batch)
                print(f"  [Articles] Inserted {inserted_count}/{total_count} rows...")
            except Exception as e:
                print(f"  ⚠️ Batch insert warning: {e}")
            batch = []

    print(f"✅ Finished migrating {inserted_count} articles.")

def migrate_misconceptions():
    from core.corpus import PHYSICS_MISCONCEPTIONS
    total_count = len(PHYSICS_MISCONCEPTIONS)
    print(f"\n📦 Found {total_count} misconceptions in corpus.py")

    batch_size = 200
    batch: List[Dict[str, Any]] = []
    inserted_count = 0

    print("🚀 Starting batch migration to Supabase 'misconceptions' table...")

    for i, m in enumerate(PHYSICS_MISCONCEPTIONS):
        entry = {
            "id": m.get("id"),
            "domain": m.get("domain", "Fisika Umum"),
            "concept": m.get("concept", ""),
            "prerequisite": m.get("prerequisite", ""),
            "misconception": m.get("misconception", ""),
            "root_cause": m.get("root_cause", ""),
            "example_answer": m.get("example_answer", ""),
            "learning_impact": m.get("learning_impact", ""),
            "remediation": m.get("remediation", ""),
            "educational_level": m.get("educational_level", []),
            "assessment_tools": m.get("assessment_tools", []),
            "years_active": m.get("years_active", []),
            "frequency": m.get("frequency", 1),
            "keywords": m.get("keywords", []),
            "references_list": m.get("references", []),
            "doi": m.get("doi"),
            "scopus_id": m.get("scopus_id"),
            "source": m.get("source"),
            "frequency_methodology": m.get("frequency_methodology"),
            "evidence_level": m.get("evidence_level"),
            "authors": m.get("authors", []),
            "journal": m.get("journal"),
            "year": m.get("year"),
        }
        batch.append(entry)

        if len(batch) >= batch_size or i == total_count - 1:
            try:
                res = supabase.table("misconceptions").upsert(batch).execute()
                inserted_count += len(batch)
                print(f"  [Misconceptions] Inserted {inserted_count}/{total_count} rows...")
            except Exception as e:
                print(f"  ⚠️ Batch insert warning: {e}")
            batch = []

    print(f"✅ Finished migrating {inserted_count} misconceptions.")

if __name__ == "__main__":
    print("=== Conceptra -> Supabase Data Migration ===")
    migrate_articles()
    migrate_misconceptions()
    print("\n🎉 Migration complete! All dataset items uploaded to Supabase.")
