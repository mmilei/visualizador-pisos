# Informe 2: Anatomía de Fallos en Fotos Difíciles (Obra, Luz Compleja y Referencias Reales)

**Fecha:** 2026-11-15  
**Proyecto:** Visualizador de Pisos (`mmilei/visualizador-pisos`)  
**Foco:** Fidelidad visual máxima del piso sin backend extra ni alteraciones sobre paredes, muebles e iluminación.

---

## 1. Por qué fallan los visualizadores en fotos difíciles de clientes

Cuando Tito o sus clientes sacan una foto real con el celular en una obra o living habitado, aparecen 6 problemas físicos y de composición donde la generación con IA suele arruinar la credibilidad:

### A. Reflejos especulares de ventanales y contraluces
- **Qué ocurre:** En pisos existentes plastificados, porcelanatos brillantes o cerámicos claros frente a un ventanal, el piso original tiene una franja blanca quemada por el reflejo del cielo.
- **Por qué falla la IA:** Si se aplica sobreimpresión débil o un prompt demasiado permisivo con el piso original, el modelo conserva las juntas del cerámico debajo del reflejo o deja un brillo plástico artificial sobre una madera que debería ser mate.
- **Mitigación aplicada:** Instrucción explícita de crear el piso nuevo **desde cero** eliminando juntas/brillos viejos, mientras se preserva el **gradiente direccional de luz de ventana** coherente con la habitación y el acabado mate/satinado elegido por el usuario (solo cuando lo activa con `Adentro`).

### B. Sombras de contacto y alfombras (efecto "mueble flotando")
- **Qué ocurre:** Patas de sillas, mesas ratonas, camas con faldón y bordes de alfombras proyectan oclusión ambiental muy sutil sobre el suelo.
- **Por qué falla la IA:** Al reemplazar todo el plano inferior, los modelos tienden a cortar el borde de la alfombra con serrucho o borrar la sombra suave debajo del sillón.
- **Mitigación aplicada:** Anclaje directo de la foto original intacta en Imagen 1 y preservación explícita de sombras de contacto reales debajo de muebles y alfombras sin tocar el resto del ambiente.

### C. Fotos de referencia con contaminación de escena o luz amarilla de obra
- **Qué ocurre:** Muchas muestras cargadas no son placas de estudio: son fotos sacadas en showrooms con muebles, cielorrasos de madera, carteles o focos incandescentes cálidos de ~3000K.
- **Por qué falla la IA:** Si el modelo interpreta la foto de referencia como "estilo de ambiente" en lugar de "solo material del piso", mezcla muebles del showroom o tiñe todo el living de naranja artificial.
- **Mitigación aplicada (doble opción):**
  1. **Modo Directo (1 a 4 referencias):** Permite pasar entre 1 y 4 fotos de referencia reales en una sola llamada (con prioridad automática a primer plano + luz natural y rótulos opcionales por imagen para ignorar paredes/muebles/textos de las referencias).
  2. **Modo "Pasar por Gemini antes":** Pre-paso opcional que extrae una muestra cenital neutralizada a **5500K** eliminando luz amarilla artificial y entorno contaminante, dejándolo cacheado para las siguientes pasadas.

### D. Fotos verticales / angulares y desalineación en el deslizador Antes/Después
- **Qué ocurre:** Cuando la foto original del ambiente viene en relación de aspecto particular (ej. `9:16` iPhone o `3:2` cámara) y el visor fuerza un contenedor fijo `4:3`, las imágenes se desfasan levemente o recortan en el deslizador.
- **Mitigación aplicada:** Medición del `naturalWidth / naturalHeight` real de la foto original para sincronizar el `aspectRatio` exacto del deslizador Antes/Después con `ResizeObserver` en la capa superpuesta.

### E. Deriva entre correcciones por chat (Multi-Turn Drift)
- **Qué ocurre:** Si en el chat posterior al resultado el usuario pide "ahora hacelas más claras" y en cada turno solo se manda la última imagen generada sin historial ni ancla original, en 2 o 3 mensajes los muebles se degradan y las paredes pierden detalle.
- **Mitigación aplicada:** Uso de **chat multi-turno real** (`contents` completo + `thoughtSignature` devuelto por Nano Banana 2.1) con fallback automático anclado tanto a la versión editada actual como a la **habitación original intacta** y a las referencias de madera.

### F. Artefactos de re-escalado IA genérico (upscaling borroso / inventado)
- **Qué ocurre:** Generar primero en muy baja calidad y pasarlo por un upscaler genérico agrega textura inventada que altera vetas y rostros/cuadros de la habitación.
- **Mitigación aplicada:** Por defecto se usa **Nano Banana 2.1 en `2K` nativo directo** (`imageConfig.imageSize: '2K'`). Adicionalmente, si el usuario decide probar rápido en **Flash Lite** o **NB 2.1 (`1K`)**, tiene un botón explícito **"Escalar a NB 2.1 (2K)"** que re-renderiza anclando la habitación original intacta y las referencias reales de madera.
