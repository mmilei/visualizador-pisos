# Análisis de Mercado, Arquitectura de Prompteo (Nano Banana) y Plan de Mejoras

**Fecha:** 2026-11-15  
**Proyecto:** Visualizador de Pisos (`mmilei/visualizador-pisos`)

---

## 1. Cómo funcionan las aplicaciones líderes del rubro

En el mercado actual existen **dos arquitecturas técnicas completamente distintas** para visualizar pisos sobre fotos reales de clientes:

### A. Motores Geométricos / CAD + Visión por Computadora (Roomvo, Floori Studio)
Son el estándar usado por grandes fabricantes e-commerce (Shaw, Mohawk, Home Depot). No "imaginan" la habitación: calculan su geometría.
- **Pipeline interno:**
  1. **Segmentación semántica** (modelos tipo *SegFormer* o *DeepLabV3+* entrenados en *ADE20K*) que clasifica cada píxel en pared, mueble, alfombra, zócalo y piso, generando una máscara exacta del plano horizontal.
  2. **Detección de plano y puntos de fuga** (OpenCV / bordes de zócalos) para construir una **homografía 3D**.
  3. **Warping de textura ortogonal + mapa de iluminación:** toman un *swatch* plano sin perspectiva, lo repiten según sus medidas reales en cm/pulgadas (`widthCm`) deformándolo hacia el punto de fuga, y **multiplican encima el mapa de luces y sombras original** de la foto del ambiente.
- **Ventajas:** Escala física exacta, 0% alucinación sobre muebles/paredes, consistencia de catálogo SKU.
- **Desventajas:** Exigen *swatches* de estudio perfectamente planos; fallan o se ven "pegados" si el usuario sube fotos sacadas con el celular en obra o con iluminación compleja, y no resuelven bien reflejos nuevos según el acabado (mate vs satinado).

### B. Motores Generativos Multimodales e Inpainting (ReimagineHome, Decor8 AI, HomeDesigns AI, InteriorAI)
Usan modelos de difusión o edición multimodal (Gemini Nano Banana, Flux Fill / ControlNet, GPT-Image).
- **Pipeline interno:**
  1. **Auto-masking / Control espacial:** o bien generan una máscara automática del piso (inpainting), o usan mapas de profundidad/bordes (*Depth + Canny*), o pasan instrucciones multimodales ancladas por rol de imagen.
  2. **Fórmula de prompteo de 4 cláusulas:**
     - **Identificación de superficie:** delimitar estrictamente el plano del suelo.
     - **Física del material (no solo color):** describir poro, bisel, nudos, reflejo especular (*"low-sheen matte natural oak with micro-bevels"*), ya que los modelos calculan la luz según la física descripta.
     - **Reglas de preservación destructiva/selectiva:** ordenar *reemplazar desde cero* el piso viejo (evita que sobreimprima el tinte sobre las juntas viejas) mientras se congela geometría, zócalos y mobiliario.
     - **Anclaje de sombras y oclusión ambiental:** pedir explícitamente *contact shadows* y *ambient occlusion* debajo de patas de muebles y bordes de alfombras para evitar el clásico bug de **"muebles flotando"**.

---

## 2. Cómo se realiza internamente el prompteo en Gemini / Nano Banana

Al trabajar con la familia Nano Banana (`gemini-nano-banana-2.1` y `gemini-3.1-flash-lite-image`):

1. **Diferencia real entre modelos:**
   - **`gemini-nano-banana-2.1`**: Soporta `imageConfig.imageSize` (`1K`, `2K`, `4K`), mejor comprensión espacial 3D, seguimiento multi-imagen y edición conversacional en múltiples turnos.
   - **`gemini-3.1-flash-lite-image`**: Pensado para velocidad y bajo costo en 1 pasada, pero **no está optimizado para multi-turn ni tracking fino de texturas en referencias ruidosas**.
2. **Estado conversacional y `thoughtSignature`:**
   - En ediciones encadenadas por chat, Gemini devuelve un `thoughtSignature` junto con la imagen generada. Mantener una sesión multi-turn real pasando las respuestas previas completas (incluyendo su `thoughtSignature`) evita la *"amnesia de imagen"* y reduce la pérdida de fidelidad respecto al solo reenviar un PNG suelto en cada turno.
3. **Separación de responsabilidades (Pre-análisis -> Swatch limpio -> Render):**
   - Los pipelines más estables evitan darle a un solo llamado generativo 5–10 fotos heterogéneas (cocina + techo de madera + collage PDF) + habitación destino. Primero destilan **1 referencia pura ortogonal** con balance de blancos neutro y luego ejecutan el reemplazo sobre la habitación.

---

## 3. Diagnóstico actual de nuestra app

### Lo que ya está bien resuelto
- **Parámetros opcionales apagados por defecto** (`Modo natural`), evitando sobre-restringir al modelo cuando el usuario solo quiere aplicar su muestra.
- **Extracción y caché de `cleanSwatchUrl`** (máx. 4 fotos reescaladas -> 1 muestra cenital guardada en `localStorage` y `/api/floors`) + límite de 2 fotos en modo manual.
- **Prompt destructivo explícito** que borra patrones previos (probado con éxito reemplazando espigas a 90° sin calcar juntas).
- **Flujo post-generación directo** con pregunta *"¿Así está bien o querés cambiar algo?"*, chat sobre el resultado sin mostrar muestras fuera de **Mis Pisos Guardados**.

### Brechas detectadas y qué debemos mejorar

#### Prioridad 1 (Impacto alto en calidad de imagen)

