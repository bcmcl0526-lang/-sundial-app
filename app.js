// ================= STATE =================
const STORAGE_KEY = "sundial_skin_type";
const NOTIF_KEY = "sundial_notif_settings";

let currentAnswers = [];

// ================= ICON HELPER =================
function icon(name) {
  return ICONS[name] || "";
}

// ================= NAVIGATION =================
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ================= SETUP / QUIZ =================
function renderQuiz() {
  document.getElementById("setup-icon").innerHTML = icon("sun");

  const area = document.getElementById("quiz-area");
  area.innerHTML = "";
  currentAnswers = new Array(QUIZ_QUESTIONS.length).fill(null);

  QUIZ_QUESTIONS.forEach((q, qi) => {
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.innerHTML = `
      <div class="q-number">Question ${qi + 1} of ${QUIZ_QUESTIONS.length}</div>
      <div class="q-text">${q.text}</div>
      <div class="options" id="opts-${qi}"></div>
    `;
    area.appendChild(card);

    const optsWrap = card.querySelector(`#opts-${qi}`);
    q.options.forEach((opt) => {
      const btn = document.createElement("div");
      btn.className = "opt";
      btn.textContent = opt.label;
      btn.onclick = () => {
        currentAnswers[qi] = opt.value;
        optsWrap.querySelectorAll(".opt").forEach(o => o.classList.remove("selected"));
        btn.classList.add("selected");
        checkQuizComplete();
      };
      optsWrap.appendChild(btn);
    });
  });

  const btn = document.createElement("button");
  btn.className = "btn-primary";
  btn.id = "quiz-submit";
  btn.textContent = "See my results";
  btn.disabled = true;
  btn.onclick = submitQuiz;
  area.appendChild(btn);
}

function checkQuizComplete() {
  const allAnswered = currentAnswers.every(a => a !== null);
  document.getElementById("quiz-submit").disabled = !allAnswered;
}

function submitQuiz() {
  const avg = currentAnswers.reduce((a, b) => a + b, 0) / currentAnswers.length;
  const skinType = Math.max(1, Math.min(6, Math.round(avg)));
  localStorage.setItem(STORAGE_KEY, String(skinType));
  showSetupResult(skinType);
}

function showSetupResult(skinType) {
  const info = SKIN_TYPES[skinType];
  document.getElementById("quiz-area").style.display = "none";
  document.querySelector("#setup .intro").style.display = "none";

  const resultEl = document.getElementById("setup-result");
  resultEl.style.display = "block";
  resultEl.innerHTML = `
    <div class="result-card">
      <div class="icon" style="width:40px;height:40px;margin:0 auto 16px;">${icon("cloudSun")}</div>
      <div class="type-badge">${info.name}</div>
      <h2 class="display">Here's the plan, you-shaped</h2>
      <p>${info.desc}</p>
      <button class="btn-primary" id="continue-btn" style="margin-top:20px;">See today's forecast</button>
    </div>
  `;
  document.getElementById("continue-btn").onclick = () => {
    showScreen("main");
    loadMainScreen();
  };
}

// ================= INIT =================
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("settings-btn").innerHTML = icon("gear");
  document.getElementById("bell-icon").innerHTML = icon("bell");
  document.getElementById("list-icon").innerHTML = icon("list");
  document.getElementById("back-icon").innerHTML = icon("arrowLeft");

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    showScreen("main");
    loadMainScreen();
  } else {
    renderQuiz();
  }

  document.getElementById("settings-btn").onclick = openSettings;
  document.getElementById("back-to-main").onclick = () => showScreen("main");
  document.getElementById("redo-quiz-btn").onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    document.querySelector("#setup .intro").style.display = "block";
    document.getElementById("quiz-area").style.display = "block";
    document.getElementById("setup-result").style.display = "none";
    renderQuiz();
    showScreen("setup");
  };
  document.getElementById("notif-toggle").onclick = toggleNotifications;
});

