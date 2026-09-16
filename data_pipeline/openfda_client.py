"""
openfda_client.py
-----------------
openFDA Drug Labeling API client for extracting indications, boxed warnings,
contraindications, and adverse reactions from FDA Structured Product Labels (SPL).
"""

import logging
import requests

OPENFDA_LABEL_URL = "https://api.fda.gov/drug/label.json"

logger = logging.getLogger("OpenFDAClient")

def fetch_drug_label(generic_name: str, timeout: int = 6) -> dict | None:
    """
    Retrieves clinical label data from openFDA for a given generic medicine name.
    """
    if not generic_name:
        return None

    query = f'openfda.generic_name:"{generic_name}"'
    params = {"search": query, "limit": 1}

    try:
        response = requests.get(OPENFDA_LABEL_URL, params=params, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            if results:
                label = results[0]
                return {
                    "generic_name": generic_name,
                    "brand_name": label.get("openfda", {}).get("brand_name", []),
                    "indications_and_usage": label.get("indications_and_usage", [""])[0][:800],
                    "boxed_warning": label.get("boxed_warning", [""])[0][:800],
                    "contraindications": label.get("contraindications", [""])[0][:800],
                    "adverse_reactions": label.get("adverse_reactions", [""])[0][:800],
                    "drug_interactions": label.get("drug_interactions", [""])[0][:800],
                    "source": "FDA DailyMed / openFDA"
                }
    except Exception as e:
        logger.debug(f"openFDA fetch error for {generic_name}: {e}")

    return None
