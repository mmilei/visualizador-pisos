import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FLOORS_DB_PATH = path.resolve(__dirname, 'data', 'floors.json');

const readFloorsDb = (): any[] => {
  try {
    if (!fs.existsSync(FLOORS_DB_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(FLOORS_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading floors db:', err);
    return [];
  }
};

const writeFloorsDb = (floors: any[]) => {
  try {
    const dir = path.dirname(FLOORS_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FLOORS_DB_PATH, JSON.stringify(floors, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving floors db:', err);
  }
};

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
    const {
      roomImage,
      floorImages,
      floorImageLabels,
      productName,
      promptText: clientPromptText,
      customPrompt,
      aspectRatio,
      modelChoice,
    } = req.body;

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

    // Prepare floor reference parts
    const referenceLabels: string[] = [];
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
        const label =
          Array.isArray(floorImageLabels) && floorImageLabels[i]
            ? floorImageLabels[i]
            : `Sample #${i + 1}`;
        referenceLabels.push(label);
      }
    }

    const refDesc =
      parts.length - 1 <= 1
        ? 'image 2'
        : `images 2 to ${parts.length} (${referenceLabels.map((l, idx) => `image ${idx + 2}: ${l}`).join(', ')})`;

    const finalPromptText =
      typeof clientPromptText === 'string' && clientPromptText.trim()
        ? clientPromptText.trim()
        : [
            `Replace ONLY the floor in image 1 with the floor shown in ${refDesc} ("${productName || 'Wood Floor'}").`,
            customPrompt ? `Additional request: ${String(customPrompt).trim()}` : '',
            'Keep walls, furniture, rugs, lighting, natural shadows under objects, and camera perspective identical to image 1.',
          ]
            .filter(Boolean)
            .join(' ');

    parts.push({ text: finalPromptText });

    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

    const preferredModel =
      modelChoice === 'gemini-3.1-flash-lite-image'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';
    const fallbackModel =
      preferredModel === 'gemini-nano-banana-2.1'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';

    let generatedImageUrl: string | null = null;
    let modelUsed = preferredModel;

    try {
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: { parts },
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
      console.warn(`Primary model ${modelUsed} failed, attempting ${fallbackModel}:`, primaryErr?.message);
      modelUsed = fallbackModel;
      const fallbackResponse = await ai.models.generateContent({
        model: modelUsed,
        contents: { parts },
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
      promptUsed: finalPromptText,
    });
  } catch (error: any) {
    console.error('Error generating floor image:', error);
    const rawMsg = typeof error === 'string' ? error : (error?.message || error?.toString?.() || JSON.stringify(error) || '');
    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota') || rawMsg.includes('limit exceeded')) {
      return res.status(429).json({
        error: 'Límite de cuota alcanzado en la API de Google Gemini Imagen. Verifica que tu clave tenga facturación activa (Pay-as-you-go) en Google AI Studio.',
        isQuotaExhausted: true,
        code: 429,
      });
    }
    const message = rawMsg || 'Error interno al procesar la imagen.';
    return res.status(500).json({ error: message });
  }
});

// Conversational floor refinement endpoint (edits the latest generated image)
app.post('/api/refine-floor', async (req, res) => {
  try {
    const {
      baseImageUrl,
      referenceImageUrl,
      instruction,
      previousInstructions,
      aspectRatio,
      modelChoice,
    } = req.body;

    if (!baseImageUrl) {
      return res.status(400).json({ error: 'Falta la imagen actual para corregir.' });
    }
    if (!instruction || !String(instruction).trim()) {
      return res.status(400).json({ error: 'Escribe una indicación de corrección.' });
    }

    const ai = getAiClient();
    const baseParsed = parseDataUrl(baseImageUrl);
    const parts: any[] = [
      {
        inlineData: {
          mimeType: baseParsed.mimeType,
          data: baseParsed.data,
        },
      },
    ];

    if (referenceImageUrl && typeof referenceImageUrl === 'string') {
      const refParsed = parseDataUrl(referenceImageUrl);
      parts.push({
        inlineData: {
          mimeType: refParsed.mimeType,
          data: refParsed.data,
        },
      });
    }

    const prevList = Array.isArray(previousInstructions)
      ? previousInstructions.filter((x) => typeof x === 'string' && x.trim()).slice(-3)
      : [];

    const promptText = [
      `Edit image 1 (the current room render) following this correction: "${String(instruction).trim()}".`,
      referenceImageUrl ? 'Image 2 is the original wood floor reference sample for grain/tone consistency if needed.' : '',
      prevList.length > 0 ? `Context from earlier adjustments: ${prevList.join(' | ')}.` : '',
      'Keep the room architecture, walls, windows, furniture, shadows, and camera angle exactly as in image 1, changing only what was requested.',
    ]
      .filter(Boolean)
      .join(' ');

    parts.push({ text: promptText });

    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

    const preferredModel =
      modelChoice === 'gemini-3.1-flash-lite-image'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';
    const fallbackModel =
      preferredModel === 'gemini-nano-banana-2.1'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';

    let generatedImageUrl: string | null = null;
    let assistantText = '';
    let modelUsed = preferredModel;

    const extractParts = (resp: any) => {
      for (const part of resp?.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data && !generatedImageUrl) {
          const mime = part.inlineData.mimeType || 'image/png';
          generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          assistantText += (assistantText ? '\n' : '') + part.text;
        }
      }
    };

    try {
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
          },
        },
      });
      extractParts(response);
    } catch (primaryErr: any) {
      console.warn(`Refine primary ${modelUsed} failed, attempting ${fallbackModel}:`, primaryErr?.message);
      modelUsed = fallbackModel;
      const fallbackResp = await ai.models.generateContent({
        model: modelUsed,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
          },
        },
      });
      extractParts(fallbackResp);
    }

    if (!generatedImageUrl) {
      return res.status(502).json({
        error: 'El modelo no devolvió una nueva imagen corregida. Intenta reformular la corrección.',
      });
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      model: modelUsed,
      assistantText: assistantText || undefined,
      promptUsed: promptText,
    });
  } catch (error: any) {
    console.error('Error refining floor image:', error);
    const rawMsg = typeof error === 'string' ? error : (error?.message || error?.toString?.() || JSON.stringify(error) || '');
    return res.status(500).json({ error: rawMsg || 'Error interno al corregir la imagen.' });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Floors CRUD endpoints (Persistent JSON Database)
app.get('/api/floors', (_req, res) => {
  try {
    const floors = readFloorsDb();
    res.json({ success: true, floors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/floors', (req, res) => {
  try {
    const newFloor = req.body;
    if (!newFloor || !newFloor.name) {
      return res.status(400).json({ error: 'Nombre del piso requerido' });
    }
    const floors = readFloorsDb();
    const existingIdx = floors.findIndex((f: any) => f.id === newFloor.id);
    if (existingIdx >= 0) {
      floors[existingIdx] = newFloor;
    } else {
      floors.unshift(newFloor);
    }
    writeFloorsDb(floors);
    res.json({ success: true, floor: newFloor, floors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/floors/:id', (req, res) => {
  try {
    const { id } = req.params;
    let floors = readFloorsDb();
    floors = floors.filter((f: any) => f.id !== id);
    writeFloorsDb(floors);
    res.json({ success: true, floors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
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
