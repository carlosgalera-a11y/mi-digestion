# APP SII — Especificación original

> Transcripción del documento `APP_SII.pages` aportado por el autor del proyecto.
> Esta especificación define la pantalla principal de registro diario de la app
> **Mi Digestión** y está implementada en [`diario.html`](../diario.html).

## 1. Pantalla Principal: "Mi Día" (Registro Diario)

Diseñada para completarse en menos de 2 minutos. Se divide en tres bloques lógicos:

### Bloque 1: Síntomas Digestivos (Parámetros Gastrointestinales)

- **Dolor Abdominal:**
  - *Formato:* Escala visual analógica (0 al 10) o caras (sin dolor a dolor insoportable).
  - *Extra:* Selector de momento (Ayunas, Después de comer, Continuo).
- **Distensión Abdominal (Hinchazón):**
  - *Formato:* Escala de 4 niveles (Ninguna, Leve, Moderada, Severa).
- **Alteración Ritmo Deposicional:**
  - *Formato:* Botón para "Registrar Deposición".
  - *Datos a recoger:* Tipo de heces (Escala de Bristol del 1 al 7) y frecuencia
    (número de veces al día).
  - [ ] Sensación de evacuación incompleta.
  - [ ] Urgencia evacuatoria (correr al baño).

### Bloque 2: Estilo de Vida y Bienestar (Eje Cerebro-Intestino)

- **Estrés:**
  - *Formato:* Deslizador (Slider) de 1 a 5 (Muy relajado → Muy estresado).
- **Actividad Física:**
  - *Formato:* Conexión automática con Apple Health / Google Fit o registro manual
    en minutos (ej. "30 min de caminata").
- **Descanso:**
  - *Formato:* Horas de sueño totales y un selector de calidad percibida
    (Mal descanso / Regular / Buen descanso).
- **"¿Cuánto te han preocupado tus síntomas hoy?"** (Escala 1 al 5).
- **"¿Tus síntomas han limitado hoy tus actividades?"** (Para nada / Un poco / Mucho).

### Bloque 3: Consumo y Hábitos Tóxicos

- **Intake (Cafeína, Alcohol, Refrescos):**
  - *Formato:* Contador de unidades (+ / −).
  - *Detalle:* Tazas de café/té, Copas de alcohol, Latas de refresco (especialmente
    los azucarados o con gas, que afectan la distensión).
- **"¿Crees que algo de lo que has comido hoy te ha sentado mal?"**
- **Smoking (Tabaco):**
  - *Formato:* Interruptor Sí/No, o contador de número de cigarrillos al día.

## Notas de implementación

| Elemento de la especificación | Implementación en la web app |
|---|---|
| Escala visual analógica 0-10 con caras | Botones 0-10 con fila de caras orientativas |
| Selector de momento del dolor | Se muestra cuando el dolor es > 0 |
| Registrar deposición (Bristol + frecuencia) | Lista de deposiciones del día, cada una con tipo 1-7, evacuación incompleta y urgencia |
| Conexión Apple Health / Google Fit | Fuera de alcance en una web estática; registro manual en minutos con indicación de copiar el dato de esas apps |
| Contadores +/− de cafeína, alcohol y refrescos | Contadores accesibles con unidades |
| Interruptor de tabaco con nº de cigarrillos | Sí/No con contador condicional |
| Almacenamiento | `localStorage` del dispositivo; sin servidor. Exportación CSV/JSON e informe imprimible en `historial.html` |
