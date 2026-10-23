# Visualizador de pisos

Prototipo web: sacás una foto del ambiente, la app detecta el piso en el navegador (SegFormer ADE20K vía Transformers.js), marcás un rectángulo sobre el piso y una medida conocida, y dibuja el piso elegido (ancho de tabla, tono, patrón recto/chevron/espiga) con perspectiva, más el cálculo de m² y cajas.

- Abrir: https://mmilei.github.io/visualizador-pisos/
- En iPhone: Safari → Compartir → "Agregar a inicio" para usarla como app.
- La primera carga baja el modelo de detección (~110 MB) y queda guardado.
- Tonos aproximados, tomados de catálogos públicos. Fotos de ejemplo con licencia libre (ver `fotos/CREDITOS.md`).
