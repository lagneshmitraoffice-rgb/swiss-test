console.log("LM ASTRO ENGINE BOOTING 🚀");

let swe = null;
let SWE_READY = false;

/* ===================================================
⏳ LOAD SWISS EPHEMERIS (VERCEL SAFE)
=================================================== */
async function loadSwiss(){

  const box = document.getElementById("resultBox");
  const log = msg => box.textContent += "\n" + msg;

  try{

    box.textContent = "🔄 Loading Swiss Ephemeris...";

    // ⭐ Absolute base URL (critical for Vercel)
    const BASE_URL = window.location.origin + "/";

    log("Base URL: " + BASE_URL);

    const SwissEphModule = (await import("./swisseph.js")).default;

    swe = await SwissEphModule({
      locateFile: file => BASE_URL + file
    });

    // ⭐ Absolute ephemeris path
    const EPHE_PATH = BASE_URL + "ephe";

    swe.swe_set_ephe_path(EPHE_PATH);

    log("Ephemeris path set to: " + EPHE_PATH);

    SWE_READY = true;
    log("✅ Swiss Ephemeris Ready");

  }catch(err){
    box.textContent = "❌ Swiss load failed:\n" + err;
    console.error(err);
  }
}


/* ===================================================
📅 JULIAN DAY (IST → UTC)
=================================================== */
function getJulianDay(dob,tob){

  const [year,month,day] = dob.split("-").map(Number);
  let [hour,min] = tob.split(":").map(Number);

  hour -= 5;
  min  -= 30;

  if(min < 0){ min+=60; hour--; }
  if(hour < 0){ hour+=24; }

  let Y=year; let M=month;
  if(M<=2){ Y--; M+=12; }

  const A=Math.floor(Y/100);
  const B=2-A+Math.floor(A/4);

  return Math.floor(365.25*(Y+4716))
      + Math.floor(30.6001*(M+1))
      + day + B - 1524.5
      + (hour+min/60)/24;
}


/* ===================================================
🌌 HELPERS
=================================================== */
function norm360(x){ x%=360; if(x<0)x+=360; return x; }

function degToSign(deg){
  const s=[
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
  ];
  return s[Math.floor(deg/30)]+" "+(deg%30).toFixed(2)+"°";
}


/* ===================================================
🪐 PLANET CALCULATION
=================================================== */
function calculatePlanets(JD){

  swe.set_sid_mode(swe.SE_SIDM_LAHIRI,0,0);

  const ayan = swe.get_ayanamsa_ut(JD);

  const sunRes  = swe.calc_ut(JD, swe.SE_SUN, swe.SEFLG_SWIEPH);
  const moonRes = swe.calc_ut(JD, swe.SE_MOON, swe.SEFLG_SWIEPH);

  if(!sunRes || !moonRes){
    throw new Error("Planet calculation failed (ephemeris missing)");
  }

  const sunSid  = norm360(sunRes.longitude  - ayan);
  const moonSid = norm360(moonRes.longitude - ayan);

  return {
    JulianDay: JD.toFixed(6),
    Ayanamsa: ayan.toFixed(6)+"°",

    Sun:{
      Degree:sunSid.toFixed(6)+"°",
      Zodiac:degToSign(sunSid)
    },

    Moon:{
      Degree:moonSid.toFixed(6)+"°",
      Zodiac:degToSign(moonSid)
    }
  };
}


/* ===================================================
🔥 GENERATE BUTTON
=================================================== */
async function generateChart(){

  const box = document.getElementById("resultBox");

  if(!SWE_READY){
    alert("Swiss still loading...");
    return;
  }

  const dob=document.getElementById("dob").value;
  const tob=document.getElementById("tob").value;

  if(!dob||!tob){
    alert("Enter DOB & TOB");
    return;
  }

  try{

    box.textContent = "🚀 Starting calculation...";

    const JD = getJulianDay(dob,tob);
    const result = calculatePlanets(JD);

    box.textContent = JSON.stringify(result,null,2);

  }catch(err){
    box.textContent = "❌ Calculation error:\n" + err;
    console.error(err);
  }
}


/* ===================================================
🚀 APP START
=================================================== */
window.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("generateBtn").onclick = generateChart;
  await loadSwiss();
});
