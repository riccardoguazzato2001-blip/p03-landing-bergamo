// Durata: LEGATO-A:P03
(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var navToggle = document.getElementById("navToggle");
  var circularNav = document.getElementById("circularNav");
  var circularNavClose = document.getElementById("circularNavClose");

  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Menu mobile: navigazione circolare (porting vanilla di
  // circular-navigation-bar.tsx). #navToggle apre/chiude, invariato
  // rispetto al vecchio pannello a scomparsa che sostituisce.
  function openCircularNav() {
    circularNav.classList.add("open");
    navToggle.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeCircularNav() {
    circularNav.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  navToggle.addEventListener("click", function () {
    if (circularNav.classList.contains("open")) {
      closeCircularNav();
    } else {
      openCircularNav();
    }
  });
  circularNavClose.addEventListener("click", closeCircularNav);
  circularNav.addEventListener("click", function (e) {
    if (e.target === circularNav) closeCircularNav();
  });
  circularNav.querySelectorAll(".circular-nav-item").forEach(function (link) {
    link.addEventListener("click", closeCircularNav);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && circularNav.classList.contains("open")) closeCircularNav();
  });

  // Dock nav (desktop): porting di dock.tsx (21st.dev/framer-motion) in JS
  // vanilla. Niente resize di larghezza come l'originale — qui il magnify è
  // uno scale+lift per item, target calcolato dalla distanza dal mouse e
  // smorzato con un lerp per-frame (stesso approccio spring-lite dell'hero
  // canvas). Rispetta prefers-reduced-motion: nessun listener del puntatore.
  function initDockNav() {
    var dock = document.getElementById("dockNav");
    if (!dock) return;
    var items = Array.prototype.slice.call(dock.querySelectorAll(".dock-item"));
    if (!items.length) return;

    var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (reduceMotion) return;

    var DISTANCE = 150;
    var BASE_SCALE = 1;
    var MAX_SCALE = 1.5;
    var LIFT = 4;
    var SMOOTH = 18;

    var state = items.map(function () {
      return { target: BASE_SCALE, current: BASE_SCALE };
    });
    var mouseX = null;
    var rafId = null;
    var lastT = null;

    function updateTargets() {
      items.forEach(function (item, i) {
        if (mouseX === null) {
          state[i].target = BASE_SCALE;
          return;
        }
        var rect = item.getBoundingClientRect();
        var center = rect.left + rect.width / 2;
        var dist = Math.abs(mouseX - center);
        var falloff = Math.max(0, 1 - dist / DISTANCE);
        state[i].target = BASE_SCALE + (MAX_SCALE - BASE_SCALE) * falloff;
      });
    }

    function tick(t) {
      if (lastT === null) lastT = t;
      var dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      var lerp = 1 - Math.exp(-SMOOTH * dt);
      var stillMoving = false;
      items.forEach(function (item, i) {
        var s = state[i];
        s.current += (s.target - s.current) * lerp;
        if (Math.abs(s.target - s.current) > 0.002) stillMoving = true;
        else s.current = s.target;
        var lift = (s.current - BASE_SCALE) / (MAX_SCALE - BASE_SCALE) * LIFT;
        item.style.transform = "scale(" + s.current.toFixed(3) + ") translateY(-" + lift.toFixed(2) + "px)";
      });
      rafId = stillMoving ? requestAnimationFrame(tick) : null;
      if (!stillMoving) lastT = null;
    }

    function ensureLoop() {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    }

    dock.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      updateTargets();
      ensureLoop();
    });
    dock.addEventListener("mouseleave", function () {
      mouseX = null;
      updateTargets();
      ensureLoop();
    });
    dock.addEventListener("focusin", function (e) {
      var item = e.target.closest(".dock-item");
      if (!item) return;
      var rect = item.getBoundingClientRect();
      mouseX = rect.left + rect.width / 2;
      updateTargets();
      ensureLoop();
    });
    dock.addEventListener("focusout", function () {
      mouseX = null;
      updateTargets();
      ensureLoop();
    });
  }
  initDockNav();

  // Spotlight sull'hover delle card #offerta (--mx/--my in % lette dal CSS)
  function initOffertaSpotlight() {
    var cards = document.querySelectorAll(".offerta-card");
    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var mx = ((e.clientX - rect.left) / rect.width) * 100;
        var my = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--mx", mx + "%");
        card.style.setProperty("--my", my + "%");
      });
    });
  }
  initOffertaSpotlight();

  // Coda hero a rotazione ("senza pensieri" / "pronto in pochi giorni" / ...):
  // porting vanilla di text-rotate.tsx (catalogo-animazioni-21st/text-rotate/,
  // motion/react -> CSS @keyframes, questo script costruisce/anima gli span).
  // AnimatePresence "wait" del sorgente = uscita completa prima dell'entrata
  // (sequenziale, mai sovrapposta): niente posizionamento assoluto.
  function initHeroTextRotate() {
    var wrap = document.getElementById("heroRotate");
    var charsEl = document.getElementById("heroRotateChars");
    var srEl = document.getElementById("heroRotateSR");
    if (!wrap || !charsEl || !srEl) return;

    var PHRASES = ["senza pensieri", "pronto in pochi giorni", "che trova clienti", "senza tecnicismi"];
    var ROTATION_INTERVAL = 2800; // ms
    var STAGGER = 0.03; // secondi per carattere, staggerFrom "last" come il sorgente
    var DURATION = 0.5; // secondi, deve combaciare con --hero-rotate-duration in CSS

    var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Costruisce gli span per-parola/per-carattere di `text`, con
    // animation-delay a cascata dall'ultimo carattere (staggerFrom "last").
    // `cls` è la classe di stato da applicare (nessuna per il render iniziale
    // statico, "is-enter" per un'entrata animata).
    function buildChars(text, cls) {
      charsEl.innerHTML = "";
      var words = text.split(" ");
      var totalChars = text.replace(/ /g, "").length;
      var charIndex = 0;
      words.forEach(function (word) {
        var wordEl = document.createElement("span");
        wordEl.className = "hero-rotate-word";
        Array.prototype.forEach.call(word, function (ch) {
          var charEl = document.createElement("span");
          charEl.className = "hero-rotate-char" + (cls ? " " + cls : "");
          charEl.textContent = ch;
          var fromEnd = totalChars - 1 - charIndex;
          charEl.style.animationDelay = (fromEnd * STAGGER) + "s";
          wordEl.appendChild(charEl);
          charIndex++;
        });
        charsEl.appendChild(wordEl);
      });
      return totalChars;
    }

    var index = 0;
    buildChars(PHRASES[0], null);
    srEl.textContent = PHRASES[0];

    if (reduceMotion) return; // frase iniziale ferma, niente rotazione

    function tick() {
      index = (index + 1) % PHRASES.length;
      var nextText = PHRASES[index];

      var exitChars = Array.prototype.slice.call(charsEl.querySelectorAll(".hero-rotate-char"));
      var exitCount = exitChars.length;
      exitChars.forEach(function (el, i) {
        el.style.animationDelay = ((exitCount - 1 - i) * STAGGER) + "s";
        el.className = "hero-rotate-char is-exit";
      });
      var exitTotal = (exitCount ? (exitCount - 1) * STAGGER : 0) + DURATION;

      setTimeout(function () {
        srEl.textContent = nextText;
        buildChars(nextText, "is-enter");
      }, exitTotal * 1000);
    }
    setInterval(tick, ROTATION_INTERVAL);
  }
  initHeroTextRotate();

  // Corridoio screenshot in #lavori: porting vanilla di image-stream-hero.tsx
  // (idee/elenco/P03-.../catalogo-animazioni-21st/image-stream-hero/, catalogo
  // componenti di Kevin). Stessa geometria/formula del sorgente React (nessuna
  // dipendenza framer-motion lì, quindi il porting è 1:1): due carreggiate di
  // card che avanzano in prospettiva, @keyframes calcolati e iniettati a
  // runtime invece che con hook React. Prime 6 immagini: stesse screenshot
  // già usate nella striscia sottostante (img/portfolio/). Le altre 10 sono
  // mockup di siti d'esempio generati via fal-ai (nano-banana-pro, 2026-09-15,
  // testo italiano esplicito nel prompt) — non sono progetti reali, servono
  // solo a dare varietà visiva al corridoio (alt="" su ogni card, decorativo).
  function initLavoriStream() {
    var mount = document.querySelector(".lavori-stream");
    if (!mount) return;

    var images = [
      "img/portfolio/campo-alpini-home.jpg",
      "img/portfolio/hair-studio-home.jpg",
      "img/portfolio/pizzeria-home.jpg",
      "img/portfolio/hotel-borghetto-home.jpg",
      "img/portfolio/ink-factory-home.jpg",
      "img/portfolio/ottobassotto-home.jpg",
      "img/portfolio/trattoria-borgo-home.jpg",
      "img/portfolio/trattoria-borgo-menu.jpg",
      "img/portfolio/parrucchieri-servizi.jpg",
      "img/portfolio/estetica-bellavita-galleria.jpg",
      "img/portfolio/pasticceria-dolcenote-home.jpg",
      "img/portfolio/agriturismo-camere.jpg",
      "img/portfolio/palestra-energia-team.jpg",
      "img/portfolio/studio-movimentosano-contatti.jpg",
      "img/portfolio/falegnameria-lavori.jpg",
      "img/portfolio/rifugio-stellaalpina-home.jpg"
    ];

    // Stessi default di CorridorPath nel sorgente .tsx.
    var P = {
      perspective: 30, cardWidth: 18, cardHeight: 25, cardRadius: 0.6,
      birthHeight: 2.6, exitHeight: 46, railBirth: -11, railExit: 44,
      fan: 3.3, turnBirth: 6, turnExit: 28, stops: 24
    };
    var cards = window.matchMedia("(max-width: 640px)").matches ? 6 : 9;
    var speed = 20;
    var axis = 50;

    function keyframesCss(dir, name) {
      var steps = [];
      for (var s = 0; s <= P.stops; s++) {
        var u = s / P.stops;
        // Geometrico sulla dimensione apparente: rapporto costante tra card
        // consecutive, così il nastro resta compatto a entrambi gli estremi.
        var scale = (P.birthHeight / P.cardHeight) * Math.pow(P.exitHeight / P.birthHeight, u);
        var z = P.perspective * (1 - 1 / scale);
        var rail = P.railExit - (P.railExit - P.railBirth) * Math.pow(1 - u, P.fan);
        var turn = P.turnBirth + (P.turnExit - P.turnBirth) * u;
        steps.push(
          (u * 100).toFixed(2) + "%{transform:translate3d(" +
          (dir * rail).toFixed(2) + "cqw,0," + z.toFixed(2) + "cqw) rotateY(" +
          (-dir * turn).toFixed(2) + "deg)}"
        );
      }
      return "@keyframes " + name + "{" + steps.join("") + "}";
    }

    var id = "ls" + Math.random().toString(36).slice(2, 8);
    var railRight = "ish-r-" + id, railLeft = "ish-l-" + id, cardCls = "ish-c-" + id;

    var styleTag = document.createElement("style");
    styleTag.textContent =
      keyframesCss(1, railRight) + keyframesCss(-1, railLeft) +
      "@media(prefers-reduced-motion:reduce){." + cardCls + "{animation-play-state:paused}}";
    mount.appendChild(styleTag);

    mount.style.containerType = "inline-size";

    var perspectiveLayer = document.createElement("div");
    perspectiveLayer.style.cssText =
      "position:absolute;inset:0;pointer-events:none;" +
      "perspective:" + P.perspective + "cqw;perspective-origin:50% " + axis + "%;";
    var stage = document.createElement("div");
    stage.style.cssText = "position:absolute;inset:0;transform-style:preserve-3d;";
    perspectiveLayer.appendChild(stage);

    [railRight, railLeft].forEach(function (railName, railIdx) {
      for (var i = 0; i < cards; i++) {
        // Offset per carreggiata: con più immagini di quante card ci stiano
        // (cards < images.length), le due carreggiate leggendo lo stesso
        // range i=0..cards-1 mostrerebbero sempre lo stesso sottoinsieme
        // fisso, non l'intero array. Lo sfasamento fa in modo che, insieme,
        // le due carreggiate coprano tutto l'array (o il più possibile).
        var img = images[(i + railIdx * cards) % images.length];
        var cardEl = document.createElement("div");
        cardEl.className = cardCls;
        cardEl.style.cssText =
          "position:absolute;overflow:hidden;left:50%;top:" + axis + "%;" +
          "width:" + P.cardWidth + "cqw;height:" + P.cardHeight + "cqw;" +
          "margin-left:" + (-P.cardWidth / 2) + "cqw;margin-top:" + (-P.cardHeight / 2) + "cqw;" +
          "border-radius:" + P.cardRadius + "cqw;" +
          "animation:" + railName + " " + speed + "s linear infinite;" +
          "animation-delay:" + (-(i * speed) / cards) + "s;" +
          "backface-visibility:hidden;";
        var imgEl = document.createElement("img");
        imgEl.src = img;
        imgEl.alt = "";
        imgEl.loading = "lazy";
        imgEl.decoding = "async";
        imgEl.draggable = false;
        imgEl.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
        cardEl.appendChild(imgEl);
        stage.appendChild(cardEl);
      }
    });

    mount.appendChild(perspectiveLayer);
  }
  initLavoriStream();

  function lerpC(a, b, t) { return a + (b - a) * t; }

  // CTA "Rispondi al sondaggio": porting vanilla di PixelFireButton
  // (catalogo-animazioni-21st/ember-footer-cta, .tsx sorgente React/canvas).
  // Canvas doom-fire a celle 3px che riempie il bottone dal basso come un
  // gauge liquido (ease esponenziale, waterline che ondeggia), l'hover piega
  // le fiamme verso il cursore, il press spara un burst. Ricolorato sulla
  // palette ambra del sito (era indaco/#2a2a2a nel sorgente) — l'ancora di
  // blend (BASE_*) è lo stesso stop t=0.4 della palette, stessa tecnica
  // dell'originale. Sempre acceso (CTA primario, nessuno stato "spento").
  function initEmberButton() {
    var btn = document.getElementById("surveyCtaBtn");
    var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!btn || reduceMotion) return;

    var canvas = document.createElement("canvas");
    canvas.className = "btn-ember-canvas";
    canvas.setAttribute("aria-hidden", "true");
    btn.insertBefore(canvas, btn.firstChild);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var CELL = 3, STEPS = 38;
    var BASE_R = 201, BASE_G = 127, BASE_B = 30; // ambra-scura, ancora di blend (= palette a t=0.4)

    function buildPalette(alpha) {
      var p = new Uint8Array(STEPS * 4);
      for (var s = 0; s < STEPS; s++) {
        var t = s / (STEPS - 1);
        var r, g, b;
        if (t < 0.4) {
          var e = t / 0.4;
          r = lerpC(90, BASE_R, e); g = lerpC(35, BASE_G, e); b = lerpC(10, BASE_B, e);
        } else if (t < 0.75) {
          var e2 = (t - 0.4) / 0.35;
          r = lerpC(BASE_R, 232, e2); g = lerpC(BASE_G, 163, e2); b = lerpC(BASE_B, 61, e2);
        } else {
          var e3 = (t - 0.75) / 0.25;
          r = lerpC(232, 246, e3); g = lerpC(163, 207, e3); b = lerpC(61, 142, e3);
        }
        p[s * 4] = r; p[s * 4 + 1] = g; p[s * 4 + 2] = b;
        p[s * 4 + 3] = Math.round(Math.pow(t, 1.2) * alpha);
      }
      return p;
    }
    var palette = buildPalette(200);

    var cols = 8, rows = 8, heat = new Uint8Array(0), waterline = new Float32Array(0), img = null;
    var pointerX = 0, hover = false, pressed = false;

    function size() {
      cols = Math.max(8, Math.ceil((btn.offsetWidth || 160) / CELL));
      rows = Math.max(6, Math.ceil((btn.offsetHeight || 38) / CELL));
      canvas.width = cols; canvas.height = rows;
      heat = new Uint8Array(cols * rows);
      waterline = new Float32Array(cols);
      pointerX = cols / 2;
      img = ctx.createImageData(cols, rows);
    }
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(btn);

    btn.addEventListener("pointermove", function (e) {
      var rect = btn.getBoundingClientRect();
      if (rect.width > 0) pointerX = ((e.clientX - rect.left) / rect.width) * cols;
    });
    btn.addEventListener("mouseenter", function () { hover = true; });
    btn.addEventListener("mouseleave", function () { hover = false; pressed = false; });
    btn.addEventListener("pointerdown", function () { pressed = true; });
    window.addEventListener("pointerup", function () { pressed = false; });

    var level = 0, lastT = 0, acc = 0, burst = 0, wasPressed = false;
    var TICK = 1000 / 30;

    function step(t) {
      requestAnimationFrame(step);
      if (!lastT) lastT = t;
      var dt = Math.min(64, t - lastT);
      lastT = t;

      level += (1 - level) * (1 - Math.exp(-dt / 240));

      acc += dt;
      if (acc >= TICK) {
        acc %= TICK;

        for (var x = 0; x < cols; x++) {
          waterline[x] = Math.max(-4, Math.min(4, waterline[x] + (Math.random() - 0.5) * 1.6));
        }
        for (var x2 = 1; x2 < cols - 1; x2++) {
          waterline[x2] = (waterline[x2 - 1] + waterline[x2] * 2 + waterline[x2 + 1]) / 4;
        }

        for (var y = 0; y < rows - 1; y++) {
          for (var x3 = 0; x3 < cols; x3++) {
            var src = (y + 1) * cols + x3;
            var dst = y * cols + Math.min(cols - 1, Math.max(0, x3 + ((Math.random() * 3) | 0) - 1));
            var v = heat[src] - (1 + ((Math.random() * 2.4) | 0));
            heat[dst] = v > 0 ? v : 0;
          }
        }

        var churn = level * (1 - level) * 4;
        var fill = level * (rows + 6);

        if (pressed && !wasPressed) burst = 1;
        wasPressed = pressed;
        burst = pressed ? Math.max(burst * 0.86, 0.45) : burst * 0.8;

        for (var x4 = 0; x4 < cols; x4++) {
          var h = fill + waterline[x4] * (0.4 + churn);
          var surface = rows - 1 - Math.floor(h);
          if (level > 0.02 && surface >= 0 && surface < rows) {
            heat[surface * cols + x4] = STEPS - 1;
            if (surface + 1 < rows) heat[(surface + 1) * cols + x4] = STEPS - 1;
          }
          if (level > 0.97) {
            if (burst > 0.05) {
              heat[(rows - 1) * cols + x4] = STEPS - 1;
              heat[(rows - 2) * cols + x4] = STEPS - 1;
              if (rows > 2 && Math.random() < burst) heat[(rows - 3) * cols + x4] = STEPS - 1;
              if (Math.random() < burst * 0.3) heat[((Math.random() * rows) | 0) * cols + x4] = STEPS - 1;
            } else if (hover) {
              heat[(rows - 1) * cols + x4] = STEPS - 1;
              if (Math.random() < 0.7) heat[(rows - 2) * cols + x4] = STEPS - 2;
              var d = x4 - pointerX;
              var near = Math.exp(-(d * d) / 18);
              if (near > 0.35 && rows > 2) heat[(rows - 3) * cols + x4] = STEPS - 1;
              if (near > 0.7 && rows > 3) heat[(rows - 4) * cols + x4] = STEPS - 3;
            } else if (Math.random() < 0.55) {
              heat[(rows - 1) * cols + x4] = Math.random() < 0.5 ? STEPS - 11 : STEPS - 17;
            }
          }
        }
      }

      var churn2 = level * (1 - level) * 4;
      var fill2 = level * (rows + 6);
      var d2 = img.data;
      for (var cx = 0; cx < cols; cx++) {
        var h2 = fill2 + waterline[cx] * (0.4 + churn2);
        for (var cy = 0; cy < rows; cy++) {
          var idx = cy * cols + cx;
          var o = idx * 4;
          var pi = heat[idx] * 4;
          var a = palette[pi + 3];
          if (rows - cy <= h2) {
            d2[o] = BASE_R + (((palette[pi] - BASE_R) * a) >> 8);
            d2[o + 1] = BASE_G + (((palette[pi + 1] - BASE_G) * a) >> 8);
            d2[o + 2] = BASE_B + (((palette[pi + 2] - BASE_B) * a) >> 8);
            d2[o + 3] = 255;
          } else {
            d2[o] = palette[pi]; d2[o + 1] = palette[pi + 1]; d2[o + 2] = palette[pi + 2]; d2[o + 3] = a;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    requestAnimationFrame(step);
  }
  initEmberButton();

  // Porting vanilla di FlameBand (catalogo-animazioni-21st/ember-footer-cta,
  // .tsx sorgente). Fascia di fuoco a celle su canvas, cresta a seno che
  // ondeggia, vento sul passaggio del puntatore, compositing plus-lighter.
  // Ricolorata ambra (era indaco/violetto nel sorgente). #cta-finale e
  // <footer> sono stati uniti in un solo elemento (index.html) proprio perché
  // qui monta UN SOLO canvas, sull'intero blocco: niente più due simulazioni
  // indipendenti non sincronizzate alla giunzione tra sezione e footer.
  function initFlameBand(mountEl) {
    var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!mountEl || reduceMotion) return;

    var canvas = document.createElement("canvas");
    canvas.className = "flame-band-canvas";
    canvas.setAttribute("aria-hidden", "true");
    mountEl.insertBefore(canvas, mountEl.firstChild);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var CELL = 8, ALPHA = 70, SPEED = 30, WAVE = 1, WIND = 1, STEPS_F = 38;
    // Probabilità di raffreddare una cella di 1 mentre risale di una riga
    // (indipendente dal drift orizzontale sotto). Più bassa = fiamme più alte
    // prima di spegnersi sotto la soglia visibile — misurato empiricamente
    // con un campionamento dell'alpha del canvas, non a calcolo puro.
    var COOL_CHANCE = 0.45;
    // indaco-950 (fondo) -> ember scuro -> ambra -> ambra-chiara (pallido)
    var STOPS = [[15, 17, 40], [140, 60, 10], [220, 140, 40], [250, 222, 165]];

    function buildBandPalette(alpha) {
      var p = new Uint8Array(STEPS_F * 4);
      for (var s = 0; s < STEPS_F; s++) {
        var t = s / (STEPS_F - 1);
        var r, g, b;
        if (t < 0.4) {
          var e = t / 0.4;
          r = lerpC(STOPS[0][0], STOPS[1][0], e); g = lerpC(STOPS[0][1], STOPS[1][1], e); b = lerpC(STOPS[0][2], STOPS[1][2], e);
        } else if (t < 0.75) {
          var e2 = (t - 0.4) / 0.35;
          r = lerpC(STOPS[1][0], STOPS[2][0], e2); g = lerpC(STOPS[1][1], STOPS[2][1], e2); b = lerpC(STOPS[1][2], STOPS[2][2], e2);
        } else {
          var e3 = (t - 0.75) / 0.25;
          r = lerpC(STOPS[2][0], STOPS[3][0], e3); g = lerpC(STOPS[2][1], STOPS[3][1], e3); b = lerpC(STOPS[2][2], STOPS[3][2], e3);
        }
        p[s * 4] = r; p[s * 4 + 1] = g; p[s * 4 + 2] = b;
        p[s * 4 + 3] = Math.round(Math.pow(t, 1.2) * alpha);
      }
      return p;
    }
    var palette = buildBandPalette(ALPHA);

    var cols = 8, rows = 8, m = new Uint8Array(0), img = null, windArr = new Float32Array(0);

    function size() {
      cols = Math.max(8, Math.ceil(mountEl.clientWidth / CELL));
      rows = Math.max(6, Math.ceil(mountEl.clientHeight / CELL));
      canvas.width = cols; canvas.height = rows;
      m = new Uint8Array(cols * rows);
      img = ctx.createImageData(cols, rows);
      windArr = new Float32Array(cols);
    }
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(mountEl);

    var pointer = { x: 0, y: 0, lastX: 0, vel: 0, active: false };
    window.addEventListener("pointermove", function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = e.pointerType !== "touch";
    }, { passive: true });

    var last = 0, visible = true;
    function step(tms) {
      requestAnimationFrame(step);
      if (!visible || tms - last < 1000 / SPEED) return;
      last = tms;
      var t = tms / 1000;

      var crest = WAVE * (STEPS_F * 0.55);
      for (var x = 0; x < cols; x++) {
        var n = 0.5 + 0.5 * (Math.sin(x * 0.035 + t * 0.45) * 0.6 + Math.sin(x * 0.011 - t * 0.2) * 0.4);
        var ripple = Math.sin(x * 0.21 + t * 1.7) + Math.sin(x * 0.047 - t * 0.9);
        var jitter = (Math.random() * 6) | 0;
        m[(rows - 1) * cols + x] = Math.max(0, Math.round(STEPS_F - 3 - crest * (1 - n) + ripple * 1.5 - jitter));
      }

      pointer.vel = pointer.vel * 0.8 + (pointer.x - pointer.lastX) * 0.2;
      pointer.lastX = pointer.x;
      windArr = new Float32Array(cols);
      if (WIND > 0 && pointer.active && Math.abs(pointer.vel) > 0.5) {
        var rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && pointer.y >= rect.top - 120 && pointer.y <= rect.bottom + 40 &&
            pointer.x >= rect.left - 100 && pointer.x <= rect.right + 100) {
          var px = ((pointer.x - rect.left) / rect.width) * cols;
          var amp = Math.max(-1, Math.min(1, pointer.vel / 28)) * WIND;
          for (var wx = 0; wx < cols; wx++) {
            var dd = (wx - px) / 20;
            windArr[wx] = amp * Math.exp(-dd * dd);
          }
        }
      }

      for (var y = 1; y < rows; y++) {
        var rowStart = y * cols;
        for (var xx = 0; xx < cols; xx++) {
          var idx = rowStart + xx;
          var v = m[idx];
          var r4 = (Math.random() * 3.99) | 0;
          var drift = r4 > 1 ? r4 - 2 : 0;
          var w = windArr[xx];
          if (w !== 0 && Math.random() < Math.abs(w)) drift += w > 0 ? 1 : -1;
          var decay = Math.random() < COOL_CHANCE ? 1 : 0;
          var target = idx - cols + drift;
          m[Math.max(0, Math.min(cols * rows - 1, target))] = v > decay ? v - decay : 0;
        }
      }

      var d = img.data;
      for (var i = 0, o = 0; i < cols * rows; i++, o += 4) {
        var pi = m[i] * 4;
        d[o] = palette[pi]; d[o + 1] = palette[pi + 1]; d[o + 2] = palette[pi + 2]; d[o + 3] = palette[pi + 3];
      }
      ctx.putImageData(img, 0, 0);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(canvas);
    }
    requestAnimationFrame(step);
  }
  initFlameBand(document.getElementById("siteFooter"));

  // Scroll reveal
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // Animated stat counters
  var counters = document.querySelectorAll(".stat-num");
  if (counters.length && "IntersectionObserver" in window) {
    var counted = new WeakSet();
    var countIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !counted.has(entry.target)) {
            counted.add(entry.target);
            animateCount(entry.target);
            countIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) { countIo.observe(el); });
  }

  // Google Analytics 4, dietro consenso esplicito (banner sotto).
  // Niente snippet gtag statico in <head>: lo script si carica SOLO dopo
  // il click su "Accetta" (o subito se il consenso era già salvato), così
  // nessun cookie/richiesta a Google parte prima del consenso.
  // Property "QUADRALABS — siti.quadralabs.eu", flusso web creato 2026-08-12.
  var GA_MEASUREMENT_ID = "G-PQ45QLM6E3";
  var GA_CONSENT_KEY = "quadralabs-consent"; // "granted" | "denied"

  function loadGA() {
    if (window.__gaLoaded || GA_MEASUREMENT_ID.indexOf("XXXX") !== -1) return;
    window.__gaLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  var cookieBanner = document.getElementById("cookieBanner");
  var gaConsent = null;
  try { gaConsent = localStorage.getItem(GA_CONSENT_KEY); } catch (e) { /* storage bloccato dal browser: trattalo come non deciso, banner resta comunque nascosto per non rompere la pagina */ }

  // Fab WhatsApp: quando il cookie banner è visibile lo alza della sua
  // altezza reale (cambia con il wrap del testo su mobile), altrimenti
  // torna al bottom di default definito in CSS.
  var whatsappFab = document.getElementById("whatsappFab");
  function syncWhatsappFabPosition() {
    if (!whatsappFab || !cookieBanner) return;
    if (!cookieBanner.hidden) {
      whatsappFab.style.bottom = (cookieBanner.offsetHeight + 16) + "px";
    } else {
      whatsappFab.style.bottom = "";
    }
  }

  if (gaConsent === "granted") {
    loadGA();
  } else if (gaConsent !== "denied" && cookieBanner) {
    cookieBanner.hidden = false;
  }
  syncWhatsappFabPosition();
  window.addEventListener("resize", syncWhatsappFabPosition);

  if (cookieBanner) {
    var gaAcceptBtn = document.getElementById("cookieAccept");
    var gaDeclineBtn = document.getElementById("cookieDecline");
    if (gaAcceptBtn) {
      gaAcceptBtn.addEventListener("click", function () {
        try { localStorage.setItem(GA_CONSENT_KEY, "granted"); } catch (e) {}
        loadGA();
        cookieBanner.hidden = true;
        syncWhatsappFabPosition();
      });
    }
    if (gaDeclineBtn) {
      gaDeclineBtn.addEventListener("click", function () {
        try { localStorage.setItem(GA_CONSENT_KEY, "denied"); } catch (e) {}
        cookieBanner.hidden = true;
        syncWhatsappFabPosition();
      });
    }
  }

  // Pricing — tab pacchetti/confronta + switch primo anno/rinnovo
  var pricingTabCards = document.getElementById("pricingTabCards");
  var pricingTabTable = document.getElementById("pricingTabTable");
  var pricingCardsPanel = document.getElementById("pricingCards");
  var pricingTablePanel = document.getElementById("pricingTable");

  function selectPricingTab(showTable) {
    if (pricingTabCards) {
      pricingTabCards.classList.toggle("is-active", !showTable);
      pricingTabCards.setAttribute("aria-selected", showTable ? "false" : "true");
    }
    if (pricingTabTable) {
      pricingTabTable.classList.toggle("is-active", showTable);
      pricingTabTable.setAttribute("aria-selected", showTable ? "true" : "false");
    }
    if (pricingCardsPanel) pricingCardsPanel.hidden = showTable;
    if (pricingTablePanel) pricingTablePanel.hidden = !showTable;
  }
  if (pricingTabCards && pricingTabTable) {
    pricingTabCards.addEventListener("click", function () { selectPricingTab(false); });
    pricingTabTable.addEventListener("click", function () {
      selectPricingTab(true);
      if (pricingTablePanel) {
        pricingTablePanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  var pricingSwitch = document.getElementById("pricingSwitch");
  var pricingToggleLabels = document.querySelectorAll(".pricing-toggle-label");
  var pricingPriceEls = document.querySelectorAll("[data-primo-price]");
  if (pricingSwitch && pricingPriceEls.length) {
    pricingSwitch.addEventListener("click", function () {
      var showRinnovo = pricingSwitch.getAttribute("aria-checked") !== "true";
      pricingSwitch.setAttribute("aria-checked", showRinnovo ? "true" : "false");
      pricingSwitch.classList.toggle("is-on", showRinnovo);
      pricingToggleLabels.forEach(function (label) {
        var isRinnovoLabel = label.getAttribute("data-toggle-label") === "rinnovo";
        label.classList.toggle("is-active", isRinnovoLabel === showRinnovo);
      });
      pricingPriceEls.forEach(function (el) {
        var amountEl = el.querySelector(".pricing-amount");
        var periodEl = el.querySelector(".pricing-period");
        if (amountEl) amountEl.textContent = showRinnovo ? el.getAttribute("data-rinnovo-price") : el.getAttribute("data-primo-price");
        if (periodEl) periodEl.textContent = showRinnovo ? el.getAttribute("data-rinnovo-period") : el.getAttribute("data-primo-period");
      });
    });
  }

  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var duration = 900;
    var start = null;

    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }
    window.requestAnimationFrame(step);
  }

  // Hero: griglia elastica animata su canvas, sfondo del nuovo hero introdotto
  // ispirandosi al componente "kinetic-matrix" di 21st.dev — porting a JS
  // vanilla (niente React/Tailwind qui) e ricolorato sulla palette del sito
  // (indaco-950 di fondo, nodi/linee panna, interazione puntatore in ambra)
  // al posto del bianco/nero originale.
  (function initHeroCanvas() {
    var heroSection = document.querySelector(".hero");
    var canvas = document.getElementById("heroCanvas");
    if (!heroSection || !canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var BG = "#0f1128";          // --indaco-950
    var LINE = "250, 247, 241";  // --panna, usato dentro rgba()
    var ACCENT = "232, 163, 61"; // --ambra

    var SPACING = 46;
    var dims = { width: 0, height: 0, cols: 0, rows: 0 };
    var nodes = [];
    var pulses = [];
    var shockwaves = [];
    var pointer = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, vx: 0, vy: 0, radius: 200, isDown: false };

    function buildLattice(width, height) {
      var cols = Math.ceil(width / SPACING) + 1;
      var rows = Math.ceil(height / SPACING) + 1;
      var list = [];
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          var x = c * SPACING, y = r * SPACING;
          list.push({ x: x, y: y, vx: 0, vy: 0, baseX: x, baseY: y, col: c, row: r, tension: 0, pulsePhase: Math.random() * Math.PI * 2 });
        }
      }
      dims = { width: width, height: height, cols: cols, rows: rows };
      nodes = list;
      pulses = [];
    }

    function drawLink(n1, n2) {
      if (!n1 || !n2) return;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();
    }

    function drawStatic() {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, dims.width, dims.height);
      ctx.strokeStyle = "rgba(" + LINE + ", 0.07)";
      ctx.lineWidth = 0.7;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.col < dims.cols - 1) drawLink(n, nodes[(n.col + 1) * dims.rows + n.row]);
        if (n.row < dims.rows - 1) drawLink(n, nodes[n.col * dims.rows + (n.row + 1)]);
      }
      ctx.fillStyle = "rgba(" + LINE + ", 0.22)";
      for (var j = 0; j < nodes.length; j++) {
        ctx.beginPath();
        ctx.arc(nodes[j].x, nodes[j].y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function resize() {
      var rect = heroSection.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      buildLattice(rect.width, rect.height);
      if (reduceMotion) drawStatic();
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(heroSection);
    } else {
      resize();
      window.addEventListener("resize", resize);
    }

    // prefers-reduced-motion: un frame fisso, niente listener del puntatore né RAF.
    if (reduceMotion) return;

    heroSection.addEventListener("mousemove", function (e) {
      var rect = heroSection.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    });
    heroSection.addEventListener("mouseleave", function () {
      pointer.x = -9999; pointer.y = -9999; pointer.isDown = false;
    });
    heroSection.addEventListener("mousedown", function (e) {
      pointer.isDown = true;
      var rect = heroSection.getBoundingClientRect();
      shockwaves.push({
        x: e.clientX - rect.left, y: e.clientY - rect.top,
        radius: 8, maxRadius: Math.max(dims.width, dims.height) * 0.8, power: 1.2
      });
    });
    window.addEventListener("mouseup", function () { pointer.isDown = false; });

    function drawTensionLink(n1, n2) {
      if (!n1 || !n2) return;
      var glow = Math.max(n1.tension, n2.tension);
      if (glow > 0.04) {
        ctx.strokeStyle = "rgba(" + ACCENT + ", " + Math.min(1, 0.25 + glow * 0.7) + ")";
        ctx.lineWidth = 0.7 + glow * 1.6;
      } else {
        ctx.strokeStyle = "rgba(" + LINE + ", 0.07)";
        ctx.lineWidth = 0.7;
      }
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();
    }

    var SPRING_K = 24, DAMPING = 0.86, lastTime = null;

    function frame(now) {
      requestAnimationFrame(frame);
      if (document.hidden || !dims.width) return; // tab in background, o resize non ancora arrivato
      var dt = lastTime === null ? 0.016 : Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      pointer.vx = (pointer.x - pointer.prevX) / (dt * 1000 || 1);
      pointer.vy = (pointer.y - pointer.prevY) / (dt * 1000 || 1);
      pointer.prevX = pointer.x;
      pointer.prevY = pointer.y;
      var mouseSpeed = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy);

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, dims.width, dims.height);

      var s;
      for (s = shockwaves.length - 1; s >= 0; s--) {
        var sw = shockwaves[s];
        sw.radius += 380 * dt;
        sw.power *= Math.pow(0.12, dt);
        if (sw.radius > sw.maxRadius || sw.power < 0.01) shockwaves.splice(s, 1);
      }

      var i, n;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        n.pulsePhase += dt * 2.4;

        var dx = pointer.x - n.x, dy = pointer.y - n.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pointer.radius && dist > 0) {
          var ratio = 1 - dist / pointer.radius;
          var force = ratio * (1100 + mouseSpeed * 140 + (pointer.isDown ? 1800 : 0));
          var angle = Math.atan2(dy, dx);
          n.vx -= Math.cos(angle) * force * dt;
          n.vy -= Math.sin(angle) * force * dt;
          n.tension = Math.min(1, n.tension + ratio * 0.5);
        }

        for (s = 0; s < shockwaves.length; s++) {
          var sw2 = shockwaves[s];
          var swDx = n.x - sw2.x, swDy = n.y - sw2.y;
          var swDist = Math.sqrt(swDx * swDx + swDy * swDy);
          var delta = Math.abs(swDist - sw2.radius);
          if (delta < 55) {
            var f2 = (1 - delta / 55) * sw2.power * 2200;
            var a2 = Math.atan2(swDy, swDx);
            n.vx += Math.cos(a2) * f2 * dt;
            n.vy += Math.sin(a2) * f2 * dt;
            n.tension = 1;
          }
        }

        n.vx += (n.baseX - n.x) * SPRING_K * dt;
        n.vy += (n.baseY - n.y) * SPRING_K * dt;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx * dt * 60;
        n.y += n.vy * dt * 60;
        n.tension = Math.max(0, n.tension - dt * 0.9);
      }

      if (Math.random() < 0.25 && nodes.length && pulses.length < 30) {
        var fromIdx = Math.floor(Math.random() * nodes.length);
        var from = nodes[fromIdx];
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        var dir = dirs[Math.floor(Math.random() * dirs.length)];
        var tc = from.col + dir[0], tr = from.row + dir[1];
        if (tc >= 0 && tc < dims.cols && tr >= 0 && tr < dims.rows) {
          var toIdx = tc * dims.rows + tr;
          if (nodes[toIdx]) pulses.push({ from: fromIdx, to: toIdx, progress: 0, speed: 1.4 + Math.random() * 1.8 });
        }
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.col < dims.cols - 1) drawTensionLink(n, nodes[(n.col + 1) * dims.rows + n.row]);
        if (n.row < dims.rows - 1) drawTensionLink(n, nodes[n.col * dims.rows + (n.row + 1)]);
      }

      var p;
      for (p = pulses.length - 1; p >= 0; p--) {
        var pulse = pulses[p];
        pulse.progress += dt * pulse.speed;
        var n1 = nodes[pulse.from], n2 = nodes[pulse.to];
        if (!n1 || !n2 || pulse.progress >= 1) {
          if (n2) n2.tension = Math.min(1, n2.tension + 0.35);
          pulses.splice(p, 1);
          continue;
        }
        var px = n1.x + (n2.x - n1.x) * pulse.progress;
        var py = n1.y + (n2.y - n1.y) * pulse.progress;
        ctx.fillStyle = "rgb(" + ACCENT + ")";
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        var pdx = pointer.x - n.x, pdy = pointer.y - n.y;
        var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        var near = pdist < pointer.radius;
        var r = near ? 1.6 + n.tension * 1.4 : 1.1 + Math.sin(n.pulsePhase) * 0.2;

        if (near || n.tension > 0.1) {
          ctx.fillStyle = "rgba(" + ACCENT + ", " + Math.min(1, 0.2 + n.tension * 0.5) + ")";
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = near || n.tension > 0.1 ? "rgb(" + ACCENT + ")" : "rgba(" + LINE + ", 0.22)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(0.8, r), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(frame);
  })();
})();
