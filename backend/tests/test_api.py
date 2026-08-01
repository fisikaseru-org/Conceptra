import sys
import os
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_misconceptions_endpoint(self):
        response = self.client.get("/api/misconceptions/")
        self.assertEqual(response.status_code, 200)

    def test_research_explorer_endpoint(self):
        response = self.client.get("/api/explorer/articles?limit=5")
        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", [])
        if data:
            article = data[0]
            doi = article.get("doi")
            url = article.get("url")
            # Test search by DOI
            if doi:
                res_doi = self.client.get(f"/api/explorer/articles?search={doi}")
                self.assertEqual(res_doi.status_code, 200)
                doi_data = res_doi.json().get("data", [])
                self.assertTrue(any(a["id"] == article["id"] for a in doi_data))
            # Test search by URL
            if url:
                res_url = self.client.get(f"/api/explorer/articles?search={url}")
                self.assertEqual(res_url.status_code, 200)
                url_data = res_url.json().get("data", [])
                self.assertTrue(any(a["id"] == article["id"] for a in url_data))

    def test_validation_metrics_endpoint(self):
        response = self.client.get("/api/validation/corpus-audit")
        self.assertEqual(response.status_code, 200)

    def test_export_csv_misconceptions(self):
        response = self.client.get("/api/export/csv/misconceptions")
        self.assertEqual(response.status_code, 200)

    def test_export_citation_bibtex(self):
        response = self.client.get("/api/export/citation/bibtex")
        self.assertEqual(response.status_code, 200)

    def test_export_citation_ris(self):
        response = self.client.get("/api/export/citation/ris")
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
