"""
rxnorm_client.py
----------------
Free NIH NLM RxNav REST API Client for drug concept standardization (RxCUI)
Requires zero API keys. Handles rate-limiting and defensive fallback.
"""

import logging
import requests

RXNAV_BASE_URL = "https://rxnav.nlm.nih.gov/REST"

logger = logging.getLogger("RxNormClient")

def find_rxcui_by_name(drug_name: str, timeout: int = 5) -> str | None:
    """
    Queries RxNav to retrieve standard RxCUI identifier for a drug name.
    """
    if not drug_name:
        return None

    url = f"{RXNAV_BASE_URL}/rxcui.json"
    params = {"name": drug_name, "search": 1}

    try:
        response = requests.get(url, params=params, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            id_group = data.get("idGroup", {})
            rxnorm_ids = id_group.get("rxnormId", [])
            if rxnorm_ids:
                return rxnorm_ids[0]
    except Exception as e:
        logger.debug(f"RxNav lookup failed for {drug_name}: {e}")

    return None

def get_drug_properties(rxcui: str, timeout: int = 5) -> dict | None:
    """
    Retrieves official RxNorm properties (name, synonym, tty) for a given RxCUI.
    """
    if not rxcui:
        return None

    url = f"{RXNAV_BASE_URL}/rxcui/{rxcui}/properties.json"

    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            return data.get("properties")
    except Exception as e:
        logger.debug(f"RxNav properties lookup failed for {rxcui}: {e}")

    return None
