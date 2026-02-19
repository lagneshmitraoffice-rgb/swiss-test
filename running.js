console.log("📸 Chart Extractor Engine Running (STABLE BUILD)");

let ocrWorker = null;

/* ===================================================
INIT OCR WORKER
=================================================== */
async function initOCR(){
  if(ocrWorker) return;

  ocrWorker = await Tesseract.createWorker();
  await ocrWorker.loadLanguage("eng");
  await ocrWorker.initialize("eng");

  await ocrWorker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    preserve_interword_spaces: "1"
  });

  console.log("✅ OCR Worker Ready");
}

/* ===================================================
IMAGE PREPROCESS (UPSCALE + B/W)
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
LETTER MERGE ENGINE
Fixes OCR broken letters like M O → MO
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
CORE ASTRO ENGINE (SIGN → HOUSE)
=================================================== */
function extractByPositions(words){

  const PLANET_MAP={
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu",
    S:"Saturn", M:"Moon", V:"Venus",
    J:"Jupiter", R:"Rahu", K:"Ketu"
  };

  const SIGN_NAMES={
    1:"Aries",2:"Taurus",3:"Gemini",4:"Cancer",
    5:"Leo",6:"Virgo",7:"Libra",8:"Scorpio",
    9:"Sagittarius",10:"Capricorn",11:"Aquarius",12:"Pisces"
  };

  const merged = mergeNearbyLetters(words);

  let signs=[];
  let planets=[];

  /* ===============================
  DETECT SIGNS & PLANETS
  =============================== */
  merged.forEach(w=>{

    const text=w.text;

    if(/^(1[0-2]|[1-9])$/.test(text)){
      signs.push({sign:parseInt(text),x:w.x,y:w.y});
      return;
    }

    if(text.length>4) return;

    if(PLANET_MAP[text]){
      planets.push({planet:PLANET_MAP[text],x:w.x,y:w.y});
    }

  });

  /* ===============================
  PLANET → NEAREST SIGN
  =============================== */
  const planetToSign={};

  planets.forEach(p=>{
    let minDist=Infinity;
    let closest=null;

    signs.forEach(s=>{
      const dx=p.x-s.x;
      const dy=p.y-s.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<minDist){
        minDist=dist;
        closest=s.sign;
      }
    });

    if(closest && !planetToSign[p.planet]){
      planetToSign[p.planet]=closest;
    }
  });

  /* ===================================================
  ⭐ SMART LAGNA DETECTION (GEOMETRY FIX)
  Lagna = LEFT MIDDLE diamond in North chart
  =================================================== */
  let lagnaSign=null;

  if(signs.length){

    const avgY = signs.reduce((sum,s)=>sum+s.y,0) / signs.length;

    const middleBand = signs.filter(s =>
      Math.abs(s.y - avgY) < 120
    );

    if(middleBand.length){
      const leftMost = middleBand.sort((a,b)=>a.x-b.x)[0];
      lagnaSign = leftMost.sign;
    }
  }

  /* ===============================
  SIGN → HOUSE CONVERSION
  =============================== */
  const finalHouses={};
  const finalPlanets={};

  Object.keys(planetToSign).forEach(planet=>{

    const sign=planetToSign[planet];
    const house=(sign-lagnaSign+12)%12+1;

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

  return{
    LagnaSign:SIGN_NAMES[lagnaSign],
    extractedHouses:finalHouses,
    planetMapping:finalPlanets,
    detectedSigns:signs.length,
    detectedPlanets:Object.keys(finalPlanets).length
  };
}

/* ===================================================
PUBLIC FUNCTION (FIXES ERROR)
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();
  const canvas = await preprocessImage(file);
  const { data } = await ocrWorker.recognize(canvas);

  return extractByPositions(data.words);
};
