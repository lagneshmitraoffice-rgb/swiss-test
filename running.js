function extractByPositions(words){

  const PLANET_MAP = {
    SU:"Sun", MO:"Moon", MA:"Mars", ME:"Mercury",
    JU:"Jupiter", VE:"Venus", SA:"Saturn",
    RA:"Rahu", KE:"Ketu",
    S:"Saturn", M:"Moon", V:"Venus",
    J:"Jupiter", R:"Rahu", K:"Ketu"
  };

  const SIGN_NAMES = {
    1:"Aries",2:"Taurus",3:"Gemini",4:"Cancer",
    5:"Leo",6:"Virgo",7:"Libra",8:"Scorpio",
    9:"Sagittarius",10:"Capricorn",11:"Aquarius",12:"Pisces"
  };

  const mergedWords = mergeNearbyLetters(words);
  let signNumbers = [];
  let planetWords  = [];

  /* ===============================
  STEP 1 → DETECT SIGNS & PLANETS
  =============================== */
  mergedWords.forEach(w => {

    const text = w.text;

    // numbers = SIGNS
    if(/^(1[0-2]|[1-9])$/.test(text)){
      signNumbers.push({ sign:parseInt(text), x:w.x, y:w.y });
      return;
    }

    if(text.length > 6) return;

    let detectedPlanet=false;

    Object.keys(PLANET_MAP).forEach(code=>{
      if(text.includes(code)){
        planetWords.push({ planet:PLANET_MAP[code], x:w.x, y:w.y });
        detectedPlanet=true;
      }
    });

    // Mars heuristic
    if(!detectedPlanet && text.length<=3 && text.length>0){
      planetWords.push({ planet:"Mars", x:w.x, y:w.y });
    }

  });

  /* ===============================
  STEP 2 → NEAREST SIGN MAPPING
  =============================== */
  const planetToSign = {};

  planetWords.forEach(p=>{
    let closestSign=null, minDist=Infinity;

    signNumbers.forEach(s=>{
      const dx=p.x-s.x;
      const dy=p.y-s.y;
      const dist=Math.sqrt(dx*dx+dy*dy);

      if(dist<minDist){ minDist=dist; closestSign=s.sign; }
    });

    if(closestSign) planetToSign[p.planet]=closestSign;
  });

  /* ===============================
  STEP 3 → FIND LAGNA SIGN
  (Top-most number usually Lagna)
  =============================== */
  let lagnaSign = null;

  if(signNumbers.length){
    lagnaSign = signNumbers.sort((a,b)=>a.y-b.y)[0].sign;
  }

  /* ===============================
  STEP 4 → SIGN → HOUSE CONVERSION
  =============================== */
  const finalHouses = {};
  const finalPlanets = {};

  Object.keys(planetToSign).forEach(planet=>{

    const sign = planetToSign[planet];

    let house = null;
    if(lagnaSign){
      house = (sign - lagnaSign + 12) % 12 + 1;
    }

    if(!finalHouses[house]) finalHouses[house]=[];

    finalHouses[house].push({
      planet:planet,
      sign:SIGN_NAMES[sign]
    });

    finalPlanets[planet] = {
      sign:SIGN_NAMES[sign],
      house:"House "+house
    };
  });

  return {
    LagnaSign: SIGN_NAMES[lagnaSign],
    extractedHouses: finalHouses,
    planetMapping: finalPlanets,
    detectedSigns: signNumbers.length,
    detectedPlanets: Object.keys(finalPlanets).length
  };
}
