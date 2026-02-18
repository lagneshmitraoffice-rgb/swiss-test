console.log("LM ASTRO ENGINE BOOTING 🚀");

const logBox = document.getElementById("log");
const log = msg => logBox.textContent += "\n" + msg;

let swe = null;
let SWE_READY = false;

/* ===================================================
⏳ LOAD SWISS EPHEMERIS (BROWSER WASM VERSION)
=================================================== */
async function loadSwiss(){
  try{
    log("Importing Swiss Ephemeris module...");

    const SwissEphModule = (await import("./swisseph.js")).default;

    log("Initializing Swiss Ephemeris...");

    // ⭐ THIS IS THE ONLY PATH CONFIG NEEDED ⭐
    swe = await SwissEphModule({
      locateFile: file => "./" + file
    });

    SWE_READY = true;
    log("✅ Swiss Ephemeris Ready");

  }catch(err){
    log("❌ Swiss load failed:");
    log(err);
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
  const s=["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
           "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  return s[Math.floor(deg/30)]+" "+(deg%30).toFixed(2)+"°";
}

/* ===================================================
🪐 PLANET CALCULATION (REAL SWISS CALL)
=================================================== */
function calculatePlanets(JD){

  log("Applying Lahiri Ayanamsa...");
  swe.set_sid_mode(swe.SE_SIDM_LAHIRI,0,0);

  const ayan = swe.get_ayanamsa_ut(JD);
  log("Ayanamsa loaded");

  log("Calculating Sun...");
  const sun  = swe.calc_ut(JD, swe.SE_SUN, swe.SEFLG_SWIEPH).longitude;

  log("Calculating Moon...");
  const moon = swe.calc_ut(JD, swe.SE_MOON, swe.SEFLG_SWIEPH).longitude;

  const sunSid  = norm360(sun  - ayan);
  const moonSid = norm360(moon - ayan);

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

  log("\n🚀 Starting calculation...");

  const JD = getJulianDay(dob,tob);
  log("Julian Day calculated");

  const result = calculatePlanets(JD);

  log("\n✅ Calculation Complete");
  logBox.textContent = JSON.stringify(result,null,2);
}

/* ===================================================
🚀 APP START
=================================================== */
window.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("generateBtn").onclick = generateChart;
  await loadSwiss();
});
