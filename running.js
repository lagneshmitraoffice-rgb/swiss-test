console.log("📸 Chart Extractor Engine Running (ULTIMATE FINAL)");

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
IMAGE UPSCALE + BINARIZE
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
MAIN ENTRY
=================================================== */
window.extractChartFromImage = async function(file){
  await initOCR();
  const canvas = await preprocessImage(file);
  const { data } = await ocrWorker.recognize(canvas);
  return extractByPositions(data.words);
};

/* ===================================================
LETTER MERGE ENGINE
=================================================== */
function mergeNearbyLetters(words){

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
      current = { text, x:w.bbox.x0, y:w.bbox.y0 };
      return;
    }

    const closeY = Math.abs(current.y - w.bbox.y0) < 20;
    const closeX = Math.abs(w.bbox.x0 - (current.x + current.text.length*15)) < 40;

    if(closeY && closeX){
      current.text += text;
    }else{
      merged.push(current);
      current = { text, x:w.bbox.x0, y:w.bbox.y0 };
    }
  });

  if(current) merged.push(current);
  return merged;
}

/* ===================================================
FINAL STABILIZER
One planet → one house only
=================================================== */
function stabilizePlanetMapping(result){

  const finalHouses = {};
  const finalPlanets = {};
  const planetCandidates = {};

  Object.keys(result.houses).forEach(h=>{
    result.houses[h].forEach(p=>{
      if(!planetCandidates[p]) planetCandidates[p]=[];
      planetCandidates[p].push(parseInt(h));
    });
  });

  Object.keys(planetCandidates).forEach(planet=>{
    const chosenHouse = planetCandidates[planet][0];

    if(!finalHouses[chosenHouse])
      finalHouses[chosenHouse]=[];

    finalHouses[chosenHouse].push(planet);
    finalPlanets[planet] = "House " + chosenHouse;
  });

  return { houses:finalHouses, planets:finalPlanets };
}

/* ===================================================
CORE POSITION ENGINE (ULTIMATE)
=================================================== */
function extractByPositions(words){

  const PLANET_MAP = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu",
    S:"Saturn", M:"Moon", V:"Venus",
    J:"Jupiter", R:"Rahu", K:"Ketu"
  };

  const mergedWords = mergeNearbyLetters(words);
  let houseNumbers = [];
  let planetWords  = [];

  mergedWords.forEach(w => {

    const text = w.text;

    // detect house numbers
    if(/^(1[0-2]|[1-9])$/.test(text)){
      houseNumbers.push({ house:parseInt(text), x:w.x, y:w.y });
      return;
    }

    // ignore long garbage words
    if(text.length > 6) return;

    let detectedPlanet = false;

    // NORMAL PLANET DETECTION
    Object.keys(PLANET_MAP).forEach(code=>{
      if(text.includes(code)){
        planetWords.push({ planet:PLANET_MAP[code], x:w.x, y:w.y });
        detectedPlanet = true;
      }
    });

    /* 🔥 MARS HEURISTIC (FINAL PIECE)
       Weak font / NA / HA / A / split letters fix */
    if(!detectedPlanet && text.length<=3 && text.length>0){
      planetWords.push({ planet:"Mars", x:w.x, y:w.y });
    }

  });

  const result = { houses:{}, planets:{} };

  planetWords.forEach(p => {
    let closestHouse=null, minDist=Infinity;

    houseNumbers.forEach(h=>{
      const dx=p.x-h.x;
      const dy=p.y-h.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<minDist){ minDist=dist; closestHouse=h.house; }
    });

    if(closestHouse!==null){
      if(!result.houses[closestHouse]) result.houses[closestHouse]=[];
      result.houses[closestHouse].push(p.planet);
      result.planets[p.planet]="House "+closestHouse;
    }
  });

  const stable = stabilizePlanetMapping(result);

  return {
    extractedHouses: stable.houses,
    planetMapping: stable.planets,
    detectedHouseCount: houseNumbers.length,
    detectedPlanetCount: Object.keys(stable.planets).length
  };
    }
