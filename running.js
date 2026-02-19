console.log("📸 Chart Extractor Engine Loaded");

(function(){

let ocrWorker=null;

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
    tessedit_char_whitelist:"0123456789",
    tessedit_pageseg_mode:"6"
  });

  console.log("✅ OCR Ready");
}

/* ===================================================
IMAGE PREPROCESS (UPSCALE + STRONG B/W)
=================================================== */
async function preprocessImage(file){

  const img = await createImageBitmap(file);
  const canvas=document.createElement("canvas");
  const ctx=canvas.getContext("2d");

  canvas.width  = img.width*3;
  canvas.height = img.height*3;
  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
  const data=imageData.data;

  // Strong black/white threshold
  for(let i=0;i<data.length;i+=4){
    const avg=(data[i]+data[i+1]+data[i+2])/3;
    const val=avg>120?255:0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
MERGE BROKEN NUMBER OCR
=================================================== */
function mergeNearbyNumbers(words){

  words.sort((a,b)=>{
    if(Math.abs(a.bbox.y0-b.bbox.y0)<20)
      return a.bbox.x0-b.bbox.x0;
    return a.bbox.y0-b.bbox.y0;
  });

  const numbers=[];

  words.forEach(w=>{
    const txt=w.text.trim();
    if(/^(1[0-2]|[1-9])$/.test(txt)){
      numbers.push({
        num:parseInt(txt),
        x:w.bbox.x0,
        y:w.bbox.y0
      });
    }
  });

  return numbers;
}

/* ===================================================
🔥 PIXEL PLANET DETECTOR (REAL BREAKTHROUGH)
=================================================== */
function detectPlanetPixels(canvas,numbers){

  const ctx=canvas.getContext("2d");
  const img=ctx.getImageData(0,0,canvas.width,canvas.height).data;

  const ZONE=160;
  const signInk={};

  numbers.forEach(n=>{

    let ink=0;

    for(let x=n.x-ZONE;x<n.x+ZONE;x++){
      for(let y=n.y-ZONE;y<n.y+ZONE;y++){

        if(x<0||y<0||x>=canvas.width||y>=canvas.height) continue;

        const i=(y*canvas.width+x)*4;
        const pixel=img[i];

        if(pixel===0) ink++; // black pixel
      }
    }

    signInk[n.num]=ink;
  });

  return signInk;
}

/* ===================================================
LAGNA DETECTION (ASTRO GEOMETRY)
Left-middle diamond = Lagna
=================================================== */
function detectLagna(numbers){

  if(!numbers.length) return null;

  const avgY=numbers.reduce((s,n)=>s+n.y,0)/numbers.length;

  const middle=numbers.filter(n=>Math.abs(n.y-avgY)<120);
  if(!middle.length) return null;

  return middle.sort((a,b)=>a.x-b.x)[0].num;
}

/* ===================================================
SIGN → HOUSE CONVERSION
=================================================== */
function convertToHouses(signInk,lagnaSign){

  const SIGN_NAMES={
    1:"Aries",2:"Taurus",3:"Gemini",4:"Cancer",
    5:"Leo",6:"Virgo",7:"Libra",8:"Scorpio",
    9:"Sagittarius",10:"Capricorn",11:"Aquarius",12:"Pisces"
  };

  const houses={};
  const planets={};

  Object.keys(signInk).forEach(signKey=>{

    const sign=parseInt(signKey);
    if(signInk[sign]<2500) return; // threshold = planet exists

    const house=(sign-lagnaSign+12)%12+1;

    if(!houses[house]) houses[house]=[];

    houses[house].push({
      planet:"PlanetDetected",
      sign:SIGN_NAMES[sign]
    });

    planets["Planet_"+sign]={
      sign:SIGN_NAMES[sign],
      house:"House "+house
    };
  });

  return {houses,planets};
}

/* ===================================================
🚀 MAIN ENGINE
=================================================== */
async function runExtractor(file){

  await initOCR();
  const canvas=await preprocessImage(file);

  const {data}=await ocrWorker.recognize(canvas);

  // STEP 1 → detect sign numbers
  const numbers=mergeNearbyNumbers(data.words);

  // STEP 2 → detect planets via pixels
  const signInk=detectPlanetPixels(canvas,numbers);

  // STEP 3 → detect Lagna
  const lagnaSign=detectLagna(numbers);

  // STEP 4 → sign → house conversion
  const {houses,planets}=convertToHouses(signInk,lagnaSign);

  return {
    LagnaSign:lagnaSign,
    extractedHouses:houses,
    planetMapping:planets,
    detectedSigns:numbers.length,
    detectedPlanetZones:Object.keys(planets).length
  };
}

/* ===================================================
GLOBAL EXPORT (FIXES YOUR ERROR)
=================================================== */
window.extractChartFromImage = async function(file){
  try{
    return await runExtractor(file);
  }catch(err){
    console.error("❌ OCR ERROR",err);
    throw err;
  }
};

})();
