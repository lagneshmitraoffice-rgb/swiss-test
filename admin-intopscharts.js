console.log("LM ASTRO ENGINE BOOTING 🚀");

const $ = id => document.getElementById(id);

let swe = null;
let SWE_READY = false;


/* ===================================================
🚀 LOAD SWISS (MODULE VERSION)
=================================================== */
async function initSwiss(){

  try{

    $("resultBox").textContent = "Booting Swiss Ephemeris…";

    // ⭐ ES MODULE IMPORT
    const SwissEphModule = (await import("./swisseph.js")).default;

    swe = await SwissEphModule({
      locateFile: file => "./" + file
    });

    // ⭐ IMPORTANT (tell Swiss where .se1 files are)
    swe.swe_set_ephe_path(".");

    SWE_READY = true;

    console.log("Swiss Ephemeris Ready ✅");
    $("resultBox").textContent = "Swiss Ephemeris Ready ✅";

  }catch(err){

    console.error("Swiss Load Error:",err);
    $("resultBox").textContent =
      "❌ Swiss Ephemeris failed to load.\n"+err;

  }
}


/* ===================================================
📅 JULIAN DAY (IST → UTC)
=================================================== */
function getJulianDay(dob,tob){

  const [year,month,day] = dob.split("-").map(Number);
  let [hour,min] = tob.split(":").map(Number);

  // IST → UTC
  hour -= 5;
  min  -= 30;
  if(min < 0){ min+=60; hour--; }
  if(hour < 0){ hour+=24; }

  let Y=year;
  let M=month;

  if(M<=2){ Y--; M+=12; }

  const A=Math.floor(Y/100);
  const B=2-A+Math.floor(A/4);

  return Math.floor(365.25*(Y+4716))
      + Math.floor(30.6001*(M+1))
      + day + B - 1524.5
      + (hour+min/60)/24;
}


/* ===================================================
🌌 PLANET CALCULATIONS
=================================================== */
function norm360(x){ x%=360; if(x<0)x+=360; return x; }

function degToSign(deg){
  const s=["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
           "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  return s[Math.floor(deg/30)]+" "+(deg%30).toFixed(2)+"°";
}


/* ===================================================
🔥 GENERATE CHART
=================================================== */
async function generateChart(){

  if(!SWE_READY){
    alert("Swiss still loading… wait few sec");
    return;
  }

  const dob=$("dob").value;
  const tob=$("tob").value;

  if(!dob||!tob){
    alert("DOB & TOB required");
    return;
  }

  $("resultBox").textContent="Calculating planets…";

  const JD = getJulianDay(dob,tob);

  swe.set_sid_mode(swe.SE_SIDM_LAHIRI,0,0);
  const ayan = swe.get_ayanamsa_ut(JD);

  const sun  = swe.calc_ut(JD, swe.SE_SUN,  swe.SEFLG_SWIEPH).longitude;
  const moon = swe.calc_ut(JD, swe.SE_MOON, swe.SEFLG_SWIEPH).longitude;

  const sunSid  = norm360(sun  - ayan);
  const moonSid = norm360(moon - ayan);

  $("resultBox").textContent = JSON.stringify({

    JulianDay: JD.toFixed(6),
    LahiriAyanamsa: ayan.toFixed(6)+"°",

    Sun:{
      SiderealDegree:sunSid.toFixed(6)+"°",
      ZodiacPosition:degToSign(sunSid)
    },

    Moon:{
      SiderealDegree:moonSid.toFixed(6)+"°",
      ZodiacPosition:degToSign(moonSid)
    }

  },null,2);
}


/* ===================================================
🚀 APP START
=================================================== */
window.addEventListener("DOMContentLoaded", async ()=>{

  $("generateBtn").onclick = generateChart;

  await initSwiss();

});
