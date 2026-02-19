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
🖼 IMAGE PREPROCESSOR (MAGIC STEP)
=================================================== */
async function preprocessImage(file){

  const img = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img,0,0);

  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const data = imageData.data;

  // GRAYSCALE + HIGH CONTRAST
  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;

    const val = avg > 160 ? 255 : 0; // threshold
    data[i] = data[i+1] = data[i+2] = val;
  }

  ctx.putImageData(imageData,0,0);

  return canvas;
}

/* ===================================================
IMAGE → ASTRO DATA
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  console.log("🧪 Preprocessing image...");
  const canvas = await preprocessImage(file);

  console.log("🔍 OCR Reading...");
  const { data:{ text } } = await ocrWorker.recognize(canvas);

  console.log("📄 OCR TEXT:");
  console.log(text);

  return parseAstroText(text);
};

/* ===================================================
🧠 NORTH INDIAN PARSER
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

  const PLANET_CODES = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu", UR:"Uranus", NE:"Neptune", PL:"Pluto"
  };

  const lines = text.split("\n");

  const result = { houses:{}, planets:{}, rawText:text };

  lines.forEach(line=>{

    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);
    if(!houseMatch) return;

    const house = houseMatch[0];
    result.houses[house] = [];

    Object.keys(PLANET_CODES).forEach(code=>{
      if(line.includes(code)){
        const name = PLANET_CODES[code];
        result.houses[house].push(name);
        result.planets[name] = "House " + house;
      }
    });

  });

  return result;
}
