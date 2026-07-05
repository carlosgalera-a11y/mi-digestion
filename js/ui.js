/* Mi Digestión — componentes de interfaz compartidos */

const PAGINAS = [
  { href: "index.html", texto: "Inicio" },
  { href: "diario.html", texto: "Mi Día" },
  { href: "historial.html", texto: "Historial e informe" },
  { href: "bristol.html", texto: "Escala de Bristol" },
  { href: "aprende.html", texto: "Aprende" },
  { href: "consulta.html", texto: "Tu consulta" }
];

function paginaActual() {
  const ruta = location.pathname.split("/").pop();
  return ruta === "" ? "index.html" : ruta;
}

export function montarCabecera() {
  const actual = paginaActual();
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="bar">
      <a class="brand" href="index.html"><span class="logo" aria-hidden="true">🌿</span> Mi Digestión</a>
      <button class="theme-toggle" type="button" aria-label="Cambiar entre tema claro y oscuro">🌓</button>
    </div>
    <nav class="site-nav" aria-label="Secciones">
      ${PAGINAS.map((p) =>
        `<a href="${p.href}" ${p.href === actual ? 'aria-current="page"' : ""}>${p.texto}</a>`
      ).join("")}
    </nav>`;
  document.body.prepend(header);
  header.querySelector(".theme-toggle").addEventListener("click", alternarTema);
  const enlaceActivo = header.querySelector('[aria-current="page"]');
  if (enlaceActivo) enlaceActivo.scrollIntoView({ inline: "center", block: "nearest" });
}

export function montarPie() {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <p><strong>Mi Digestión</strong> es una herramienta de apoyo para pacientes de consultas de aparato digestivo.</p>
    <p>No sustituye la valoración de un profesional sanitario. Ante síntomas de alarma o dudas sobre tu salud,
       consulta con tu médico. Tus registros se guardan únicamente en este dispositivo.</p>`;
  document.body.append(footer);
}

/* ---------- Tema claro / oscuro ---------- */

const CLAVE_TEMA = "midigestion.tema";

export function aplicarTemaGuardado() {
  const guardado = localStorage.getItem(CLAVE_TEMA);
  const oscuroSistema = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const tema = guardado || (oscuroSistema ? "dark" : "light");
  document.documentElement.dataset.theme = tema;
}

function alternarTema() {
  const actual = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = actual;
  localStorage.setItem(CLAVE_TEMA, actual);
}

/* ---------- Avisos breves ---------- */

let toastEl = null;
let toastTimer = null;

export function avisar(mensaje) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.setAttribute("role", "status");
    document.body.append(toastEl);
  }
  toastEl.textContent = mensaje;
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 2600);
}

/* ---------- Arranque común de todas las páginas ---------- */

export function iniciarPagina() {
  aplicarTemaGuardado();
  montarCabecera();
  montarPie();
}
