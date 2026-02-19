console.log("📸 Chart Extractor Engine Running");

/* ===================================================
INIT OCR WORKER
=================================================== */
let ocrWorker = null;

async function initOCR(){
  if(ocrWorker) return;
  ocrWorker = await Tesseract.createWorker("eng");
  console.log("✅ OCR Worker Ready");
}

/* ===================================================
IMAGE → ASTRO DATA
=================================================== */
window.extractChartFromImage = async function(file){

  await initOCR();

  console.log("🔍 Reading chart image...");

  const { data:{ text } } = await ocrWorker.recognize(file);

  console.log("📄 OCR TEXT:");
  console.log(text);

  return parseAstroText(text);
};

/* ===================================================
TEXT → PLANET DATA PARSER
=================================================== */
function parseAstroText(rawText){

  const text = rawText.toUpperCase();

  const PLANETS = [
    "SUN","MOON","MARS","MERCURY","JUPITER",
    "VENUS","SATURN","RAHU","KETU"
  ];

  const SIGNS = [
    "ARIES","TAURUS","GEMINI","CANCER","LEO","VIRGO",
    "LIBRA","SCORPIO","SAGITTARIUS","CAPRICORN","AQUARIUS","PISCES"
  ];

  const lines = text.split("\n");

  const result = {
    planets:{},
    rawText:text
  };

  lines.forEach(line => {

    PLANETS.forEach(planet => {

      if(line.includes(planet)){

        const sign = SIGNS.find(s => line.includes(s));
        const degMatch = line.match(/(\d+(\.\d+)?)/);

        if(sign && degMatch){
          result.planets[planet] = {
            sign: sign,
            degree: parseFloat(degMatch[0])
          };
        }

      }

    });

  });

  console.log("🪐 Extracted Planets:", result);
  return result;
}
