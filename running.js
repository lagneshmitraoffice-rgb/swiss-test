console.log("📸 Chart Extractor Engine Running");

/* ===================================================
INIT OCR WORKER (HIGH ACCURACY MODE)
=================================================== */
let ocrWorker = null;

async function initOCR(){
  if(ocrWorker) return;

  ocrWorker = await Tesseract.createWorker("eng");

  // ⭐ VERY IMPORTANT SETTINGS
  await ocrWorker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    preserve_interword_spaces: "1"
  });

  console.log("✅ OCR Worker Ready");
}

/* ===================================================
🧠 SUPER IMAGE PREPROCESS (FINAL MAGIC)
Zoom + High Contrast + Binarize
=================================================== */
async function preprocessImage(file){

  const img = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // ⭐ 3x UPSCALE (MOST IMPORTANT)
  canvas.width  = img.width * 3;
  canvas.height = img.height * 3;

  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const data = imageData.data;

  for(let i=0;i<data.length;i+=4){

    const avg = (data[i]+data[i+1]+data[i+2])/3;

    // ⭐ AGGRESSIVE THRESHOLD
    const val = avg > 140 ? 255 : 0;

    data[i] = data[i+1] = data[i+2] = val;
  }

  ctx.putImageData(imageData,0,0);

  return canvas;
}

/* ===================================================
MAIN EXTRACT FUNCTION
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  console.log("🧪 Preprocessing...");
  const canvas = await preprocessImage(file);

  console.log("🔍 Running OCR...");
  const { data:{ text } } = await ocrWorker.recognize(canvas);

  console.log("📄 OCR TEXT:");
  console.log(text);

  return parseAstroText(text);
};

/* ===================================================
🔥 SMART MEMORY PARSER (NORTH INDIAN CHART)
Planet lines appear BEFORE house number
Example:
JU
ME PL
SU 7
NE UR 8
11 MO
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

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

  const result = {
    houses:{},
    planets:{},
    rawText:text
  };

  const lines = text.split("\n");

  let pendingPlanets = [];

  lines.forEach(line => {

    line = line.trim();
    if(!line) return;

    // STEP 1 → collect planets
    Object.keys(PLANET_CODES).forEach(code => {
      if(line.includes(code)){
        pendingPlanets.push(PLANET_CODES[code]);
      }
    });

    // STEP 2 → detect house number
    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);

    if(houseMatch && pendingPlanets.length > 0){

      const house = houseMatch[0];

      if(!result.houses[house])
        result.houses[house] = [];

      pendingPlanets.forEach(planet=>{
        result.houses[house].push(planet);
        result.planets[planet] = "House " + house;
      });

      pendingPlanets = [];
    }

  });

  return result;
}
