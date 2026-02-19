console.log("📸 Chart Extractor Engine Running");

/* ===================================================
INIT OCR WORKER
=================================================== */
let ocrWorker = null;

async function initOCR(){
  if(ocrWorker) return;
  ocrWorker = await Tesseract.createWorker("eng");
  console.log("✅ OCR Worker Ready");
}

/* ===================================================
IMAGE → ASTRO DATA
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  console.log("🔍 Reading chart image...");
  const { data:{ text } } = await ocrWorker.recognize(file);

  console.log("📄 OCR TEXT:");
  console.log(text);

  return parseAstroText(text);
};

/* ===================================================
🧠 TEXT → NORTH INDIAN CHART PARSER
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

  /* PLANET SHORT CODES */
  const PLANET_CODES = {
    SU:"Sun",
    MO:"Moon",
    MA:"Mars",
    ME:"Mercury",
    JU:"Jupiter",
    VE:"Venus",
    SA:"Saturn",
    RA:"Rahu",
    KE:"Ketu",
    UR:"Uranus",
    NE:"Neptune",
    PL:"Pluto"
  };

  const lines = text.split("\n");

  const result = {
    houses:{},
    planets:{},
    rawText:text
  };

  /* ===================================================
  STEP 1 → FIND LINES WITH HOUSE NUMBERS
  =================================================== */

  lines.forEach(line=>{

    // find house number 1–12
    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);

    if(!houseMatch) return;

    const house = houseMatch[0];
    result.houses[house] = [];

    // detect planets in same line
    Object.keys(PLANET_CODES).forEach(code=>{
      if(line.includes(code)){
        const planetName = PLANET_CODES[code];
        result.houses[house].push(planetName);
        result.planets[planetName] = "House " + house;
      }
    });

  });

  console.log("🪐 Extracted Chart:", result);
  return result;
}
