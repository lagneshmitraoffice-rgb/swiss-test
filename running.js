console.log("📸 Chart Extractor Engine Running (ZONE MATCH ENGINE FINAL)");

let ocrWorker = null;

/* ===================================================
INIT OCR WORKER (FINAL FIX)
=================================================== */
async function initOCR(){
  if(ocrWorker) return;

  ocrWorker = await Tesseract.createWorker();
  await ocrWorker.loadLanguage("eng");
  await ocrWorker.initialize("eng");

  // ⭐⭐⭐ MOST IMPORTANT FIX ⭐⭐⭐
  await ocrWorker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: "6",     // detect single letters
    classify_bln_numeric_mode: "1"
  });

  console.log("✅ OCR Worker Ready");
}

/* ===================================================
IMAGE PREPROCESS (UPSCALE + STRONG B/W)
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

  // ⭐ THIN PLANET LETTER BOOST
  for(let i=0;i<data.length;i+=4){
    const avg = (data[i]+data[i+1]+data[i+2])/3;
    const val = avg > 120 ? 255 : 0;
    data[i]=data[i+1]=data[i+2]=val;
  }

  ctx.putImageData(imageData,0,0);
  return canvas;
}

/* ===================================================
MERGE BROKEN OCR LETTERS (M O → MO)
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
🔥 CORE ENGINE (ZONE MATCH)
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

  let numbers=[];
  let planets=[];

  /* ===== Detect numbers & planets ===== */
  merged.forEach(w=>{

    const text=w.text;

    if(/^(1[0-2]|[1-9])$/.test(text)){
      numbers.push({num:parseInt(text),x:w.x,y:w.y});
      return;
    }

    if(text.length>4) return;

    if(PLANET_MAP[text]){
      planets.push({planet:PLANET_MAP[text],x:w.x,y:w.y});
    }
  });

  /* ===== Zone matching ===== */
  const ZONE_SIZE = 140;
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

  /* ===== Lagna detection ===== */
  let lagnaSign=null;
  if(numbers.length){
    const avgY = numbers.reduce((s,n)=>s+n.y,0)/numbers.length;
    const mid  = numbers.filter(n=>Math.abs(n.y-avgY)<120);
    if(mid.length) lagnaSign = mid.sort((a,b)=>a.x-b.x)[0].num;
  }

  /* ===== Sign → House conversion ===== */
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
PUBLIC FUNCTION (CALLED BY HTML)
=================================================== */
window.extractChartFromImage = async function(file){
  await initOCR();
  const canvas = await preprocessImage(file);
  const { data } = await ocrWorker.recognize(canvas);
  return extractByPositions(data.words);
};
