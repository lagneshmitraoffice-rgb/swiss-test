console.log("📸 Chart Extractor Engine Running (POSITION MODE v3)");

/* ===================================================
INIT OCR WORKER
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

  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg > 140 ? 255 : 0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
🚀 MAIN EXTRACT FUNCTION
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  const canvas = await preprocessImage(file);

  console.log("🔍 Running OCR WORD MODE...");
  const { data } = await ocrWorker.recognize(canvas);

  return extractByPositions(data.words);
};

/* ===================================================
🔥 LETTER MERGE ENGINE
Merge nearby letters into clusters
=================================================== */
function mergeNearbyLetters(words){

  // sort by Y then X
  words.sort((a,b)=>{
    if(Math.abs(a.bbox.y0 - b.bbox.y0) < 20)
      return a.bbox.x0 - b.bbox.x0;
    return a.bbox.y0 - b.bbox.y0;
  });

  const merged = [];
  let current = null;

  words.forEach(w=>{

    const text = w.text.toUpperCase().trim();
    if(!text) return;

    if(!current){
      current = {
        text,
        x: w.bbox.x0,
        y: w.bbox.y0
      };
      return;
    }

    const closeY = Math.abs(current.y - w.bbox.y0) < 20;
    const closeX = Math.abs(w.bbox.x0 - (current.x + current.text.length*15)) < 40;

    if(closeY && closeX){
      current.text += text;
    } else {
      merged.push(current);
      current = {
        text,
        x: w.bbox.x0,
        y: w.bbox.y0
      };
    }

  });

  if(current) merged.push(current);

  return merged;
}

/* ===================================================
🔥 CORE POSITION ENGINE (FINAL)
=================================================== */
function extractByPositions(words){

  const PLANET_MAP = {

    // 2-letter
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu",

    // 1-letter fallback
    S:"Saturn", M:"Moon", V:"Venus",
    J:"Jupiter", R:"Rahu", K:"Ketu"
  };

  const mergedWords = mergeNearbyLetters(words);

  let houseNumbers = [];
  let planetWords  = [];

  /* ===================================================
  STEP 1 → DETECT HOUSE NUMBERS & PLANETS
  =================================================== */
  mergedWords.forEach(w => {

    const text = w.text;

    // House numbers
    if(/^(1[0-2]|[1-9])$/.test(text)){
      houseNumbers.push({
        house: parseInt(text),
        x: w.x,
        y: w.y
      });
      return;
    }

    // Ignore long garbage
    if(text.length > 6) return;

    // Check planet codes inside cluster
    Object.keys(PLANET_MAP).forEach(code=>{
      if(text.includes(code)){
        planetWords.push({
          planet: PLANET_MAP[code],
          x: w.x,
          y: w.y
        });
      }
    });

  });

  console.log("🏠 Houses detected:", houseNumbers);
  console.log("🪐 Planets detected:", planetWords);

  /* ===================================================
  STEP 2 → NEAREST HOUSE MAPPING
  =================================================== */
  const result = { houses:{}, planets:{} };

  planetWords.forEach(p => {

    let closestHouse = null;
    let minDist = Infinity;

    houseNumbers.forEach(h => {
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < minDist){
        minDist = dist;
        closestHouse = h.house;
      }
    });

    if(closestHouse !== null){

      if(!result.houses[closestHouse])
        result.houses[closestHouse] = [];

      if(!result.houses[closestHouse].includes(p.planet)){
        result.houses[closestHouse].push(p.planet);
      }

      result.planets[p.planet] = "House " + closestHouse;
    }

  });

  /* ===================================================
  STEP 3 → SORT OUTPUT
  =================================================== */
  const sortedHouses = {};
  Object.keys(result.houses)
    .sort((a,b)=>a-b)
    .forEach(h=>{
      sortedHouses[h] = result.houses[h];
    });

  return {
    extractedHouses: sortedHouses,
    planetMapping: result.planets,
    detectedHouseCount: houseNumbers.length,
    detectedPlanetCount: planetWords.length
  };
  }
