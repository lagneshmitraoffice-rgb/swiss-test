console.log("📸 Chart Extractor Engine Loaded");

/* ===================================================
GLOBAL SAFE EXPORT
=================================================== */
(function(){

let ocrWorker = null;

/* ===================================================
INIT OCR
=================================================== */
async function initOCR(){

  if(!window.Tesseract){
    throw new Error("Tesseract not loaded. Check <script src>");
  }

  if(ocrWorker) return;

  ocrWorker = await Tesseract.createWorker();
  await ocrWorker.loadLanguage("eng");
  await ocrWorker.initialize("eng");

  await ocrWorker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    tessedit_pageseg_mode: "6",
    preserve_interword_spaces: "1"
  });

  console.log("✅ OCR Worker Ready");
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

  ctx.drawImage(img,0,0,canvas.width,canvas.height);

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
MERGE LETTERS
=================================================== */
function mergeNearbyLetters(words){

  words.sort((a,b)=>{
    if(Math.abs(a.bbox.y0 - b.bbox.y0) < 20)
      return a.bbox.x0 - b.bbox.x0;
    return a.bbox.y0 - b.bbox.y0;
  });

  const merged=[];
  let current=null;

  words.forEach(w=>{
    const text = w.text.toUpperCase().trim();
    if(!text) return;

    if(!current){
      current={text,x:w.bbox.x0,y:w.bbox.y0};
      return;
    }

    const closeY = Math.abs(current.y - w.bbox.y0) < 20;
    const closeX = Math.abs(w.bbox.x0 - (current.x + current.text.length*15)) < 40;

    if(closeY && closeX){
      current.text += text;
    }else{
      merged.push(current);
      current={text,x:w.bbox.x0,y:w.bbox.y0};
    }
  });

  if(current) merged.push(current);

  return merged;
}

/* ===================================================
CORE ENGINE
=================================================== */
function extractByPositions(rawWords){

  const SIGN_NAMES={
    1:"Aries",2:"Taurus",3:"Gemini",4:"Cancer",
    5:"Leo",6:"Virgo",7:"Libra",8:"Scorpio",
    9:"Sagittarius",10:"Capricorn",11:"Aquarius",12:"Pisces"
  };

  const PLANET_CHAR_MAP={
    M:"Moon",
    J:"Jupiter",
    V:"Venus",
    S:"Saturn",
    R:"Rahu",
    K:"Ketu",
    U:"Sun",
    E:"Mercury",
    A:"Mars",N:"Mars",H:"Mars"
  };

  /* ===== GET SIGN NUMBERS ===== */
  const merged = mergeNearbyLetters(rawWords);

  let numbers=[];
  merged.forEach(w=>{
    if(/^(1[0-2]|[1-9])$/.test(w.text)){
      numbers.push({num:parseInt(w.text),x:w.x,y:w.y});
    }
  });

  /* ===== GET PLANETS (RAW OCR) ===== */
  let planets=[];
  rawWords.forEach(w=>{
    const char = w.text.toUpperCase().replace(/[^A-Z]/g,'');
    if(PLANET_CHAR_MAP[char]){
      planets.push({
        planet:PLANET_CHAR_MAP[char],
        x:w.bbox.x0,
        y:w.bbox.y0
      });
    }
  });

  /* ===== ZONE MATCH ===== */
  const ZONE_SIZE=140;
  const signToPlanets={};

  numbers.forEach(n=>{
    const left=n.x-ZONE_SIZE;
    const right=n.x+ZONE_SIZE;
    const top=n.y-ZONE_SIZE;
    const bottom=n.y+ZONE_SIZE;

    planets.forEach(p=>{
      if(p.x>left && p.x<right && p.y>top && p.y<bottom){
        if(!signToPlanets[n.num]) signToPlanets[n.num]=[];
        if(!signToPlanets[n.num].includes(p.planet))
          signToPlanets[n.num].push(p.planet);
      }
    });
  });

  /* ===== LAGNA DETECTION ===== */
  let lagnaSign=null;

  if(numbers.length){
    const avgY = numbers.reduce((s,n)=>s+n.y,0)/numbers.length;
    const mid = numbers.filter(n=>Math.abs(n.y-avgY)<120);
    if(mid.length){
      lagnaSign = mid.sort((a,b)=>a.x-b.x)[0].num;
    }
  }

  /* ===== SIGN → HOUSE ===== */
  const finalHouses={};
  const finalPlanets={};

  Object.keys(signToPlanets).forEach(signKey=>{
    const sign=parseInt(signKey);

    if(!lagnaSign) return;

    const house=(sign-lagnaSign+12)%12+1;

    signToPlanets[sign].forEach(planet=>{
      if(!finalHouses[house]) finalHouses[house]=[];

      finalHouses[house].push({
        planet,
        sign:SIGN_NAMES[sign]
      });

      finalPlanets[planet]={
        sign:SIGN_NAMES[sign],
        house:"House "+house
      };
    });
  });

  return{
    LagnaSign:SIGN_NAMES[lagnaSign],
    extractedHouses:finalHouses,
    planetMapping:finalPlanets,
    detectedSigns:numbers.length,
    detectedPlanets:Object.keys(finalPlanets).length
  };
}

/* ===================================================
PUBLIC FUNCTION (GLOBAL SAFE)
=================================================== */
window.extractChartFromImage = async function(file){

  try{
    await initOCR();
    const canvas = await preprocessImage(file);
    const { data } = await ocrWorker.recognize(canvas);
    return extractByPositions(data.words);
  }catch(err){
    console.error("❌ OCR ERROR:",err);
    throw err;
  }
};

})();
