# Visualizador de Pisos · IA Multimodal

Aplicación moderna para visualizar y transformar pisos de madera en fotografías reales de ambientes mediante Inteligencia Artificial Multimodal (Google Gemini) y motor de simulación local en Canvas.

## Características

- **Transformación Directa 1-Clic**: Reemplazo automático del suelo respetando la perspectiva de la habitación, patas de muebles, zócalos, sombras de contacto y luz ambiental.
- **Orientación de Tablas**: Soporte para colocación Vertical (en profundidad hacia el fondo) u Horizontal (a lo ancho de izquierda a derecha).
- **Múltiples Fotos de Referencia**: Carga de macros de vetas/poros, fotos de pisos colocados en ambientes reales y muestras de catálogo.
- **Fichas Técnicas para Drive**: Registro técnico de pisos (especies, medidas de ancho en cm, acabado, notas) con exportación de fichas `.md`.
- **Modo Simulación Local Inmediata (Offline)**: Motor en Canvas con rotación según orientación para pruebas instantáneas sin costo de API.
- **Visor Comparativo**: Modo Deslizador (Split-slider antes/después), Modo Alternar (Toggle) y Modo Lado a Lado.

---

## Requisitos

- Node.js 18+ o superior
- Clave de API de Google Gemini (Google AI Studio)

---

## Instalación y Ejecución Local

1. Clona el repositorio e instala dependencias:
```bash
git clone https://github.com/mmilei/visualizador-pisos.git
cd visualizador-pisos
npm install
```

2. Configura tu variable de entorno en un archivo `.env`:
```bash
cp .env.example .env
```
Edita `.env` y coloca tu API key:
```env
GEMINI_API_KEY="tu_clave_de_gemini_aqui"
PORT=3000
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```
Abre tu navegador en `http://localhost:3000`.

---

## Despliegue en Producción

### Opción A: Vercel / Render / Railway
1. Sube este repositorio a tu GitHub.
2. Crea un nuevo proyecto en [Vercel](https://vercel.com) o [Render](https://render.com) importando tu repositorio.
3. Agrega la variable de entorno `GEMINI_API_KEY`.
4. El comando de build es `npm run build` y el comando de inicio es `npm start`.

### Opción B: Cloudflare Pages + Worker
Usa el script de Cloudflare Worker provisto en el modal "Proxy Cloudflare" de la aplicación para manejar el backend serverless.
