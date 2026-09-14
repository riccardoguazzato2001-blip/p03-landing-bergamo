// Durata: LEGATO-A:P03
// Pagina "Chiedi info" (ex modale, ora pagina dedicata — vedi CLAUDE.md di
// P03 § "Form collegato a Google Sheet: le 4 cose che si sbagliano" per le
// regole del backend). Pagina indipendente: non carica script.js (stesso
// pattern di privacy.html), niente header scroll/circular-nav qui.
(function () {
  "use strict";

  // URL della web app Apps Script (dopo il deploy manuale, vedi apps-script/LEGGIMI-deploy.md).
  // Vuoto = modalità dimostrativa: il form apre un mailto pre-compilato invece di POSTare.
  var INFO_FORM_BACKEND_URL = "";

  var params = new URLSearchParams(window.location.search);
  var pacchetto = params.get("pacchetto") || "";

  var badgeEl = document.getElementById("contattoBadge");
  var pacchettoInput = document.getElementById("contattoPacchetto");
  if (pacchettoInput) pacchettoInput.value = pacchetto;
  if (badgeEl) badgeEl.textContent = pacchetto ? "Hai scelto: " + pacchetto : "Richiesta informazioni";

  var form = document.getElementById("contattoForm");
  if (!form) return;

  var statusEl = document.getElementById("contattoStatus");
  var submitBtn = document.getElementById("contattoSubmit");
  var submitLabel = submitBtn ? submitBtn.querySelector(".info-form-submit-label") : null;

  function showStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = "info-form-status " + (ok ? "is-ok" : "is-err");
    statusEl.hidden = false;
  }

  function mailtoFallback(data) {
    var subject = "Interesse per " + (data.pacchetto || "sito web");
    var body = "Nome: " + data.nome + "\nAttività: " + data.attivita +
      "\nTelefono: " + data.telefono + "\nEmail: " + data.email +
      "\nMessaggio: " + data.messaggio;
    window.location.href = "mailto:info@quadralabs.eu?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    var data = {
      pacchetto: pacchettoInput ? pacchettoInput.value : "",
      nome: form.nome.value.trim(),
      attivita: form.attivita.value.trim(),
      telefono: form.telefono.value.trim(),
      email: form.email.value.trim(),
      messaggio: form.messaggio.value.trim(),
      pagina: window.location.href,
      timestamp: new Date().toISOString()
    };

    if (!INFO_FORM_BACKEND_URL) {
      mailtoFallback(data);
      showStatus("Si apre il tuo programma di posta con i dati già compilati.", true);
      return;
    }

    submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = "Invio in corso…";

    // Content-Type text/plain con dentro una stringa JSON: è una "richiesta
    // semplice" CORS, niente preflight OPTIONS (Apps Script non lo gestisce).
    // Mai mode:'no-cors' — nasconderebbe un fallimento reale come un successo.
    fetch(INFO_FORM_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data)
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = "Invia la richiesta";
        if (json && json.ok) {
          form.reset();
          if (pacchettoInput) pacchettoInput.value = pacchetto;
          showStatus("Richiesta inviata! Ti ricontattiamo entro 24-48h.", true);
        } else {
          showStatus("Qualcosa non ha funzionato. Riprova o scrivici a info@quadralabs.eu.", false);
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = "Invia la richiesta";
        showStatus("Qualcosa non ha funzionato. Riprova o scrivici a info@quadralabs.eu.", false);
      });
  });
})();
