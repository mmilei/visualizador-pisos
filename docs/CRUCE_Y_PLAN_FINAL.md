# Cruce de los 3 Informes y Matriz de Mejoras Implementadas

**Fecha:** 2026-11-15  
**Proyecto:** Visualizador de Pisos (`mmilei/visualizador-pisos`)

---

## 1. Matriz de Cruce (Informe 1 × Informe 2 × Informe 3)

| Hallazgo / Problema detectado | Fuente en Informes | Solución implementada en la app |
|---|---|---|
| **Forzar specs ocultas rompe fidelidad de la muestra** | Inf. 1 §2 + Inf. 3 §1 | Ficha de piso con todos los campos opcionales (`plankFormat: ''` libre) + switch **`Adentro / Afuera`** por parámetro al generar con reflejo en vivo en el editor de prompt. |
| **Falta de control e invisibilidad del prompt real** | Inf. 1 §3 + Inf. 3 §2 | Consola siempre visible y editable con el texto literal enviado, selector de estrategia (`Chat directo`, `Demolición estricta`, `Libre`), switch de rótulos de imagen, plantillas guardables y `PromptTraceEntry` inspeccionable por versión y en Historial. |
| **Limitar a 1-2 refs desperdicia contexto visual real** | Inf. 2 §1.C + Inf. 3 §1 | Soporte para **1 a 4 fotos de referencia** (`Auto (1–4)` con prioridad close-up + luz natural o selección manual `Elegir (1–4)`), manteniendo cero miniaturas fuera de `Mis Pisos Guardados`. |
| **Pre-paso IA obligado vs ir derecho estilo chat** | Inf. 2 §1.C + Inf. 3 §1 | Switch explícito de flujo: **`Directo (estilo chat)`** vs **`Pasar por Gemini antes (Muestra limpia IA 5500K)`**. |
| **Baja nitidez por escalado genérico vs costos de prueba** | Inf. 2 §1.F + Requisito Tito | Selector explícito: **`Nano Banana 2.1 · 2K nativo`** (default directo), **`NB 2.1 · 1K`**, y **`Flash Lite`**, más botón **`Escalar a NB 2.1 (2K)`** disponible cuando se parte de `Flash Lite` o `1K`. |
| **Deriva en correcciones sucesivas por chat** | Inf. 2 §1.E + Inf. 3 §1 | Continuidad multi-turno real (`contents` + `thoughtSignature`) con anclaje automático a habitación original y referencias, más toggle `Enviar texto literal sin envoltorio` en el chat. |
| **Desalineación en visor Antes/Después en fotos iPhone** | Inf. 2 §1.D | Cálculo dinámico del `aspectRatio` real (`naturalWidth / naturalHeight`) + `ResizeObserver` sincronizado en el deslizador. |
| **Pisos e historial desconectados al compartir API Key** | Inf. 3 §2 | Derivación SHA-256 `apiKeyId` (`key_<16hex>`) compartida entre cliente y servidor (`/api/floors`, `/api/history` con `x-api-key-id`) + respaldo/importación `.json` para sesiones estáticas. |

---

## 2. Checklist de Verificación Técnica

- `src/utils/promptBuilder.ts`: Inclusión estrictamente condicional según switches `Adentro/Afuera`, estrategias `chat_direct | strict_demolish | blank`, selección inteligente de hasta 4 referencias y limpieza 5500K en pre-paso.
- `src/utils/geminiDirect.ts` y `server.ts`: Paridad completa de endpoints (`generate-floor`, `extract-swatch`, `refine-floor` multi-turno con `thoughtSignature`, `upgrade-2k`, y CRUD particionado `/api/floors` + `/api/history`).
- `tsc --noEmit` + `npm run build`: Compilación sin errores verificada antes de despliegue.
