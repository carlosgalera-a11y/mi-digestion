/* Mi Digestión — gráficos SVG ligeros (sin dependencias)
 * Un gráfico = una serie, un eje. Tooltip al pasar el dedo o el ratón. */

const NS = "http://www.w3.org/2000/svg";

let tooltip = null;
function obtenerTooltip() {
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "viz-tooltip";
    document.body.append(tooltip);
  }
  return tooltip;
}

function mostrarTooltip(html, x, y) {
  const t = obtenerTooltip();
  t.innerHTML = html;
  t.style.display = "block";
  const r = t.getBoundingClientRect();
  const px = Math.min(Math.max(8, x - r.width / 2), window.innerWidth - r.width - 8);
  const py = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
  t.style.left = px + "px";
  t.style.top = py + "px";
}

export function ocultarTooltip() {
  if (tooltip) tooltip.style.display = "none";
}

function el(nombre, atributos = {}) {
  const nodo = document.createElementNS(NS, nombre);
  for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, v);
  return nodo;
}

function etiquetaFecha(iso) {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}

const ALTO = 190;
const MARGEN = { arriba: 14, derecha: 10, abajo: 26, izquierda: 30 };

function base(contenedor, titulo, subtitulo, descripcion) {
  contenedor.innerHTML = "";
  contenedor.classList.add("viz-root");
  const h = document.createElement("p");
  h.className = "viz-titulo";
  h.textContent = titulo;
  const s = document.createElement("p");
  s.className = "viz-sub";
  s.textContent = subtitulo;
  const ancho = Math.max(260, contenedor.clientWidth - 8 || 300);
  const svg = el("svg", {
    width: "100%", viewBox: `0 0 ${ancho} ${ALTO}`, role: "img",
    "aria-label": descripcion
  });
  contenedor.append(h, s, svg);
  return { svg, ancho };
}

function rejillaY(svg, escalaY, ticks, ancho, formato = (v) => v) {
  for (const v of ticks) {
    const y = escalaY(v);
    svg.append(el("line", {
      x1: MARGEN.izquierda, x2: ancho - MARGEN.derecha, y1: y, y2: y,
      stroke: "var(--grid)", "stroke-width": 1
    }));
    const texto = el("text", {
      x: MARGEN.izquierda - 6, y: y + 3.5, "text-anchor": "end",
      "font-size": 10.5, fill: "var(--muted)"
    });
    texto.textContent = formato(v);
    svg.append(texto);
  }
}

function etiquetasX(svg, fechas, escalaX, ancho) {
  if (!fechas.length) return;
  const indices = fechas.length <= 4
    ? fechas.map((_, i) => i)
    : [0, Math.floor((fechas.length - 1) / 2), fechas.length - 1];
  for (const i of indices) {
    const texto = el("text", {
      x: escalaX(i), y: ALTO - 8, "text-anchor": "middle",
      "font-size": 10.5, fill: "var(--muted)"
    });
    texto.textContent = etiquetaFecha(fechas[i]);
    svg.append(texto);
  }
}

function sinDatos(svg, ancho) {
  const texto = el("text", {
    x: ancho / 2, y: ALTO / 2, "text-anchor": "middle",
    "font-size": 12, fill: "var(--muted)"
  });
  texto.textContent = "Aún no hay datos en este periodo";
  svg.append(texto);
}

/** Gráfico de línea de una serie temporal.
 * puntos: [{fecha, valor|null}] ordenados; los null se omiten. */
