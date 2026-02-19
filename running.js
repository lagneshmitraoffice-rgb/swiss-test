console.log("📸 Chart Extractor Engine Running (POSITION MODE)");

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

  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg>140 ? 255 : 0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
🚀 MAIN EXTRACT FUNCTION (POSITION BASED)
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  const canvas = await preprocessImage(file);

  console.log("🔍 Running OCR WORD MODE...");
  const { data } = await ocrWorker.recognize(canvas);

  console.log("📦 WORD BLOCKS:", data.words);

  const gridResult = extractByPositions(data.words);

  return gridResult;
};

/* ===================================================
🔥 CORE BREAKTHROUGH ENGINE
IMAGE → WORD POSITIONS → HOUSE MAP
=================================================== */
function extractByPositions(words){

  const PLANET_MAP = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu",
    S:"Saturn", M:"Moon", V:"Venus", J:"Jupiter"
  };

  const houseNumbers = [];
  const planetWords  = [];

  // STEP 1 → Separate numbers & planets
  words.forEach(w => {

    const text = w.text.toUpperCase().trim();

    // detect house numbers
    if(/^(1[0-2]|[1-9])$/.test(text)){
      houseNumbers.push({
        house: parseInt(text),
        x: w.bbox.x0,
        y: w.bbox.y0
      });
    }

    // detect planets
    Object.keys(PLANET_MAP).forEach(code=>{
      if(text === code){
        planetWords.push({
          planet: PLANET_MAP[code],
          x: w.bbox.x0,
          y: w.bbox.y0
        });
      }
    });

  });

  console.log("🏠 Houses detected:", houseNumbers);
  console.log("🪐 Planets detected:", planetWords);

  /* ===================================================
  STEP 2 → FIND NEAREST HOUSE FOR EACH PLANET
  =================================================== */

  const result = { houses:{}, planets:{} };

  planetWords.forEach(p => {

    let closestHouse = null;
    let minDist = 999999;

    houseNumbers.forEach(h => {

      const dx = p.x - h.x;
      const dy = p.y - h.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < minDist){
        minDist = dist;
        closestHouse = h.house;
      }
    });

    if(closestHouse){
      if(!result.houses[closestHouse])
        result.houses[closestHouse] = [];

      result.houses[closestHouse].push(p.planet);
      result.planets[p.planet] = "House " + closestHouse;
    }

  });

  return {
    extractedHouses: result.houses,
    planetMapping: result.planets,
    detectedHouseCount: houseNumbers.length,
    detectedPlanetCount: planetWords.length
  };
}
