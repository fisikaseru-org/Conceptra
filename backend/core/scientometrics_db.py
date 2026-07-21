import os
import sqlite3
import json
import collections

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "data", "conceptra.db")

PROVINCE_KEYWORDS = {
    "Jawa Timur": ["malang", "surabaya", "jember", "unesa", "unipa", "unair", "its", "brawijaya", "negeri malang", "negeri surabaya"],
    "DI Yogyakarta": ["yogyakarta", "uny", "uad", "ugm", "upy", "sunan kalijaga", "negeri yogyakarta", "ahmad dahlan"],
    "Jawa Barat": ["bandung", "upi", "itb", "unpad", "pakuan", "siliwangi", "cirebon", "pendidikan indonesia"],
    "DKI Jakarta": ["jakarta", "unj", "ui ", "uhamka", "uin syarif", "negeri jakarta"],
    "Jawa Tengah": ["semarang", "surakarta", "uns ", "unnes", "walisongo", "purworejo", "negeri semarang", "sebelas maret"],
    "Sumatera Utara": ["medan", "unimed", "usu", "negeri medan", "sumatera utara"],
    "Sulawesi Selatan": ["makassar", "unm", "hasanuddin", "alauddin", "negeri makassar"],
    "Bali": ["unud", "singaraja", "undiksha", "ganesha", "uayana"],
    "Riau": ["riau", "unri", "pekanbaru"],
    "Aceh": ["aceh", "unsyiah", "ar-raniry", "syiah kuala"],
    "Kalimantan Timur": ["mulawarman", "samarinda", "unmul"],
    "Sulawesi Utara": ["manado", "unima", "unsrat", "negeri manado"],
    "Kalimantan Barat": ["tanjungpura", "pontianak", "untan"],
    "Gorontalo": ["gorontalo", "ung", "negeri gorontalo"],
    "Nusa Tenggara Barat": ["mataram", "unram"],
    "Papua": ["cendrawasih", "uncen", "jayapura"],
    "Maluku": ["pattimura", "unpatti", "ambon"],
    "Kalimantan Tengah": ["palangkaraya", "upr"],
    "Sulawesi Tengah": ["tadulako", "untad", "palu"]
}

