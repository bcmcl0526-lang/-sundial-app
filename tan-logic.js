// ---- Core rating logic ----
// Input: UV index (0-11+), cloud cover %, skin type (1-6)
// Output: rating 1-10 + label + color + description + session minutes + tips

// Cloud cover matters less than people think. Thin/moderate cloud barely
// reduces UV; only heavy overcast meaningfully cuts it. We apply a small
// modifier so the rating reflects reality without pretending clouds = no UV.
function cloudAdjustedUV(uv, cloudPct) {
  let factor = 1;
  if (cloudPct >= 90) factor = 0.7;       // heavy overcast
  else if (cloudPct >= 60) factor = 0.88; // significant cloud
  else if (cloudPct >= 30) factor = 0.97; // light/scattered cloud
  // below 30% cloud: negligible effect, factor stays 1
  return uv * factor;
}

// Map adjusted UV to a 1-10 "tan rating"
function uvToRating(adjustedUV) {
  // UV 0-1 -> 1-2, UV 3-6 sweet spot -> 5-8, UV 7+ -> 8-10 (diminishing returns/burn risk)
  if (adjustedUV <= 0.5) return 1;
  if (adjustedUV <= 1.5) return 2;
  if (adjustedUV <= 2.5) return 3;
  if (adjustedUV <= 3.5) return 5;
  if (adjustedUV <= 4.5) return 6;
  if (adjustedUV <= 5.5) return 7;
  if (adjustedUV <= 6.5) return 8;
  if (adjustedUV <= 8.5) return 9;
  return 10;
}

const RATING_INFO = {
  1: {
    label: "Not happening",
    color: "var(--bad)",
    desc: "UV is essentially flat right now. Even hours outside won't meaningfully change your color — better used for a walk than a tan."
  },
  2: {
    label: "Basically nothing",
    color: "var(--bad)",
    desc: "Very low UV. You could sit out all day and barely notice a difference. Save your time."
  },
  3: {
    label: "Slow going",
    color: "var(--warn)",
    desc: "Low UV — tanning is technically possible but very slow, especially for fairer skin. Fine for casual time outside, not ideal for results."
  },
  5: {
    label: "Decent window",
    color: "var(--warn)",
    desc: "UV is moderate. You'll build color steadily without much burn risk — solid for base-tan building, especially for lighter skin."
  },
  6: {
    label: "Good time to tan",
    color: "var(--good)",
    desc: "This is the sweet spot. Enough UV to trigger real melanin production, with a comfortable safety window. Great session conditions."
  },
  7: {
    label: "Great conditions",
    color: "var(--good)",
    desc: "Strong, efficient tanning UV with manageable burn risk if you watch your time. One of the best windows you'll get."
  },
  8: {
    label: "Prime, but watch the clock",
    color: "var(--good)",
    desc: "High UV — you'll tan fast, but burn risk rises just as fast. Stick closely to your recommended session time."
  },
  9: {
    label: "Intense — short session only",
    color: "var(--warn)",
    desc: "Very high UV. Color comes quickly but so does burn. Keep sessions short, reapply SPF, and don't push past your window."
  },
  10: {
    label: "Too much — sun protection day",
    color: "var(--bad)",
    desc: "Extreme UV. This is burn territory, not tan territory. If you're out, prioritize shade, SPF 50+, and covering up — come back when UV settles."
  },
};

// General tips that rotate based on rating tier
function getTips(rating, skinType) {
  const tips = [];

  if (rating <= 2) {
    tips.push({ icon: "cloud", text: "UV this low won't build a tan — consider waiting for a higher-UV window later or tomorrow." });
    tips.push({ icon: "eye", text: "Good time for outdoor activity without much sun-exposure planning needed." });
  } else if (rating <= 5) {
    tips.push({ icon: "bottle", text: "Apply SPF 30 about 15 minutes before going out — it slows burning, not the gradual tan." });
    tips.push({ icon: "rotate", text: "Rotate position every 15-20 minutes for even color." });
    tips.push({ icon: "drop", text: "Stay hydrated — dehydrated skin tans less evenly." });
  } else if (rating <= 8) {
    tips.push({ icon: "bottle", text: "SPF 30 is your friend here — it lets melanin develop while cutting burn risk significantly." });
    tips.push({ icon: "timer", text: "Set a timer for your session length below and actually get up when it goes off." });
    tips.push({ icon: "rotate", text: "Flip position halfway through for even coverage." });
    tips.push({ icon: "shield", text: "Protect eyes and lips — these don't 'tan,' they just get damaged." });
  } else {
    tips.push({ icon: "warn", text: "Burn risk is high right now — even a short session needs SPF 30-50." });
    tips.push({ icon: "timer", text: "Cut your session to the lower end of the time range — you can always do another short one later." });
    tips.push({ icon: "tree", text: "Take shade breaks between short sun intervals instead of one long stretch." });
  }

  if (skinType <= 2) {
    tips.push({ icon: "list", text: "Fair skin types build color slowest and burn fastest — consistency over many short sessions beats one long one." });
  }

  return tips;
}

// Get recommended session length in minutes for current adjusted UV + skin type
function getSessionMinutes(adjustedUV, skinType) {
  const uvFloor = Math.max(0, Math.min(11, Math.floor(adjustedUV)));
  const type = SKIN_TYPES[skinType];
  if (!type) return null;
  if (uvFloor < 3) return null; // UV too low for meaningful guidance
  return type.baseMinutes[uvFloor] ?? type.baseMinutes[11];
}
