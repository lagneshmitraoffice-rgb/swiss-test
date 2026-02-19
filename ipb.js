console.log("✨ IPB Engine v2 Loaded");

/* ================================
GET INPUT VALUES
================================ */
function getInputs(){
  return {
    lagna:Number(document.getElementById("lagna").value),
    Sun:Number(document.getElementById("sun").value),
    Moon:Number(document.getElementById("moon").value),
    Mars:Number(document.getElementById("mars").value),
    Mercury:Number(document.getElementById("mercury").value),
    Jupiter:Number(document.getElementById("jupiter").value),
    Venus:Number(document.getElementById("venus").value),
    Saturn:Number(document.getElementById("saturn").value),
    Rahu:Number(document.getElementById("rahu").value),
    Ketu:Number(document.getElementById("ketu").value)
  };
}

/* ================================
VALIDATION
================================ */
function validateInputs(data){

  if(!data.lagna || data.lagna<1 || data.lagna>12){
    alert("Please enter Lagna (1-12)");
    return false;
  }

  return true;
}

/* ================================
RULE ENGINE 🔥
================================ */
function generateReading(p){

  let R={
    personality:"",
    career:"",
    love:"",
    strengths:"",
    challenges:""
  };

  // SUN
  if(p.Sun==10) R.career+="Born leader with authority.<br>";
  if(p.Sun==1) R.personality+="Strong ego and confidence.<br>";

  // MOON
  if(p.Moon==4) R.personality+="Emotionally deep and family oriented.<br>";
  if(p.Moon==6) R.challenges+="Overthinking and stress prone.<br>";

  // MARS
  if(p.Mars==7) R.love+="Passionate & intense relationships.<br>";
  if(p.Mars==6) R.strengths+="Competitive and unstoppable work ethic.<br>";

  // MERCURY
  if(p.Mercury==10) R.career+="Business & communication genius.<br>";
  if(p.Mercury==1) R.personality+="Sharp mind and witty personality.<br>";

  // JUPITER
  if(p.Jupiter==9) R.strengths+="Blessed with luck and wisdom.<br>";
  if(p.Jupiter==10) R.career+="High status career growth.<br>";

  // VENUS
  if(p.Venus==7) R.love+="Romantic and relationship oriented.<br>";
  if(p.Venus==11) R.strengths+="Popular and socially magnetic.<br>";

  // SATURN
  if(p.Saturn==10) R.career+="Slow but unstoppable career rise.<br>";
  if(p.Saturn==7) R.challenges+="Marriage delays or karmic partners.<br>";

  // RAHU
  if(p.Rahu==10) R.career+="Obsessed with fame & success.<br>";
  if(p.Rahu==7) R.love+="Unusual karmic relationships.<br>";

  // KETU
  if(p.Ketu==4) R.challenges+="Detached from home/family.<br>";
  if(p.Ketu==1) R.personality+="Spiritual and introspective nature.<br>";

  return R;
}

/* ================================
MAIN FUNCTION
================================ */
function interpret(){

  const data=getInputs();
  if(!validateInputs(data)) return;

  const reading=generateReading(data);

  document.getElementById("result").innerHTML=`
  <h2>🧠 Personality</h2>${reading.personality||"Balanced personality."}
  <h2>💼 Career</h2>${reading.career||"Stable career path."}
  <h2>❤️ Relationships</h2>${reading.love||"Normal relationship life."}
  <h2>💪 Strengths</h2>${reading.strengths||"General strengths."}
  <h2>⚠️ Challenges</h2>${reading.challenges||"No major challenges."}
  `;
}

window.interpret=interpret;
