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
