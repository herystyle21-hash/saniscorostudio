(() => {
  "use strict";
    /* --- SISTEM LOGIN & KEAMANAN SESI --- */
  const AUTH_KEY = "sanisStudio_auth_v1";
  const SESSION_KEY = "sanisStudio_session_v1";

  async function hashText(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function getAuthCreds() {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      if (saved && saved.user && saved.passHash) return saved;
    } catch (_) {}
    return { user: "saniscoro", passHash: await hashText("5758") };
  }

  function unlockStudio() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("appShell").classList.remove("app-locked");
  }

  function lockStudio() {
    sessionStorage.removeItem(SESSION_KEY);
    document.getElementById("loginPass").value = "";
    document.getElementById("loginError").textContent = "";
    document.getElementById("appShell").classList.add("app-locked");
    document.getElementById("loginScreen").classList.remove("hidden");
  }

  (async function initAuth() {
    const creds = await getAuthCreds();
    document.getElementById("newAuthUser").value = creds.user;

    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      unlockStudio();
    }

    document.getElementById("btnTogglePass").onclick = () => {
      const inp = document.getElementById("loginPass");
      inp.type = inp.type === "password" ? "text" : "password";
    };

    document.getElementById("loginForm").onsubmit = async e => {
      e.preventDefault();
      const u = document.getElementById("loginUser").value.trim().toLowerCase();
      const p = document.getElementById("loginPass").value;
      const errBox = document.getElementById("loginError");
      const current = await getAuthCreds();

      if (u === current.user.toLowerCase() && (await hashText(p)) === current.passHash) {
        sessionStorage.setItem(SESSION_KEY, "1");
        errBox.textContent = "";
        unlockStudio();
        showToast(`Selamat datang, ${current.user}!`);
      } else {
        errBox.textContent = "Username atau Password/PIN salah.";
      }
    };

    document.getElementById("btnLogout").onclick = () => {
      lockStudio();
      showToast("Sesi dikunci.");
    };

    document.getElementById("btnSaveAuth").onclick = async () => {
      const newU = document.getElementById("newAuthUser").value.trim();
      const newP = document.getElementById("newAuthPass").value;
      if (newU.length < 3) return showToast("Username minimal 3 karakter");
      if (newP.length < 4) return showToast("Password/PIN minimal 4 karakter");
      const passHash = await hashText(newP);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: newU, passHash }));
      document.getElementById("newAuthPass").value = "";
      showToast("Username & Password login diperbarui!");
    };
  })();


  const STORAGE_KEY = "sanisStudio_modular_v1";
  const SAFE_MIME = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i;
  const imgCache = new Map();

  const DEFAULT_STATE = {
    template: "breaking",
    themeMode: "dark",
    accentColor: "#E11D2A",
    ratio: "4:5",
    exportWidth: 1440,
    logoMode: "sc_vector",
    brandMono: "SC",
    socialHandle: "Tiktok & IG | @saniscoro",
    customLogo: "",
    captionTone: "breaking",
    capEmoji: true,
    capCta: true,
    capTags: true,
    activeSlide: 0,
    slides: [
      {
        type: "cover",
        kicker: "MARKET ALERT",
        title: "MASIH BANYAK GILA LONG! BITCOIN TURUN LAGI HINGGA [[SENTUH $62,000]]",
        subtitle: "Likuidasi posisi leverage menembus ratusan juta dolar dalam 24 jam terakhir.",
        bullets: ["Volatilitas tinggi di sesi Asia", "Trader ritel terjebak leverage tinggi"],
        quote: "Sumber: Data Derivatif & On-Chain",
        bgImage: "",
        preset: "fire",
        fadeStart: 42,
        fadeOpacity: 100,
        imgOffsetY: 0,
        imgZoom: 100
      },
      {
        type: "content",
        kicker: "ANALISIS DATA",
        title: "KENAPA [[LIKUIDASI MASSAL]] TERJADI MENDADAK?",
        subtitle: "Tingginya rasio funding rate memicu koreksi tajam sebelum tren berlanjut.",
        bullets: [
          "**Over-leverage** di area resistensi psikologis utama",
          "**Stop-loss beruntun** mempercepat tekanan jual jangka pendek",
          "**Area akumulasi spot** mulai terlihat di zona support bawah"
        ],
        quote: "Manajemen risiko selalu lebih penting dari prediksi harga.",
        bgImage: "",
        preset: "cyber",
        fadeStart: 35,
        fadeOpacity: 95,
        imgOffsetY: 0,
        imgZoom: 100
      },
      {
        type: "closing",
        kicker: "KESIMPULAN",
        title: "STRATEGI AMAN HADAPI [[VOLATILITAS PASAR]]",
        subtitle: "Simpan postingan ini dan bagikan pendapatmu di kolom komentar!",
        bullets: [
          "Gunakan ukuran posisi terukur & hindari FOMO",
          "Pantau konfirmasi struktur harga sebelum entry"
        ],
        quote: "Follow @saniscoro untuk update berita & analisis harian.",
        bgImage: "",
        preset: "bullish",
        fadeStart: 40,
        fadeOpacity: 100,
        imgOffsetY: 0,
        imgZoom: 100
      }
    ]
  };

  let state = loadState();
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");
  let rafPending = false;
  let saveTimer = null;

  /* --- KEAMANAN & PENYIMPANAN --- */
  function isSafeDataUrl(url) {
    return typeof url === "string" && url.length < 3_500_000 && SAFE_MIME.test(url);
  }

  function sanitizeObject(target, source) {
    for (const key of Object.keys(source)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      if (!(key in target)) continue;
      if (Array.isArray(target[key]) && Array.isArray(source[key])) {
        target[key] = source[key].slice(0, 10).map((item, idx) => {
          const base = JSON.parse(JSON.stringify(DEFAULT_STATE.slides[Math.min(idx, DEFAULT_STATE.slides.length - 1)]));
          if (item && typeof item === "object") {
            sanitizeObject(base, item);
            if (!isSafeDataUrl(base.bgImage)) base.bgImage = "";
            if (!Array.isArray(base.bullets)) base.bullets = [];
            base.bullets = base.bullets.slice(0, 6).map(b => String(b || "").slice(0, 180));
          }
          return base;
        });
      } else if (typeof target[key] === typeof source[key]) {
        target[key] = source[key];
      }
    }
  }

  function loadState() {
    const base = JSON.parse(JSON.stringify(DEFAULT_STATE));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        sanitizeObject(base, parsed);
        if (!isSafeDataUrl(base.customLogo)) base.customLogo = "";
        if (!base.slides.length) base.slides = JSON.parse(JSON.stringify(DEFAULT_STATE.slides));
        base.activeSlide = Math.max(0, Math.min(base.activeSlide, base.slides.length - 1));
      }
    } catch (_) {}
    return base;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (_) {
        // Jika kuota penuh karena foto besar, simpan tanpa dataURL gambar
        const slim = JSON.parse(JSON.stringify(state));
        slim.customLogo = "";
        slim.slides.forEach(s => { s.bgImage = ""; });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slim)); } catch (__) {}
      }
    }, 350);
  }

  function showToast(msg) {
    const box = document.getElementById("toastBox");
    box.textContent = msg;
    box.classList.add("show");
    clearTimeout(box._t);
    box._t = setTimeout(() => box.classList.remove("show"), 2600);
  }

  /* --- IMAGE LOADER & KOMPRESI --- */
  function getCachedImage(src) {
    if (!src || !isSafeDataUrl(src)) return null;
    if (imgCache.has(src)) return imgCache.get(src);
    if (imgCache.size >= 20) {
      const firstKey = imgCache.keys().next().value;
      imgCache.delete(firstKey);
    }
    const img = new Image();
    img.onload = () => requestRender();
    img.src = src;
    imgCache.set(src, img);
    return img;
  }

  function compressImageFile(file, maxDim = 1600) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) return reject(new Error("File bukan gambar"));
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
            else { w = Math.round(w * (maxDim / h)); h = maxDim; }
          }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const cx = c.getContext("2d");
          cx.imageSmoothingEnabled = true;
          cx.imageSmoothingQuality = "high";
          cx.drawImage(img, 0, 0, w, h);
          const out = c.toDataURL("image/jpeg", 0.9);
          resolve(out);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* --- RENDERING ENGINE (1080 / 1440PX) --- */
  function requestRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const w = 1080;
      const h = state.ratio === "4:5" ? 1350 : 1080;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      renderSlideToContext(ctx, state.slides[state.activeSlide], state.activeSlide, w, h);
    });
  }

  function drawPresetBackdrop(c, preset, w, h, isFresh) {
    const grad = c.createLinearGradient(0, 0, 0, h * 0.72);
    if (preset === "fire") {
      grad.addColorStop(0, "#450a0a");
      grad.addColorStop(0.45, "#dc2626");
      grad.addColorStop(1, "#09090b");
    } else if (preset === "bullish") {
      grad.addColorStop(0, "#052e16");
      grad.addColorStop(0.5, "#15803d");
      grad.addColorStop(1, "#09090b");
    } else if (preset === "cyber") {
      grad.addColorStop(0, "#0c192c");
      grad.addColorStop(0.5, "#1d4ed8");
      grad.addColorStop(1, "#09090b");
    } else {
      grad.addColorStop(0, isFresh ? "#f4f4f5" : "#27272a");
      grad.addColorStop(1, isFresh ? "#e4e4e7" : "#121215");
    }
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    // Aksen cahaya & grid arsitektural
    c.save();
    if (preset === "fire" || preset === "bullish" || preset === "cyber") {
      const glow = c.createRadialGradient(w * 0.5, h * 0.28, 20, w * 0.5, h * 0.28, w * 0.48);
      glow.addColorStop(0, preset === "fire" ? "rgba(251,146,60,0.65)" : preset === "bullish" ? "rgba(74,222,128,0.45)" : "rgba(96,165,250,0.5)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h * 0.75);
    }
    c.strokeStyle = isFresh ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
    c.lineWidth = 1;
    const step = 72;
    for (let x = step; x < w; x += step) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    for (let y = step; y < h; y += step) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }
    c.restore();
  }

  function drawSCLogo(c, cx, cy, scale, color) {
    c.save();
    c.translate(cx, cy);
    c.scale(scale, scale);
    c.fillStyle = color;
    c.strokeStyle = color;

    // Monogram S + C geometris presisi
    c.lineWidth = 14;
    c.lineCap = "butt";
    // Huruf S
    c.beginPath();
    c.moveTo(-14, -48);
    c.lineTo(-56, -48);
    c.arc(-56, -32, 16, -Math.PI / 2, Math.PI, true);
    c.lineTo(-72, -24);
    c.arc(-56, -24, 16, Math.PI, Math.PI / 2, true);
    c.lineTo(-30, -8);
    c.arc(-30, 8, 16, -Math.PI / 2, 0, false);
    c.lineTo(-14, 16);
    c.arc(-30, 16, 16, 0, Math.PI / 2, false);
    c.lineTo(-74, 32);
    c.stroke();

    // Huruf C terbuka kanan
    c.beginPath();
    c.moveTo(72, -26);
    c.lineTo(72, -48);
    c.lineTo(24, -48);
    c.arc(24, -24, 24, -Math.PI / 2, Math.PI, true);
    c.lineTo(0, 8);
    c.arc(24, 8, 24, Math.PI, Math.PI / 2, true);
    c.lineTo(72, 32);
    c.lineTo(72, 10);
    c.stroke();

    // Teks SANIS CORO & 57 CREATOR 58
    c.textAlign = "center";
    c.font = "900 22px -apple-system, BlinkMacSystemFont, sans-serif";
    c.fillText("SANIS CORO", 0, 62);
    c.font = "700 11px -apple-system, BlinkMacSystemFont, sans-serif";
    c.fillText("57   C R E A T O R   58", 0, 80);
    c.restore();
  }

  function drawBrandHeader(c, cx, cy, isDarkText) {
    const fg = isDarkText ? "#09090b" : "#ffffff";
    if (state.logoMode === "custom" && state.customLogo) {
      const img = getCachedImage(state.customLogo);
      if (img && img.complete && img.naturalWidth) {
        const h = 64;
        const w = Math.min(240, (img.naturalWidth / img.naturalHeight) * h);
        c.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        return;
      }
    }
    if (state.logoMode === "monogram") {
      c.save();
      c.font = "900 44px -apple-system, BlinkMacSystemFont, sans-serif";
      c.fillStyle = fg;
      c.textAlign = "center";
      c.textBaseline = "middle";
      const txt = (state.brandMono || "SC").toUpperCase();
      const tw = c.measureText(txt).width;
      c.fillText(txt, cx - 16, cy);
      c.fillStyle = "#22c55e";
      c.fillRect(cx + tw / 2 - 6, cy - 12, 24, 24);
      c.restore();
      return;
    }
    drawSCLogo(c, cx, cy - 12, 0.85, fg);
  }

  function parseStyledTokens(text) {
    const parts = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let last = 0, match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push({ text: text.slice(last, match.index), hi: false });
      parts.push({ text: match[1], hi: true });
      last = regex.lastIndex;
    }
    if (last < text.length) parts.push({ text: text.slice(last), hi: false });
    return parts;
  }

  function drawHighlightedHeadline(c, rawText, cx, startY, maxWidth, fontSize, lineHeight, baseColor, hiColor, align = "center") {
    const tokens = parseStyledTokens(rawText.toUpperCase());
    const words = [];
    tokens.forEach(tok => {
      tok.text.split(/\s+/).filter(Boolean).forEach(w => words.push({ word: w, hi: tok.hi }));
    });

    c.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const lines = [];
    let current = [];
    let currentWidth = 0;
    const spaceW = c.measureText(" ").width;

    words.forEach(item => {
      const wWidth = c.measureText(item.word).width;
      if (current.length && currentWidth + spaceW + wWidth > maxWidth) {
        lines.push(current);
        current = [item];
        currentWidth = wWidth;
      } else {
        current.push(item);
        currentWidth += (current.length > 1 ? spaceW : 0) + wWidth;
      }
    });
    if (current.length) lines.push(current);

    lines.forEach((line, idx) => {
      const totalW = line.reduce((acc, it, i) => acc + c.measureText(it.word).width + (i > 0 ? spaceW : 0), 0);
      let drawX = align === "left" ? cx : cx - totalW / 2;
      const drawY = startY + idx * lineHeight;
      c.textAlign = "left";
      c.textBaseline = "top";
      line.forEach((it, i) => {
        if (i > 0) drawX += spaceW;
        c.fillStyle = it.hi ? hiColor : baseColor;
        c.fillText(it.word, drawX, drawY);
        drawX += c.measureText(it.word).width;
      });
    });

    return lines.length * lineHeight;
  }

  function wrapSimpleText(c, text, x, y, maxW, lineH, color, font) {
    c.save();
    c.font = font;
    c.fillStyle = color;
    c.textAlign = "left";
    c.textBaseline = "top";
    const words = String(text || "").split(/\s+/);
    let line = "", curY = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (c.measureText(test).width > maxW && line) {
        c.fillText(line, x, curY);
        line = w;
        curY += lineH;
      } else {
        line = test;
      }
    }
    if (line) { c.fillText(line, x, curY); curY += lineH; }
    c.restore();
    return curY - y;
  }

  function renderSlideToContext(c, slide, index, w, h) {
    const isFresh = state.themeMode === "fresh";
    const bgBase = isFresh ? "#ffffff" : "#000000";
    const fgBase = isFresh ? "#09090b" : "#ffffff";

    c.save();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.fillStyle = bgBase;
    c.fillRect(0, 0, w, h);

    // 1. Gambar Background / Preset
    const bgImg = getCachedImage(slide.bgImage);
    if (bgImg && bgImg.complete && bgImg.naturalWidth) {
      const zoom = (slide.imgZoom || 100) / 100;
      const scale = Math.max(w / bgImg.naturalWidth, (h * 0.72) / bgImg.naturalHeight) * zoom;
      const dw = bgImg.naturalWidth * scale;
      const dh = bgImg.naturalHeight * scale;
      const dx = (w - dw) / 2;
      const dy = ((slide.imgOffsetY || 0) / 100) * h;
      c.drawImage(bgImg, dx, dy, dw, dh);
    } else {
      drawPresetBackdrop(c, slide.preset || "fire", w, h, isFresh);
    }

    // 2. Gradasi Bottom Fade (mulus menyatu ke dasar)
    const fadeStartRatio = Math.max(0.1, Math.min(0.85, (slide.fadeStart || 42) / 100));
    const fadeAlpha = Math.max(0, Math.min(1, (slide.fadeOpacity ?? 100) / 100));
    const fadeGrad = c.createLinearGradient(0, h * fadeStartRatio, 0, h * 0.76);
    if (isFresh) {
      fadeGrad.addColorStop(0, "rgba(255,255,255,0)");
      fadeGrad.addColorStop(0.65, `rgba(255,255,255,${0.88 * fadeAlpha})`);
      fadeGrad.addColorStop(1, `rgba(255,255,255,${fadeAlpha})`);
    } else {
      fadeGrad.addColorStop(0, "rgba(0,0,0,0)");
      fadeGrad.addColorStop(0.65, `rgba(0,0,0,${0.9 * fadeAlpha})`);
      fadeGrad.addColorStop(1, `rgba(0,0,0,${fadeAlpha})`);
    }
    c.fillStyle = fadeGrad;
    c.fillRect(0, h * fadeStartRatio, w, h - h * fadeStartRatio);

    // Indikator Slide di Pojok Kanan Atas
    c.fillStyle = isFresh ? "rgba(255,255,255,0.88)" : "rgba(18,18,21,0.75)";
    roundRect(c, w - 136, 44, 88, 42, 21);
    c.fill();
    c.fillStyle = fgBase;
    c.font = "800 20px -apple-system, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(`${index + 1}/${state.slides.length}`, w - 92, 65);

    // 3. Tata Letak Berdasarkan Jenis Slide & Template
    if (slide.type === "cover" && state.template === "breaking") {
      // Logo di tengah atas judul
      drawBrandHeader(c, w / 2, h * 0.56, isFresh);
      const titleY = h * 0.625;
      const fontSize = state.ratio === "4:5" ? 66 : 56;
      drawHighlightedHeadline(c, slide.title, w / 2, titleY, w - 110, fontSize, fontSize * 1.12, fgBase, state.accentColor, "center");
    } else if (state.template === "editorial" && slide.type === "cover") {
      // Editorial Studio Split + Bento
      c.fillStyle = isFresh ? "rgba(255,255,255,0.92)" : "rgba(18,18,21,0.92)";
      c.fillRect(0, h * 0.44, w, h * 0.56);
      drawBrandHeader(c, 150, 74, isFresh);
      c.fillStyle = state.accentColor;
      c.font = "800 20px -apple-system, sans-serif";
      c.textAlign = "left";
      c.fillText((slide.kicker || "EDITORIAL").toUpperCase(), 64, h * 0.47);
      const usedH = drawHighlightedHeadline(c, slide.title, 64, h * 0.505, w - 128, 56, 63, fgBase, state.accentColor, "left");
      wrapSimpleText(c, slide.subtitle, 64, h * 0.505 + usedH + 16, w - 128, 36, isFresh ? "#3f3f46" : "#a1a1aa", "500 25px -apple-system, sans-serif");
    } else {
      // Slide Isi / Penutup / Fintech Card
      drawBrandHeader(c, 150, 72, isFresh);
      const cardY = h * 0.24;
      const cardH = h * 0.63;
      c.fillStyle = isFresh ? "rgba(255,255,255,0.95)" : "rgba(18,18,21,0.92)";
      c.strokeStyle = isFresh ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
      c.lineWidth = 2;
      roundRect(c, 56, cardY, w - 112, cardH, 28);
      c.fill();
      c.stroke();

      c.fillStyle = state.accentColor;
      c.font = "800 21px -apple-system, sans-serif";
      c.textAlign = "left";
      c.fillText((slide.kicker || "INSIGHT").toUpperCase(), 96, cardY + 54);

      const usedH = drawHighlightedHeadline(c, slide.title, 96, cardY + 90, w - 192, 46, 54, fgBase, state.accentColor, "left");
      let cursorY = cardY + 90 + usedH + 18;

      if (slide.subtitle) {
        cursorY += wrapSimpleText(c, slide.subtitle, 96, cursorY, w - 192, 34, isFresh ? "#3f3f46" : "#d4d4d8", "500 24px -apple-system, sans-serif") + 18;
      }

      (slide.bullets || []).forEach(b => {
        if (!b.trim()) return;
        c.fillStyle = state.accentColor;
        c.beginPath();
        c.arc(106, cursorY + 15, 7, 0, Math.PI * 2);
        c.fill();
        const clean = b.replace(/\*\*/g, "");
        cursorY += wrapSimpleText(c, clean, 128, cursorY, w - 224, 34, fgBase, "700 24px -apple-system, sans-serif") + 14;
      });

      if (slide.quote) {
        c.fillStyle = isFresh ? "#f4f4f5" : "#202026";
        roundRect(c, 96, cardY + cardH - 104, w - 192, 66, 14);
        c.fill();
        c.fillStyle = isFresh ? "#52525b" : "#a1a1aa";
        c.font = "600 20px -apple-system, sans-serif";
        c.textAlign = "left";
        c.textBaseline = "middle";
        c.fillText(slide.quote.slice(0, 64), 118, cardY + cardH - 71);
      }
    }

    // 4. Kapsul Sosial Media Pojok Kanan Bawah
    const handleTxt = (state.socialHandle || "Tiktok & IG | @saniscoro").trim();
    if (handleTxt) {
      c.font = "600 20px -apple-system, sans-serif";
      const pillW = Math.min(w - 112, c.measureText(handleTxt).width + 48);
      const pillX = w - 56 - pillW;
      const pillY = h - 88;
      c.fillStyle = isFresh ? "#f4f4f5" : "rgba(24,24,28,0.9)";
      c.strokeStyle = isFresh ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.2)";
      c.lineWidth = 1.5;
      roundRect(c, pillX, pillY, pillW, 46, 23);
      c.fill();
      c.stroke();

      c.fillStyle = isFresh ? "#3f3f46" : "#a1a1aa";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(handleTxt, pillX + pillW / 2, pillY + 23);
    }

    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* --- GENERATOR CAPTION OTOMATIS --- */
  function generateAutoCaption() {
    const s0 = state.slides[0];
    const cleanTitle = (s0.title || "").replace(/\[\[|\]\]/g, "");
    const e = state.capEmoji;
    const lines = [];

    if (state.captionTone === "breaking") {
      lines.push(`${e ? "🚨 " : ""}${cleanTitle}`);
      if (s0.subtitle) lines.push("", s0.subtitle);
      state.slides.slice(1).forEach((sl, idx) => {
        const t = (sl.title || "").replace(/\[\[|\]\]/g, "");
        lines.push("", `${e ? "📌 " : ""}${idx + 2}. ${t}`);
        (sl.bullets || []).slice(0, 3).forEach(b => {
          if (b.trim()) lines.push(`• ${b.replace(/\*\*/g, "")}`);
        });
      });
    } else if (state.captionTone === "analysis") {
      lines.push(`${e ? "📊 " : ""}RINGKASAN ANALISIS: ${cleanTitle}`, "");
      state.slides.forEach((sl, idx) => {
        const t = (sl.title || "").replace(/\[\[|\]\]/g, "");
        lines.push(`Slide ${idx + 1} — ${t}`);
        if (sl.subtitle) lines.push(sl.subtitle);
        lines.push("");
      });
    } else {
      lines.push(`${e ? "⚡ " : ""}${cleanTitle}`, "", s0.subtitle || "Geser sampai akhir untuk detail lengkapnya →");
    }

    if (state.capCta) {
      lines.push("", `${e ? "💬 " : ""}Bagaimana menurutmu? Tulis pendapatmu di komentar & simpan postingan ini agar tidak ketinggalan update!`);
    }

    if (state.capTags) {
      const joined = state.slides.map(s => `${s.title} ${s.kicker}`).join(" ").toLowerCase();
      const tags = ["#saniscoro", "#microblog", "#beritaterkini"];
      if (/bitcoin|btc|kripto|crypto|long|short/.test(joined)) tags.push("#cryptoindonesia", "#bitcoin", "#tradingcrypto");
      if (/saham|ihsg|ekonomi|pasar|dolar/.test(joined)) tags.push("#investasi", "#sahamindonesia", "#finansial");
      if (/ai|teknologi|digital|desain/.test(joined)) tags.push("#teknologi", "#edukasi");
      lines.push("", tags.join(" "));
    }

    document.getElementById("captionOutput").value = lines.join("\n").trim();
  }

  /* --- EKSPOR PNG 1440PX & SHARE INSTAGRAM --- */
  function renderSlideBlob(slideIndex) {
    return new Promise(resolve => {
      const targetW = state.exportWidth || 1440;
      const targetH = state.ratio === "4:5" ? Math.round(targetW * 1.25) : targetW;
      const off = document.createElement("canvas");
      off.width = targetW;
      off.height = targetH;
      const octx = off.getContext("2d");
      octx.save();
      octx.scale(targetW / 1080, targetW / 1080);
      renderSlideToContext(octx, state.slides[slideIndex], slideIndex, 1080, state.ratio === "4:5" ? 1350 : 1080);
      octx.restore();
      off.toBlob(blob => resolve(blob), "image/png");
    });
  }

  async function downloadSlide(idx) {
    const blob = await renderSlideBlob(idx);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanis-studio-slide-0${idx + 1}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function shareToInstagram(allSlides = false) {
    const caption = document.getElementById("captionOutput").value;
    try { await navigator.clipboard.writeText(caption); } catch (_) {}

    const indices = allSlides ? state.slides.map((_, i) => i) : [state.activeSlide];
    const files = [];
    for (const i of indices) {
      const blob = await renderSlideBlob(i);
      files.push(new File([blob], `sanis-studio-slide-0${i + 1}.png`, { type: "image/png" }));
    }

    if (navigator.canShare && navigator.canShare({ files })) {
      try {
        await navigator.share({
          files,
          title: "Sanis Studio Post",
          text: caption
        });
        showToast("Caption disalin & menu berbagi dibuka!");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    for (const i of indices) await downloadSlide(i);
    showToast("PNG diunduh & Caption disalin! Buka Instagram untuk upload.");
  }

  /* --- SINKRONISASI UI & EVENT --- */
  function syncFormFromState() {
    const sl = state.slides[state.activeSlide];
    document.getElementById("slideCounter").textContent = `${state.activeSlide + 1} / ${state.slides.length}`;
    document.getElementById("toggleRatioBtn").textContent = state.ratio === "4:5" ? "4:5 PORTRAIT" : "1:1 SQUARE";
    document.getElementById("toggleQualityBtn").textContent = `${state.exportWidth}PX HD`;

    document.querySelectorAll(".tpl-card").forEach(b => b.classList.toggle("active", b.dataset.tpl === state.template));
    document.getElementById("themeMode").value = state.themeMode;
    document.getElementById("accentColor").value = state.accentColor;
    document.getElementById("logoMode").value = state.logoMode;
    document.getElementById("brandMono").value = state.brandMono;
    document.getElementById("socialHandle").value = state.socialHandle;

    document.getElementById("slideType").value = sl.type;
    document.getElementById("slideKicker").value = sl.kicker;
    document.getElementById("slideTitle").value = sl.title;
    document.getElementById("slideSubtitle").value = sl.subtitle;
    document.getElementById("slideQuote").value = sl.quote;

    document.getElementById("fadeStart").value = sl.fadeStart;
    document.getElementById("valFadeStart").textContent = `${sl.fadeStart}%`;
    document.getElementById("fadeOpacity").value = sl.fadeOpacity;
    document.getElementById("valFadeOpacity").textContent = `${sl.fadeOpacity}%`;
    document.getElementById("imgOffsetY").value = sl.imgOffsetY;
    document.getElementById("valImgY").textContent = `${sl.imgOffsetY}%`;
    document.getElementById("imgZoom").value = sl.imgZoom;
    document.getElementById("valImgZoom").textContent = `${sl.imgZoom}%`;

    const thumb = document.getElementById("bgThumbImg");
    const ph = document.getElementById("bgPlaceholderText");
    if (sl.bgImage) {
      thumb.src = sl.bgImage;
      thumb.style.display = "block";
      ph.style.display = "none";
    } else {
      thumb.style.display = "none";
      ph.style.display = "block";
    }

    renderBulletsList();
    renderSlideCards();
    requestRender();
  }

  function renderBulletsList() {
    const sl = state.slides[state.activeSlide];
    const box = document.getElementById("bulletsContainer");
    box.innerHTML = "";
    (sl.bullets || []).forEach((txt, idx) => {
      const row = document.createElement("div");
      row.className = "bullet-item";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "input";
      inp.value = txt;
      inp.oninput = () => {
        sl.bullets[idx] = inp.value;
        requestRender();
        scheduleSave();
      };
      const del = document.createElement("button");
      del.className = "bullet-del";
      del.textContent = "×";
      del.onclick = () => {
        sl.bullets.splice(idx, 1);
        syncFormFromState();
        scheduleSave();
      };
      row.append(inp, del);
      box.appendChild(row);
    });
  }

  function renderSlideCards() {
    const box = document.getElementById("slideListContainer");
    box.innerHTML = "";
    state.slides.forEach((sl, idx) => {
      const item = document.createElement("div");
      item.className = `slide-item ${idx === state.activeSlide ? "active" : ""}`;
      const info = document.createElement("div");
      info.className = "slide-item-info";
      info.innerHTML = `<div class="slide-item-tag">SLIDE ${idx + 1} • ${sl.type.toUpperCase()}</div>
                        <div class="slide-item-title">${(sl.title || "Tanpa Judul").replace(/\[\[|\]\]/g, "")}</div>`;
      info.onclick = () => { state.activeSlide = idx; syncFormFromState(); };

      const btns = document.createElement("div");
      btns.className = "slide-item-btns";
      const up = document.createElement("button");
      up.className = "mini-icon-btn"; up.textContent = "↑";
      up.onclick = () => {
        if (idx === 0) return;
        [state.slides[idx - 1], state.slides[idx]] = [state.slides[idx], state.slides[idx - 1]];
        state.activeSlide = idx - 1;
        syncFormFromState(); scheduleSave();
      };
      const del = document.createElement("button");
      del.className = "mini-icon-btn"; del.textContent = "🗑";
      del.onclick = () => {
        if (state.slides.length <= 1) return showToast("Minimal harus ada 1 slide");
        state.slides.splice(idx, 1);
        state.activeSlide = Math.min(state.activeSlide, state.slides.length - 1);
        syncFormFromState(); scheduleSave();
      };
      btns.append(up, del);
      item.append(info, btns);
      box.appendChild(item);
    });
  }

  function bindEvents() {
    // Desktop Tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`pane-${btn.dataset.tab}`).classList.add("active");
        if (btn.dataset.tab === "caption") generateAutoCaption();
      };
    });

    // Mobile Bottom Nav
    document.querySelectorAll(".mnav-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".mnav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const v = btn.dataset.mview;
        const prevSec = document.getElementById("mobilePreviewSection");
        const editSec = document.getElementById("mobileEditorSection");
        if (v === "preview") {
          prevSec.classList.add("active-mobile");
          editSec.classList.remove("active-mobile");
        } else {
          prevSec.classList.remove("active-mobile");
          editSec.classList.add("active-mobile");
          document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
          document.getElementById(`pane-${v}`).classList.add("active");
          if (v === "caption") generateAutoCaption();
        }
      };
    });

    // Swipe di kanvas ponsel
    let touchStartX = 0;
    const touchArea = document.getElementById("canvasTouchArea");
    touchArea.addEventListener("touchstart", e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    touchArea.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(dx) > 48) {
        if (dx < 0 && state.activeSlide < state.slides.length - 1) state.activeSlide++;
        else if (dx > 0 && state.activeSlide > 0) state.activeSlide--;
        syncFormFromState();
      }
    }, { passive: true });

    // Navigasi & HUD
    document.getElementById("prevSlideBtn").onclick = () => {
      if (state.activeSlide > 0) { state.activeSlide--; syncFormFromState(); }
    };
    document.getElementById("nextSlideBtn").onclick = () => {
      if (state.activeSlide < state.slides.length - 1) { state.activeSlide++; syncFormFromState(); }
    };
    document.getElementById("toggleRatioBtn").onclick = () => {
      state.ratio = state.ratio === "4:5" ? "1:1" : "4:5";
      syncFormFromState(); scheduleSave();
    };
    document.getElementById("toggleQualityBtn").onclick = () => {
      state.exportWidth = state.exportWidth === 1440 ? 1080 : 1440;
      syncFormFromState(); scheduleSave();
    };

    // Template & Warna
    document.querySelectorAll(".tpl-card").forEach(card => {
      card.onclick = () => { state.template = card.dataset.tpl; syncFormFromState(); scheduleSave(); };
    });
    document.getElementById("themeMode").onchange = e => { state.themeMode = e.target.value; requestRender(); scheduleSave(); };
    document.getElementById("accentColor").oninput = e => { state.accentColor = e.target.value; requestRender(); scheduleSave(); };
    document.querySelectorAll(".chip-btn").forEach(ch => {
      ch.onclick = () => { state.accentColor = ch.dataset.color; document.getElementById("accentColor").value = state.accentColor; requestRender(); scheduleSave(); };
    });
    document.getElementById("logoMode").onchange = e => { state.logoMode = e.target.value; requestRender(); scheduleSave(); };
    document.getElementById("brandMono").oninput = e => { state.brandMono = e.target.value; requestRender(); scheduleSave(); };
    document.getElementById("socialHandle").oninput = e => { state.socialHandle = e.target.value; requestRender(); scheduleSave(); };

    // Upload Logo
    document.getElementById("logoUploadInput").onchange = async e => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        state.customLogo = await compressImageFile(file, 600);
        state.logoMode = "custom";
        syncFormFromState(); scheduleSave();
        showToast("Logo berhasil diunggah!");
      } catch (_) { showToast("Gagal memproses logo"); }
    };
    document.getElementById("btnClearLogo").onclick = () => {
      state.customLogo = ""; state.logoMode = "sc_vector"; syncFormFromState(); scheduleSave();
    };

    // Upload Background (Klik, Drag & Drop, Paste)
    const handleBgFile = async file => {
      try {
        const dataUrl = await compressImageFile(file, 1600);
        state.slides[state.activeSlide].bgImage = dataUrl;
        syncFormFromState(); scheduleSave();
        showToast("Background diperbarui!");
      } catch (_) { showToast("Format gambar tidak didukung"); }
    };
    document.getElementById("bgFileInput").onchange = e => {
      const f = e.target.files[0]; e.target.value = ""; if (f) handleBgFile(f);
    };
    const dropZone = document.getElementById("bgDropZone");
    dropZone.ondragover = e => e.preventDefault();
    dropZone.ondrop = e => {
      e.preventDefault();
      if (e.dataTransfer.files[0]) handleBgFile(e.dataTransfer.files[0]);
    };
    window.addEventListener("paste", e => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith("image/"));
      if (item) handleBgFile(item.getAsFile());
    });
    document.getElementById("btnRemoveBg").onclick = () => {
      state.slides[state.activeSlide].bgImage = ""; syncFormFromState(); scheduleSave();
    };
    document.getElementById("btnApplyBgAll").onclick = () => {
      const cur = state.slides[state.activeSlide];
      state.slides.forEach(s => {
        s.bgImage = cur.bgImage; s.preset = cur.preset;
        s.fadeStart = cur.fadeStart; s.fadeOpacity = cur.fadeOpacity;
        s.imgOffsetY = cur.imgOffsetY; s.imgZoom = cur.imgZoom;
      });
      scheduleSave(); showToast("Background & gradasi diterapkan ke semua slide!");
    };
    document.querySelectorAll(".preset-btn").forEach(btn => {
      btn.onclick = () => {
        const sl = state.slides[state.activeSlide];
        sl.bgImage = ""; sl.preset = btn.dataset.preset;
        syncFormFromState(); scheduleSave();
      };
    });

    // Sliders & Text Inputs
    const bindSlider = (id, prop, valId) => {
      document.getElementById(id).oninput = e => {
        const v = Number(e.target.value);
        state.slides[state.activeSlide][prop] = v;
        document.getElementById(valId).textContent = `${v}%`;
        requestRender(); scheduleSave();
      };
    };
    bindSlider("fadeStart", "fadeStart", "valFadeStart");
    bindSlider("fadeOpacity", "fadeOpacity", "valFadeOpacity");
    bindSlider("imgOffsetY", "imgOffsetY", "valImgY");
    bindSlider("imgZoom", "imgZoom", "valImgZoom");

    document.getElementById("slideType").onchange = e => { state.slides[state.activeSlide].type = e.target.value; requestRender(); scheduleSave(); };
    document.getElementById("slideKicker").oninput = e => { state.slides[state.activeSlide].kicker = e.target.value; requestRender(); scheduleSave(); };
    document.getElementById("slideTitle").oninput = e => { state.slides[state.activeSlide].title = e.target.value; renderSlideCards(); requestRender(); scheduleSave(); };
    document.getElementById("slideSubtitle").oninput = e => { state.slides[state.activeSlide].subtitle = e.target.value; requestRender(); scheduleSave(); };
    document.getElementById("slideQuote").oninput = e => { state.slides[state.activeSlide].quote = e.target.value; requestRender(); scheduleSave(); };

    document.getElementById("btnHighlightSelection").onclick = () => {
      const ta = document.getElementById("slideTitle");
      const start = ta.selectionStart, end = ta.selectionEnd;
      if (start === end) return showToast("Blok dulu kata di judul yang ingin disorot");
      const selected = ta.value.slice(start, end);
      ta.value = ta.value.slice(0, start) + `[[${selected}]]` + ta.value.slice(end);
      state.slides[state.activeSlide].title = ta.value;
      requestRender(); scheduleSave();
    };

    document.getElementById("btnAddBullet").onclick = () => {
      const sl = state.slides[state.activeSlide];
      if (sl.bullets.length >= 6) return showToast("Maksimal 6 poin per slide");
      sl.bullets.push("Poin pembahasan baru");
      syncFormFromState(); scheduleSave();
    };

    document.getElementById("btnAddSlide").onclick = () => {
      if (state.slides.length >= 10) return showToast("Maksimal 10 slide carousel");
      state.slides.push({
        type: "content",
        kicker: "UPDATE TERBARU",
        title: "JUDUL SLIDE BARU DENGAN [[KATA SOROTAN]]",
        subtitle: "Tambahkan penjelasan singkat yang padat dan mudah dibaca.",
        bullets: ["Poin utama pertama", "Poin utama kedua"],
        quote: "Sumber: Sanis Coro Studio",
        bgImage: "",
        preset: "cyber",
        fadeStart: 40,
        fadeOpacity: 100,
        imgOffsetY: 0,
        imgZoom: 100
      });
      state.activeSlide = state.slides.length - 1;
      syncFormFromState(); scheduleSave();
    };

    // Caption & Export
    document.getElementById("captionTone").onchange = e => { state.captionTone = e.target.value; generateAutoCaption(); scheduleSave(); };
    const bindPill = (id, prop) => {
      const el = document.getElementById(id);
      el.classList.toggle("active", state[prop]);
      el.onclick = () => { state[prop] = !state[prop]; el.classList.toggle("active", state[prop]); generateAutoCaption(); scheduleSave(); };
    };
    bindPill("togEmoji", "capEmoji");
    bindPill("togCta", "capCta");
    bindPill("togTags", "capTags");
    document.getElementById("btnRegenCaption").onclick = generateAutoCaption;
    document.getElementById("btnCopyCaption").onclick = async () => {
      try {
        await navigator.clipboard.writeText(document.getElementById("captionOutput").value);
        showToast("Caption disalin ke clipboard!");
      } catch (_) { showToast("Pilih teks caption lalu salin manual"); }
    };

    document.getElementById("btnDownloadCurrent").onclick = () => downloadSlide(state.activeSlide);
    document.getElementById("btnExportAll").onclick = async () => {
      for (let i = 0; i < state.slides.length; i++) await downloadSlide(i);
      showToast(`${state.slides.length} slide PNG (${state.exportWidth}px) diunduh!`);
    };
    document.getElementById("btnShareIGCurrent").onclick = () => shareToInstagram(false);
    document.getElementById("btnShareAllIG").onclick = () => shareToInstagram(true);

    document.getElementById("btnResetProject").onclick = () => {
      localStorage.removeItem(STORAGE_KEY);
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      syncFormFromState(); generateAutoCaption();
      showToast("Proyek dikembalikan ke pengaturan awal");
    };
  }

  bindEvents();
  syncFormFromState();
  generateAutoCaption();
})();
