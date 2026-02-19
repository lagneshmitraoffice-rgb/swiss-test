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
IMAGE PREPROCESS (HIGH CONTRAST)
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

  for(let i=0;i<data.length;i+=4){

    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg > 160 ? 255 : 0;

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
PLANET + NUMBER PARSER
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

  lines.forEach(line => {

    // detect house number (1–12)
    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);

    if(!houseMatch) return;

    const house = houseMatch[0];

    if(!result.houses[house])
      result.houses[house] = [];

    // detect planet codes in same line
    Object.keys(PLANET_CODES).forEach(code => {

      if(line.includes(code)){

        const planetName = PLANET_CODES[code];

        result.houses[house].push(planetName);
        result.planets[planetName] = "House " + house;
      }

    });

  });

  return result;
}
