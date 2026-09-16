"""
normalize_drugs.py
------------------
Standardization and entity extraction utilities for clinical medicine names,
active chemical ingredients, and Indian pharmaceutical trade brand mappings.
"""

import re

# Comprehensive brand-to-generic dictionary for top prescribed Indian drugs
INDIAN_BRAND_SYNONYMS = {
    "dolo": "Paracetamol",
    "dolo 650": "Paracetamol",
    "calpol": "Paracetamol",
    "calpol 650": "Paracetamol",
    "crocin": "Paracetamol",
    "augmentin": "Amoxicillin and Potassium Clavulanate",
    "augmentin 625": "Amoxicillin and Potassium Clavulanate",
    "augmentin 625 duo": "Amoxicillin and Potassium Clavulanate",
    "clavam": "Amoxicillin and Potassium Clavulanate",
    "clavam 625": "Amoxicillin and Potassium Clavulanate",
    "glycomet": "Metformin",
    "glycomet 500": "Metformin",
    "glycomet sr": "Metformin",
    "pan-d": "Pantoprazole and Domperidone",
    "pand": "Pantoprazole and Domperidone",
    "pantocid": "Pantoprazole",
    "pantocid 40": "Pantoprazole",
    "combiflam": "Ibuprofen and Paracetamol",
    "flexon": "Ibuprofen and Paracetamol",
    "telma": "Telmisartan",
    "telma 40": "Telmisartan",
    "amlong": "Amlodipine",
    "amlong 5": "Amlodipine",
    "atorva": "Atorvastatin",
    "atorva 10": "Atorvastatin",
    "atorva 20": "Atorvastatin",
    "montair-lc": "Montelukast and Levocetirizine",
    "montair lc": "Montelukast and Levocetirizine",
    "azithral": "Azithromycin",
    "azithral 500": "Azithromycin",
    "ecosprin": "Aspirin",
    "ecosprin 75": "Aspirin",
    "ecosprin 150": "Aspirin",
    "shelcal": "Calcium and Vitamin D3",
    "shelcal 500": "Calcium and Vitamin D3"
}

def clean_drug_name(name: str) -> str:
    """Removes dosage numbers, symbols, and whitespace to find normalized key."""
    if not name:
        return ""
    # Strip strength numbers like 500mg, 650, etc.
    cleaned = re.sub(r'\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|sr|ec|dt|duo)?\b', '', name, flags=re.IGNORECASE)
    cleaned = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', cleaned)
    return re.sub(r'\s+', ' ', cleaned).strip().lower()

def resolve_drug_identity(query: str) -> dict:
    """
    Resolves an input query (brand or generic) to standard generic name and source.
    """
    if not query:
        return {"query": "", "resolved_generic": "", "is_indian_brand": False}

    q_lower = query.strip().lower()
    cleaned = clean_drug_name(query)

    # Check direct brand dictionary
    if q_lower in INDIAN_BRAND_SYNONYMS:
        return {
            "query": query,
            "resolved_generic": INDIAN_BRAND_SYNONYMS[q_lower],
            "is_indian_brand": True,
            "matched_brand": q_lower
        }

    if cleaned in INDIAN_BRAND_SYNONYMS:
        return {
            "query": query,
            "resolved_generic": INDIAN_BRAND_SYNONYMS[cleaned],
            "is_indian_brand": True,
            "matched_brand": cleaned
        }

    # Partial match for Indian brands
    for brand_key, generic in INDIAN_BRAND_SYNONYMS.items():
        if brand_key in q_lower or q_lower in brand_key:
            return {
                "query": query,
                "resolved_generic": generic,
                "is_indian_brand": True,
                "matched_brand": brand_key
            }

    # Default to formatted title case generic query
    return {
        "query": query,
        "resolved_generic": query.strip().title(),
        "is_indian_brand": False
    }