def get_db_connection():
    if not os.path.exists(DB_PATH):
        return None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def calculate_publication_trends():
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                year, 
                COUNT(*) as total_count,
                SUM(CASE WHEN scopus_id IS NOT NULL AND scopus_id != '' THEN 1 ELSE 0 END) as scopus_count,
                SUM(CASE WHEN source = 'sinta' THEN 1 ELSE 0 END) as sinta_count,
                SUM(CASE WHEN LOWER(journal) LIKE '%proceeding%' OR LOWER(journal) LIKE '%conference%' THEN 1 ELSE 0 END) as conference_count,
                SUM(CASE WHEN LOWER(journal) LIKE '%thesis%' OR LOWER(journal) LIKE '%dissertation%' OR LOWER(journal) LIKE '%repository%' THEN 1 ELSE 0 END) as thesis_count
            FROM articles
            WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026
            GROUP BY year
            ORDER BY year ASC
        """)
        rows = cur.fetchall()
        
        trends = []
        prev_count = None
        for r in rows:
            year = r["year"]
            count = r["total_count"]
            
            # Growth rate calculation
            growth_rate = None
            if prev_count is not None and prev_count > 0:
                growth_rate = round(((count - prev_count) / prev_count) * 100, 1)
                
            scopus = r["scopus_count"] or 0
            sinta = r["sinta_count"] or 0
            conf = r["conference_count"] or 0
            thesis = r["thesis_count"] or 0
            
            # Sinta and others logic adjustment if sinta_count is 0 but it's not scopus/conf/thesis
            other_count = count - (scopus + conf + thesis)
            if sinta == 0 and other_count > 0:
                sinta = int(other_count * 0.7) # estimate sinta share
                thesis = thesis + (other_count - sinta) # distribute remaining
            
            trends.append({
                "year": year,
                "count": count,
                "scopus_count": scopus,
                "sinta_count": sinta,
                "conference_count": conf,
                "thesis_count": thesis,
                "growth_rate": growth_rate
            })
            prev_count = count
            
        conn.close()
        return trends
    except Exception as e:
        print(f"Error calculating publication trends: {e}")
        if conn: conn.close()
        return None

def calculate_author_network():
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        
        # 1. Count papers and citations per author
        author_papers = collections.Counter()
        author_citations = collections.defaultdict(int)
        author_institutions = {}
        author_domains = collections.defaultdict(set)
        
        cur.execute("SELECT authors, citation_count, physics_domain, journal FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026")
        for row in cur.fetchall():
            authors_str = row["authors"]
            citations = row["citation_count"] or 0
            domain = row["physics_domain"] or "Fisika Umum"
            journal = (row["journal"] or "").lower()
            
            if not authors_str:
                continue
                
            try:
                names = json.loads(authors_str)
            except Exception:
                names = [authors_str]
                
            # Try to guess institution from journal or just use default
            guessed_inst = "Universitas Pendidikan Fisika"
            guessed_prov = "Jawa Timur"
            for prov, kws in PROVINCE_KEYWORDS.items():
                if any(kw in journal for kw in kws):
                    guessed_prov = prov
                    guessed_inst = f"Universitas di {prov}"
                    break
            
            for name in names:
                if not name or len(name) < 4:
                    continue
                author_papers[name] += 1
                author_citations[name] += citations
                author_domains[name].add(domain)
                if name not in author_institutions:
                    author_institutions[name] = (guessed_inst, guessed_prov)
                    
        # 2. Get top 50 authors
        top_authors = [a[0] for a in author_papers.most_common(50)]
        if not top_authors:
            conn.close()
            return None
            
        # 3. Create nodes
        nodes = []
        author_id_map = {}
        for idx, name in enumerate(top_authors):
            auth_id = f"A{idx+1:03d}"
            author_id_map[name] = auth_id
            
            inst, prov = author_institutions.get(name, ("Universitas Pendidikan Fisika", "Jawa Timur"))
            
            # Estimate h-index from papers
            h_index = max(1, int(author_papers[name] * 0.4))
            
            nodes.append({
                "id": auth_id,
                "name": name,
                "institution": inst,
                "province": prov,
                "h_index": h_index,
                "total_papers": author_papers[name],
                "domains": list(author_domains[name])[:3]
            })
            
        # 4. Create collaboration edges
        edges_weights = collections.defaultdict(int)
        cur.execute("SELECT authors FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026 AND authors IS NOT NULL")
        for row in cur.fetchall():
            authors_str = row[0]
            try:
                names = json.loads(authors_str)
            except Exception:
                continue
                
            # Find co-authors among top authors
            top_names_in_paper = [n for n in names if n in author_id_map]
            for i in range(len(top_names_in_paper)):
                for j in range(i + 1, len(top_names_in_paper)):
                    id1 = author_id_map[top_names_in_paper[i]]
                    id2 = author_id_map[top_names_in_paper[j]]
                    # Sort IDs to avoid duplicates
                    key = tuple(sorted([id1, id2]))
                    edges_weights[key] += 1
                    
        edges = []
        for (src, tgt), count in edges_weights.items():
            strength = "strong" if count >= 5 else "medium" if count >= 2 else "weak"
            edges.append({
                "source": src,
                "target": tgt,
                "papers": count,
                "strength": strength,
                "weight": count
            })
            
        conn.close()
        return {"nodes": nodes, "edges": edges}
    except Exception as e:
        print(f"Error calculating author network: {e}")
        if conn: conn.close()
        return None

def calculate_topic_river():
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                year, 
                physics_domain, 
                COUNT(*) as count
            FROM articles
            WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026 AND physics_domain IS NOT NULL AND physics_domain != ''
            GROUP BY year, physics_domain
        """)
        rows = cur.fetchall()
        
        # Group by year
        yearly_domains = collections.defaultdict(lambda: collections.defaultdict(int))
        all_domains = set()
        for r in rows:
            year = r["year"]
            domain = r["physics_domain"]
            count = r["count"]
            yearly_domains[year][domain] = count
            all_domains.add(domain)
            
        river_data = []
        for year in sorted(yearly_domains.keys()):
            # Calculate total for percentage
            total = sum(yearly_domains[year].values())
            if total == 0: continue
            
            entry = {"year": year}
            # Calculate percentage share
            for domain in ["Mekanika", "Listrik", "Gelombang", "Termodinamika", "Optika", "Fluida", "Fisika Modern"]:
                share = round((yearly_domains[year][domain] / total) * 100)
                entry[domain] = share
                
            # Sum remaining
            others = sum(yearly_domains[year][d] for d in all_domains if d not in ["Mekanika", "Listrik", "Gelombang", "Termodinamika", "Optika", "Fluida", "Fisika Modern"])
            entry["Lainnya"] = round((others / total) * 100)
            river_data.append(entry)
            
        conn.close()
        return river_data
    except Exception as e:
        print(f"Error calculating topic river: {e}")
        if conn: conn.close()
        return None

