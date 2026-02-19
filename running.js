console.log("📸 Chart Extractor Engine Running");

/* ===================================================
INIT OCR WORKER (HIGH ACCURACY MODE)
=================================================== */
let ocrWorker = null;

async function initOCR(){
  if(ocrWorker) return;

  ocrWorker = await Tesseract.createWorker("eng");

  await ocrWorker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    preserve_interword_spaces: "1"
  });

  console.log("✅ OCR Worker Ready");
}

/* ===================================================
🧠 IMAGE UPSCALE + BINARIZE
=================================================== */
async function preprocessImage(file){

  const img = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width  = img.width * 3;
  canvas.height = img.height * 3;
  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const data = imageData.data;

  // strong B/W threshold for OCR
  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg>140 ? 255 : 0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
MAIN EXTRACT FUNCTION
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  const fullCanvas = await preprocessImage(file);
  const { data:{ text } } = await ocrWorker.recognize(fullCanvas);

  console.log("📄 OCR TEXT:");
  console.log(text);

  const parsed   = parseAstroText(text);
  const fallback = miniAstroParser(text);

  return {
    fullParser: parsed,
    fallbackAstro: fallback
  };
};

/* ===================================================
🔥 PARSER 1 — GRID / LINE BASED PARSER
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

  const PLANET_MAP = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu",
    S:"Saturn", M:"Moon", V:"Venus", J:"Jupiter"
  };

  const result = {
    houses:{},
    planets:{},
    rawText:text
  };

  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  let memoryPlanets = [];

  for(let line of lines){

    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);

    let foundPlanets = [];
    Object.keys(PLANET_MAP).forEach(code=>{
      if(line.includes(code)) foundPlanets.push(PLANET_MAP[code]);
    });

    // CASE 1 → same line
    if(houseMatch && foundPlanets.length){
      const house = houseMatch[0];
      if(!result.houses[house]) result.houses[house]=[];

      foundPlanets.forEach(p=>{
        result.houses[house].push(p);
        result.planets[p] = "House "+house;
      });
      continue;
    }

    // CASE 2 → planet line first
    if(foundPlanets.length){
      memoryPlanets = foundPlanets;
      continue;
    }

    // CASE 3 → house after planets
    if(houseMatch && memoryPlanets.length){
      const house = houseMatch[0];
      if(!result.houses[house]) result.houses[house]=[];

      memoryPlanets.forEach(p=>{
        result.houses[house].push(p);
        result.planets[p] = "House "+house;
      });

      memoryPlanets=[];
    }
  }

  return result;
}

/* ===================================================
🔥 PARSER 2 — ASTRO FALLBACK (SMART LAGNA + HOUSE CALC)
This guarantees output even when OCR messy ho.
=================================================== */
function miniAstroParser(rawText){

  const text = rawText.toUpperCase();

  const PLANETS = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu"
  };

  /* ===============================
  STEP 1 → SMART LAGNA DETECTION
  =============================== */
  let lagnaSign = null;

  // ASC 6
  let ascMatch = text.match(/ASC\s*(\d{1,2})/);
  if(ascMatch) lagnaSign = parseInt(ascMatch[1]);

  // LAGNA 6
  if(!lagnaSign){
    let lagnaMatch = text.match(/LAGNA\s*(\d{1,2})/);
    if(lagnaMatch) lagnaSign = parseInt(lagnaMatch[1]);
  }

  // fallback → first number in chart
  if(!lagnaSign){
    const nums = text.match(/\b(1[0-2]|[1-9])\b/g);
    if(nums) lagnaSign = parseInt(nums[0]);
  }

  /* ===============================
  STEP 2 → FIND PLANETS
  =============================== */
  let planetsFound = [];
  Object.keys(PLANETS).forEach(code=>{
    if(text.includes(code) && planetsFound.length < 2){
      planetsFound.push(PLANETS[code]);
    }
  });

  /* ===============================
  STEP 3 → FIND SIGN NUMBERS
  =============================== */
  const signNumbers = text.match(/\b(1[0-2]|[1-9])\b/g);

  const houses = {};

  if(lagnaSign && signNumbers){
    planetsFound.forEach((planet,i)=>{
      const planetSign = parseInt(signNumbers[i % signNumbers.length]);
      const house = (planetSign - lagnaSign + 12) % 12 + 1;
      houses[planet] = "House " + house;
    });
  }

  return {
    LagnaSign: lagnaSign,
    PlanetsDetected: planetsFound,
    CalculatedHouses: houses
  };
                                        }
