console.log("🧠 Swiss Worker Booting...");

let swe = null;
let READY = false;

function sendLog(msg){
  postMessage({ type:"log", message: msg });
}

/* ================= JULIAN DAY ================= */
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

function norm360(x){ x%=360; if(x<0)x+=360; return x; }

/* ================= CALC ================= */
function calculatePlanets(JD){

  sendLog("Setting sidereal mode...");
  swe.set_sid_mode(swe.SE_SIDM_LAHIRI,0,0);

  sendLog("Getting ayanamsa...");
  const ayan = swe.get_ayanamsa_ut(JD);

  sendLog("Calling swe.calc_ut SUN...");
  const sunRes  = swe.calc_ut(JD, swe.SE_SUN, swe.SEFLG_SWIEPH);

  sendLog("Calling swe.calc_ut MOON...");
  const moonRes = swe.calc_ut(JD, swe.SE_MOON, swe.SEFLG_SWIEPH);

  sendLog("Swiss returned results!");

  const sunSid  = norm360(sunRes.longitude  - ayan);
  const moonSid = norm360(moonRes.longitude - ayan);

  return {
    JD,
    Sun: sunSid,
    Moon: moonSid
  };
}

/* ================= LOAD ================= */
async function loadSwiss(){

  try{
    sendLog("Loading Swiss WASM...");

    const BASE = self.location.origin + "/";

    const SwissEphModule = (await import(BASE + "swisseph.js")).default;

    swe = await SwissEphModule({
      locateFile: file => BASE + file
    });

    sendLog("Setting ephemeris path...");
    swe.swe_set_ephe_path(BASE + "ephe");

    READY = true;
    sendLog("Swiss READY");

    postMessage({ type:"ready" });

  }catch(err){
    postMessage({ type:"error", message: err.toString() });
  }
}

/* ================= MESSAGE ================= */
self.onmessage = async (e)=>{

  if(e.data.type === "init"){
    await loadSwiss();
  }

  if(e.data.type === "calc"){
    try{
      if(!READY) throw new Error("Swiss not ready");

      sendLog("Calculating JD...");
      const JD = getJulianDay(e.data.dob, e.data.tob);

      sendLog("JD = " + JD);

      const result = calculatePlanets(JD);

      postMessage({ type:"result", data: result });

    }catch(err){
      postMessage({ type:"error", message: err.toString() });
    }
  }

};
