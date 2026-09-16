# 🧬 SMASP JavaScript Architecture Guide

Welcome to the modular JavaScript architecture of **SMASP v2.0 (Smart Medicine Awareness & Safety Platform)**.

This directory is organized into domain-specific modules, making it intuitive for any AI assistant or human developer to locate, extend, or maintain specific functionality.

---

## 📁 Directory Structure & Responsibilities

```
js/
├── data/                    # Static clinical & educational datasets
│   ├── medicines.js         # Default drug catalog (MOA, steps, contraindications)
│   ├── conditions.js        # Health conditions, symptoms, and allergen definitions
│   ├── interactions.js      # Drug-Drug Interaction (DDI) rules & severity ratings
│   ├── awarenessTips.js     # Public health education tips and guidance
│   └── i18n.js              # Localization dictionary (EN, HI)
│
├── engine/                  # Core clinical & algorithmic services
│   ├── riskEngine.js        # Risk scoring, pediatric/pregnancy modifiers, allergen triage
│   └── speechEngine.js      # Web Speech API voice synthesis ("Explain Like a Doctor")
│
├── storage/                 # Persistence layer
│   └── storageManager.js    # LocalStorage handling (custom datasets, history, bookmarks)
│
├── ui/                      # Presentation layer & view controllers
│   ├── domUtils.js          # HTML sanitization (XSS defense) & ARIA accessibility
│   ├── components.js        # Modular HTML widget templates (cards, tables, banners)
│   ├── homeView.js          # Search form controller, live filters, admin panel (index.html)
│   └── resultView.js        # Results controller, DDI comparison, print export (result.html)
│
├── app.js                   # Main application router and lifecycle bootstrap
└── README.md                # This reference guide
```

---

## 🛠️ How to Perform Common Tasks

### 1. Adding a New Medicine
Open [`js/data/medicines.js`](file:///d:/Projects/Smart_Patient-main/js/data/medicines.js) and add a new entry to `defaultMedicines`:
```javascript
"Cetirizine": {
  use: "Allergies, hay fever, hives",
  category: "Antihistamine",
  icon: "🍃",
  mechanism: "Selectively blocks peripheral H1 histamine receptors...",
  treats: "Alleviates sneezing, runny nose, and itching.",
  description: "Second-generation antihistamine with minimal sedation.",
  avoid: ["Severe Kidney Disease"],
  caution: ["Elderly"],
  side_effects: "Mild drowsiness, dry mouth",
  learn_more: "Does not cross blood-brain barrier as easily as first-gen antihistamines.",
  did_you_know: ["Second-generation antihistamines cause significantly less drowsiness."],
  who_cannot: ["End-stage renal failure without dialysis"],
  dosage_forms: ["Tablet", "Syrup"],
  allergens: ["Cetirizine", "Piperazine"],
  age_caution: { child: "Use pediatric syrup.", elderly: "Dose adjustment may be required." },
  pregnancy: "Generally acceptable if advised by clinician.",
  breastfeeding: "Small amounts enter breast milk; consult clinician.",
  sources: ["NHS Cetirizine guidance", "FDA Drug Label"],
  confidence: "High",
  steps: [
    { icon: "🍃", label: "Taken orally", desc: "Rapidly absorbed in gastrointestinal tract" },
    { icon: "🩸", label: "Circulation", desc: "Reaches peripheral tissues" },
    { icon: "🧬", label: "H1 blockade", desc: "Histamine unable to bind to receptor" },
    { icon: "✨", label: "Relief", desc: "Allergic symptoms subside" }
  ]
}
```

### 2. Adding a Drug–Drug Interaction Rule
Open [`js/data/interactions.js`](file:///d:/Projects/Smart_Patient-main/js/data/interactions.js) and append to `interactionRules`:
```javascript
{
  meds: ["DrugA", "DrugB"],
  level: "AVOID", // "AVOID" | "CAUTION" | "SAFE"
  reason: "Explanation of why these medicines interact.",
  severity: "High", // "High" | "Medium" | "Low"
  confidence: "High"
}
```

### 3. Adding a Health Condition or Symptom
Open [`js/data/conditions.js`](file:///d:/Projects/Smart_Patient-main/js/data/conditions.js) and add your condition to `defaultConditions` or symptom to `symptomSuggestions`.

### 4. Updating Risk Calculation Logic
Open [`js/engine/riskEngine.js`](file:///d:/Projects/Smart_Patient-main/js/engine/riskEngine.js):
- `evaluateRisk()`: Core triage (checks `avoid` list first $\rightarrow$ `caution` list second $\rightarrow$ `safe`).
- `applyProfileRiskAdjustments()`: Modifies risk based on age group, pregnancy, and breastfeeding.
- `evaluateAllergyRisk()`: Compares declared allergies against medicine allergens.

### 5. Modifying Card Layout or Styling
- Card structure: [`js/ui/components.js`](file:///d:/Projects/Smart_Patient-main/js/ui/components.js) $\rightarrow$ `buildMedicineCard()`
- Comparison table: [`js/ui/components.js`](file:///d:/Projects/Smart_Patient-main/js/ui/components.js) $\rightarrow$ `buildComparisonTable()`
- CSS styling: [`style.css`](file:///d:/Projects/Smart_Patient-main/style.css)

---

## 🔒 Security & Best Practices
- **XSS Prevention**: Always sanitize dynamic user input or database text using `SMASP.ui.domUtils.escHtml()` or `SMASP.ui.domUtils.escAttr()` before interpolating into HTML.
- **Environment Compatibility**: Modules use an IIFE pattern with universal root export (`window.SMASP` in browsers and `module.exports` in Node.js), ensuring zero bundler requirements and 100% compatibility across local `file://` protocol, dev servers, and static GitHub Pages.
