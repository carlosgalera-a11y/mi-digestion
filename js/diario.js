/* Mi Día — lógica del registro diario */

import { iniciarPagina, avisar } from "./ui.js";
import { obtenerRegistro, guardarRegistro, fechaISO, ETIQUETAS } from "./storage.js";
import { BRISTOL, svgBristol } from "./bristol.js";

iniciarPagina();

const form = document.getElementById("form-diario");
const inputFecha = document.getElementById("fecha");
const estadoGuardado = document.getElementById("estado-guardado");

let registro = null;
let estresTocado = false;

/* ---------- Construcción de controles dinámicos ---------- */

const grupoDolor = document.getElementById("grupo-dolor");
grupoDolor.innerHTML = Array.from({ length: 11 }, (_, i) =>
  `<label><input type="radio" name="dolor" value="${i}"><span>${i}</span></label>`
).join("");

const selectorBristol = document.getElementById("selector-bristol");
selectorBristol.innerHTML = BRISTOL.map((b) =>
  `<label title="Tipo ${b.tipo}: ${b.nombre}">
     <input type="radio" name="bristol" value="${b.tipo}">
     ${svgBristol(b.tipo, 40)}
     <span class="n">${b.tipo}</span>
   </label>`
).join("");

/* ---------- Utilidades de formulario ---------- */

function marcarRadio(nombre, valor) {
  form.querySelectorAll(`input[name="${nombre}"]`).forEach((r) => {
    r.checked = valor != null && String(valor) === r.value;
  });
}

function radioMarcado(nombre) {
  const r = form.querySelector(`input[name="${nombre}"]:checked`);
  return r ? r.value : null;
}

/* ---------- Cargar y pintar un día ---------- */

function cargarDia(fecha) {
  registro = obtenerRegistro(fecha);
  estresTocado = registro.estres != null;

  marcarRadio("dolor", registro.dolor.intensidad);
  marcarRadio("momento", registro.dolor.momento);
  marcarRadio("distension", registro.distension);
  marcarRadio("calidad-sueno", registro.descanso.calidad);
  marcarRadio("preocupacion", registro.preocupacion);
  marcarRadio("limitacion", registro.limitacion);
  marcarRadio("comida-mal", registro.comidaSospechosa.si == null ? null : (registro.comidaSospechosa.si ? "si" : "no"));
  marcarRadio("tabaco", registro.tabaco.fuma == null ? null : (registro.tabaco.fuma ? "si" : "no"));

  document.getElementById("estres").value = registro.estres ?? 3;
  document.getElementById("actividad").value = registro.actividad ?? "";
  document.getElementById("sueno-horas").value = registro.descanso.horas ?? "";
  document.getElementById("comida-detalle").value = registro.comidaSospechosa.detalle || "";
  document.getElementById("cigarrillos").value = registro.tabaco.cigarrillos || "";
  document.getElementById("notas").value = registro.notas || "";

  form.querySelectorAll('.contador').forEach((c) => {
    c.querySelector(".valor").textContent = registro.consumo[c.dataset.contador] ?? 0;
  });

  marcarRadio("bristol", null);
  document.getElementById("dep-incompleta").checked = false;
  document.getElementById("dep-urgencia").checked = false;

  actualizarVisibilidad();
  pintarEstres();
  pintarDeposiciones();
  estadoGuardado.textContent = "";
}

function actualizarVisibilidad() {
  const dolor = radioMarcado("dolor");
  document.getElementById("campo-momento").hidden = !(dolor != null && Number(dolor) > 0);
  document.getElementById("campo-comida").hidden = radioMarcado("comida-mal") !== "si";
  document.getElementById("campo-cigarrillos").hidden = radioMarcado("tabaco") !== "si";
}

function pintarEstres() {
  const v = Number(document.getElementById("estres").value);
  document.getElementById("valor-estres").textContent =
    estresTocado ? `${v} · ${ETIQUETAS.estres[v]}` : "sin indicar";
}

