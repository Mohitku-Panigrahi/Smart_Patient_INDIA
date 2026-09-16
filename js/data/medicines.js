/**
 * @file medicines.js
 * @description Default catalog of medicines with pharmacological data,
 * mechanisms of action, journey steps, contraindications, and science facts.
 * @namespace SMASP.data.medicines
 */

(function (root) {
  'use strict';

  const defaultMedicines = {
    "Paracetamol": {
      use: "Fever, mild pain, headache",
      category: "Analgesic / Antipyretic",
      icon: "💊",
      mechanism: "Blocks COX enzymes in the brain → reduces prostaglandin production → signals the hypothalamus to lower body temperature and reduce pain perception.",
      treats: "Acts on the hypothalamus (brain's thermostat) to lower fever. Reduces pain signals at the central nervous system level without causing significant inflammation reduction.",
      description: "One of the world's most widely used medicines. Effective for mild to moderate pain and fever. Generally well-tolerated at recommended doses, but dangerous in overdose.",
      avoid: ["Liver Disease"],
      caution: ["Asthma"],
      side_effects: "Nausea, rash (rare), liver damage in overdose",
      learn_more: "Overdose risk even with slightly high doses; always follow recommended limits; alcohol multiplies liver toxicity risk.",
      did_you_know: [
        "Paracetamol overdose is the leading cause of acute liver failure in many countries.",
        "It works differently from NSAIDs — it doesn't reduce inflammation, only pain and fever.",
        "Safe for most pregnant women when used as directed — consult a doctor first.",
        "Alcohol and paracetamol together dramatically increase liver strain."
      ],
      who_cannot: [
        "People with liver or kidney disease",
        "Heavy alcohol users",
        "Those with G6PD deficiency",
        "Anyone already taking other paracetamol-containing products"
      ],
      dosage_forms: ["Tablet", "Syrup", "Suppository", "IV"],
      allergens: ["Paracetamol"],
      age_caution: {
        child: "Dose must be weight-based.",
        elderly: "Monitor liver function in prolonged use."
      },
      pregnancy: "Generally considered lower risk when advised by clinician.",
      breastfeeding: "Usually compatible in standard doses after clinical advice.",
      sources: [
        "WHO Model List of Essential Medicines",
        "NHS: Paracetamol guidance",
        "FDA Drug Safety Communication"
      ],
      confidence: "Moderate",
      steps: [
        { icon: "💊", label: "Taken orally", desc: "Absorbed in the small intestine" },
        { icon: "🩸", label: "Enters bloodstream", desc: "Distributed throughout the body" },
        { icon: "🧠", label: "Acts on CNS", desc: "Inhibits COX-2 in the brain" },
        { icon: "🌡️", label: "Effect", desc: "Pain signal blocked, fever reduced" }
      ]
    },
    "Ibuprofen": {
      use: "Pain, inflammation, arthritis, menstrual cramps",
      category: "NSAID / Anti-inflammatory",
      icon: "🔵",
      mechanism: "Inhibits COX-1 and COX-2 enzymes throughout the body → blocks prostaglandin synthesis → reduces inflammation, pain, and fever at the site of injury.",
      treats: "Directly targets the source of inflammation — reduces swelling, redness, and pain in muscles, joints, and tissues. More effective than paracetamol for inflammatory conditions.",
      description: "A nonsteroidal anti-inflammatory drug (NSAID). Treats pain, fever, and inflammation. Widely used for arthritis, sports injuries, dental pain, and period cramps.",
      avoid: ["Stomach Ulcer"],
      caution: ["High Blood Pressure"],
      side_effects: "Stomach irritation, nausea, increased blood pressure with prolonged use",
      learn_more: "Take with food to protect stomach lining; long-term use increases cardiovascular and GI bleeding risk.",
      did_you_know: [
        "Ibuprofen can thin the stomach lining, which is why it should always be taken with food.",
        "Regular use can raise blood pressure — important to monitor if you're hypertensive.",
        "It is one of the only OTC drugs with clear anti-inflammatory properties.",
        "High doses increase risk of heart attack with long-term use."
      ],
      who_cannot: [
        "People with stomach ulcers or GI bleeding history",
        "Patients with severe heart failure",
        "Those with chronic kidney disease",
        "Pregnant women in 3rd trimester",
        "People taking blood thinners"
      ],
      dosage_forms: ["Tablet", "Capsule", "Suspension", "Topical Gel"],
      allergens: ["NSAID"],
      age_caution: {
        child: "Use age/weight-appropriate pediatric formulation.",
        elderly: "Higher GI and kidney risk with prolonged use."
      },
      pregnancy: "Avoid in late pregnancy; seek clinician advice in all trimesters.",
      breastfeeding: "Often compatible short term with professional advice.",
      sources: [
        "NHS: Ibuprofen guidance",
        "Mayo Clinic Drug Monograph",
        "EMA safety updates"
      ],
      confidence: "Moderate",
      steps: [
        { icon: "🔵", label: "Taken orally", desc: "Absorbed via the stomach and intestines" },
        { icon: "🩸", label: "Enters bloodstream", desc: "Binds to COX-1 and COX-2 enzymes" },
        { icon: "🦴", label: "Reaches site", desc: "Prostaglandin production halted" },
        { icon: "🧊", label: "Effect", desc: "Inflammation, swelling, and pain reduced" }
      ]
    },
    "Aspirin": {
      use: "Pain, fever, heart attack prevention, blood clot prevention",
      category: "Salicylate / Antiplatelet",
      icon: "🟡",
      mechanism: "Irreversibly inhibits COX-1 and COX-2 → blocks thromboxane A2 in platelets → prevents platelet aggregation (blood clotting) and reduces inflammation.",
      treats: "Dual action: reduces pain/fever AND prevents blood clots. Low-dose aspirin therapy is used to reduce heart attack and stroke risk in high-risk individuals.",
      description: "One of medicine's oldest and most versatile drugs. Acts as a pain reliever, anti-inflammatory, and blood thinner. Unique among common analgesics for its antiplatelet effect.",
      avoid: ["Bleeding Disorder"],
      caution: ["Asthma"],
      side_effects: "Bleeding risk, stomach irritation, Reye's syndrome in children",
      learn_more: "Never given to children under 16; blood-thinning effect is permanent until new platelets form (7-10 days); increases surgical bleeding risk.",
      did_you_know: [
        "Aspirin was first synthesized in 1897 and is still one of the most prescribed drugs globally.",
        "It permanently inactivates platelets — one dose affects clotting for up to 10 days.",
        "Low-dose aspirin (75–100mg) is used to prevent heart attacks, not treat pain.",
        "Aspirin should never be given to children under 16 due to Reye's syndrome risk."
      ],
      who_cannot: [
        "People with bleeding disorders",
        "Children under 16 years old",
        "Those with aspirin-sensitive asthma",
        "Patients on blood thinners (warfarin)",
        "Those with active stomach ulcers"
      ],
      dosage_forms: ["Tablet", "Enteric-coated tablet", "Chewable tablet"],
      allergens: ["Aspirin", "NSAID", "Salicylate"],
      age_caution: {
        child: "Avoid in children under 16 due to Reye syndrome.",
        elderly: "Increased bleeding risk; monitor closely."
      },
      pregnancy: "Not routinely used without specialist advice.",
      breastfeeding: "Use with caution under professional guidance.",
      sources: [
        "NHS: Aspirin guidance",
        "CDC antiplatelet education",
        "FDA aspirin safety label"
      ],
      confidence: "Moderate",
      steps: [
        { icon: "🟡", label: "Taken orally", desc: "Rapidly absorbed in the stomach" },
        { icon: "🩸", label: "Enters bloodstream", desc: "Distributed to platelets and tissues" },
        { icon: "🔗", label: "Binds platelets", desc: "Irreversibly inactivates COX-1" },
        { icon: "❤️", label: "Effect", desc: "Clotting reduced, pain/fever lowered" }
      ]
    },
    "Diclofenac": {
      use: "Pain, inflammation, musculoskeletal pain",
      category: "NSAID / Anti-inflammatory",
      icon: "🟠",
      mechanism: "Inhibits cyclooxygenase enzymes to reduce prostaglandins and inflammation.",
      treats: "Useful for joint/muscle inflammatory pain and swelling.",
      description: "Common NSAID used for short-term inflammatory pain management.",
      avoid: ["Stomach Ulcer", "Heart Disease"],
      caution: ["High Blood Pressure", "Kidney Disease"],
      side_effects: "GI irritation, fluid retention, elevated blood pressure",
      learn_more: "Use lowest effective dose for shortest duration.",
      did_you_know: [
        "Topical diclofenac can reduce systemic exposure compared with oral forms.",
        "Long-term oral NSAID use can increase cardiovascular risk."
      ],
      who_cannot: ["Active ulcer disease", "Late pregnancy", "Severe heart disease"],
      dosage_forms: ["Tablet", "Topical Gel", "Patch", "Injection"],
      allergens: ["NSAID"],
      age_caution: {
        child: "Specialist pediatric advice needed.",
        elderly: "Higher kidney/GI risk in prolonged use."
      },
      pregnancy: "Avoid particularly in 3rd trimester.",
      breastfeeding: "May be used with caution after clinician review.",
      sources: ["NHS medicine guidance", "EMA safety communications"],
      confidence: "Moderate",
      steps: [
        { icon: "🟠", label: "Taken", desc: "Absorbed orally/topically depending on form" },
        { icon: "🩸", label: "Distributed", desc: "Reaches inflamed tissues" },
        { icon: "🧬", label: "COX inhibition", desc: "Lowers inflammatory mediators" },
        { icon: "🧊", label: "Effect", desc: "Reduces pain and swelling" }
      ]
    },
    "Naproxen": {
      use: "Pain, inflammation, arthritis",
      category: "NSAID / Anti-inflammatory",
      icon: "🟣",
      mechanism: "Blocks COX enzymes and reduces inflammatory prostaglandins.",
      treats: "Useful for longer-duration pain control in inflammatory conditions.",
      description: "Longer-acting NSAID used for inflammatory pain states.",
      avoid: ["Stomach Ulcer"],
      caution: ["High Blood Pressure", "Kidney Disease", "Heart Disease"],
      side_effects: "Dyspepsia, GI bleed risk, fluid retention",
      learn_more: "Take with food and monitor kidney function in chronic use.",
      did_you_know: [
        "Naproxen has a longer duration than ibuprofen.",
        "Like other NSAIDs, it can increase GI bleeding risk."
      ],
      who_cannot: ["Active GI bleeding", "Late pregnancy"],
      dosage_forms: ["Tablet", "Suspension", "Delayed-release tablet"],
      allergens: ["NSAID"],
      age_caution: {
        child: "Pediatric use should follow specialist advice.",
        elderly: "Higher bleeding and renal risk."
      },
      pregnancy: "Avoid in later pregnancy.",
      breastfeeding: "Assess with clinician before use.",
      sources: ["NHS guidance", "FDA label summary"],
      confidence: "Moderate",
      steps: [
        { icon: "🟣", label: "Taken orally", desc: "Absorbed through GI tract" },
        { icon: "🩸", label: "In bloodstream", desc: "Circulates to painful tissues" },
        { icon: "🧬", label: "COX blocked", desc: "Prostaglandins decrease" },
        { icon: "🧊", label: "Effect", desc: "Pain and inflammation lowered" }
      ]
    }
  };

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.defaultMedicines = defaultMedicines;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = defaultMedicines;
  }
})(typeof window !== 'undefined' ? window : globalThis);
