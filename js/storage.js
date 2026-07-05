/* Mi Digestión — almacenamiento local
 * Todos los datos se guardan SOLO en el dispositivo (localStorage).
 * No se envía nada a ningún servidor. */

const CLAVE = "midigestion.registros.v1";

/** Registro vacío de un día, según la especificación "Mi Día". */
export function registroVacio(fecha) {
  return {
    fecha, // "YYYY-MM-DD"
    // Bloque 1 — Síntomas digestivos
    dolor: { intensidad: null, momento: null }, // 0-10; "ayunas" | "despues" | "continuo"
    distension: null, // 0 Ninguna | 1 Leve | 2 Moderada | 3 Severa
    deposiciones: [], // [{ bristol: 1-7, incompleta: bool, urgencia: bool }]
    // Bloque 2 — Estilo de vida y bienestar (eje cerebro-intestino)
    estres: null, // 1-5
    actividad: null, // minutos
    descanso: { horas: null, calidad: null }, // "mal" | "regular" | "buen"
    preocupacion: null, // 1-5
    limitacion: null, // "nada" | "poco" | "mucho"
    // Bloque 3 — Consumo y hábitos
    consumo: { cafeina: 0, alcohol: 0, refrescos: 0 },
    comidaSospechosa: { si: null, detalle: "" },
    tabaco: { fuma: null, cigarrillos: 0 },
    notas: ""
  };
}

function leerTodo() {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return {};
    const datos = JSON.parse(bruto);
    return datos && typeof datos === "object" ? datos : {};
  } catch {
    return {};
  }
}

function escribirTodo(datos) {
  localStorage.setItem(CLAVE, JSON.stringify(datos));
}

/** Devuelve el registro de una fecha (o uno vacío sin guardar). */
export function obtenerRegistro(fecha) {
  const todo = leerTodo();
  const guardado = todo[fecha];
  if (!guardado) return registroVacio(fecha);
  // Fusionar con el esquema por si hay registros de versiones antiguas
  return { ...registroVacio(fecha), ...guardado, fecha };
}

export function guardarRegistro(registro) {
  const todo = leerTodo();
  todo[registro.fecha] = registro;
  escribirTodo(todo);
}

export function borrarRegistro(fecha) {
  const todo = leerTodo();
  delete todo[fecha];
  escribirTodo(todo);
}

/** Todos los registros ordenados por fecha ascendente. */
export function listarRegistros() {
  const todo = leerTodo();
  return Object.keys(todo)
    .sort()
    .map((f) => ({ ...registroVacio(f), ...todo[f], fecha: f }));
}

/** Registros de los últimos `dias` días (incluido hoy). */
export function registrosRecientes(dias) {
  const limite = new Date();
  limite.setDate(limite.getDate() - (dias - 1));
  const desde = fechaISO(limite);
  return listarRegistros().filter((r) => r.fecha >= desde);
}

export function fechaISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

export function fechaBonita(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString("es-ES", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

/* ---------- Etiquetas legibles ---------- */

export const ETIQUETAS = {
  momento: { ayunas: "En ayunas", despues: "Después de comer", continuo: "Continuo" },
  distension: ["Ninguna", "Leve", "Moderada", "Severa"],
  calidad: { mal: "Mal descanso", regular: "Regular", buen: "Buen descanso" },
  limitacion: { nada: "Para nada", poco: "Un poco", mucho: "Mucho" },
  estres: ["", "Muy relajado/a", "Relajado/a", "Neutral", "Estresado/a", "Muy estresado/a"],
  preocupacion: ["", "Nada", "Poco", "Algo", "Bastante", "Mucho"]
};

/* ---------- Exportación ---------- */

function csvSeguro(valor) {
  const s = String(valor ?? "");
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** CSV con una fila por día, apto para Excel/hoja de cálculo del profesional. */
export function exportarCSV(registros) {
  const cab = [
    "fecha", "dolor_0_10", "momento_dolor", "distension", "n_deposiciones",
    "tipos_bristol", "evac_incompleta", "urgencia", "estres_1_5",
    "actividad_min", "sueno_horas", "calidad_sueno", "preocupacion_1_5",
    "limitacion", "cafeina_tazas", "alcohol_copas", "refrescos_latas",
    "comida_sospechosa", "detalle_comida", "tabaco", "cigarrillos", "notas"
  ];
  const filas = registros.map((r) => [
    r.fecha,
    r.dolor.intensidad ?? "",
    r.dolor.momento ? ETIQUETAS.momento[r.dolor.momento] : "",
    r.distension == null ? "" : ETIQUETAS.distension[r.distension],
    r.deposiciones.length,
    r.deposiciones.map((d) => d.bristol).join(" "),
    r.deposiciones.some((d) => d.incompleta) ? "Sí" : "No",
    r.deposiciones.some((d) => d.urgencia) ? "Sí" : "No",
    r.estres ?? "",
    r.actividad ?? "",
    r.descanso.horas ?? "",
    r.descanso.calidad ? ETIQUETAS.calidad[r.descanso.calidad] : "",
    r.preocupacion ?? "",
    r.limitacion ? ETIQUETAS.limitacion[r.limitacion] : "",
    r.consumo.cafeina,
    r.consumo.alcohol,
    r.consumo.refrescos,
    r.comidaSospechosa.si == null ? "" : (r.comidaSospechosa.si ? "Sí" : "No"),
    r.comidaSospechosa.detalle,
    r.tabaco.fuma == null ? "" : (r.tabaco.fuma ? "Sí" : "No"),
    r.tabaco.fuma ? r.tabaco.cigarrillos : "",
    r.notas
  ].map(csvSeguro).join(";"));
  // BOM para que Excel abra el UTF-8 correctamente
  return "﻿" + [cab.join(";"), ...filas].join("\r\n");
}

export function exportarJSON() {
  return JSON.stringify({ version: 1, exportado: new Date().toISOString(), registros: leerTodo() }, null, 2);
}

/** Importa una copia de seguridad JSON. Devuelve el nº de días importados. */
export function importarJSON(texto) {
  const datos = JSON.parse(texto);
  const registros = datos && datos.registros;
  if (!registros || typeof registros !== "object") {
    throw new Error("El archivo no parece una copia de Mi Digestión.");
  }
  const todo = leerTodo();
  let n = 0;
  for (const [fecha, reg] of Object.entries(registros)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && reg && typeof reg === "object") {
      todo[fecha] = { ...registroVacio(fecha), ...reg, fecha };
      n++;
    }
  }
  escribirTodo(todo);
  return n;
}

export function borrarTodo() {
  localStorage.removeItem(CLAVE);
}

export function descargarArchivo(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
