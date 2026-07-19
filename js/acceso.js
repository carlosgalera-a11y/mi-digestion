/* Página de acceso — login por correo (OTP: enlace mágico o código). */

import { SB, URL_PUBLICA, sesionActual, aplicarTemaGuardado } from "./pro.js";

aplicarTemaGuardado();

const formEmail = document.getElementById("form-email");
const formCodigo = document.getElementById("form-codigo");
const mensaje = document.getElementById("mensaje");
const inputEmail = document.getElementById("email");
const inputCodigo = document.getElementById("codigo");

// Si ya hay sesión, ir directamente al área de profesionales.
sesionActual().then((s) => { if (s) location.replace("profesionales.html"); });

function estado(txt, tipo = "") {
  mensaje.textContent = txt;
  mensaje.style.color = tipo === "error" ? "var(--critical)" : "var(--text-secondary)";
}

let emailActual = "";

formEmail.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const email = inputEmail.value.trim().toLowerCase();
  if (!email) return;
  const btn = document.getElementById("btn-enviar");
  btn.disabled = true;
  estado("Enviando…");
  const { error } = await SB.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: URL_PUBLICA + "profesionales.html"
    }
  });
  btn.disabled = false;
  if (error) {
    estado("No se pudo enviar: " + error.message, "error");
    return;
  }
  emailActual = email;
  document.getElementById("email-eco").textContent = email;
  formEmail.hidden = true;
  formCodigo.hidden = false;
  estado("Revisa tu correo (mira también la carpeta de spam).");
  inputCodigo.focus();
});

formCodigo.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const token = inputCodigo.value.trim();
  if (!/^\d{6}$/.test(token)) { estado("El código son 6 dígitos.", "error"); return; }
  const btn = document.getElementById("btn-verificar");
  btn.disabled = true;
  estado("Comprobando…");
  const { error } = await SB.auth.verifyOtp({ email: emailActual, token, type: "email" });
  btn.disabled = false;
  if (error) {
    estado("Código incorrecto o caducado: " + error.message, "error");
    return;
  }
  location.replace("profesionales.html");
});

document.getElementById("btn-otro-correo").addEventListener("click", () => {
  formCodigo.hidden = true;
  formEmail.hidden = false;
  estado("");
  inputEmail.focus();
});
