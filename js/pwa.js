/* Mi Digestión — registro de PWA e invitación a instalar (script clásico). */
(function () {
  "use strict";

  // 1) Registrar el service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {});
    });
  }

  var CLAVE_DESCARTE = "midigestion.pwa.descartado";
  var promptDiferido = null;

  function esStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }
  function esIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function descartado() {
    try { return localStorage.getItem(CLAVE_DESCARTE) === "1"; } catch (e) { return false; }
  }
  function marcarDescartado() {
    try { localStorage.setItem(CLAVE_DESCARTE, "1"); } catch (e) {}
  }

  function crearBanner(iosMode) {
    if (document.getElementById("pwa-banner")) return;
    var b = document.createElement("div");
    b.id = "pwa-banner";
    b.className = "pwa-banner";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-label", "Instalar Mi Digestión");
    var texto = iosMode
      ? 'Pulsa <strong>Compartir</strong> <span aria-hidden="true">􀈂</span> y luego <strong>“Añadir a pantalla de inicio”</strong>.'
      : "Acceso directo desde tu móvil y funciona sin conexión.";
    var botones = iosMode
      ? '<button type="button" class="btn" id="pwa-cerrar">Entendido</button>'
      : '<button type="button" class="btn primario" id="pwa-instalar">Instalar</button>' +
        '<button type="button" class="btn" id="pwa-cerrar">Ahora no</button>';
    b.innerHTML =
      '<img src="img/icons/icon-192.png" alt="" class="pwa-banner-icono">' +
      '<div class="pwa-banner-texto"><strong>Instala Mi Digestión</strong><br><span>' + texto + "</span></div>" +
      '<div class="pwa-banner-acciones">' + botones + "</div>";
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add("visible"); });

    var cerrar = document.getElementById("pwa-cerrar");
    if (cerrar) cerrar.addEventListener("click", function () { ocultarBanner(); marcarDescartado(); });
    var inst = document.getElementById("pwa-instalar");
    if (inst) inst.addEventListener("click", instalar);
  }

  function ocultarBanner() {
    var b = document.getElementById("pwa-banner");
    if (b) { b.classList.remove("visible"); setTimeout(function () { b.remove(); }, 300); }
  }

  function instalar() {
    if (!promptDiferido) return;
    promptDiferido.prompt();
    promptDiferido.userChoice.then(function () {
      promptDiferido = null;
      ocultarBanner();
    });
  }

  // 2) Android / Chrome: capturar el evento de instalación
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    promptDiferido = e;
    // Botón visible en la portada si existe
    var btnPortada = document.getElementById("btn-instalar-pwa");
    if (btnPortada) {
      btnPortada.hidden = false;
      btnPortada.addEventListener("click", instalar);
    }
    if (!esStandalone() && !descartado()) crearBanner(false);
  });

  window.addEventListener("appinstalled", function () {
    ocultarBanner();
    var card = document.getElementById("card-instalar");
    if (card) card.hidden = true;
  });

  // 3) iOS Safari: no hay evento; mostramos instrucciones si procede
  window.addEventListener("load", function () {
    if (esStandalone()) {
      var card = document.getElementById("card-instalar");
      if (card) card.hidden = true;
      return;
    }
    if (esIOS() && !descartado()) {
      setTimeout(function () { crearBanner(true); }, 1200);
    }
    // Botón de la portada: en iOS abre las instrucciones
    var btnPortada = document.getElementById("btn-instalar-pwa");
    if (btnPortada && esIOS()) {
      btnPortada.hidden = false;
      btnPortada.addEventListener("click", function () { crearBanner(true); });
    }
  });
})();
