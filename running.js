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
🖼 IMAGE PREPROCESSOR (HIGH CONTRAST)
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

  // Convert to B/W high contrast
  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg > 160 ? 255 : 0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
✂️ SLICE NORTH INDIAN CHART INTO HOUSES
=================================================== */
async function sliceChartIntoHouses(canvas){

  const w = canvas.width;
  const h = canvas.height;

  const boxW = w/3;
  const boxH = h/3;

  const houses = [];

  // 3x3 grid → center skip
  const coords = [
    [0,0],[1,0],[2,0],
    [0,1],      [2,1],
    [0,2],[1,2],[2,2]
  ];

  coords.forEach(([x,y])=>{
    const crop = document.createElement("canvas");
    crop.width = boxW;
    crop.height = boxH;

    crop.getContext("2d").drawImage(
      canvas,
      x*boxW, y*boxH, boxW, boxH,
      0,0,boxW,boxH
    );

    houses.push(crop);
  });

  return houses;
}

/* ===================================================
IMAGE → ASTRO DATA (MAIN PIPELINE)
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  console.log("🧪 Preprocessing...");
  const preCanvas = await preprocessImage(file);

  console.log("✂️ Slicing houses...");
  const houseImages = await sliceChartIntoHouses(preCanvas);

  let combinedText = "";

  for(const img of houseImages){
    const { data:{ text } } = await ocrWorker.recognize(img);
    combinedText += "\n" + text;
  }

  console.log("📄 OCR TEXT:", combinedText);

  return parseAstroText(combinedText);
};

/* ===================================================
🧠 NORTH INDIAN PLANET PARSER
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

  const PLANET_CODES = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu", UR:"Uranus", NE:"Neptune", PL:"Pluto"
  };

  const result = {
    houses:{},
    planets:{},
    rawText:text
  };

  const lines = text.split("\n");

  lines.forEach(line=>{

    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);
    if(!houseMatch) return;

    const house = houseMatch[0];
    if(!result.houses[house]) result.houses[house] = [];

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
