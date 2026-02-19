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

  console.log("📄 FINAL OCR TEXT:");
  console.log(text);

  return parseAstroText(text);
};

/* ===================================================
🔥 SMART GRID PARSER (FINAL STABLE VERSION)
Works with:
Planet line
House line
Same line
Reverse order
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

  const PLANET_MAP = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu",
    UR:"Uranus", NE:"Neptune", PL:"Pluto",
    S:"Saturn", M:"Moon", V:"Venus", J:"Jupiter"
  };

  const result = {
    houses:{},
    planets:{},
    rawText:text
  };

  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);

  let memoryPlanets = [];

  for(let i=0;i<lines.length;i++){

    const line = lines[i];

    // detect house number
    const houseMatch = line.match(/\b(1[0-2]|[1-9])\b/);

    // detect planets in line
    const foundPlanets = [];
    Object.keys(PLANET_MAP).forEach(code=>{
      if(line.includes(code)){
        foundPlanets.push(PLANET_MAP[code]);
      }
    });

    // CASE 1 → same line planet + house
    if(houseMatch && foundPlanets.length>0){

      const house = houseMatch[0];
      if(!result.houses[house]) result.houses[house]=[];

      foundPlanets.forEach(p=>{
        result.houses[house].push(p);
        result.planets[p]="House "+house;
      });

      continue;
    }

    // CASE 2 → planet line first, house next
    if(foundPlanets.length>0){
      memoryPlanets = foundPlanets;
      continue;
    }

    if(houseMatch && memoryPlanets.length>0){

      const house = houseMatch[0];
      if(!result.houses[house]) result.houses[house]=[];

      memoryPlanets.forEach(p=>{
        result.houses[house].push(p);
        result.planets[p]="House "+house;
      });

      memoryPlanets=[];
    }
  }

  return result;
          }
