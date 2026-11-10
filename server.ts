import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Allow large image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }
  // If it's already raw base64
  return {
    mimeType: 'image/jpeg',
    data: dataUrl,
  };
}

// Floor transformation endpoint
app.post('/api/generate-floor', async (req, res) => {
  try {
    const { roomImage, floorImages, floorImageLabels, productName, woodDetails, customPrompt, plankOrientation, aspectRatio } = req.body;

    if (!roomImage) {
      return res.status(400).json({ error: 'La foto del ambiente es requerida.' });
    }

    if (!floorImages || !Array.isArray(floorImages) || floorImages.length === 0) {
      return res.status(400).json({ error: 'Al menos una foto o muestra del piso es requerida.' });
    }

    const ai = getAiClient();

    // Prepare room image part
    const roomParsed = parseDataUrl(roomImage);
    const parts: any[] = [
      {
        inlineData: {
          mimeType: roomParsed.mimeType,
          data: roomParsed.data,
        },
      },
    ];

    // Prepare floor reference parts and description list
    const referenceDescriptions: string[] = [];
    for (let i = 0; i < floorImages.length; i++) {
      const floorImg = floorImages[i];
      if (typeof floorImg === 'string' && floorImg.length > 0) {
        const parsed = parseDataUrl(floorImg);
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
        const label = Array.isArray(floorImageLabels) && floorImageLabels[i] ? floorImageLabels[i] : `Muestra de referencia #${i + 1}`;
        referenceDescriptions.push(`- Reference Image #${i + 2}: ${label}`);
      }
    }

    const plankWidthStr = woodDetails?.widthCm ? `${woodDetails.widthCm} cm` : '';
    const plankFormatStr = woodDetails?.format ? woodDetails.format.toUpperCase() : 'PARALELO/RECTO';
    const finishStr = woodDetails?.finish || 'Satinado natural';
    const speciesStr = woodDetails?.species || 'Madera natural seleccionada';

    // Mandatory Plank Direction / Orientation
    const orientationDirective = plankOrientation === 'horizontal'
      ? 'MANDATORY PLANK ORIENTATION: HORIZONTAL / TRANSVERSAL (Tablas a lo ancho). The wood planks MUST run horizontally across the room from left to right, perpendicular to the camera viewpoint.'
      : plankOrientation === 'diagonal'
      ? 'MANDATORY PLANK ORIENTATION: DIAGONAL 45 DEGREES across the room floor.'
      : 'MANDATORY PLANK ORIENTATION: VERTICAL / LONGITUDINAL (Tablas en profundidad hacia el fondo). The wood planks MUST run longitudinally from the foreground into the depth/background of the room, parallel to the line of sight.';

    const promptText = `
You are an expert architectural and interior visualization AI.
The first image provided is a real photo of a room/interior space.
The subsequent ${parts.length - 1} image(s) show target wood floor product sample(s) to install:
${referenceDescriptions.join('\n')}

MULTI-PHOTO REFERENCE INTEGRATION:
- If a reference shows a close-up/macro, prioritize it for the wood grain micro-texture, pore relief, bevels, and micro-color nuances.
- If a reference shows an installed room or wide angle, use it for authentic plank-to-plank shade variation, bevel joint spacing, and ambient light bounce.
- Synthesize all provided reference photos into a cohesive, photorealistic new floor.

EXACT FLOOR SPECIFICATIONS & GEOMETRY:
- Product Name: "${productName || 'Wood Floor'}"
- Wood Species: ${speciesStr}
- Plank Pattern: ${plankFormatStr}
- ${orientationDirective}
${plankWidthStr ? `- Exact Plank Width: ${plankWidthStr}. Use room furniture legs and doors as scale reference so planks appear accurately proportioned at ${plankWidthStr}.` : ''}
- Surface Finish: ${finishStr}
${customPrompt ? `- ADDITIONAL USER INSTRUCTIONS: "${customPrompt}"` : ''}

TASK:
Generate a photorealistic, professional photograph showing the EXACT SAME ROOM from the first image, where ONLY the existing floor surface has been replaced with the wood floor shown in the reference image(s).

STRICT PRESERVATION RULES:
1. Preserve the exact room architecture, walls, windows, doors, ceiling, structural pillars, baseboards, and wall finishes.
2. Keep all furniture, tables, chairs, sofas, decorations, rugs (unless on the floor being replaced), and objects in their exact positions and forms.
3. The camera angle, perspective, lens focal length, framing, and vantage point must remain 100% identical to image 1.

PHOTOREALISTIC FLOOR INTEGRATION RULES:
1. Lay the wood floor strictly following the specified orientation (${plankOrientation || 'vertical'}) and scale (${plankWidthStr || 'standard plank width'}).
2. Match the exact wood species, tone, natural color variation, plank layout (straight, herringbone, or chevron according to the reference), texture, and grain from the reference image(s).
3. Cast soft, realistic contact shadows directly beneath all furniture legs, baseboards, and any objects touching the floor.
4. Render natural ambient lighting, window sheen, subtle specular gloss, and reflections consistent with the room's real light sources.
`.trim();

    parts.push({ text: promptText });

    // Supported aspect ratios: "1:1", "3:4", "4:3", "9:16", "16:9"
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

    let generatedImageUrl: string | null = null;
    let modelUsed = 'gemini-3.1-flash-lite-image';

    try {
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: {
          parts,
        },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (primaryErr: any) {
      console.warn(`Primary model ${modelUsed} failed, attempting gemini-nano-banana-2.1:`, primaryErr?.message);
      modelUsed = 'gemini-nano-banana-2.1';
      const fallbackResponse = await ai.models.generateContent({
        model: modelUsed,
        contents: {
          parts,
        },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
          },
        },
      });

      for (const part of fallbackResponse.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageUrl) {
      return res.status(502).json({
        error: 'El modelo no devolvió una imagen generada. Verifica las imágenes de entrada e intenta nuevamente.',
      });
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      model: modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating floor image:', error);
    const rawMsg = typeof error === 'string' ? error : (error?.message || error?.toString?.() || JSON.stringify(error) || '');
    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota') || rawMsg.includes('limit exceeded')) {
      return res.status(429).json({
        error: 'Límite de cuota alcanzado en la API de Gemini Imagen. Los modelos de generación fotorrealista requieren asociar facturación activa (Pay-as-you-go) en Google AI Studio (~$0.03 por imagen). Para ensayar inmediatamente tu ambiente sin costo, pulsa "Simulación Inmediata".',
        isQuotaExhausted: true,
        code: 429,
      });
    }
    const message = rawMsg || 'Error interno al procesar la imagen.';
    return res.status(500).json({ error: message });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Serve frontend
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Floor Visualizer server running on port ${port} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
