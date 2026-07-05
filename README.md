# 🌿 Mi Digestión

Web app para **pacientes de consultas de aparato digestivo** (síndrome de intestino
irritable, dispepsia, trastornos de la motilidad…). Ayuda al paciente a observar y
comunicar sus síntomas, y al profesional a disponer de un registro objetivo y
resumido de la evolución entre consultas.

**➡️ App en línea:** https://carlosgalera-a11y.github.io/mi-digestion/

## Qué incluye

| Página | Contenido |
|---|---|
| `diario.html` | **"Mi Día"** — registro diario en menos de 2 minutos: dolor abdominal (0-10 y momento), distensión, deposiciones con escala de Bristol (urgencia y evacuación incompleta), estrés, actividad física, descanso, preocupación y limitación, cafeína/alcohol/refrescos, comidas sospechosas y tabaco. Implementa la especificación de [`docs/APP_SII.md`](docs/APP_SII.md). |
| `historial.html` | Evolución con gráficos, **informe imprimible para la consulta**, exportación CSV (Excel), copia de seguridad/restauración JSON. |
| `bristol.html` | Escala de Bristol ilustrada y cómo usarla. |
| `aprende.html` | Educación para pacientes: SII, dispepsia funcional, motilidad, eje cerebro-intestino y hábitos. |
| `consulta.html` | Cómo preparar la consulta, síntomas de alarma y preguntas frecuentes. |

## Privacidad

Los registros del paciente se guardan **únicamente en su dispositivo**
(`localStorage` del navegador). La app no tiene servidor, no usa cookies y no envía
datos a ningún sitio. El paciente puede exportar, restaurar o borrar sus datos desde
la página de historial.

## Desarrollo

Sitio estático sin dependencias ni proceso de build: HTML + CSS + JavaScript
(módulos ES). Para probar en local:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

El despliegue a GitHub Pages es automático en cada push a `main`
(`.github/workflows/deploy.yml`).

## Aviso

Esta herramienta es un apoyo educativo y de registro de síntomas. **No diagnostica
ni sustituye la valoración de un profesional sanitario.**
