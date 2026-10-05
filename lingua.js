// Durata: LEGATO-A:P03
// Landing multilingua: selettore lingua nell'header + barra di suggerimento.
// Caricato da index/contatto/privacy in tutte le lingue. Le pagine en/ de/
// fr/ es/ sono GENERATE da i18n/build.py: si modifica solo l'italiano.
//
// Scelte fissate con Kevin (2026-10-05): niente redirect automatico per
// lingua del browser (il QR dei biglietti deve aprire sempre l'italiano),
// solo una barra chiudibile che propone la lingua del browser. I testi della
// barra sono scritti QUI nella lingua di arrivo, non tradotti dal build: la
// barra parla nella lingua che propone, non in quella della pagina.
(function () {
  "use strict";

  var SCELTA_KEY = "quadralabs-lingua";            // lingua scelta a mano dal selettore
  var SUGGERIMENTO_KEY = "quadralabs-lingua-barra"; // "chiusa" = non riproporre la barra

  var BARRA = {
    it: { testo: "Questa pagina è disponibile anche in italiano.", vai: "Passa all'italiano", chiudi: "Chiudi" },
    en: { testo: "This page is also available in English.", vai: "Switch to English", chiudi: "Close" },
    de: { testo: "Diese Seite gibt es auch auf Deutsch.", vai: "Auf Deutsch lesen", chiudi: "Schließen" },
    fr: { testo: "Cette page existe aussi en français.", vai: "Lire en français", chiudi: "Fermer" },
    es: { testo: "Esta página también está disponible en español.", vai: "Leer en español", chiudi: "Cerrar" }
  };

  function leggi(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function scrivi(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* storage bloccato: pazienza */ } }

  var paginaLingua = (document.documentElement.getAttribute("lang") || "it").slice(0, 2);

  // Link verso le altre lingue: portano con sé la sezione corrente (#offerta
  // resta #offerta) e la query (contatto.html?pacchetto=... resta sul pacchetto).
  function hrefConContesto(href) {
    var base = href.split("#")[0];
    if (window.location.search && base.indexOf("?") === -1) base += window.location.search;
    return base + window.location.hash;
  }
  var linkLingua = document.querySelectorAll("a[data-lang]");
  Array.prototype.forEach.call(linkLingua, function (a) {
    a.addEventListener("click", function () {
      scrivi(SCELTA_KEY, a.getAttribute("data-lang"));
      a.setAttribute("href", hrefConContesto(a.getAttribute("href")));
    });
  });

  // ---------- Selettore nell'header ----------
  var btn = document.getElementById("langSwitchBtn");
  var menu = document.getElementById("langSwitchMenu");
  if (btn && menu) {
    var apri = function () { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); };
    var chiudi = function () { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) {
        apri();
        var attuale = menu.querySelector('a[aria-current="true"]') || menu.querySelector("a");
        if (attuale) attuale.focus();
      } else {
        chiudi();
      }
    });
    document.addEventListener("click", function (e) {
      if (!menu.hidden && !menu.contains(e.target)) chiudi();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { chiudi(); btn.focus(); }
    });
  }

  // ---------- Barra di suggerimento (prima visita, mai redirect) ----------
  if (leggi(SCELTA_KEY) || leggi(SUGGERIMENTO_KEY) === "chiusa") return;

  var preferite = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  var proposta = null;
  for (var i = 0; i < preferite.length; i++) {
    var codice = String(preferite[i] || "").slice(0, 2).toLowerCase();
    if (BARRA[codice]) { proposta = codice; break; }
  }
  if (!proposta || proposta === paginaLingua) return;

  var link = document.querySelector('.lang-switch-menu a[data-lang="' + proposta + '"]');
  if (!link) return;
  var t = BARRA[proposta];

  var barra = document.createElement("div");
  barra.className = "lang-suggest";
  barra.setAttribute("role", "region");
  barra.setAttribute("aria-label", t.testo);
  barra.setAttribute("lang", proposta);

  var testo = document.createElement("span");
  testo.textContent = t.testo;
  var vai = document.createElement("a");
  vai.href = link.getAttribute("href");
  vai.textContent = t.vai;
  vai.setAttribute("hreflang", proposta);
  vai.addEventListener("click", function () {
    scrivi(SCELTA_KEY, proposta);
    vai.setAttribute("href", hrefConContesto(vai.getAttribute("href")));
  });
  var x = document.createElement("button");
  x.type = "button";
  x.setAttribute("aria-label", t.chiudi);
  x.textContent = "×";
  x.addEventListener("click", function () {
    scrivi(SUGGERIMENTO_KEY, "chiusa");
    barra.hidden = true;
  });

  barra.appendChild(testo);
  barra.appendChild(vai);
  barra.appendChild(x);
  document.body.appendChild(barra);
})();
