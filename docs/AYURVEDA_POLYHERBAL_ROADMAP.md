# Ayurveda Polyherbal & Pharmacokinetic Roadmap (AHDI v2)
## Expanding Traditional Herb-Drug Safety to Classical Polyherbal Formulations & Bioactive Kinetics

**Document Ref:** SPI-AYUR-2026-V2  
**Framework:** Ayurvedic Pharmacopoeia of India (API), CCRAS (Central Council for Research in Ayurvedic Sciences), Ayush Research Portal

---

## 1. The Polyherbal Reality in Indian Clinical Practice

In real-world Indian households and AYUSH dispensaries, patients rarely consume single isolated raw herbs. Instead, they consume **classical compound polyherbal formulations** (*Yoga* / *Kashayam* / *Vati* / *Avaleha*) consisting of multiple botanicals with synergistic pharmacokinetics.

### The Pharmacokinetic Bio-Enhancer Phenomenon: *The Piperine Effect*
Ancient Ayurvedic texts describe *Yogavahi* (catalytic carrier herbs). The classical formula **Trikatu** (*Piper longum* + *Piper nigrum* + *Zingiber officinale*) contains high concentrations of **Piperine**:
- **Validated Mechanism**: Piperine is a potent non-competitive inhibitor of intestinal **P-glycoprotein (P-gp)** and hepatic **CYP3A4 / CYP2C9**.
- **Clinical Impact**: Co-administration of Piperine-rich formulations surges systemic AUC bioavailability of co-prescribed allopathic drugs by **$100\%\text{--}300\%$** (e.g. Rifampicin, Metformin, Propranolol, Theophylline, Phenytoin).
- **SPI v4 Innovation**: First platform to model Piperine bio-enhancement surges dynamically.

---

## 2. Priority Classical Formulations for AHDI Expansion

| Formulation Name | Primary Botanical Constituents | Key Bioactive Markers | High-Risk Allopathic Interactions |
|---|---|---|---|
| **Triphala Churna** | *Terminalia chebula, Terminalia bellirica, Phyllanthus emblica* | Tannins, Gallic acid, Chebulinic acid | **Iron & Zinc Supplements**: Tannins chelate divalent cations, collapsing oral absorption by $>70\%$. |
| **Trikatu Churna** | *Piper nigrum, Piper longum, Zingiber officinale* | Piperine, Gingerols, Shogaols | **Low Therapeutic Index Drugs (Warfarin, Phenytoin, Digoxin)**: P-gp and CYP3A4 inhibition surges serum concentration. |
| **Dashamoola** | Ten roots (*Aegle marmelos, Premna integrifolia*, etc.) | Flavonoids, Alkaloids | **Antihypertensives / Diuretics**: Fluid retention modulation; requires blood pressure monitoring. |
| **Chandraprabha Vati** | 37 ingredients (incl. *Shilajit, Guggulu, Loha Bhasma*) | Fulvic acids, Guggulsterones, Iron | **Oral Antibiotics & Anticoagulants**: Cation chelation (fluoroquinolones) + antiplatelet bleeding synergy. |
| **Chyawanprash** | 40+ ingredients (*Amla* base + sugar/honey + ghee) | Ascorbic acid, Polyphenols | **Oral Antidiabetics (Metformin/Glimepiride)**: High carbohydrate load opposes glycemic control unless sugar-free variant used. |
| **Khadirarishta** | *Acacia catechu* fermented liquid (contains self-generated alcohol 5–10%) | Polyphenols, Catechins, Ethanol | **Metronidazole / Disulfiram-like drugs**: Fermented self-generated alcohol causes severe disulfiram ethanol reaction (nausea, tachycardia). |

---

## 3. Dose-Threshold & Preparation-Specific Modeling
Unlike Western synthetics where 1 tablet = 500mg uniform salt:
1. **Dose Dependencies**:
   - Ashwagandha extract standard ($300\text{--}600\text{ mg/day}$) $\rightarrow$ Mild GABA potentiation.
   - High-dose raw root powder ($> 3\text{--}5\text{ g/day}$) $\rightarrow$ Severe sedation when combined with Alprazolam or Clonazepam.
2. **Formulation Extraction Ratio**:
   - Hydroalcoholic extract ($10:1$) has 10-fold higher bio-activity than traditional water decoction (*Kwatha*).
   - SPI v4 records preparation type (*Standardized Extract* vs. *Churna / Raw Powder*).

---

## 4. Integration Milestones
- **Q2 2026**: Ingest 15 classical Ayurvedic multi-herb formulations into `ayurveda_interactions`.
- **Q3 2026**: Incorporate Unani (*Khamira*) and Siddha (*Nilavembu Kudineer*) high-risk matrices.
- **Q4 2026**: Conduct prospective observational interaction validation at an AYUSH-Allopathy integrated tertiary center (e.g. Center for Integrative Medicine, NIMHANS / AIIMS).
