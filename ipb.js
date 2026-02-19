console.log("✨ IPB Engine Loaded");

/* ================================
READ INPUT VALUES
================================ */
function getPlanetInputs(){

  return {
    lagna: Number(document.getElementById("lagna").value),

    planets:{
      Sun:Number(document.getElementById("sun").value),
      Moon:Number(document.getElementById("moon").value),
      Mars:Number(document.getElementById("mars").value),
      Mercury:Number(document.getElementById("mercury").value),
      Jupiter:Number(document.getElementById("jupiter").value),
      Venus:Number(document.getElementById("venus").value),
      Saturn:Number(document.getElementById("saturn").value),
      Rahu:Number(document.getElementById("rahu").value),
      Ketu:Number(document.getElementById("ketu").value)
    }
  };

}

/* ================================
LAGNA PERSONALITY ENGINE 🔥
================================ */
function lagnaReading(lagna){

  const LAGNA_TEXT = {
    1:"Bold, independent and action oriented personality.",
    2:"Calm, stable and material comfort oriented.",
    3:"Curious, communicative and clever mind.",
    4:"Emotional, nurturing and home loving nature.",
    5:"Creative, expressive and leadership personality.",
    6:"Analytical, hardworking and perfectionist.",
    7:"Charming, relationship oriented and diplomatic.",
    8:"Intense, secretive and transformative personality.",
    9:"Lucky, optimistic and philosophical mindset.",
    10:"Ambitious, disciplined and status focused.",
    11:"Visionary, social and futuristic thinker.",
    12:"Spiritual, dreamy and deeply intuitive."
  };

  return LAGNA_TEXT[lagna] || "";
}

/* ================================
PLANET RULE ENGINE
================================ */
function planetRules(planets){

  let personality="";
  let career="";
  let love="";
  let strengths="";
  let challenges="";

  // 🌞 SUN
  if(planets.Sun==10) career+="Strong leadership career potential.<br>";
  if(planets.Sun==1) personality+="Natural authority and confidence.<br>";

  // 🌙 MOON
  if(planets.Moon==4) personality+="Emotionally sensitive and home loving.<br>";
  if(planets.Moon==6) challenges+="Overthinking and anxiety tendencies.<br>";

  // 🔥 MARS
  if(planets.Mars==7) love+="Passionate relationships and strong attraction.<br>";
  if(planets.Mars==6) strengths+="Competitive and hardworking nature.<br>";

  // ☿ MERCURY
  if(planets.Mercury==10) career+="Excellent business and communication skills.<br>";
  if(planets.Mercury==1) personality+="Sharp intelligence and witty nature.<br>";

  // ♃ JUPITER
  if(planets.Jupiter==9) strengths+="Strong luck and protection in life.<br>";
  if(planets.Jupiter==10) career+="High career growth and recognition.<br>";

  // ♀ VENUS
  if(planets.Venus==7) love+="Romantic and relationship oriented.<br>";
  if(planets.Venus==11) strengths+="Social charm and popularity.<br>";

  // ♄ SATURN
  if(planets.Saturn==10) career+="Slow but powerful career success.<br>";
  if(planets.Saturn==7) challenges+="Delay in marriage or relationships.<br>";

  // ☊ RAHU
  if(planets.Rahu==10) career+="Huge ambition and fame desire.<br>";
  if(planets.Rahu==7) love+="Unusual or karmic relationships.<br>";

  // ☋ KETU
  if(planets.Ketu==4) challenges+="Emotional detachment from home.<br>";
  if(planets.Ketu==1) personality+="Spiritual personality and introspection.<br>";

  return {personality,career,love,strengths,challenges};
}

/* ================================
MAIN INTERPRET FUNCTION
================================ */
function interpret(){

  const data = getPlanetInputs();

  const lagnaText = lagnaReading(data.lagna);
  const rules = planetRules(data.planets);

  document.getElementById("result").innerHTML = `
  <h2>🧠 Personality</h2>
  ${lagnaText}<br>${rules.personality || "Balanced personality."}

  <h2>💼 Career</h2>
  ${rules.career || "Stable career path."}

  <h2>❤️ Relationships</h2>
  ${rules.love || "Normal relationship life."}

  <h2>💪 Strengths</h2>
  ${rules.strengths || "General strengths."}

  <h2>⚠️ Challenges</h2>
  ${rules.challenges || "No major challenges."}
  `;
}

/* ================================
MAKE FUNCTION GLOBAL
================================ */
window.interpret = interpret;
