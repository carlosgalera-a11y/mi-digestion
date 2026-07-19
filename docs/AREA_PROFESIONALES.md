# Área de profesionales — configuración

El área de profesionales usa **Supabase** (proyecto *Filehub*) para el acceso real,
el almacenamiento de documentos e imágenes, y la IA del megacuaderno. Todos los
objetos creados llevan el prefijo `midig_` / `midig-` y no afectan al resto del proyecto.

## Qué se ha creado en Supabase

- **Tablas**: `midig_professionals` (lista de acceso con roles), `midig_documents`, `midig_images`.
- **Funciones**: `midig_is_allowed()`, `midig_is_superadmin()` (usadas por las políticas RLS).
- **Buckets privados**: `midig-docs`, `midig-images` (solo profesionales autorizados).
- **Edge function**: `midig-ask` (responde preguntas sobre los documentos con IA).
- **Superadmin inicial**: `carlosgalera2roman@gmail.com`.

## Pasos que debes dar tú (una sola vez)

### 1. Permitir la URL de la web en Supabase Auth

Para que el enlace de acceso por correo funcione:

1. Entra en el panel de Supabase → proyecto **Filehub** → **Authentication** → **URL Configuration**.
2. En **Redirect URLs**, añade:
   `https://carlosgalera-a11y.github.io/mi-digestion/profesionales.html`
3. (Recomendado) En **Site URL** puedes dejar la que ya tengas.

> Si además quieres que el correo incluya el **código de 6 dígitos** (alternativa al enlace),
> en **Authentication → Email Templates → Magic Link** añade `{{ .Token }}` en el cuerpo.

### 2. Nombrar a Montse superadministradora

Cuando tengas su correo, entra en el área de profesionales con tu cuenta
(`carlosgalera2roman@gmail.com`), abre **Accesos** y añádela con rol **Superadministradora**.
A partir de ahí ella podrá gestionar los correos autorizados.

### 3. (Opcional) Activar la IA del megacuaderno

El megacuaderno ya permite subir y consultar documentos. Para que responda preguntas
automáticamente, añade en Supabase → **Edge Functions → Secrets** (o *Project Settings → Functions*):

- `ANTHROPIC_API_KEY` = tu clave de API de Anthropic.
- (opcional) `MIDIG_MODEL` = modelo a usar (por defecto `claude-haiku-4-5-20251001`).

Sin esa clave, la app funciona igual pero al preguntar responde que la IA no está conectada.

## Cómo se entra

1. En la web pública, pie de página → **🩺 Acceso profesionales** (o `/acceso.html`).
2. Se introduce el correo → llega un enlace/código por email → se entra.
3. Solo entran los correos que estén en la lista (gestionada por la superadministradora).

## Sobre el modelo CAG

- Modelo DenseNet-121 exportado a ONNX (`modelo/cag_densenet.onnx`) y ejecutado en el
  navegador con onnxruntime-web (sin enviar las imágenes a ningún servidor de IA).
- La inferencia del navegador se validó frente a PyTorch (diferencia < 1e-6).
- **Mapeo de clases** (inferido de las 2 imágenes de muestra del repo original):
  índice 0 ≈ CAG, índice 1 ≈ sin CAG.
- Es una herramienta **experimental y no diagnóstica**.
