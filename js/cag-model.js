/* Inferencia del modelo CAG (DenseNet121) en el navegador con onnxruntime-web.
 * Requiere que window.ort esté cargado (js/vendor/ort/ort.wasm.min.js).
 *
 * IMPORTANTE (mapeo de clases): validado con las 2 imágenes de muestra del
 * repositorio original, el índice 0 corresponde a CAG (gastritis atrófica) y
 * el índice 1 a "sin hallazgos". Es una inferencia con pocas muestras: la
 * herramienta es experimental y NO diagnóstica. */

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const RUTA_MODELO = "modelo/cag_densenet.onnx";

let sesionPromesa = null;

export function modeloDisponible() {
  return typeof window !== "undefined" && !!window.ort;
}

export function cargarModelo() {
  if (sesionPromesa) return sesionPromesa;
  const ort = window.ort;
  if (!ort) return Promise.reject(new Error("onnxruntime-web no está cargado"));
  ort.env.wasm.numThreads = 1;      // sin SharedArrayBuffer (GitHub Pages no aísla origen)
  ort.env.wasm.simd = true;
  ort.env.wasm.wasmPaths = new URL("js/vendor/ort/", location.href).href;
  sesionPromesa = ort.InferenceSession.create(RUTA_MODELO, { executionProviders: ["wasm"] });
  return sesionPromesa;
}

/** Convierte un <img>/<canvas> a tensor [1,3,224,224] (resize lado corto 256 + center crop 224 + normalización ImageNet). */
export function preprocesar(fuente) {
  const w = fuente.naturalWidth || fuente.width;
  const h = fuente.naturalHeight || fuente.height;
  const escala = 256 / Math.min(w, h);
  const sw = 224 / escala, sh = 224 / escala;
  const sx = (w - sw) / 2, sy = (h - sh) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = 224; canvas.height = 224;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(fuente, sx, sy, sw, sh, 0, 0, 224, 224);
  const { data } = ctx.getImageData(0, 0, 224, 224);

  const out = new Float32Array(3 * 224 * 224);
  const plano = 224 * 224;
  for (let i = 0; i < plano; i++) {
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255;
    out[i] = (r - MEAN[0]) / STD[0];
    out[plano + i] = (g - MEAN[1]) / STD[1];
    out[2 * plano + i] = (b - MEAN[2]) / STD[2];
  }
  return out;
}

/** Ejecuta el modelo sobre una imagen. Devuelve { cag, sano } (probabilidades 0-1). */
export async function predecir(fuente) {
  const sesion = await cargarModelo();
  const datos = preprocesar(fuente);
  const tensor = new window.ort.Tensor("float32", datos, [1, 3, 224, 224]);
  const salida = await sesion.run({ input: tensor });
  const p = (salida.prob || salida[Object.keys(salida)[0]]).data;
  return { cag: p[0], sano: p[1] };
}