1. **Chat de correcciones stateless (degradación iterativa y pérdida del cuarto original)**
   - *Problema actual:* `refine-floor` envía solo la última imagen generada + la última instrucción (con `includeReference: false`). Tras 2 o 3 correcciones seguidas (*"girá 90°"* -> *"más oscuro"* -> *"más mate"*), el modelo re-comprime muebles/paredes y puede derivar del material real del piso guardado.
   - *Solución:*
     - Preservar `thoughtSignature` / historial de chat real cuando se usa `gemini-nano-banana-2.1`.
     - Alternativamente (o en complemento), en cada edición pasar **3 roles claros**: `IMAGEN 1: habitación original` (ancla fiel de muebles/paredes/luz), `IMAGEN 2: versión actual a modificar` y `IMAGEN 3: muestra limpia del piso` (solo si existe `cleanSwatchUrl`), indicando cambiar únicamente el piso pedido sin tocar mobiliario ni tono base del producto.

2. **Pre-análisis automático de la habitación destino ("Room Inspector" con VLM rápido)**
   - *Problema actual:* El prompt del cuarto es idéntico sea un living con alfombra, un baño con zócalo de porcelanato o una cocina con escalera al fondo. Además, conceptos como *"vertical"* u *"horizontal"* son ambiguos según desde qué ángulo se sacó la foto.
   - *Solución:* Al cargar la foto en el Paso 1, ejecutar un análisis rápido en texto (`gemini-2.5-flash`, <1s, costo mínimo) que extraiga:
     - Material/patrón actual a demoler (*"90° parquet espiga"*, *"cerámico con juntas"*).
     - Elementos críticos a NO tocar (*"alfombra beige central"*, *"escalera izquierda"*, *"isla blanca"*).
     - Eje principal de perspectiva del ambiente y dónde entra la luz principal.
     - Anclas de escala visibles (*altura de zócalo*, *puerta*, *patas de sillas*).
   - Inyectar esa lectura breve y precisa dentro del prompt de Nano Banana mejora enormemente la precisión de bordes, escala y dirección real.

3. **Balance de blancos neutro en `extract-swatch` y anclaje de escala física**
   - *Problema actual:* Si las fotos subidas por el usuario tienen luz cálida artificial (lámparas de obra), la `Muestra limpia` puede heredar tinte naranja y oscurecer/amarillear el resultado final. Asimismo, activar `"18 cm"` sin referencia relativa en el cuarto hace que la IA adivine el tamaño visual.
   - *Solución:*
     - Exigir en `buildSwatchExtractionPrompt` **iluminación neutra balanceada (daylight 5500K)** para extraer color real de la madera sin dominante amarilla/azul.
     - Traducir `widthCm` en el prompt a proporciones concretas frente a objetos de la escena (ej. *"tabla ancha de ~20 cm, aprox. un cuarto del ancho de una puerta estándar"*).

4. **Resolución HD (`2K`) bajo demanda y alineación milimétrica del deslizador Antes/Después**
   - *Problema actual:* Al no enviar `imageConfig.imageSize`, Nano Banana 2.1 genera en `1K`. En fotos originales de `1600px` o en pantalla completa se nota suavizado. Además, si la relación de aspecto de la foto original (ej. `3:2` o `16:10`) no coincide exacto con `4:3`/`16:9`, el deslizador tiene un leve desplazamiento en bordes.
   - *Solución:*
     - Mantener `1K` rápido para iterar y sumar un botón **"Generar versión final en 2K"** cuando el usuario confirma `"Así está bien"` (mejor calidad sin quemar créditos en borradores).
     - Normalizar/recortar el preview o ajustar la capa de comparación al `naturalWidth/naturalHeight` original para que el deslizador antes/después calce 1:1.

#### Prioridad 2 (Control del usuario y casos difíciles)

5. **Protección rápida de zonas difíciles (escaleras, balcones, alfombras parecidas)**
   - *Problema actual:* En ambientes abiertos (living -> balcón o escalera integrada), el modelo a veces cambia también los escalones o el piso exterior.
   - *Solución:* Agregar un control **opcional** (apagado por defecto) tipo *"Proteger zona: escalera / exterior / alfombra"* o un pincel simple de exclusión sobre la foto del cuarto antes de generar.

6. **Edición de pisos en "Mis Pisos Guardados" + regenerar muestra limpia**
   - *Problema actual:* Hoy solo se puede crear o eliminar un piso personalizado (`AddFloorModal`); si Tito quiere agregar/quitar una foto o regenerar la `Muestra limpia IA` de `Fusión Composite Natural`, tiene que borrar toda la ficha y volver a cargarla.
   - *Solución:* Agregar botón **"Editar ficha / fotos"** y **"Regenerar muestra limpia"** dentro de `Mis Pisos Guardados`.

#### Prioridad 3 (Flujo comercial / compartido)

7. **Placa comparativa Antes / Después lista para WhatsApp + portabilidad de pisos**
   - *Problema actual:* Solo descarga la imagen final sin contexto; y en GitHub Pages (`localStorage`), los pisos cargados por Tito en un dispositivo no se sincronizan automáticamente al abrir el link en otro teléfono.
   - *Solución:*
     - Botón **"Exportar Antes / Después (WhatsApp)"** que arme en canvas una sola imagen lado a lado o arriba/abajo con el nombre del piso y su ficha técnica limpia.
     - Opción simple de **Exportar / Importar Mis Pisos (`.json`)** para que Tito pueda pasarle su catálogo cargado a otro celular o computadora en segundos sin depender de backend.
