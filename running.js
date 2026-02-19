console.log("📸 Chart Extractor Engine Running");

/* ===================================================
INIT OCR WORKER (HIGH ACCURACY MODE)
=================================================== */
let ocrWorker = null;

async function initOCR(){
  if(ocrWorker) return;

  ocrWorker = await Tesseract.createWorker("eng");

  // ⭐ HIGH ACCURACY SETTINGS
  await ocrWorker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    preserve_interword_spaces: "1"
  });

  console.log("✅ OCR Worker Ready");
}

/* ===================================================
🧠 SUPER IMAGE PREPROCESS
Zoom + Crop + Binarize (Best combo for charts)
=================================================== */
async function preprocessImage(file){

  const img = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width  = img.width;
  canvas.height = img.height;
  ctx.drawImage(img,0,0);

  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const data = imageData.data;

  let minX=99999, minY=99999, maxX=0, maxY=0;

  // ===============================
  // STEP 1 → FIND LIGHT REGION (CHART AREA)
  // ===============================
  for(let y=0;y<canvas.height;y++){
    for(let x=0;x<canvas.width;x++){

      const i=(y*canvas.width+x)*4;
      const r=data[i], g=data[i+1], b=data[i+2];
      const brightness = (r+g+b)/3;

      if(brightness > 170){
        if(x<minX) minX=x;
        if(y<minY) minY=y;
        if(x>maxX) maxX=x;
        if(y>maxY) maxY=y;
      }
    }
  }

  // fallback if crop fails
  if(minX>maxX){
    console.log("⚠️ Crop fail → using full image");
    return canvas;
  }

  const padding = 20;
  minX = Math.max(0, minX-padding);
  minY = Math.max(0, minY-padding);
  maxX = Math.min(canvas.width, maxX+padding);
  maxY = Math.min(canvas.height, maxY+padding);

  const cropWidth  = maxX-minX;
  const cropHeight = maxY-minY;

  // ===============================
  // STEP 2 → UPSCALE CROPPED AREA
  // ===============================
  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d");

  cropCanvas.width  = cropWidth * 3;
  cropCanvas.height = cropHeight * 3;

  cropCtx.drawImage(
    canvas,
    minX, minY, cropWidth, cropHeight,
    0,0,cropCanvas.width,cropCanvas.height
  );

  // ===============================
  // STEP 3 → STRONG BLACK & WHITE
  // ===============================
  const cropData = cropCtx.getImageData(0,0,cropCanvas.width,cropCanvas.height);
  const d = cropData.data;

  for(let i=0;i<d.length;i+=4){
    const avg=(d[i]+d[i+1]+d[i+2])/3;
    const val = avg>150 ? 255 : 0;
    d[i]=d[i+1]=d[i+2]=val;
  }

  cropCtx.putImageData(cropData,0,0);

  return cropCanvas;
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
🔥 NORTH INDIAN CHART MEMORY PARSER
Planet lines appear BEFORE house number

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

    // STEP 1 → Collect planets first
    Object.keys(PLANET_CODES).forEach(code => {
      if(line.includes(code)){
        pendingPlanets.push(PLANET_CODES[code]);
      }
    });

    // STEP 2 → Detect house number
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
