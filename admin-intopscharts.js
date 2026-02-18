console.log("LM ASTRO ENGINE UI READY 🚀");

const box = document.getElementById("resultBox");

/* ================= WORKER ================= */

const worker = new Worker("./swissWorker.js", { type: "module" });

box.textContent = "🔄 Booting Astro Engine...";

/* ================= INIT ================= */

worker.postMessage({ type: "init" });

worker.onmessage = (e) => {

  if (e.data.type === "ready") {
    box.textContent = "✅ Swiss Ephemeris Ready";
  }

  if (e.data.type === "result") {
    box.textContent = JSON.stringify(e.data.data, null, 2);
  }

  if (e.data.type === "error") {
    box.textContent = "❌ Error:\n" + e.data.message;
  }
};

/* ================= GENERATE ================= */

document.getElementById("generateBtn").onclick = () => {

  const dob = document.getElementById("dob").value;
  const tob = document.getElementById("tob").value;

  if (!dob || !tob) {
    alert("Enter DOB & TOB");
    return;
  }

  box.textContent = "🔮 Calculating chart...";

  worker.postMessage({
    type: "calc",
    dob,
    tob
  });

};
