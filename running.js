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
🧠 IMAGE UPSCALE + BINARIZE (GLOBAL PREPROCESS)
=================================================== */
async function preprocessImage(file){

  const img = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // ⭐ 3x UPSCALE = biggest OCR booster
  canvas.width  = img.width * 3;
  canvas.height = img.height * 3;
  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const data = imageData.data;

  // Strong B/W threshold
  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg>140 ? 255 : 0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
📍 FIND TEXT POSITIONS (LOCATE LAGNA CHART AREA)
=================================================== */
async function getTextBlocks(canvas){

  const { data } = await ocrWorker.recognize(canvas);

  return data.words.map(w => ({
    text: w.text.toUpperCase(),
    y: w.bbox.y0
  }));
}

/* ===================================================
✂️ CROP ONLY LAGNA CHART AREA
Between "LAGNA" and "VIMSHOTTARI"
=================================================== */
async function cropChartRegion(fullCanvas){

  console.log("🔍 Detecting text blocks...");
  const words = await getTextBlocks(fullCanvas);

  let lagnaY=null, dashaY=null;

  words.forEach(w=>{
    if(w.text.includes("LAGNA")) lagnaY = w.y;
    if(w.text.includes("VIMSH")) dashaY = w.y;
  });

  // Fallback if OCR words fail
  if(!lagnaY || !dashaY){
    console.log("⚠️ Smart crop fallback activated");

    const fallbackCanvas = document.createElement("canvas");
    const ctx = fallbackCanvas.getContext("2d");

    const topCut = fullCanvas.height * 0.20;
    const bottomCut = fullCanvas.height * 0.35;
    const cropHeight = fullCanvas.height - topCut - bottomCut;

    fallbackCanvas.width  = fullCanvas.width;
    fallbackCanvas.height = cropHeight;

    ctx.drawImage(
      fullCanvas,
      0, topCut,
      fullCanvas.width, cropHeight,
      0,0,
      fallbackCanvas.width,fallbackCanvas.height
    );

    return fallbackCanvas;
  }

  console.log("📐 Cropping Lagna Chart via text detection");

  const cropCanvas = document.createElement("canvas");
  const ctx = cropCanvas.getContext("2d");

  cropCanvas.width  = fullCanvas.width;
  cropCanvas.height = dashaY - lagnaY;

  ctx.drawImage(
    fullCanvas,
    0, lagnaY,
    fullCanvas.width, cropCanvas.height,
    0,0,
    cropCanvas.width, cropCanvas.height
  );

  return cropCanvas;
}

/* ===================================================
MAIN EXTRACT FUNCTION
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  console.log("🧪 Step 1 → Preprocess full page");
  const fullCanvas = await preprocessImage(file);

  console.log("✂️ Step 2 → Crop Lagna Chart");
  const chartCanvas = await cropChartRegion(fullCanvas);

  console.log("🔍 Step 3 → OCR ONLY on chart region");
  const { data:{ text } } = await ocrWorker.recognize(chartCanvas);

  console.log("📄 FINAL OCR TEXT:");
  console.log(text);

  return parseAstroText(text);
};

/* ===================================================
🧠 NORTH INDIAN MEMORY PARSER
Planet lines appear BEFORE house number
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

  const PLANET_CODES = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu", UR:"Uranus", NE:"Neptune", PL:"Pluto"
  };

  const result = { houses:{}, planets:{}, rawText:text };

  const lines = text.split("\n");
  let pendingPlanets = [];

  lines.forEach(line => {

    line = line.trim();
    if(!line) return;

    // Collect planets
    Object.keys(PLANET_CODES).forEach(code=>{
      if(line.includes(code))
        pendingPlanets.push(PLANET_CODES[code]);
    });

    // Detect house number
    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);

    if(houseMatch && pendingPlanets.length>0){

      const house = houseMatch[0];
      if(!result.houses[house]) result.houses[house]=[];

      pendingPlanets.forEach(p=>{
        result.houses[house].push(p);
        result.planets[p]="House "+house;
      });

      pendingPlanets=[];
    }
  });

  return result;
    }