function pintarDeposiciones() {
  const lista = document.getElementById("lista-deposiciones");
  lista.innerHTML = registro.deposiciones.map((d, i) => {
    const info = BRISTOL[d.bristol - 1];
    const extras = [d.incompleta ? "evacuación incompleta" : null, d.urgencia ? "con urgencia" : null]
      .filter(Boolean).join(", ");
    return `<li>
      <strong>Nº ${i + 1}</strong> · Bristol tipo ${d.bristol} (${info.nombre.toLowerCase()})${extras ? " · " + extras : ""}
      <button type="button" class="quitar" data-indice="${i}" aria-label="Eliminar la deposición ${i + 1}">✕</button>
    </li>`;
  }).join("");
  const n = registro.deposiciones.length;
  document.getElementById("resumen-deposiciones").textContent =
    n === 0 ? "Hoy no has registrado ninguna deposición todavía."
            : `Frecuencia de hoy: ${n} ${n === 1 ? "vez" : "veces"}.`;
}

/* ---------- Recoger el formulario en el registro ---------- */

function recogerFormulario() {
  const dolor = radioMarcado("dolor");
  registro.dolor.intensidad = dolor == null ? null : Number(dolor);
  registro.dolor.momento = registro.dolor.intensidad > 0 ? radioMarcado("momento") : null;

  const dist = radioMarcado("distension");
  registro.distension = dist == null ? null : Number(dist);

  registro.estres = estresTocado ? Number(document.getElementById("estres").value) : null;

  const act = document.getElementById("actividad").value;
  registro.actividad = act === "" ? null : Math.max(0, Number(act));

  const horas = document.getElementById("sueno-horas").value;
  registro.descanso.horas = horas === "" ? null : Math.min(24, Math.max(0, Number(horas)));
  registro.descanso.calidad = radioMarcado("calidad-sueno");

  const preo = radioMarcado("preocupacion");
  registro.preocupacion = preo == null ? null : Number(preo);
  registro.limitacion = radioMarcado("limitacion");

  const comida = radioMarcado("comida-mal");
  registro.comidaSospechosa.si = comida == null ? null : comida === "si";
  registro.comidaSospechosa.detalle = comida === "si" ? document.getElementById("comida-detalle").value.trim() : "";

  const tabaco = radioMarcado("tabaco");
  registro.tabaco.fuma = tabaco == null ? null : tabaco === "si";
  registro.tabaco.cigarrillos = tabaco === "si" ? Math.max(0, Number(document.getElementById("cigarrillos").value) || 0) : 0;

  registro.notas = document.getElementById("notas").value.trim();
}

/* ---------- Eventos ---------- */

inputFecha.max = fechaISO();
inputFecha.value = fechaISO();
cargarDia(inputFecha.value);

inputFecha.addEventListener("change", () => {
  if (!inputFecha.value) inputFecha.value = fechaISO();
  cargarDia(inputFecha.value);
});

form.addEventListener("change", (ev) => {
  if (ev.target.name === "dolor" || ev.target.name === "comida-mal" || ev.target.name === "tabaco") {
    actualizarVisibilidad();
  }
});

document.getElementById("estres").addEventListener("input", () => {
  estresTocado = true;
  pintarEstres();
});

form.querySelectorAll(".contador").forEach((c) => {
  c.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      const clave = c.dataset.contador;
      const nuevo = Math.max(0, (registro.consumo[clave] ?? 0) + Number(b.dataset.paso));
      registro.consumo[clave] = nuevo;
      c.querySelector(".valor").textContent = nuevo;
    });
  });
});

document.getElementById("btn-registrar-deposicion").addEventListener("click", () => {
  const tipo = radioMarcado("bristol");
  if (tipo == null) {
    avisar("Elige primero el tipo de heces (1 a 7)");
    return;
  }
  registro.deposiciones.push({
    bristol: Number(tipo),
    incompleta: document.getElementById("dep-incompleta").checked,
    urgencia: document.getElementById("dep-urgencia").checked
  });
  marcarRadio("bristol", null);
  document.getElementById("dep-incompleta").checked = false;
  document.getElementById("dep-urgencia").checked = false;
  pintarDeposiciones();
  guardarTodo("Deposición registrada");
});

document.getElementById("lista-deposiciones").addEventListener("click", (ev) => {
  const btn = ev.target.closest(".quitar");
  if (!btn) return;
  registro.deposiciones.splice(Number(btn.dataset.indice), 1);
  pintarDeposiciones();
  guardarTodo("Deposición eliminada");
});

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  guardarTodo("Día guardado ✓");
});

function guardarTodo(mensaje) {
  recogerFormulario();
  guardarRegistro(registro);
  estadoGuardado.textContent = "Guardado en este dispositivo ✓";
  avisar(mensaje);
}
