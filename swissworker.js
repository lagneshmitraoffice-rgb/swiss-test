console.log("🧠 Swiss Worker Booting...");

let swe = null;
let READY = false;

/* ===================================================
📅 JULIAN DAY (IST → UTC)
=================================================== */
function getJulianDay(dob, tob) {

  const [year, month, day] = dob.split("-").map(Number);
  let [hour, min] = tob.split(":").map(Number);

  hour -= 5;
  min  -= 30;

  if (min < 0) { min += 60; hour--; }
  if (hour < 0) { hour += 24; }

  let Y = year;
  let M = month;

  if (M <= 2) {
    Y--;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (Y + 4716))
      + Math.floor(30.6001 * (M + 1))
      + day + B - 1524.5
      + (hour + min / 60) / 24;
}

/* ===================================================
🌌 HELPERS
=================================================== */
function norm360(x) {
  x %= 360;
  if (x < 0) x += 360;
  return x;
}

function degToSign(deg) {
  const s = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
  ];
  return s[Math.floor(deg / 30)] + " " + (deg % 30).toFixed(2) + "°";
}

/* ===================================================
🪐 PLANET CALCULATION
=================================================== */
function calculatePlanets(JD) {

  swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

  const ayan = swe.get_ayanamsa_ut(JD);

  const sunRes  = swe.calc_ut(JD, swe.SE_SUN, swe.SEFLG_SWIEPH);
  const moonRes = swe.calc_ut(JD, swe.SE_MOON, swe.SEFLG_SWIEPH);

  if (!sunRes || !moonRes || sunRes.error || moonRes.error) {
    throw new Error("Planet calculation failed (ephemeris issue)");
  }

  const sunSid  = norm360(sunRes.longitude  - ayan);
  const moonSid = norm360(moonRes.longitude - ayan);

  return {
    JulianDay: JD.toFixed(6),
    Ayanamsa: ayan.toFixed(6) + "°",
    Sun: degToSign(sunSid),
    Moon: degToSign(moonSid)
  };
}

/* ===================================================
🚀 LOAD SWISS (VERCEL SAFE + WARMUP)
=================================================== */
async function loadSwiss() {

  try {

    const BASE = self.location.origin + "/";

    console.log("Worker BASE:", BASE);

    const SwissEphModule = (await import(BASE + "swisseph.js")).default;

    swe = await SwissEphModule({
      locateFile: file => BASE + file
    });

    // ⭐ EPHEMERIS FOLDER PATH (IMPORTANT)
    swe.swe_set_ephe_path(BASE + "ephe");

    // ⭐⭐⭐ WARMUP CALL (CRITICAL FIX) ⭐⭐⭐
    swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
    swe.get_ayanamsa_ut(2451545.0); // dummy JD to force load

    // small delay to fully wake WASM
    await new Promise(r => setTimeout(r, 400));

    READY = true;

    postMessage({ type: "ready" });

  } catch (err) {

    console.error("Worker load error:", err);
    postMessage({ type: "error", message: err.toString() });
  }
}

/* ===================================================
📨 MESSAGE HANDLER
=================================================== */
self.onmessage = async (e) => {

  if (e.data.type === "init") {
    await loadSwiss();
  }

  if (e.data.type === "calc") {

    try {

      if (!READY) throw new Error("Swiss not ready yet");

      const JD = getJulianDay(e.data.dob, e.data.tob);
      const result = calculatePlanets(JD);

      postMessage({ type: "result", data: result });

    } catch (err) {

      console.error("Calculation error:", err);
      postMessage({ type: "error", message: err.toString() });
    }
  }
};