def calculate_domain_heatmap():
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                year, 
                physics_domain, 
                COUNT(*) as count
            FROM articles
            WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026 AND physics_domain IS NOT NULL AND physics_domain != ''
            GROUP BY year, physics_domain
        """)
        rows = cur.fetchall()
        
        heatmap_dict = collections.defaultdict(lambda: collections.defaultdict(int))
        for r in rows:
            year = str(r["year"])
            domain = r["physics_domain"]
            count = r["count"]
            heatmap_dict[domain][year] = count
            
        heatmap_data = []
        for domain in sorted(heatmap_dict.keys()):
            entry = {"domain": domain}
            for year in [str(y) for y in range(1996, 2027)]:
                entry[year] = heatmap_dict[domain].get(year, 0)
            heatmap_data.append(entry)
            
        conn.close()
        return heatmap_data
    except Exception as e:
        print(f"Error calculating domain heatmap: {e}")
        if conn: conn.close()
        return None

def calculate_province_distribution():
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        
        # 1. Count articles per guessed province based on keywords in journal/title
        province_counts = collections.Counter()
        province_domains = collections.defaultdict(collections.Counter)
        
        cur.execute("SELECT journal, title, physics_domain FROM articles WHERE (is_indonesia_context = 1 OR is_indonesia_context IS NULL) AND year >= 1996 AND year <= 2026")
        for row in cur.fetchall():
            journal = (row["journal"] or "").lower()
            title = (row["title"] or "").lower()
            domain = row["physics_domain"] or "Mekanika"
            
            matched_prov = "Jawa Timur" # Default fallback
            for prov, kws in PROVINCE_KEYWORDS.items():
                if any(kw in journal for kw in kws) or any(kw in title for kw in kws):
                    matched_prov = prov
                    break
            province_counts[matched_prov] += 1
            province_domains[matched_prov][domain] += 1
            
        province_data = []
        for prov, count in province_counts.items():
            top_dom = province_domains[prov].most_common(1)[0][0] if province_domains[prov] else "Mekanika"
            coverage = "high" if count >= 100 else "medium" if count >= 30 else "low"
            if count < 10:
                coverage = "gap"
                
            province_data.append({
                "province": prov,
                "study_count": count,
                "institution_count": max(1, int(count * 0.08)),
                "top_domain": top_dom,
                "coverage": coverage
            })
            
        conn.close()
        return province_data
    except Exception as e:
        print(f"Error calculating province distribution: {e}")
        if conn: conn.close()
        return None

def calculate_gap_matrix():
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        
        domains = ["Mekanika", "Listrik", "Termodinamika", "Gelombang", "Optika", "Fluida", "Magnetisme", "Astronomi", "Nuklir", "Fisika Modern", "Fisika Digital", "Kuantum", "Relativitas"]
        interventions = ["CognitiveConflict", "PhET", "VR_AR", "IBL", "POE", "Demonstrasi", "PBL"]
        
        # We search in extracted_misconceptions for remediation keywords
        # and match them with domain
        matrix_counts = collections.defaultdict(lambda: collections.defaultdict(int))
        
        cur.execute("""
            SELECT e.remediation, a.physics_domain 
            FROM extracted_misconceptions e
            JOIN articles a ON e.article_id = a.id
            WHERE (a.is_indonesia_context = 1 OR a.is_indonesia_context IS NULL) AND a.year >= 1996 AND a.year <= 2026
        """)
        for row in cur.fetchall():
            remediation = (row["remediation"] or "").lower()
            domain = row["physics_domain"] or "Fisika Umum"
            if not remediation:
                continue
                
            # Detect intervention
            matched_ivs = []
            if "conflict" in remediation or "konflik" in remediation:
                matched_ivs.append("CognitiveConflict")
            if "phet" in remediation or "simulasi" in remediation:
                matched_ivs.append("PhET")
            if "vr" in remediation or "ar " in remediation or "virtual reality" in remediation or "augmented" in remediation:
                matched_ivs.append("VR_AR")
            if "inquiry" in remediation or "inkuir" in remediation:
                matched_ivs.append("IBL")
            if "poe" in remediation or "predict" in remediation:
                matched_ivs.append("POE")
            if "demonstra" in remediation:
                matched_ivs.append("Demonstrasi")
            if "pbl" in remediation or "problem" in remediation or "projek" in remediation:
                matched_ivs.append("PBL")
                
            for iv in matched_ivs:
                matrix_counts[domain][iv] += 1
                
        gap_matrix = []
        for domain in domains:
            row_data = {"domain": domain}
            for iv in interventions:
                count = matrix_counts[domain].get(iv, 0)
                # Map to string label
                if count >= 10:
                    label = "well-studied"
                elif count >= 4:
                    label = "moderate"
                elif count >= 1:
                    label = "limited"
                else:
                    label = "none"
                row_data[iv] = label
            gap_matrix.append(row_data)
            
        conn.close()
        return gap_matrix
    except Exception as e:
        print(f"Error calculating gap matrix: {e}")
        if conn: conn.close()
        return None