export function graficoLinea(contenedor, opciones) {
  const { titulo, subtitulo, puntos, yMax, yMin = 0, ticks, formatoValor = (v) => v } = opciones;
  const validos = puntos.map((p, i) => ({ ...p, i })).filter((p) => p.valor != null);
  const { svg, ancho } = base(contenedor, titulo, subtitulo,
    `${titulo}. Gráfico de línea con ${validos.length} días con datos.`);

  const innerAncho = ancho - MARGEN.izquierda - MARGEN.derecha;
  const innerAlto = ALTO - MARGEN.arriba - MARGEN.abajo;
  const n = puntos.length;
  const escalaX = (i) => MARGEN.izquierda + (n <= 1 ? innerAncho / 2 : (i / (n - 1)) * innerAncho);
  const escalaY = (v) => MARGEN.arriba + innerAlto - ((v - yMin) / (yMax - yMin)) * innerAlto;

  rejillaY(svg, escalaY, ticks, ancho);
  etiquetasX(svg, puntos.map((p) => p.fecha), escalaX, ancho);

  if (!validos.length) { sinDatos(svg, ancho); return; }

  // Trazo: segmentos continuos entre días consecutivos con dato
  let d = "";
  for (let k = 0; k < validos.length; k++) {
    const p = validos[k];
    const cmd = k > 0 && validos[k - 1].i === p.i - 1 ? "L" : "M";
    d += `${cmd}${escalaX(p.i).toFixed(1)},${escalaY(p.valor).toFixed(1)}`;
  }
  svg.append(el("path", {
    d, fill: "none", stroke: "var(--series-1)",
    "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round"
  }));

  for (const p of validos) {
    svg.append(el("circle", {
      cx: escalaX(p.i), cy: escalaY(p.valor), r: 4,
      fill: "var(--series-1)", stroke: "var(--surface-1)", "stroke-width": 2
    }));
  }

  // Capa de interacción: cruz + tooltip del día más cercano
  const cursor = el("line", {
    y1: MARGEN.arriba, y2: ALTO - MARGEN.abajo,
    stroke: "var(--baseline)", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0
  });
  svg.append(cursor);

  const zona = el("rect", {
    x: MARGEN.izquierda, y: 0, width: innerAncho, height: ALTO,
    fill: "transparent"
  });
  svg.append(zona);

  zona.addEventListener("pointermove", (ev) => {
    const caja = svg.getBoundingClientRect();
    const relX = ((ev.clientX - caja.left) / caja.width) * ancho;
    let cercano = null, dist = Infinity;
    for (const p of validos) {
      const dx = Math.abs(escalaX(p.i) - relX);
      if (dx < dist) { dist = dx; cercano = p; }
    }
    if (!cercano) return;
    cursor.setAttribute("x1", escalaX(cercano.i));
    cursor.setAttribute("x2", escalaX(cercano.i));
    cursor.setAttribute("opacity", 1);
    mostrarTooltip(
      `<strong>${etiquetaFecha(cercano.fecha)}</strong> · ${formatoValor(cercano.valor)}${cercano.extra ? "<br>" + cercano.extra : ""}`,
      ev.clientX, ev.clientY
    );
  });
  zona.addEventListener("pointerleave", () => {
    cursor.setAttribute("opacity", 0);
    ocultarTooltip();
  });
}

/** Gráfico de barras por día (magnitud, una serie). */
export function graficoBarrasDias(contenedor, opciones) {
  const { titulo, subtitulo, puntos, yMax, ticks, formatoValor = (v) => v } = opciones;
  const { svg, ancho } = base(contenedor, titulo, subtitulo,
    `${titulo}. Gráfico de barras con un valor por día.`);

  const innerAncho = ancho - MARGEN.izquierda - MARGEN.derecha;
  const innerAlto = ALTO - MARGEN.arriba - MARGEN.abajo;
  const n = puntos.length;
  const paso = innerAncho / Math.max(1, n);
  const anchoBarra = Math.max(3, Math.min(26, paso - 2));
  const escalaY = (v) => MARGEN.arriba + innerAlto - (v / yMax) * innerAlto;
  const centroX = (i) => MARGEN.izquierda + paso * i + paso / 2;

  rejillaY(svg, escalaY, ticks, ancho);
  etiquetasX(svg, puntos.map((p) => p.fecha), centroX, ancho);

  const conDatos = puntos.filter((p) => p.valor != null && p.valor > 0);
  if (!puntos.some((p) => p.valor != null)) { sinDatos(svg, ancho); return; }

  for (let i = 0; i < n; i++) {
    const p = puntos[i];
    if (p.valor == null || p.valor === 0) continue;
    const y = escalaY(p.valor);
    const barra = el("rect", {
      x: centroX(i) - anchoBarra / 2, y,
      width: anchoBarra, height: ALTO - MARGEN.abajo - y,
      rx: Math.min(4, anchoBarra / 2), fill: "var(--series-1)"
    });
    barra.addEventListener("pointermove", (ev) => {
      mostrarTooltip(`<strong>${etiquetaFecha(p.fecha)}</strong> · ${formatoValor(p.valor)}${p.extra ? "<br>" + p.extra : ""}`, ev.clientX, ev.clientY);
    });
    barra.addEventListener("pointerleave", ocultarTooltip);
    svg.append(barra);
  }

  // Línea base
  svg.append(el("line", {
    x1: MARGEN.izquierda, x2: ancho - MARGEN.derecha,
    y1: ALTO - MARGEN.abajo, y2: ALTO - MARGEN.abajo,
    stroke: "var(--baseline)", "stroke-width": 1
  }));
  void conDatos;
}