// ================= MAIN SCREEN =================
async function loadMainScreen() {
  const content = document.getElementById("main-content");
  content.className = "loading-pulse";
  content.textContent = "Reading the sky…";

  if (!navigator.geolocation) {
    content.textContent = "Location isn't available — can't fetch UV data without it.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await fetchAndRender(pos.coords.latitude, pos.coords.longitude);
      } catch (e) {
        content.className = "loading-pulse";
        content.textContent = "Couldn't load UV data right now. Pull to refresh in a bit.";
      }
    },
    () => {
      content.className = "loading-pulse";
      content.textContent = "Location access is needed to check your local UV index.";
    }
  );
}

async function fetchAndRender(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index,cloud_cover,temperature_2m&hourly=uv_index,cloud_cover&daily=uv_index_max,cloud_cover_mean,temperature_2m_max&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();

  const uv = data.current.uv_index;
  const cloud = data.current.cloud_cover;
  const temp = Math.round(data.current.temperature_2m);

  const skinType = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 3;
  const adjUV = cloudAdjustedUV(uv, cloud);
  const rating = uvToRating(adjUV);
  const info = RATING_INFO[rating];
  const sessionMin = getSessionMinutes(adjUV, skinType);
  const tips = getTips(rating, skinType);

  const scene = getWeatherScene(uv, cloud);
  if (window.setWeatherScene) window.setWeatherScene(scene);

  const content = document.getElementById("main-content");
  content.className = "";

  // build hourly strip (next 8 hours)
  const hourlyHtml = buildHourlyStrip(data.hourly, skinType);

  content.innerHTML = `
    <div class="hero">
      <div class="place">${SCENE_LABELS[scene]}</div>
      <div class="temp display">${temp}°</div>
      <div class="condition">UV ${uv.toFixed(1)} · ${cloud}% cloud</div>
    </div>

    <div class="rating-banner">
      <div class="rb-left">
        <div class="rb-num">${rating}</div>
        <div class="rb-out">/10</div>
      </div>
      <div class="rb-label">${info.label}</div>
    </div>

    ${hourlyHtml}

    ${buildDailyStrip(data.daily, skinType)}

    <div class="advice-card">
      <h3>What this means</h3>
      <p>${info.desc}</p>
      ${sessionMin ? `<div class="session-time"><span class="icon">${icon("timer")}</span>Recommended session: ~${sessionMin} min</div>` : ""}
    </div>

    <div class="tip-list">
      <h3>Tips for today</h3>
      ${tips.map(t => `<div class="tip-item"><span class="icon">${icon(t.icon)}</span><span>${t.text}</span></div>`).join("")}
    </div>

    <div class="footer-spacer"></div>
  `;

  window.__sundialLatest = { rating, uv, cloud };
}

function buildHourlyStrip(hourly, skinType) {
  if (!hourly || !hourly.time) return "";
  const now = new Date();
  const items = [];

  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]);
    if (t < now) continue;
    if (items.length >= 8) break;

    const adjUV = cloudAdjustedUV(hourly.uv_index[i], hourly.cloud_cover[i]);
    const r = uvToRating(adjUV);
    const scene = getWeatherScene(hourly.uv_index[i], hourly.cloud_cover[i]);
    const isNow = items.length === 0;
    const timeLabel = isNow ? "Now" : t.toLocaleTimeString([], { hour: "numeric" });

    items.push(`
      <div class="hour-item ${isNow ? "now" : ""}">
        <div class="h-time">${timeLabel}</div>
        <div class="h-icon">${icon(SCENE_ICONS[scene])}</div>
        <div class="h-rating">${r}</div>
      </div>
    `);
  }

  if (items.length === 0) return "";

  return `
    <div class="hourly-strip">
      <div class="hs-title">Today's outlook</div>
      <div class="hourly-scroll">${items.join("")}</div>
    </div>
  `;
}

