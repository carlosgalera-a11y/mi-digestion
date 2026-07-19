/* Megacuaderno de documentos — subida, listado y preguntas a la IA. */

import { SB, SUPABASE_URL, proteger, avisar, escaparHTML } from "./pro.js";

const BUCKET = "midig-docs";
const FUNCION_ASK = SUPABASE_URL + "/functions/v1/midig-ask";
const TEXTO_EXT = /\.(txt|md|csv|json|log)$/i;

const perfil = await proteger();
if (perfil) init(perfil);

function init(perfil) {
  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("input-doc");
  const lista = document.getElementById("lista-docs");
  const conteo = document.getElementById("conteo");
  const vacio = document.getElementById("docs-vacio");
  const chat = document.getElementById("chat");
  const form = document.getElementById("form-chat");
  const preguntaEl = document.getElementById("pregunta");

  /* ----- Subida ----- */
  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("arrastrando"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("arrastrando"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault(); dropzone.classList.remove("arrastrando");
    if (e.dataTransfer.files[0]) subir(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", () => { if (input.files[0]) subir(input.files[0]); input.value = ""; });

  async function subir(file) {
    const prog = document.getElementById("subida-progreso");
    const barra = document.getElementById("subida-barra");
    const texto = document.getElementById("subida-texto");
    prog.hidden = false; barra.style.width = "30%"; texto.textContent = `Subiendo ${file.name}…`;

    const limpio = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${perfil.email}/${Date.now()}_${limpio}`;
    const { error: errUp } = await SB.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream", upsert: false
    });
    if (errUp) { prog.hidden = true; avisar("Error al subir: " + errUp.message); return; }
    barra.style.width = "70%";
    const { error: errIns } = await SB.from("midig_documents").insert({
      filename: file.name, storage_path: path, size_bytes: file.size, mime: file.type
    });
    barra.style.width = "100%";
    setTimeout(() => { prog.hidden = true; barra.style.width = "0"; }, 500);
    if (errIns) avisar("Subido pero no registrado: " + errIns.message);
    else avisar("Documento subido ✓");
    cargarLista();
  }

  /* ----- Listado ----- */
  async function docs() {
    const { data, error } = await SB.from("midig_documents")
      .select("id, filename, storage_path, size_bytes, mime, created_at")
      .order("created_at", { ascending: false });
    if (error) { avisar("Error al listar: " + error.message); return []; }
    return data;
  }

  function kb(n) { return n == null ? "" : (n < 1024 ? n + " B" : (n / 1024).toFixed(0) + " KB"); }

  async function cargarLista() {
    const data = await docs();
    conteo.textContent = `· ${data.length}`;
    vacio.hidden = data.length > 0;
    lista.innerHTML = data.map((d) => {
      const esTexto = TEXTO_EXT.test(d.filename);
      return `<li>
        <span class="crece">
          <span class="nombre">${escaparHTML(d.filename)}</span><br>
          <span class="meta">${kb(d.size_bytes)}${esTexto ? "" : " · no indexable para preguntas"}</span>
        </span>
        <button type="button" class="btn" data-ver="${d.id}" data-path="${escaparHTML(d.storage_path)}" style="padding:6px 12px;min-height:34px">Abrir</button>
        <button type="button" class="btn peligro" data-del="${d.id}" data-path="${escaparHTML(d.storage_path)}" style="padding:6px 12px;min-height:34px">Quitar</button>
      </li>`;
    }).join("");
  }

  lista.addEventListener("click", async (e) => {
    const ver = e.target.closest("button[data-ver]");
    const del = e.target.closest("button[data-del]");
    if (ver) {
      const { data } = await SB.storage.from(BUCKET).createSignedUrl(ver.dataset.path, 3600);
      if (data) window.open(data.signedUrl, "_blank", "noopener");
    } else if (del) {
      if (!confirm("¿Quitar este documento?")) return;
      await SB.storage.from(BUCKET).remove([del.dataset.path]);
      await SB.from("midig_documents").delete().eq("id", del.dataset.id);
      avisar("Documento quitado");
      cargarLista();
    }
  });

  /* ----- Preguntas a la IA ----- */
  function burbuja(texto, clase) {
    const div = document.createElement("div");
    div.className = "chat-burbuja " + clase;
    div.textContent = texto;
    chat.append(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  // Reúne el texto de los documentos indexables (.txt, .md…) para dar contexto a la IA.
  async function reunirContexto() {
    const data = await docs();
    const textos = [];
    for (const d of data) {
      if (!TEXTO_EXT.test(d.filename)) continue;
      const { data: sig } = await SB.storage.from(BUCKET).createSignedUrl(d.storage_path, 300);
      if (!sig) continue;
      try {
        const r = await fetch(sig.signedUrl);
        const t = await r.text();
        textos.push(`### ${d.filename}\n${t.slice(0, 20000)}`);
      } catch { /* ignora documentos ilegibles */ }
      if (textos.join("\n").length > 100000) break;
    }
    return textos.join("\n\n");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pregunta = preguntaEl.value.trim();
    if (!pregunta) return;
    burbuja(pregunta, "usuario");
    preguntaEl.value = "";
    const btn = document.getElementById("btn-preguntar");
    btn.disabled = true;
    const pensando = burbuja("Pensando…", "asistente");
    try {
      const contexto = await reunirContexto();
      const { data: s } = await SB.auth.getSession();
      const r = await fetch(FUNCION_ASK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (s ? s.access_token : "")
        },
        body: JSON.stringify({ pregunta, contexto })
      });
      const out = await r.json();
      pensando.textContent = out.answer || out.error || "Sin respuesta.";
    } catch (err) {
      pensando.textContent = "No se pudo consultar: " + err.message;
    } finally {
      btn.disabled = false;
    }
  });

  cargarLista();
}
