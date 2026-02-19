console.log("📸 Chart Extractor Engine Loaded (ULTRA STABLE BUILD)");

(function(){

let ocrWorker = null;

/* ===================================================
INIT OCR
=================================================== */
async function initOCR(){

  if(!window.Tesseract)
    throw new Error("Tesseract not loaded!");

  if(ocrWorker) return;

  ocrWorker = await Tesseract.createWorker();
  await ocrWorker.loadLanguage("eng");
  await ocrWorker.initialize("eng");

  await ocrWorker.setParameters({
    tessedit_char_whitelist: "0123456789",
    tessedit_pageseg_mode: "6"
  });

  console.log("✅ OCR Ready");
}

/* ===================================================
IMAGE PREPROCESS
=================================================== */
async function preprocessImage(file){

  const img = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width  = img.width * 3;
  canvas.height = img.height * 3;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const data = imageData.data;

  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg > 120 ? 255 : 0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
EXTRACT SIGN NUMBERS
=================================================== */
function extractNumbers(words){

  const numbers = [];

  words.forEach(w=>{
    const txt = w.text.trim();
    if(/^(1[0-2]|[1-9])$/.test(txt)){
      numbers.push({
        num: parseInt(txt),
        x: w.bbox.x0,
        y: w.bbox.y0
      });
    }
  });

  return numbers;
}

/* ===================================================
BIG DONUT PLANET INK DETECTOR
=================================================== */
function detectPlanetInk(canvas, numbers){

  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0,0,canvas.width,canvas.height).data;

  const OUTER = 320;
  const INNER = 160;

  const densityMap = {};

  numbers.forEach(n=>{

    let ink = 0;
    let pixels = 0;

    const startX = Math.max(0, n.x - OUTER);
    const endX   = Math.min(canvas.width, n.x + OUTER);
    const startY = Math.max(0, n.y - OUTER);
    const endY   = Math.min(canvas.height, n.y + OUTER);

    for(let y=startY; y<endY; y+=2){
      for(let x=startX; x<endX; x+=2){

        const dx = x - n.x;
        const dy = y - n.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if(dist < INNER || dist > OUTER) continue;

        pixels++;

        const i = (y*canvas.width + x) * 4;
        if(img[i] === 0) ink++;
      }
    }

    densityMap[n.num] = ink / pixels;
  });

  return densityMap;
}

/* ===================================================
LAGNA DETECTION
=================================================== */
function detectLagna(numbers){

  if(!numbers.length) return null;

  const avgY = numbers.reduce((s,n)=>s+n.y,0) / numbers.length;
  const middle = numbers.filter(n=>Math.abs(n.y-avgY)<120);

  if(middle.length)
    return middle.sort((a,b)=>a.x-b.x)[0].num;

  return numbers.sort((a,b)=>a.x-b.x)[0].num;
}

/* ===================================================
🔥 ADAPTIVE PLANET DETECTOR (GAME CHANGER)
=================================================== */
function convertToHouses(densityMap, lagnaSign){

  const SIGN_NAMES = {
    1:"Aries",2:"Taurus",3:"Gemini",4:"Cancer",
    5:"Leo",6:"Virgo",7:"Libra",8:"Scorpio",
    9:"Sagittarius",10:"Capricorn",11:"Aquarius",12:"Pisces"
  };

  const houses = {};
  const planets = {};

  const entries = Object.entries(densityMap);
  if(!entries.length || !lagnaSign)
    return {houses:{}, planets:{}};

  // sort by density DESC
  entries.sort((a,b)=>b[1]-a[1]);

  const densities = entries.map(e=>e[1]);
  const avg = densities.reduce((a,b)=>a+b,0) / densities.length;

  let detectedSigns = [];

  /* ===== STAGE 1 : STRONG SPIKES ===== */
  entries.forEach(([sign,density])=>{
    if(density > avg * 1.25)
      detectedSigns.push(parseInt(sign));
  });

  /* ===== STAGE 2 : MEDIUM SPIKES ===== */
  if(detectedSigns.length < 3){
    entries.slice(0,6).forEach(([sign,density])=>{
      if(density > avg * 1.10)
        detectedSigns.push(parseInt(sign));
    });
  }

  /* ===== STAGE 3 : FALLBACK ===== */
  if(detectedSigns.length < 3){
    console.log("⚠️ Weak chart fallback used");
    detectedSigns = entries.slice(0,5).map(e=>parseInt(e[0]));
  }

  /* ===== SIGN → HOUSE ===== */
  detectedSigns.forEach(sign=>{

    const house = (sign - lagnaSign + 12) % 12 + 1;

    if(!houses[house]) houses[house] = [];

    houses[house].push({
      planet: "PlanetDetected",
      sign: SIGN_NAMES[sign]
    });

    planets["Planet_"+sign] = {
      sign: SIGN_NAMES[sign],
      house: "House "+house
    };
  });

  return {houses, planets};
}

/* ===================================================
MAIN ENGINE
=================================================== */
async function runExtractor(file){

  await initOCR();
  const canvas = await preprocessImage(file);
  const { data } = await ocrWorker.recognize(canvas);

  const numbers = extractNumbers(data.words);
  if(!numbers.length)
    return {LagnaSign:null,extractedHouses:{},planetMapping:{}};

  const densityMap = detectPlanetInk(canvas, numbers);
  const lagnaSign  = detectLagna(numbers);
  const {houses, planets} = convertToHouses(densityMap, lagnaSign);

  return {
    LagnaSign: lagnaSign,
    extractedHouses: houses,
    planetMapping: planets,
    detectedSigns: numbers.length,
    detectedPlanetZones: Object.keys(planets).length
  };
}

/* ===================================================
GLOBAL EXPORT
=================================================== */
window.extractChartFromImage = async function(file){
  return await runExtractor(file);
};

})();
