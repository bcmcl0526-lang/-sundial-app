// ================= ANIMATED WEATHER BACKGROUND =================
// Renders a full-screen canvas scene that shifts based on current
// UV / cloud cover: clear (sun rays), cloudy (drifting clouds over warm sky),
// overcast (flat grey, slow heavy clouds), night/low-UV (dim still sky).

(function () {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, DPR = 1;
  let currentScene = "clear";
  let targetScene = "clear";
  let transition = 1; // 1 = fully on currentScene, animates toward targetScene
  let clouds = [];
  let time = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initClouds();
  }

  function initClouds() {
    clouds = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * W,
        y: H * (0.08 + Math.random() * 0.35),
        scale: 0.6 + Math.random() * 0.9,
        speed: 0.04 + Math.random() * 0.08,
        opacity: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // ---- gradient palettes per scene ----
  const PALETTES = {
    clear: ["#ff9a5c", "#2b1b34", "#150b1c"],
    cloudy: ["#7d8fa6", "#3a3f55", "#1c1f2b"],
    overcast: ["#6b7280", "#3f434f", "#1c1f2b"],
    night: ["#2c3552", "#1a1f33", "#0f1117"],
  };

  function lerpColor(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function drawBackground(t) {
    const from = PALETTES[currentScene];
    const to = PALETTES[targetScene];
    const c0 = lerpColor(from[0], to[0], t);
    const c1 = lerpColor(from[1], to[1], t);
    const c2 = lerpColor(from[2], to[2], t);

    const grad = ctx.createRadialGradient(W * 0.5, H * 0.15, 0, W * 0.5, H * 0.15, Math.max(W, H) * 0.9);
    grad.addColorStop(0, c0);
    grad.addColorStop(0.55, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawSunRays(opacity) {
    if (opacity <= 0.01) return;
    const cx = W * 0.5;
    const cy = H * 0.18;
    const rayCount = 12;
    const baseRadius = Math.max(W, H) * 0.12;

    ctx.save();
    ctx.globalAlpha = opacity;

    // glow disc
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 2.4);
    glow.addColorStop(0, "rgba(255, 214, 140, 0.55)");
    glow.addColorStop(1, "rgba(255, 214, 140, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // rotating rays
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.00008);
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const len = baseRadius * 3.2;
      ctx.save();
      ctx.rotate(angle);
      const rayGrad = ctx.createLinearGradient(0, 0, len, 0);
      rayGrad.addColorStop(0, "rgba(255, 224, 168, 0.18)");
      rayGrad.addColorStop(1, "rgba(255, 224, 168, 0)");
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      const width = 0.16;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, len, -width, width);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // core disc
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 0.55, 0, Math.PI * 2);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 0.55);
    coreGrad.addColorStop(0, "rgba(255, 238, 200, 0.9)");
    coreGrad.addColorStop(1, "rgba(255, 200, 120, 0.35)");
    ctx.fillStyle = coreGrad;
    ctx.fill();

    ctx.restore();
  }

  function drawCloud(x, y, scale, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const lumps = [
      [0, 0, 38],
      [34, -10, 30],
      [-32, -6, 26],
      [16, 14, 32],
      [-20, 14, 28],
    ];
    lumps.forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawClouds(opacity, slow) {
    if (opacity <= 0.01) return;
    clouds.forEach(c => {
      drawCloud(c.x, c.y, c.scale, c.opacity * opacity);
      c.x += c.speed * (slow ? 0.4 : 1);
      if (c.x > W + 120) c.x = -120;
    });
  }

  function render() {
    time += 16;
    ctx.clearRect(0, 0, W, H);

    // ease transition
    if (transition < 1) {
      transition = Math.min(1, transition + 0.012);
    }

    drawBackground(transition);

    // blend scene-specific elements based on the blended scene
    const scene = transition >= 1 ? targetScene : currentScene;
    const sunOpacity =
      targetScene === "clear" ? transition :
      currentScene === "clear" ? (1 - transition) : 0;

    const cloudOpacity =
      (targetScene === "cloudy" || targetScene === "overcast") ? transition :
      (currentScene === "cloudy" || currentScene === "overcast") ? (1 - transition) : 0;

    drawSunRays(sunOpacity);
    drawClouds(cloudOpacity, targetScene === "overcast");

    requestAnimationFrame(render);
  }

  // public API: call with scene key ("clear" | "cloudy" | "overcast" | "night")
  window.setWeatherScene = function (scene) {
    if (!PALETTES[scene]) scene = "clear";
    if (scene === targetScene) return;
    currentScene = transition >= 1 ? targetScene : currentScene;
    targetScene = scene;
    transition = 0;
  };

  window.addEventListener("resize", resize);
  resize();
  render();
})();
