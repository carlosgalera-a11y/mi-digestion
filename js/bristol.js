/* Escala de Bristol — datos e ilustraciones SVG compartidas */

export const BRISTOL = [
  {
    tipo: 1,
    nombre: "Bolas duras y separadas",
    descripcion: "Trozos duros y sueltos, como nueces, difíciles de expulsar.",
    grupo: "dura",
    significado: "Sugiere estreñimiento importante."
  },
  {
    tipo: 2,
    nombre: "Con forma pero grumosa",
    descripcion: "Con forma alargada pero compacta y grumosa.",
    grupo: "dura",
    significado: "Sugiere estreñimiento leve."
  },
  {
    tipo: 3,
    nombre: "Con grietas en la superficie",
    descripcion: "Con forma alargada y grietas en la superficie.",
    grupo: "normal",
    significado: "Se considera dentro de lo normal."
  },
  {
    tipo: 4,
    nombre: "Lisa y blanda",
    descripcion: "Con forma alargada, lisa y blanda, como una salchicha.",
    grupo: "normal",
    significado: "El tipo considerado ideal."
  },
  {
    tipo: 5,
    nombre: "Trozos blandos",
    descripcion: "Trozos blandos con bordes definidos, fáciles de expulsar.",
    grupo: "normal",
    significado: "En el límite; puede indicar tendencia a diarrea."
  },
  {
    tipo: 6,
    nombre: "Trozos pastosos",
    descripcion: "Trozos blandos y esponjosos con bordes irregulares.",
    grupo: "liquida",
    significado: "Sugiere diarrea leve."
  },
  {
    tipo: 7,
    nombre: "Líquida",
    descripcion: "Totalmente líquida, sin trozos sólidos.",
    grupo: "liquida",
    significado: "Diarrea."
  }
];

export const GRUPOS = {
  dura: "Estreñimiento",
  normal: "Rango normal",
  liquida: "Diarrea"
};

/** Ilustración esquemática de cada tipo (SVG accesible, hereda el color del texto). */
export function svgBristol(tipo, tam = 56) {
  const formas = {
    1: '<circle cx="14" cy="20" r="6"/><circle cx="32" cy="14" r="6"/><circle cx="48" cy="22" r="6"/><circle cx="24" cy="34" r="6"/><circle cx="42" cy="36" r="6"/>',
    2: '<rect x="6" y="16" width="52" height="18" rx="9"/><circle cx="18" cy="20" r="3" data-hueco="1"/><circle cx="30" cy="30" r="3" data-hueco="1"/><circle cx="42" cy="21" r="3" data-hueco="1"/>',
    3: '<rect x="6" y="17" width="52" height="16" rx="8"/><line x1="18" y1="17" x2="16" y2="33"/><line x1="30" y1="17" x2="28" y2="33"/><line x1="42" y1="17" x2="40" y2="33"/>',
    4: '<rect x="6" y="18" width="52" height="14" rx="7"/>',
    5: '<ellipse cx="16" cy="20" rx="9" ry="6"/><ellipse cx="38" cy="16" rx="9" ry="6"/><ellipse cx="28" cy="33" rx="10" ry="6"/><ellipse cx="48" cy="32" rx="8" ry="6"/>',
    6: '<path d="M8 24 Q12 14 20 18 Q26 10 34 16 Q44 10 48 20 Q58 22 52 30 Q54 38 44 36 Q36 42 28 36 Q16 40 12 32 Q4 30 8 24 Z"/>',
    7: '<path d="M6 22 Q16 16 26 22 T46 22 T58 22 L58 30 Q48 36 38 30 T18 30 T6 30 Z"/>'
  };
  const relleno = tipo === 2
    ? formas[2].replace(/<circle([^/]*)data-hueco="1"\/>/g, '<circle$1 fill="var(--surface-1, #fff)"/>')
    : formas[tipo];
  return `<svg class="mini" width="${tam}" height="${Math.round(tam * 0.78)}" viewBox="0 0 64 50" role="img"
    aria-label="Tipo ${tipo} de la escala de Bristol"
    fill="currentColor" stroke="var(--surface-1, #fff)" stroke-width="${tipo === 3 ? 2 : 0}">
    ${relleno}
  </svg>`;
}
