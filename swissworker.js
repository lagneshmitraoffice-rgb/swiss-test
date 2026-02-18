import SwissEph from "./swisseph.js";

let swe = null;

/* ================= INIT SWISS INSIDE WORKER ================= */

async function initSwiss() {

  try {
    const BASE = self.location.origin + "/";

    swe = await SwissEph({
      locateFile: file => BASE + file
    });

    /* 🔥 LOAD EPHE FILES INTO WASM FS */

    const files = [
      "sepl_18.se1",
      "semo_18.se1",
      "seas_18.se1",
      "sefstars.txt",
      "seasnam.txt",
      "seorbel.txt"
    ];

    swe.FS.mkdir("/ephe");

    for (const file of files) {
      const res = await fetch(BASE + "ephe/" + file);
      const buf = await res.arrayBuffer();
      swe.FS.writeFile("/ephe/" + file, new Uint8Array(buf));
    }

    swe.swe_set_ephe_path("/ephe");

    postMessage({ type: "ready" });

  } catch (err) {
    postMessage({ type: "error", message: err.toString() });
  }
}

/* ================= JULIAN DAY ================= */

function getJulianDay(dob, tob) {

  const [year, month, day] = dob.split("-").map(Number);
  let [hour, min] = tob.split(":").map(Number);

  hour -= 5; min -= 30;
  if (min < 0) { min += 60; hour--; }
  if (hour < 0) { hour += 24; }

  let Y = year, M = month;
  if (M <= 2) { Y--; M += 12; }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (Y + 4716))
       + Math.floor(30.6001 * (M + 1))
       + day + B - 1524.5
       + (hour + min / 60) / 24;
}

function norm360(x){ x%=360; if(x<0)x+=360; return x; }

function degToSign(deg){
  const s=["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
           "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  return s[Math.floor(deg/30)]+" "+(deg%30).toFixed(2)+"°";
}

/* ================= CALCULATION ================= */

function calculateChart(dob, tob) {

  const JD = getJulianDay(dob, tob);

  swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
  const ayan = swe.get_ayanamsa_ut(JD);

  const sun  = swe.calc_ut(JD, swe.SE_SUN, swe.SEFLG_SWIEPH).longitude;
  const moon = swe.calc_ut(JD, swe.SE_MOON, swe.SEFLG_SWIEPH).longitude;

  const sunSid  = norm360(sun  - ayan);
  const moonSid = norm360(moon - ayan);

  return {
    JulianDay: JD.toFixed(6),
    Ayanamsa: ayan.toFixed(6) + "°",
    Sun: degToSign(sunSid),
    Moon: degToSign(moonSid)
  };
}

/* ================= WORKER MESSAGES ================= */

onmessage = async (e) => {

  if (e.data.type === "init") {
    await initSwiss();
  }

  if (e.data.type === "calc") {
    const result = calculateChart(e.data.dob, e.data.tob);
    postMessage({ type: "result", data: result });
  }
};
