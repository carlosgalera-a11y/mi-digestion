/* Apartado de imágenes — subida privada + comparación con el modelo CAG. */

import { SB, proteger, avisar, escaparHTML } from "./pro.js";
import { predecir } from "./cag-model.js";

const BUCKET = "midig-images";
const perfil = await proteger();
if (perfil) init(perfil);

function init(perfil) {
  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("input-imagen");
  const galeria = document.getElementById("galeria");
  const galeriaVacia = document.getElementById("galeria-vacia");
  const analizador = document.getElementById("analizador");
  const imgPaciente = document.getElementById("img-paciente");
  const resultado = document.getElementById("resultado");
  const btnAnalizar = document.getElementById("btn-analizar");

  let imagenActual = null; // fila de midig_images en análisis

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
    if (!file.type.startsWith("image/")) { avisar("Ese archivo no es una imagen"); return; }
    const prog = document.getElementById("subida-progreso");
    const barra = document.getElementById("subida-barra");
    const texto = document.getElementById("subida-texto");
    prog.hidden = false; barra.style.width = "30%"; texto.textContent = `Subiendo ${file.name}…`;

    const limpio = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${perfil.email}/${Date.now()}_${limpio}`;
    const { error: errUp } = await SB.storage.from(BUCKET).upload(path, file, {
      contentType: file.type, upsert: false
    });
    if (errUp) { prog.hidden = true; avisar("Error al subir: " + errUp.message); return; }
    barra.style.width = "70%";

    const { error: errIns } = await SB.from("midig_images").insert({
      filename: file.name, storage_path: path, size_bytes: file.size, mime: file.type
    });
    barra.style.width = "100%";
    setTimeout(() => { prog.hidden = true; barra.style.width = "0"; }, 500);
    if (errIns) { avisar("Subida pero no registrada: " + errIns.message); }
    else avisar("Imagen subida ✓");
    await cargarGaleria();
    // abrir la recién subida
    const nueva = (await filas())[0];
    if (nueva) abrir(nueva);
  }

  /* ----- Galería ----- */
  async function filas() {
    const { data, error } = await SB.from("midig_images")
      .select("id, filename, storage_path, model_label, model_score, created_at")
      .order("created_at", { ascending: false });
    if (error) { avisar("Error al listar: " + error.message); return []; }
    return data;
  }

  async function urlFirmada(path) {
    const { data } = await SB.storage.from(BUCKET).createSignedUrl(path, 3600);
    return data ? data.signedUrl : "";
  }

  async function cargarGaleria() {
    const data = await filas();
    galeriaVacia.hidden = data.length > 0;
    galeria.innerHTML = "";
    for (const row of data) {
      const url = await urlFirmada(row.storage_path);
      const fig = document.createElement("figure");
      fig.style.cursor = "pointer";
      const etiqueta = row.model_label
        ? `<figcaption class="hint" style="text-align:center">${escaparHTML(row.model_label)}</figcaption>`
        : `<figcaption class="hint" style="text-align:center">${escaparHTML(row.filename)}</figcaption>`;
      fig.innerHTML = `<img src="${url}" alt="${escaparHTML(row.filename)}" loading="lazy">${etiqueta}`;
      fig.addEventListener("click", () => abrir(row));
      galeria.append(fig);
    }
  }

  /* ----- Analizador ----- */
  async function abrir(row) {
    imagenActual = row;
    analizador.hidden = false;
    resultado.innerHTML = "";
    imgPaciente.crossOrigin = "anonymous";
    imgPaciente.src = await urlFirmada(row.storage_path);
    if (row.model_label) {
      pintarResultado(row.model_score != null ? Number(row.model_score) : null, row.model_label);
    }
    analizador.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  btnAnalizar.addEventListener("click", async () => {
    if (!imagenActual) return;
    if (!window.ort) { avisar("El motor del modelo no se ha cargado"); return; }
    btnAnalizar.disabled = true;
    resultado.innerHTML = `<p class="hint">Cargando el modelo y analizando… (la primera vez tarda unos segundos)</p>`;
    try {
      await esperarImagen(imgPaciente);
      const { cag } = await predecir(imgPaciente);
      const etiqueta = cag >= 0.5 ? "Posible CAG" : "Sin signos de CAG";
      pintarResultado(cag, etiqueta);
      await SB.from("midig_images")
        .update({ model_label: etiqueta, model_score: Number(cag.toFixed(4)) })
        .eq("id", imagenActual.id);
      cargarGaleria();
    } catch (e) {
      resultado.innerHTML = `<p style="color:var(--critical)">No se pudo analizar: ${escaparHTML(e.message)}</p>`;
    } finally {
      btnAnalizar.disabled = false;
    }
  });

  function pintarResultado(cag, etiqueta) {
    const pct = cag == null ? null : Math.round(cag * 100);
    const pos = cag != null && cag >= 0.5;
    resultado.innerHTML = `
      <div class="resultado-modelo ${pos ? "pos" : "neg"}">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          <span class="prob">${pct == null ? "—" : pct + "%"}</span>
          <strong>${escaparHTML(etiqueta)}</strong>
        </div>
        ${pct == null ? "" : `<div class="medidor"><span style="width:${pct}%"></span></div>`}
        <p class="hint" style="margin:6px 0 0">
          Probabilidad estimada de gastritis atrófica crónica según el modelo (clase 0).
          Resultado <strong>experimental y no diagnóstico</strong>; contrástalo con la imagen y el resto de datos clínicos.
        </p>
      </div>`;
  }

  function esperarImagen(img) {
    return img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("no se pudo cargar la imagen")); });
  }

  cargarGaleria();
}
