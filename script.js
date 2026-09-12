// Durata: LEGATO-A:P03
(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var nav = document.getElementById("mainNav");
  var navToggle = document.getElementById("navToggle");

  function onScroll() {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  navToggle.addEventListener("click", function () {
    var isOpen = nav.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
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

  // Lavori strip: senza questo, l'unico modo di scorrere una striscia
  // overflow-x:auto è un trackpad con swipe orizzontale o shift+rotellina —
  // un mouse normale con rotellina verticale resta bloccato. Frecce, drag col
  // mouse e conversione verticale->orizzontale della rotellina coprono tutti i casi.
  var lavoriWrap = document.querySelector(".lavori-strip-wrap");
  var lavoriStrip = document.querySelector(".lavori-strip");
  if (lavoriWrap && lavoriStrip) {
    var prevBtn = lavoriWrap.querySelector(".lavori-nav-prev");
    var nextBtn = lavoriWrap.querySelector(".lavori-nav-next");

    function updateEdges() {
      var max = lavoriStrip.scrollWidth - lavoriStrip.clientWidth;
      lavoriWrap.classList.toggle("at-start", lavoriStrip.scrollLeft <= 4);
      lavoriWrap.classList.toggle("at-end", lavoriStrip.scrollLeft >= max - 4);
    }
    updateEdges();
    lavoriStrip.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);

    function scrollByCard(dir) {
      var card = lavoriStrip.querySelector(".lavoro-card");
      var step = card ? card.getBoundingClientRect().width + 18 : lavoriStrip.clientWidth * 0.8;
      lavoriStrip.scrollBy({ left: dir * step, behavior: "smooth" });
    }
    if (prevBtn) prevBtn.addEventListener("click", function () { scrollByCard(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { scrollByCard(1); });

    // Rotellina verticale -> scroll orizzontale (solo quando il gesto è
    // prevalentemente verticale, cioè un mouse normale: un trackpad che manda
    // già deltaX lo lasciamo passare senza interferire). scroll-snap-type
    // manda indietro ogni assegnazione istantanea di scrollLeft che non cade
    // esattamente su una card — va disattivato durante lo scroll a rotellina
    // e riattivato solo quando l'utente smette (altrimenti la striscia sembra
    // bloccata: ogni tick di rotellina veniva annullato dallo snap-back).
    var wheelIdleTimer = null;
    lavoriStrip.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        lavoriStrip.classList.add("is-dragging");
        lavoriStrip.scrollLeft += e.deltaY;
        e.preventDefault();
        clearTimeout(wheelIdleTimer);
        wheelIdleTimer = setTimeout(function () {
          lavoriStrip.classList.remove("is-dragging");
        }, 150);
      }
    }, { passive: false });

    // Drag-to-scroll col mouse (i trackpad/touch funzionano già di loro).
    var isDown = false, dragStartX = 0, startScroll = 0, moved = false;
    lavoriStrip.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      isDown = true; moved = false;
      dragStartX = e.clientX;
      startScroll = lavoriStrip.scrollLeft;
      lavoriStrip.classList.add("is-dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 3) moved = true;
      lavoriStrip.scrollLeft = startScroll - dx;
    });
    function stopDrag() {
      if (!isDown) return;
      isDown = false;
      lavoriStrip.classList.remove("is-dragging");
    }
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    // Evita che il drag venga interpretato anche come click sulla card sotto il cursore.
    lavoriStrip.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
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

  if (gaConsent === "granted") {
    loadGA();
  } else if (gaConsent !== "denied" && cookieBanner) {
    cookieBanner.hidden = false;
  }

  if (cookieBanner) {
    var gaAcceptBtn = document.getElementById("cookieAccept");
    var gaDeclineBtn = document.getElementById("cookieDecline");
    if (gaAcceptBtn) {
      gaAcceptBtn.addEventListener("click", function () {
        try { localStorage.setItem(GA_CONSENT_KEY, "granted"); } catch (e) {}
        loadGA();
        cookieBanner.hidden = true;
      });
    }
    if (gaDeclineBtn) {
      gaDeclineBtn.addEventListener("click", function () {
        try { localStorage.setItem(GA_CONSENT_KEY, "denied"); } catch (e) {}
        cookieBanner.hidden = true;
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
    pricingTabTable.addEventListener("click", function () { selectPricingTab(true); });
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
