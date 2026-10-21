/* One question per subject is drawn each run (random from the pool).
   Format: q = question, o = four options, a = index of the correct option, w = one-line explanation. */
window.QUESTIONS = {
  anatomy: [
    { q: "Which nerve is most at risk in a fracture of the surgical neck of the humerus?",
      o: ["Radial nerve", "Axillary nerve", "Ulnar nerve", "Musculocutaneous nerve"], a: 1,
      w: "The axillary nerve winds around the surgical neck." },
    { q: "Which muscle 'unlocks' the knee at the start of flexion?",
      o: ["Popliteus", "Gastrocnemius", "Sartorius", "Plantaris"], a: 0,
      w: "Popliteus rotates the femur laterally on the tibia to unlock the knee." }
  ],
  biochem: [
    { q: "What is the rate-limiting enzyme of glycolysis?",
      o: ["Hexokinase", "Phosphofructokinase-1", "Pyruvate kinase", "Aldolase"], a: 1,
      w: "PFK-1 is the main control point of glycolysis." },
    { q: "Scurvy is caused by deficiency of which vitamin?",
      o: ["Vitamin A", "Vitamin B1", "Vitamin C", "Vitamin D"], a: 2,
      w: "Vitamin C is needed for collagen hydroxylation." }
  ],
  physio: [
    { q: "Which structure is the normal pacemaker of the heart?",
      o: ["AV node", "SA node", "Bundle of His", "Purkinje fibres"], a: 1,
      w: "The SA node has the fastest spontaneous depolarisation rate." },
    { q: "Influx of which ion causes the rapid upstroke of a nerve action potential?",
      o: ["Sodium", "Potassium", "Calcium", "Chloride"], a: 0,
      w: "Voltage-gated Na+ channels open and sodium rushes in." }
  ],
  patho: [
    { q: "Reed–Sternberg cells are the hallmark of which condition?",
      o: ["Hodgkin lymphoma", "Multiple myeloma", "Burkitt lymphoma", "Chronic myeloid leukaemia"], a: 0,
      w: "Owl-eye Reed–Sternberg cells define Hodgkin lymphoma." },
    { q: "Which type of necrosis is typical of an ischaemic infarct in the brain?",
      o: ["Coagulative", "Caseous", "Liquefactive", "Fat necrosis"], a: 2,
      w: "The brain has little structural stroma, so the dead tissue liquefies." }
  ],
  micro: [
    { q: "Gram-positive cocci in clusters that are coagulase positive: which organism?",
      o: ["Streptococcus pyogenes", "Staphylococcus aureus", "Enterococcus faecalis", "Staphylococcus epidermidis"], a: 1,
      w: "Coagulase positivity separates S. aureus from other staphylococci." },
    { q: "Tetanus is caused by which organism?",
      o: ["Clostridium botulinum", "Clostridium perfringens", "Clostridium tetani", "Clostridioides difficile"], a: 2,
      w: "C. tetani releases tetanospasmin, which blocks inhibitory neurotransmitter release." }
  ],
  pharma: [
    { q: "What is the antidote for paracetamol poisoning?",
      o: ["N-acetylcysteine", "Naloxone", "Atropine", "Flumazenil"], a: 0,
      w: "N-acetylcysteine replenishes glutathione." },
    { q: "What is the antidote for opioid overdose?",
      o: ["Flumazenil", "Naloxone", "Physostigmine", "Pralidoxime"], a: 1,
      w: "Naloxone is a competitive opioid receptor antagonist." }
  ],
  spm: [
    { q: "Which mosquito is the main vector of dengue?",
      o: ["Anopheles stephensi", "Culex quinquefasciatus", "Aedes aegypti", "Mansonia"], a: 2,
      w: "Aedes aegypti breeds in clean stored water and bites by day." },
    { q: "Which index best reflects chronic undernutrition (stunting) in children?",
      o: ["Weight for height", "Height for age", "Mid-upper arm circumference", "Weight for age"], a: 1,
      w: "Low height for age means stunting, the mark of long-term deprivation." }
  ],
  forensic: [
    { q: "Rigor mortis appears first in which muscles?",
      o: ["Eyelids", "Quadriceps", "Calf muscles", "Finger flexors"], a: 0,
      w: "It starts in the small muscles of the eyelids, then spreads downwards." },
    { q: "A bitter almond smell at autopsy suggests poisoning with:",
      o: ["Cyanide", "Arsenic", "Organophosphate", "Methanol"], a: 0,
      w: "Cyanide is the classic bitter almond odour." }
  ],
  ent: [
    { q: "What is the most common site of epistaxis?",
      o: ["Woodruff's plexus", "Little's area", "Inferior turbinate", "Olfactory cleft"], a: 1,
      w: "Little's area (Kiesselbach's plexus) sits on the anterior nasal septum." },
    { q: "A negative Rinne test (bone conduction louder than air) indicates:",
      o: ["Conductive hearing loss", "Sensorineural hearing loss", "Normal hearing", "Functional deafness"], a: 0,
      w: "Rinne negative means BC > AC, the pattern of conductive loss." }
  ],
  ophthal: [
    { q: "Which retinal cells are responsible for colour vision?",
      o: ["Rods", "Cones", "Bipolar cells", "Ganglion cells"], a: 1,
      w: "Cones work in bright light and detect colour." },
    { q: "Which part of the retina gives the sharpest central vision?",
      o: ["Optic disc", "Peripheral retina", "Fovea", "Ora serrata"], a: 2,
      w: "The fovea has the highest cone density." }
  ]
};