/** Distribución por categorías (p. ej. tipos de Bristol 1-7). */
export function graficoDistribucion(contenedor, opciones) {
  const { titulo, subtitulo, categorias, grupos = [] } = opciones;
  const total = categorias.reduce((s, c) => s + c.valor, 0);
  const { svg, ancho } = base(contenedor, titulo, subtitulo,
    `${titulo}. Barras por categoría, total ${total}.`);

  const margenAbajo = grupos.length ? 40 : MARGEN.abajo;
  const innerAncho = ancho - MARGEN.izquierda - MARGEN.derecha;
  const innerAlto = ALTO - MARGEN.arriba - margenAbajo;
  const n = categorias.length;
  const paso = innerAncho / n;
  const anchoBarra = Math.min(34, paso - 8);
  const maxV = Math.max(1, ...categorias.map((c) => c.valor));
  const escalaY = (v) => MARGEN.arriba + innerAlto - (v / maxV) * innerAlto;
  const centroX = (i) => MARGEN.izquierda + paso * i + paso / 2;

  const ticks = maxV <= 4 ? Array.from({ length: maxV + 1 }, (_, i) => i)
    : [0, Math.round(maxV / 2), maxV];
  for (const v of ticks) {
    const y = escalaY(v);
    svg.append(el("line", { x1: MARGEN.izquierda, x2: ancho - MARGEN.derecha, y1: y, y2: y, stroke: "var(--grid)", "stroke-width": 1 }));
    const t = el("text", { x: MARGEN.izquierda - 6, y: y + 3.5, "text-anchor": "end", "font-size": 10.5, fill: "var(--muted)" });
    t.textContent = v;
    svg.append(t);
  }

  if (total === 0) { sinDatos(svg, ancho); return; }

  categorias.forEach((c, i) => {
    if (c.valor > 0) {
      const y = escalaY(c.valor);
      const barra = el("rect", {
        x: centroX(i) - anchoBarra / 2, y,
        width: anchoBarra, height: ALTO - margenAbajo - y,
        rx: 4, fill: "var(--series-1)"
      });
      barra.addEventListener("pointermove", (ev) =>
        mostrarTooltip(`<strong>${c.etiqueta}</strong> · ${c.valor} ${c.valor === 1 ? "vez" : "veces"}${c.detalle ? "<br>" + c.detalle : ""}`, ev.clientX, ev.clientY));
      barra.addEventListener("pointerleave", ocultarTooltip);
      svg.append(barra);
      // Etiqueta directa del valor sobre la barra
      const val = el("text", { x: centroX(i), y: y - 4, "text-anchor": "middle", "font-size": 10.5, fill: "var(--text-secondary)", "font-weight": 600 });
      val.textContent = c.valor;
      svg.append(val);
    }
    const t = el("text", { x: centroX(i), y: ALTO - margenAbajo + 14, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)" });
    t.textContent = c.etiqueta;
    svg.append(t);
  });

  // Corchetes de grupo bajo el eje (p. ej. estreñimiento / normal / diarrea)
  for (const g of grupos) {
    const x1 = centroX(g.desde) - anchoBarra / 2;
    const x2 = centroX(g.hasta) + anchoBarra / 2;
    const y = ALTO - margenAbajo + 22;
    svg.append(el("line", { x1, x2, y1: y, y2: y, stroke: "var(--baseline)", "stroke-width": 1 }));
    const t = el("text", { x: (x1 + x2) / 2, y: y + 12, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" });
    t.textContent = g.nombre;
    svg.append(t);
  }

  svg.append(el("line", {
    x1: MARGEN.izquierda, x2: ancho - MARGEN.derecha,
    y1: ALTO - margenAbajo, y2: ALTO - margenAbajo,
    stroke: "var(--baseline)", "stroke-width": 1
  }));
}
