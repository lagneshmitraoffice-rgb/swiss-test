console.log("LM ASTRO ENGINE BOOTING 🚀");

/* ===================================================
🔥 FORCE BROWSER MODE (EMS FIX)
=================================================== */
window.process = undefined;
window.require = undefined;
window.module  = undefined;
window.exports = undefined;

const $ = id => document.getElementById(id);

let swe = null;
let SWE_READY = false;


/* ===================================================
⏳ WAIT UNTIL SWISSEPH SCRIPT READY
=================================================== */
function waitForSwissEph(){
  return new Promise((resolve,reject)=>{
    let tries = 0;

    const timer = setInterval(()=>{
      if(window.SwissEph){
        clearInterval(timer);
        resolve();
      }

      tries++;
      if(tries > 80){
        clearInterval(timer);
        reject("SwissEph script NOT found");
      }
    },100);
  });
}


/* ===================================================
🚀 INIT SWISS EPHEMERIS
=================================================== */
async function initSwiss(){
  try{
    $("resultBox").textContent = "Booting Swiss Ephemeris…";

    await waitForSwissEph();

    swe = new window.SwissEph();

    await swe.initSwissEph({
      locateFile: file => "/astro/" + file
    });

    SWE_READY = true;
    console.log("Swiss Ephemeris Ready ✅");
    $("resultBox").textContent = "Swiss Ephemeris Ready ✅";

  }catch(err){
    console.error("Swiss Load Error:",err);
    $("resultBox").textContent =
      "❌ Swiss Ephemeris failed to load.";
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
🌌 PLANET CALCULATIONS
=================================================== */
function getAyanamsa(JD){
  swe.set_sid_mode(swe.SE_SIDM_LAHIRI,0,0);
  return swe.get_ayanamsa_ut(JD);
}

function getSun(JD){
  return swe.calc_ut(JD, swe.SE_SUN, swe.SEFLG_SWIEPH).longitude;
}

function getMoon(JD){
  return swe.calc_ut(JD, swe.SE_MOON, swe.SEFLG_SWIEPH).longitude;
}

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

  const JD   = getJulianDay(dob,tob);
  const ayan = getAyanamsa(JD);

  const sunSid  = norm360(getSun(JD)  - ayan);
  const moonSid = norm360(getMoon(JD) - ayan);

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
🚀 APP START (SINGLE ENTRY)
=================================================== */
window.addEventListener("DOMContentLoaded", async ()=>{

  $("generateBtn").onclick = generateChart;

  await initSwiss();

});
