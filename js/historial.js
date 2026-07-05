/* Historial e informe — evolución de síntomas y resumen para la consulta */

import { iniciarPagina, avisar } from "./ui.js";
import {
  registrosRecientes, exportarCSV, exportarJSON, importarJSON,
  borrarTodo, descargarArchivo, fechaISO, fechaBonita, ETIQUETAS
} from "./storage.js";
import { graficoLinea, graficoBarrasDias, graficoDistribucion } from "./charts.js";
import { BRISTOL } from "./bristol.js";

iniciarPagina();

let dias = 30;

function rangoFechas(nDias) {
  const fechas = [];
  const hoy = new Date();
  for (let i = nDias - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    fechas.push(fechaISO(d));
  }
  return fechas;
}

function media(valores) {
  const v = valores.filter((x) => x != null && !Number.isNaN(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function fmt(n, dec = 1) {
  return n == null ? "—" : n.toLocaleString("es-ES", { maximumFractionDigits: dec });
}

/* ---------- Render principal ---------- */

function pintar() {
  const registros = registrosRecientes(dias);
  const porFecha = Object.fromEntries(registros.map((r) => [r.fecha, r]));
  const fechas = rangoFechas(dias);
  const primeraFecha = fechas[0];
  const ultimaFecha = fechas[fechas.length - 1];

  document.getElementById("titulo-periodo").textContent =
    ` · del ${fechaBonita(primeraFecha)} al ${fechaBonita(ultimaFecha)}`;
  document.getElementById("informe-cabecera").textContent =
    `Periodo: ${fechaBonita(primeraFecha)} — ${fechaBonita(ultimaFecha)} · Generado el ${fechaBonita(fechaISO())}`;

  pintarStats(registros);
  pintarGraficos(fechas, porFecha, registros);
  pintarInforme(registros, primeraFecha, ultimaFecha);
  pintarTabla(registros);
}

function pintarStats(registros) {
  const nDias = registros.length;
  const dolorMedio = media(registros.map((r) => r.dolor.intensidad));
  const depsTotales = registros.reduce((s, r) => s + r.deposiciones.length, 0);
  const diasConUrgencia = registros.filter((r) => r.deposiciones.some((d) => d.urgencia)).length;
  const estresMedio = media(registros.map((r) => r.estres));

  const tiles = [
    { valor: nDias, etiqueta: `día${nDias === 1 ? "" : "s"} registrado${nDias === 1 ? "" : "s"} de ${dias}` },
    { valor: fmt(dolorMedio), etiqueta: "dolor medio (0-10)" },
    { valor: nDias ? fmt(depsTotales / nDias) : "—", etiqueta: "deposiciones al día (media)" },
    { valor: nDias ? Math.round((diasConUrgencia / nDias) * 100) + "%" : "—", etiqueta: "días con urgencia" },
  ];
  if (estresMedio != null) tiles[3] = { valor: fmt(estresMedio), etiqueta: "estrés medio (1-5)" };

  document.getElementById("stats").innerHTML = tiles.map((t) =>
    `<div class="stat-tile"><div class="valor">${t.valor}</div><div class="etiqueta">${t.etiqueta}</div></div>`
  ).join("");
}

function pintarGraficos(fechas, porFecha, registros) {
  const serie = (extraer, extra) => fechas.map((f) => {
    const r = porFecha[f];
    return { fecha: f, valor: r ? extraer(r) : null, extra: r && extra ? extra(r) : "" };
  });

  graficoLinea(document.getElementById("chart-dolor"), {
    titulo: "Dolor abdominal",
    subtitulo: "Escala 0 (sin dolor) a 10 (insoportable)",
    puntos: serie((r) => r.dolor.intensidad,
      (r) => r.dolor.momento ? ETIQUETAS.momento[r.dolor.momento] : ""),
    yMax: 10, ticks: [0, 5, 10],
    formatoValor: (v) => `dolor ${v}/10`
  });

  graficoLinea(document.getElementById("chart-distension"), {
    titulo: "Distensión abdominal",
    subtitulo: "0 ninguna · 1 leve · 2 moderada · 3 severa",
    puntos: serie((r) => r.distension),
    yMax: 3, ticks: [0, 1, 2, 3],
    formatoValor: (v) => ETIQUETAS.distension[v].toLowerCase()
  });

  graficoBarrasDias(document.getElementById("chart-deposiciones"), {
    titulo: "Deposiciones por día",
    subtitulo: "Número de veces al día",
    puntos: serie((r) => r.deposiciones.length,
      (r) => r.deposiciones.map((d) => "tipo " + d.bristol).join(", ")),
    yMax: Math.max(4, ...registros.map((r) => r.deposiciones.length)),
    ticks: [0, 2, 4].concat(Math.max(...registros.map((r) => r.deposiciones.length), 0) > 4
      ? [Math.max(...registros.map((r) => r.deposiciones.length))] : []),
    formatoValor: (v) => `${v} ${v === 1 ? "deposición" : "deposiciones"}`
  });

  const conteoBristol = Array.from({ length: 7 }, () => 0);
  for (const r of registros) for (const d of r.deposiciones) conteoBristol[d.bristol - 1]++;
  graficoDistribucion(document.getElementById("chart-bristol"), {
    titulo: "Tipos de heces (escala de Bristol)",
    subtitulo: "Cuántas veces has registrado cada tipo",
    categorias: conteoBristol.map((v, i) => ({
      etiqueta: String(i + 1), valor: v, detalle: BRISTOL[i].nombre
    })),
    grupos: [
      { desde: 0, hasta: 1, nombre: "estreñimiento" },
      { desde: 2, hasta: 4, nombre: "normal" },
      { desde: 5, hasta: 6, nombre: "diarrea" }
    ]
  });

  graficoLinea(document.getElementById("chart-estres"), {
    titulo: "Estrés",
    subtitulo: "1 muy relajado/a · 5 muy estresado/a",
    puntos: serie((r) => r.estres),
    yMin: 1, yMax: 5, ticks: [1, 3, 5],
    formatoValor: (v) => `estrés ${v}/5`
  });

  graficoLinea(document.getElementById("chart-sueno"), {
    titulo: "Horas de sueño",
    subtitulo: "Con la calidad percibida de cada noche",
    puntos: serie((r) => r.descanso.horas,
      (r) => r.descanso.calidad ? ETIQUETAS.calidad[r.descanso.calidad] : ""),
    yMax: 12, ticks: [0, 4, 8, 12],
    formatoValor: (v) => `${fmt(v)} h`
  });
}

/* ---------- Informe en texto ---------- */

function pintarInforme(registros, desde, hasta) {
  const destino = document.getElementById("informe-texto");
  const n = registros.length;
  if (!n) {
    destino.innerHTML = `<p>No hay registros en este periodo. Empieza por
      <a href="diario.html">registrar tu día</a>.</p>`;
    return;
  }

  const dolorMedio = media(registros.map((r) => r.dolor.intensidad));
  const dolorMax = Math.max(...registros.map((r) => r.dolor.intensidad ?? 0));
  const diasDolorAlto = registros.filter((r) => (r.dolor.intensidad ?? 0) >= 6).length;
  const momentos = registros.map((r) => r.dolor.momento).filter(Boolean);
  const momentoFrecuente = momentos.length
    ? Object.entries(momentos.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const distensiones = registros.map((r) => r.distension).filter((v) => v != null);
  const diasDistModer = distensiones.filter((v) => v >= 2).length;

  const depsTotales = registros.reduce((s, r) => s + r.deposiciones.length, 0);
  const todasDeps = registros.flatMap((r) => r.deposiciones);
  const conteo = Array.from({ length: 7 }, () => 0);
  todasDeps.forEach((d) => conteo[d.bristol - 1]++);
  const tipoFrecuente = todasDeps.length ? conteo.indexOf(Math.max(...conteo)) + 1 : null;
  const nUrgencia = todasDeps.filter((d) => d.urgencia).length;
  const nIncompleta = todasDeps.filter((d) => d.incompleta).length;

  const estresMedio = media(registros.map((r) => r.estres));
  const suenoMedio = media(registros.map((r) => r.descanso.horas));
  const actividadMedia = media(registros.map((r) => r.actividad));
  const diasLimitado = registros.filter((r) => r.limitacion === "poco" || r.limitacion === "mucho").length;
  const preocupacionMedia = media(registros.map((r) => r.preocupacion));

  const cafeMedia = media(registros.map((r) => r.consumo.cafeina));
  const alcoholMedia = media(registros.map((r) => r.consumo.alcohol));
  const refrescosMedia = media(registros.map((r) => r.consumo.refrescos));
  const diasFuma = registros.filter((r) => r.tabaco.fuma).length;

  const sospechosas = registros
    .filter((r) => r.comidaSospechosa.si && r.comidaSospechosa.detalle)
    .map((r) => `${fechaBonita(r.fecha)}: ${r.comidaSospechosa.detalle}`);

  const notas = registros.filter((r) => r.notas).map((r) => `${fechaBonita(r.fecha)}: ${r.notas}`);

  destino.innerHTML = `
    <p><strong>${n} día${n === 1 ? "" : "s"} registrado${n === 1 ? "" : "s"}</strong> entre el ${fechaBonita(desde)} y el ${fechaBonita(hasta)}.</p>
    <h3>Síntomas digestivos</h3>
    <ul>
      <li>Dolor abdominal medio de <strong>${fmt(dolorMedio)}/10</strong> (máximo ${dolorMax}/10);
          ${diasDolorAlto} día${diasDolorAlto === 1 ? "" : "s"} con dolor intenso (≥6).
          ${momentoFrecuente ? `Aparece sobre todo <strong>${ETIQUETAS.momento[momentoFrecuente].toLowerCase()}</strong>.` : ""}</li>
      <li>Distensión (hinchazón) moderada o severa en <strong>${diasDistModer} de ${distensiones.length || n} días</strong> valorados.</li>
      <li><strong>${depsTotales}</strong> deposiciones en total (media ${fmt(depsTotales / n)} al día).
          ${tipoFrecuente ? `Tipo de Bristol más frecuente: <strong>${tipoFrecuente}</strong>.` : ""}
          ${nUrgencia ? `Con urgencia: ${nUrgencia}.` : ""}
          ${nIncompleta ? `Con sensación de evacuación incompleta: ${nIncompleta}.` : ""}</li>
    </ul>
    <h3>Estilo de vida (eje cerebro-intestino)</h3>
    <ul>
      <li>Estrés medio: <strong>${fmt(estresMedio)}/5</strong>. Preocupación por los síntomas: ${fmt(preocupacionMedia)}/5.</li>
      <li>Sueño medio: <strong>${fmt(suenoMedio)} h</strong>. Actividad física media: ${fmt(actividadMedia, 0)} min/día.</li>
      <li>Los síntomas limitaron sus actividades en <strong>${diasLimitado} día${diasLimitado === 1 ? "" : "s"}</strong>.</li>
    </ul>
    <h3>Consumo y hábitos</h3>
    <ul>
      <li>Cafeína: ${fmt(cafeMedia)} tazas/día · Alcohol: ${fmt(alcoholMedia)} copas/día · Refrescos: ${fmt(refrescosMedia)} latas/día.</li>
      <li>Tabaco: ${diasFuma ? `fumó en ${diasFuma} de ${n} días` : "no fumó en el periodo"}.</li>
    </ul>
    ${sospechosas.length ? `<h3>Comidas que el paciente relaciona con sus síntomas</h3>
      <ul>${sospechosas.map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}
    ${notas.length ? `<h3>Notas del paciente</h3>
      <ul>${notas.map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}
  `;
}

/* ---------- Tabla ---------- */

function pintarTabla(registros) {
  const cuerpo = document.querySelector("#tabla-registros tbody");
  if (!registros.length) {
    cuerpo.innerHTML = `<tr><td colspan="10">Sin registros en este periodo.</td></tr>`;
    return;
  }
  cuerpo.innerHTML = [...registros].reverse().map((r) => `
    <tr>
      <td>${fechaBonita(r.fecha)}</td>
      <td>${r.dolor.intensidad ?? "—"}</td>
      <td>${r.distension == null ? "—" : ETIQUETAS.distension[r.distension]}</td>
      <td>${r.deposiciones.length}</td>
      <td>${r.deposiciones.map((d) => d.bristol).join(" ") || "—"}</td>
      <td>${r.estres ?? "—"}</td>
      <td>${r.descanso.horas ?? "—"}</td>
      <td>${r.consumo.cafeina}</td>
      <td>${r.consumo.alcohol}</td>
      <td>${r.tabaco.fuma == null ? "—" : r.tabaco.fuma ? r.tabaco.cigarrillos || "Sí" : "No"}</td>
    </tr>`).join("");
}

/* ---------- Acciones ---------- */

document.getElementById("selector-periodo").addEventListener("change", (ev) => {
  if (ev.target.name === "periodo") {
    dias = Number(ev.target.value);
    pintar();
  }
});

document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

document.getElementById("btn-csv").addEventListener("click", () => {
  const registros = registrosRecientes(dias);
  if (!registros.length) { avisar("No hay registros que exportar"); return; }
  descargarArchivo(`mi-digestion_${fechaISO()}.csv`, exportarCSV(registros), "text/csv;charset=utf-8");
});

document.getElementById("btn-copia").addEventListener("click", () => {
  descargarArchivo(`mi-digestion_copia_${fechaISO()}.json`, exportarJSON(), "application/json");
  avisar("Copia de seguridad descargada");
});

const inputArchivo = document.getElementById("archivo-copia");
document.getElementById("btn-restaurar").addEventListener("click", () => inputArchivo.click());
inputArchivo.addEventListener("change", async () => {
  const archivo = inputArchivo.files[0];
  if (!archivo) return;
  try {
    const n = importarJSON(await archivo.text());
    avisar(`Copia restaurada: ${n} día${n === 1 ? "" : "s"}`);
    pintar();
  } catch (e) {
    avisar("No se pudo leer la copia: " + e.message);
  }
  inputArchivo.value = "";
});

document.getElementById("btn-borrar").addEventListener("click", () => {
  const seguro = confirm("¿Seguro que quieres borrar TODOS tus registros de este dispositivo?\n\nEsta acción no se puede deshacer. Te recomendamos descargar antes una copia de seguridad.");
  if (!seguro) return;
  borrarTodo();
  avisar("Registros borrados");
  pintar();
});

/* Redibujar al cambiar el tamaño (los SVG usan el ancho del contenedor) */
let timerResize = null;
window.addEventListener("resize", () => {
  clearTimeout(timerResize);
  timerResize = setTimeout(pintar, 250);
});

pintar();