function buildDailyStrip(daily, skinType) {
  if (!daily || !daily.time) return "";
  const items = [];

  for (let i = 0; i < daily.time.length && i < 7; i++) {
    const d = new Date(daily.time[i]);
    const uvMax = daily.uv_index_max[i];
    const cloud = Math.round(daily.cloud_cover_mean[i]);
    const temp = Math.round(daily.temperature_2m_max[i]);

    const adjUV = cloudAdjustedUV(uvMax, cloud);
    const r = uvToRating(adjUV);
    const scene = getWeatherScene(uvMax, cloud);
    const dayLabel = i === 0 ? "Today" : d.toLocaleDateString([], { weekday: "short" });

    items.push(`
      <div class="day-row">
        <div class="day-name">${dayLabel}</div>
        <div class="day-icon">${icon(SCENE_ICONS[scene])}</div>
        <div class="day-bar-wrap">
          <div class="day-bar" style="width:${r * 10}%; background:${ratingColor(r)};"></div>
        </div>
        <div class="day-rating">${r}</div>
        <div class="day-temp">${temp}°</div>
      </div>
    `);
  }

  if (items.length === 0) return "";

  return `
    <div class="daily-strip">
      <div class="hs-title">Next 7 days</div>
      <div class="day-list">${items.join("")}</div>
    </div>
  `;
}

function ratingColor(r) {
  if (r <= 2) return "var(--bad)";
  if (r <= 5) return "var(--warn)";
  if (r <= 8) return "var(--good)";
  return "var(--warn)";
}


// ================= SETTINGS =================
function openSettings() {
  const skinType = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 3;
  document.getElementById("skin-type-summary").textContent = SKIN_TYPES[skinType].name + " — " + SKIN_TYPES[skinType].desc;

  const settings = JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
  const toggle = document.getElementById("notif-toggle");
  const thresholdArea = document.getElementById("threshold-area");

  toggle.classList.toggle("on", !!settings.enabled);
  thresholdArea.style.display = settings.enabled ? "block" : "none";

  renderThresholdChips(settings.threshold || 6);

  showScreen("settings");
}

function renderThresholdChips(selected) {
  const wrap = document.getElementById("threshold-options");
  wrap.innerHTML = "";
  [5, 6, 7, 8].forEach(val => {
    const chip = document.createElement("div");
    chip.className = "threshold-chip" + (val === selected ? " selected" : "");
    chip.textContent = `${val}+`;
    chip.onclick = () => {
      wrap.querySelectorAll(".threshold-chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      const settings = JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
      settings.threshold = val;
      localStorage.setItem(NOTIF_KEY, JSON.stringify(settings));
    };
    wrap.appendChild(chip);
  });
}

async function toggleNotifications() {
  const toggle = document.getElementById("notif-toggle");
  const thresholdArea = document.getElementById("threshold-area");
  const settings = JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");

  if (!settings.enabled) {
    if (!("Notification" in window)) {
      alert("Notifications aren't supported in this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      alert("Notification permission was denied. You can enable it later in iPhone Settings > SunDial > Notifications.");
      return;
    }
    settings.enabled = true;
    settings.threshold = settings.threshold || 6;
    localStorage.setItem(NOTIF_KEY, JSON.stringify(settings));
    toggle.classList.add("on");
    thresholdArea.style.display = "block";
    renderThresholdChips(settings.threshold);
    registerBackgroundCheck();
  } else {
    settings.enabled = false;
    localStorage.setItem(NOTIF_KEY, JSON.stringify(settings));
    toggle.classList.remove("on");
    thresholdArea.style.display = "none";
  }
}

// ================= NOTIFICATION CHECK =================
function checkAndNotify() {
  const settings = JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
  if (!settings.enabled) return;
  const latest = window.__sundialLatest;
  if (!latest) return;

  if (latest.rating >= settings.threshold) {
    const lastNotif = parseInt(localStorage.getItem("sundial_last_notif") || "0", 10);
    const now = Date.now();
    if (now - lastNotif < 1000 * 60 * 60 * 2) return;

    if (Notification.permission === "granted") {
      new Notification("Good time to tan", {
        body: `Today's rating just hit ${latest.rating}/10. Conditions are good — head outside.`,
        icon: "icon.png"
      });
      localStorage.setItem("sundial_last_notif", String(now));
    }
  }
}

function registerBackgroundCheck() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  setInterval(() => {
    loadMainScreen().then(checkAndNotify);
  }, 1000 * 60 * 30);
}
