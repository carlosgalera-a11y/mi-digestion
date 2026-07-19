/* Área de profesionales — cliente Supabase, autenticación y control de acceso.
 * La librería Supabase se carga antes como script clásico (window.supabase). */

export const SUPABASE_URL = "https://igvadjgjpyuvzailjqwg.supabase.co";
export const SUPABASE_ANON = "sb_publishable_8m-_636I5GHOd_ccf5SQYw_TYB9L78p";
export const URL_PUBLICA = "https://carlosgalera-a11y.github.io/mi-digestion/";

if (!window.supabase || !window.supabase.createClient) {
  throw new Error("No se ha cargado la librería de Supabase (js/vendor/supabase.js).");
}

export const SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/* ---------- Sesión y perfil ---------- */

export async function sesionActual() {
  const { data } = await SB.auth.getSession();
  return data.session || null;
}

/** Fila del profesional en la allowlist (o null si no está autorizado). */
export async function miPerfil() {
  const s = await sesionActual();
  if (!s) return null;
  const email = s.user.email.toLowerCase();
  const { data, error } = await SB
    .from("midig_professionals")
    .select("email, nombre, role, active")
    .eq("email", email)
    .maybeSingle();
  if (error) return null;
  if (!data || !data.active) return null;
  return data;
}

export async function cerrarSesion() {
  await SB.auth.signOut();
  location.replace("acceso.html");
}

/* ---------- Guardián de página ---------- */

/** Protege una página de profesionales. Devuelve el perfil o bloquea la vista.
 * opciones.superadmin = true exige rol superadmin. */
export async function proteger(opciones = {}) {
  mostrarCargando();
  const s = await sesionActual();
  if (!s) { location.replace("acceso.html"); return null; }

  const perfil = await miPerfil();
  if (!perfil) { pantallaNoAutorizado(s.user.email); return null; }

  if (opciones.superadmin && perfil.role !== "superadmin") {
    pantallaSoloSuperadmin();
    return null;
  }
  montarCabeceraPro(perfil);
  ocultarCargando();
  return perfil;
}

/* ---------- Interfaz común del área privada ---------- */

const NAV_PRO = [
  { href: "profesionales.html", texto: "Inicio", icono: "🏠" },
  { href: "pro-documentos.html", texto: "Documentos", icono: "📄" },
  { href: "pro-imagenes.html", texto: "Imágenes", icono: "🔬" },
  { href: "pro-accesos.html", texto: "Accesos", icono: "🔑", soloAdmin: true }
];

function paginaActual() {
  const r = location.pathname.split("/").pop();
  return r === "" ? "profesionales.html" : r;
}

export function montarCabeceraPro(perfil) {
  if (document.querySelector(".pro-header")) return;
  const actual = paginaActual();
  const esAdmin = perfil.role === "superadmin";
  const header = document.createElement("header");
  header.className = "site-header pro-header";
  header.innerHTML = `
    <div class="bar">
      <a class="brand" href="profesionales.html"><span class="logo" aria-hidden="true">🩺</span> Mi Digestión <span class="pro-badge">Profesionales</span></a>
      <button class="theme-toggle" type="button" aria-label="Cambiar tema">🌓</button>
    </div>
    <nav class="site-nav" aria-label="Área de profesionales">
      ${NAV_PRO.filter((p) => !p.soloAdmin || esAdmin).map((p) =>
        `<a href="${p.href}" ${p.href === actual ? 'aria-current="page"' : ""}>${p.icono} ${p.texto}</a>`
      ).join("")}
    </nav>
    <div class="pro-userbar">
      <span class="pro-user">${esAdmin ? "⭐ " : ""}${perfil.nombre || perfil.email}${esAdmin ? " · superadmin" : ""}</span>
      <button type="button" class="btn-salir" id="btn-cerrar-sesion">Salir</button>
    </div>`;
  document.body.prepend(header);
  header.querySelector(".theme-toggle").addEventListener("click", alternarTema);
  header.querySelector("#btn-cerrar-sesion").addEventListener("click", cerrarSesion);
}

/* ---------- Pantallas de estado ---------- */

function contenedorEstado() {
  document.querySelectorAll(".pro-estado").forEach((n) => n.remove());
  const main = document.querySelector("main") || document.body;
  main.querySelectorAll(":scope > *:not(.pro-estado)").forEach((n) => { n.style.display = "none"; });
  const div = document.createElement("div");
  div.className = "pro-estado";
  main.append(div);
  return div;
}

function mostrarCargando() {
  if (document.querySelector(".pro-cargando")) return;
  const d = document.createElement("div");
  d.className = "pro-cargando";
  d.innerHTML = `<div class="spinner" aria-hidden="true"></div><p>Comprobando acceso…</p>`;
  document.body.append(d);
}
function ocultarCargando() {
  document.querySelector(".pro-cargando")?.remove();
}

function pantallaNoAutorizado(email) {
  ocultarCargando();
  const d = contenedorEstado();
  d.innerHTML = `
    <div class="card" style="max-width:520px;margin:40px auto;text-align:center">
      <div style="font-size:2.4rem" aria-hidden="true">🔒</div>
      <h1>Acceso no autorizado</h1>
      <p>Tu cuenta <strong>${email}</strong> no está en la lista de profesionales autorizados.</p>
      <p class="hint">Si crees que deberías tener acceso, pide a la administradora (Montse) que añada
         tu correo desde el panel de accesos.</p>
      <div class="acciones" style="justify-content:center">
        <button type="button" class="btn" id="btn-salir-noauth">Cerrar sesión</button>
        <a class="btn" href="index.html">Volver al inicio</a>
      </div>
    </div>`;
  d.querySelector("#btn-salir-noauth").addEventListener("click", cerrarSesion);
}

function pantallaSoloSuperadmin() {
  ocultarCargando();
  const d = contenedorEstado();
  d.innerHTML = `
    <div class="card" style="max-width:520px;margin:40px auto;text-align:center">
      <div style="font-size:2.4rem" aria-hidden="true">⛔</div>
      <h1>Solo para la administradora</h1>
      <p>Esta sección está reservada a la superadministradora.</p>
      <a class="btn primario" href="profesionales.html">Volver al área de profesionales</a>
    </div>`;
}

/* ---------- Tema (reutiliza la clave del sitio público) ---------- */

const CLAVE_TEMA = "midigestion.tema";
export function aplicarTemaGuardado() {
  const g = localStorage.getItem(CLAVE_TEMA);
  const oscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = g || (oscuro ? "dark" : "light");
}
function alternarTema() {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  localStorage.setItem(CLAVE_TEMA, t);
}

/* ---------- Avisos ---------- */

let toastEl = null, toastTimer = null;
export function avisar(mensaje, ms = 2800) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.setAttribute("role", "status");
    document.body.append(toastEl);
  }
  toastEl.textContent = mensaje;
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), ms);
}

export function escaparHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
