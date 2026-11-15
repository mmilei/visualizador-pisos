# Informe 3: Paridad con Chat Directo (Gemini / ChatGPT) y Transparencia Total del Prompt

**Fecha:** 2026-11-15  
**Proyecto:** Visualizador de Pisos (`mmilei/visualizador-pisos`)  
**Foco:** Entender por qué el chat directo suele dar mejores resultados que apps rígidas y darle a Tito control 100% visible y editable sobre cada envío a Nano Banana.

---

## 1. Por qué el chat directo de Gemini / ChatGPT supera muchas veces a apps enlatadas

Al comparar flujos reales usando exactamente el mismo motor de imagen, el chat conversacional tiene 4 ventajas estructurales que las apps tradicionales suelen romper:

1. **No sobrecarga con 8 restricciones contradictorias si no hacen falta:**  
   Cuando una app fuerza siempre `patrón = recto`, `ancho = 18 cm`, `acabado = mate`, etc., aunque la foto de referencia muestre otra proporción o textura, el modelo pelea entre lo que *ve* en la foto de referencia y lo que *lee* en el texto forzado.
2. **Usa varias fotos de referencia naturales (1 a 4 imágenes):**  
   En chat, pasar la foto del cuarto + 2 o 3 fotos del mismo piso (ej. un close-up de veta + una foto colocado en luz natural) permite que el modelo triangule el color y el tamaño real de tabla sin tener que "adivinar" desde una sola miniatura plana.
3. **Lenguaje claro y directo centrado en lo importante:**  
   "Reemplazá únicamente el piso de la Foto 1 por el piso de madera mostrado en las referencias; respetá luz, reflejos y sombras; dejá todo lo demás exactamente igual." Menos jerga contradictoria = menos alucinaciones en paredes y zócalos.
4. **Continuidad multi-turno nativa:**  
   En un chat real, cuando decís *"girá las tablas 90 grados"* o *"un poco menos brillante"*, el modelo recuerda el turno original y conserva `thoughtSignature`, evitando reinterpretar toda la escena desde cero.

---

## 2. Arquitectura de Transparencia Total implementada

Para que la app funcione **tal cual el chat de Gemini** pero con orden de catálogo y memoria entre sesiones:

- **Todos los parámetros parametrizables con switch `Adentro` / `Afuera`:**  
  En `"Mis Pisos Guardados"` se pueden cargar y editar todos los datos opcionales (especie, patrón Chevron/Recto/Espiga/Deck, ancho en cm, acabado, notas), ninguno obligatorio salvo el nombre. Al momento de generar, Tito decide con cada switch qué queda **Adentro** o **Afuera** del prompt, viendo **en tiempo real** en el editor literal cómo cada regla entra o sale del texto que se enviará.
- **Editor literal siempre visible (cero caja negra):**  
  - Estrategias rápidas: **Chat directo** (natural en español, default), **Demolición estricta** (inglés técnico para pisos difíciles donde el modelo intenta calcar cerámicos viejos), o **En blanco / libre**.
  - Switch para incluir o quitar **rótulos por imagen** (`IMAGEN 1`, `IMAGEN 2...`).
  - Plantillas guardadas por el usuario (`SavedPromptPreset`) para experimentar y comparar qué prompt funciona mejor en cada tipo de obra.
- **Trazabilidad completa (`PromptTraceEntry`) en cada resultado:**  
  Cada burbuja del chat y cada entrada del `Historial de Pruebas` guarda y permite inspeccionar exactamente: modelo usado, resolución (`1K`/`2K`), flujo (`Directo` vs `Pre-paso Gemini`), imágenes enviadas, duración y el texto literal enviado—con botón **"Reutilizar prompt"** para volver a iterar sin reescribir.
- **Espacio compartido por API Key (`apiKeyId` vía SHA-256):**  
  Tanto `"Mis Pisos Guardados"`, como el `"Historial de Pruebas"` y `"Mis plantillas"` se particionan automáticamente por un hash no reversible (`key_<16hex>`) de la Gemini API Key activa, sincronizándose en backend (`/api/floors`, `/api/history` mediante header `x-api-key-id`) y con respaldo/importación `.json` para GitHub Pages.
