console.log("LM ASTRO ENGINE UI READY 🚀");

const box = document.getElementById("resultBox");

/* ===================================================
🧠 CREATE WORKER (CRITICAL PATH FIX)
=================================================== */

// ⭐ absolute path use kar rahe hai (vercel safe)
const worker = new Worker("/swissworker.js", { type: "module" });

box.textContent = "🔄 Booting Astro Engine...";

/* ===================================================
🚀 INIT ENGINE
=================================================== */

worker.postMessage({ type: "init" });

worker.onmessage = (e) => {

  // Engine Ready
  if (e.data.type === "ready") {
    console.log("Worker Ready");
    box.textContent = "✅ Swiss Ephemeris Ready";
  }

  // Chart Result
  if (e.data.type === "result") {
    console.log("Chart Received");
    box.textContent = JSON.stringify(e.data.data, null, 2);
  }

  // Error
  if (e.data.type === "error") {
    console.error("Worker Error:", e.data.message);
    box.textContent = "❌ Error:\n" + e.data.message;
  }
};

/* ===================================================
🔥 GENERATE BUTTON
=================================================== */

document.getElementById("generateBtn").addEventListener("click", () => {

  const dob = document.getElementById("dob").value;
  const tob = document.getElementById("tob").value;

  if (!dob || !tob) {
    alert("Enter DOB & TOB");
    return;
  }

  box.textContent = "🔮 Calculating chart...";

  worker.postMessage({
    type: "calc",
    dob: dob,
    tob: tob
  });
});
