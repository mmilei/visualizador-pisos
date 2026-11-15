import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FLOORS_DB_PATH = path.resolve(__dirname, 'data', 'floors.json');
const HISTORY_DB_PATH = path.resolve(__dirname, 'data', 'history.json');

function deriveServerKeyId(rawKey?: string | null): string {
  const clean = (rawKey || '').trim();
  if (!clean) return 'default';
  const hex = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 16);
  return `key_${hex}`;
}

const readJsonArray = (filePath: string): any[] => {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
};

const writeJsonArray = (filePath: string, items: any[]) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err);
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
  return {
    mimeType: 'image/jpeg',
    data: dataUrl,
  };
}

function extractThoughtSignature(parts: any[]): string | undefined {
  for (const part of parts || []) {
    if (typeof part?.thoughtSignature === 'string' && part.thoughtSignature) {
      return part.thoughtSignature;
    }
    if (typeof part?.thought_signature === 'string' && part.thought_signature) {
      return part.thought_signature;
    }
  }
  return undefined;
}

function resolveRequestKeyId(req: express.Request): string {
  const headerVal = req.header('x-api-key-id');
  if (headerVal && headerVal.trim()) return headerVal.trim();
  return deriveServerKeyId(process.env.GEMINI_API_KEY);
}

// Floor transformation endpoint (1 room + 1 to 4 references, explicit promptText, 1K/2K/Lite)
app.post('/api/generate-floor', async (req, res) => {
  const startedAt = Date.now();
  try {
    const {
      roomImage,
      floorImages,
      floorImageLabels,
      productName,
      promptText: clientPromptText,
      customPrompt,
      includeImageRoleLabels = true,
      aspectRatio = '4:3',
      modelChoice = 'gemini-nano-banana-2.1',
      imageSize = '2K',
      pipelineMode = 'direct',
    } = req.body;

    if (!roomImage) {
      return res.status(400).json({ error: 'La foto del ambiente es requerida.' });
    }

    if (!floorImages || !Array.isArray(floorImages) || floorImages.length === 0) {
      return res.status(400).json({ error: 'Al menos una foto o muestra del piso es requerida.' });
    }

    const ai = getAiClient();
    const roomParsed = parseDataUrl(roomImage);
    const parts: any[] = [];
    const imageRoles: string[] = [];

    const roomRole =
      'IMAGEN 1 — AMBIENTE A MODIFICAR (reemplazar únicamente el piso respetando luz, sombras y todo lo demás exactamente igual):';
    imageRoles.push(roomRole);
    if (includeImageRoleLabels !== false) {
      parts.push({ text: roomRole });
    }
    parts.push({
      inlineData: {
        mimeType: roomParsed.mimeType,
        data: roomParsed.data,
      },
    });

    // Support 1 to 4 reference photos cleanly
    const cappedFloorImages = floorImages.slice(0, 4);
    const referenceLabels: string[] = [];

    cappedFloorImages.forEach((floorImg: string, i: number) => {
      if (typeof floorImg === 'string' && floorImg.length > 0) {
        const parsed = parseDataUrl(floorImg);
        const label =
          Array.isArray(floorImageLabels) && floorImageLabels[i]
            ? floorImageLabels[i]
            : `Referencia #${i + 1}`;
        referenceLabels.push(label);
        const refRole = `IMAGEN ${referenceLabels.length + 1} — REFERENCIA DE PISO (${label}; usar solo el piso/madera de esta foto, ignorar muebles, paredes, techos o textos):`;
        imageRoles.push(refRole);
        if (includeImageRoleLabels !== false) {
          parts.push({ text: refRole });
        }
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }
    });

    const refDesc =
      referenceLabels.length <= 1
        ? 'la foto de referencia (Imagen 2)'
        : `las ${referenceLabels.length} fotos de referencia (Imágenes 2 a ${referenceLabels.length + 1}: ${referenceLabels.join(', ')})`;

    const finalPromptText =
      typeof clientPromptText === 'string' && clientPromptText.trim()
        ? clientPromptText.trim()
        : [
            `Reemplazá únicamente el piso de la Foto 1 (el ambiente a editar) con el piso de madera mostrado en ${refDesc}${productName ? ` ("${productName}")` : ''}.`,
            'Creá el piso nuevo desde cero (eliminando el diseño, juntas y color del piso viejo de la Foto 1; sin copiar muebles, techos, personas ni textos de las fotos de referencia).',
            'Respetá exactamente la iluminación original del ambiente, reflejos de ventanas y sombras debajo de muebles y alfombras. Todo lo que no sea el piso debe quedar exactamente igual.',
            customPrompt ? String(customPrompt).trim() : '',
          ]
            .filter(Boolean)
            .join('\n\n');

    parts.push({ text: finalPromptText });

    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';
    const validSize = imageSize === '1K' ? '1K' : '2K';

    const preferredModel =
      modelChoice === 'gemini-3.1-flash-lite-image'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';
    const fallbackModel =
      preferredModel === 'gemini-nano-banana-2.1'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';

    let generatedImageUrl: string | null = null;
    let thoughtSignature: string | undefined;
    let modelUsed = preferredModel;

    const runModel = async (targetModel: string) => {
      const imageConfig: Record<string, string> = {
        aspectRatio: selectedRatio,
      };
      if (targetModel === 'gemini-nano-banana-2.1') {
        imageConfig.imageSize = validSize;
      }

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: { parts },
        config: { imageConfig },
      });

      const candParts = response.candidates?.[0]?.content?.parts ?? [];
      thoughtSignature = extractThoughtSignature(candParts);
      for (const part of candParts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }
    };

    try {
      await runModel(modelUsed);
    } catch (primaryErr: any) {
      console.warn(`Primary model ${modelUsed} failed, attempting ${fallbackModel}:`, primaryErr?.message);
      modelUsed = fallbackModel;
      await runModel(modelUsed);
    }

    if (!generatedImageUrl) {
      return res.status(502).json({
        error: 'El modelo no devolvió una imagen generada. Verifica las imágenes de entrada e intenta nuevamente.',
      });
    }

    const resolvedSize = modelUsed === 'gemini-nano-banana-2.1' ? validSize : undefined;

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      model: modelUsed,
      imageSize: resolvedSize,
      promptUsed: finalPromptText,
      thoughtSignature,
      traceEntry: {
        id: `trace-gen-${Date.now()}`,
        stage: 'generate-floor',
        model: modelUsed,
        imageSize: resolvedSize,
        pipelineMode: pipelineMode === 'gemini_prepass' ? 'gemini_prepass' : 'direct',
        includeImageRoleLabels: includeImageRoleLabels !== false,
        imageRoles,
        promptText: finalPromptText,
        usedConversationHistory: false,
        durationMs: Date.now() - startedAt,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Error generating floor image:', error);
    const rawMsg =
      typeof error === 'string'
        ? error
        : error?.message || error?.toString?.() || JSON.stringify(error) || '';
    if (
      rawMsg.includes('429') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.includes('quota') ||
      rawMsg.includes('limit exceeded')
    ) {
      return res.status(429).json({
        error:
          'Límite de cuota alcanzado en la API de Google Gemini Imagen. Verifica que tu clave tenga facturación activa (Pay-as-you-go) en Google AI Studio.',
        isQuotaExhausted: true,
        code: 429,
      });
    }
    return res.status(500).json({ error: rawMsg || 'Error interno al procesar la imagen.' });
  }
});

// Optional pre-pass: synthesize 1 pure top-down neutral 5500K plank swatch from up to 4 floor photos
app.post('/api/extract-swatch', async (req, res) => {
  const startedAt = Date.now();
  try {
    const { floorImages, floorImageLabels, productName, modelChoice } = req.body;
    if (!floorImages || !Array.isArray(floorImages) || floorImages.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos una foto para extraer la muestra.' });
    }

    const ai = getAiClient();
    const capped = floorImages.slice(0, 4);
    const labels = Array.isArray(floorImageLabels) ? floorImageLabels.slice(0, 4) : [];

    const parts: any[] = [];
    const imageRoles: string[] = [];

    capped.forEach((img: string, idx: number) => {
      if (typeof img === 'string' && img.length > 0) {
        const parsed = parseDataUrl(img);
        const roleText = `FOTO ${idx + 1} (${labels[idx] || `Foto #${idx + 1}`}) — extraer únicamente la madera del piso`;
        imageRoles.push(roleText);
        parts.push({ text: roleText });
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        });
      }
    });

    const labelHint = labels.length > 0 ? ` (${labels.join(', ')})` : '';
    const promptText = [
      `Inspect the provided reference photo(s)${labelHint} of the wood flooring product "${productName || 'Wood Floor'}".`,
      'Generate ONE clean, flat, straight-on orthographic top-down studio texture sample of ONLY this flooring material filling 100% of the frame edge-to-edge.',
      'Neutralize any warm yellow artificial construction bulb cast to natural neutral 5500K daylight balance so the true oak/wood color, grain, natural knots, micro-bevels, and finish are accurate.',
      'COMPLETELY EXCLUDE any walls, wood ceilings, kitchen cabinets, stairs, people, tools, plastic sheets, rugs, text labels, borders, or collage margins.',
    ].join(' ');

    parts.push({ text: promptText });

    const preferredModel =
      modelChoice === 'gemini-3.1-flash-lite-image'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';
    const fallbackModel =
      preferredModel === 'gemini-nano-banana-2.1'
        ? 'gemini-3.1-flash-lite-image'
        : 'gemini-nano-banana-2.1';

    let swatchUrl: string | null = null;
    let modelUsed = preferredModel;

    try {
      const response = await ai.models.generateContent({
        model: modelUsed,
        contents: { parts },
        config: { imageConfig: { aspectRatio: '1:1' } },
      });
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          swatchUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch {
      modelUsed = fallbackModel;
      const fallbackResp = await ai.models.generateContent({
        model: modelUsed,
        contents: { parts },
        config: { imageConfig: { aspectRatio: '1:1' } },
      });
      for (const part of fallbackResp.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          swatchUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!swatchUrl) {
      return res.status(502).json({ error: 'No se pudo sintetizar la muestra del piso.' });
    }

    return res.json({
      success: true,
      swatchUrl,
      model: modelUsed,
      traceEntry: {
        id: `trace-swatch-${Date.now()}`,
        stage: 'extract-swatch',
        model: modelUsed,
        pipelineMode: 'gemini_prepass',
        includeImageRoleLabels: true,
        imageRoles,
        promptText,
        usedConversationHistory: false,
        durationMs: Date.now() - startedAt,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Error extracting swatch:', error);
    return res.status(500).json({ error: error?.message || 'Error al sintetizar muestra.' });
  }
});

// Multi-turn conversational floor refinement endpoint (thoughtSignature + original room anchor fallback)
app.post('/api/refine-floor', async (req, res) => {
  const startedAt = Date.now();
  try {
    const {
      baseImageUrl,
      originalRoomImage,
      referenceImages = [],
      referenceLabels = [],
      initialPromptText,
      conversationHistory = [],
      instruction,
      previousInstructions = [],
      rawMode = false,
      includeImageRoleLabels = true,
      aspectRatio = '4:3',
      modelChoice = 'gemini-nano-banana-2.1',
      imageSize = '2K',
    } = req.body;

    if (!baseImageUrl) {
      return res.status(400).json({ error: 'Falta la imagen actual para corregir.' });
    }
    if (!instruction || !String(instruction).trim()) {
      return res.status(400).json({ error: 'Escribe una indicación de corrección.' });
    }

    const ai = getAiClient();
    const cleanInstruction = String(instruction).trim();
    const prevList = Array.isArray(previousInstructions)
      ? previousInstructions.filter((x) => typeof x === 'string' && x.trim()).slice(-3)
      : [];

    const refsArray: string[] = Array.isArray(referenceImages)
      ? referenceImages.filter((x) => typeof x === 'string' && x.length > 0).slice(0, 4)
      : [];

    const promptText = rawMode
      ? cleanInstruction
      : [
          `Aplicá únicamente esta corrección sobre el piso de la imagen actual del ambiente: "${cleanInstruction}".`,
          refsArray.length > 0
            ? 'Usá las fotos de referencia adjuntas únicamente para mantener fidelidad del material de madera (nunca reemplaces la habitación por la foto de referencia).'
            : '',
          prevList.length > 0 ? `Ajustes previos en esta conversación: ${prevList.join(' | ')}.` : '',
          'Respetá exactamente la iluminación original, sombras de contacto, paredes, zócalos, alfombras, muebles y encuadre: todo lo que no sea el piso debe quedar idéntico.',
        ]
          .filter(Boolean)
          .join(' ');

    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';
    const validSize = imageSize === '1K' ? '1K' : '2K';

    const buildSingleTurnAnchored = () => {
      const roles: string[] = [];
      const parts: any[] = [];

      const baseParsed = parseDataUrl(baseImageUrl);
      const baseRole =
        'IMAGEN 1 — RESULTADO ACTUAL A CORREGIR (mantener habitación, luz y muebles exactos; aplicar cambio pedido al piso):';
      roles.push(baseRole);
      if (includeImageRoleLabels !== false) parts.push({ text: baseRole });
      parts.push({ inlineData: { mimeType: baseParsed.mimeType, data: baseParsed.data } });

      if (originalRoomImage && typeof originalRoomImage === 'string' && originalRoomImage !== baseImageUrl) {
        const origParsed = parseDataUrl(originalRoomImage);
        const origRole =
          'IMAGEN 2 — HABITACIÓN ORIGINAL (ancla de muebles, zócalos, paredes e iluminación real):';
        roles.push(origRole);
        if (includeImageRoleLabels !== false) parts.push({ text: origRole });
        parts.push({ inlineData: { mimeType: origParsed.mimeType, data: origParsed.data } });
      }

      refsArray.forEach((refUrl, idx) => {
        const rParsed = parseDataUrl(refUrl);
        const refLabel =
          Array.isArray(referenceLabels) && referenceLabels[idx]
            ? referenceLabels[idx]
            : `Ref #${idx + 1}`;
        const refRole = `IMAGEN ${roles.length + 1} — REFERENCIA DE PISO (${refLabel}; solo madera/material, jamás copiar el cuarto de esta foto):`;
        roles.push(refRole);
        if (includeImageRoleLabels !== false) parts.push({ text: refRole });
        parts.push({ inlineData: { mimeType: rParsed.mimeType, data: rParsed.data } });
      });

      parts.push({ text: promptText });
      return { contents: [{ role: 'user', parts }], imageRoles: roles };
    };

    const historyArr = Array.isArray(conversationHistory) ? conversationHistory : [];
    const canUseMultiTurn =
      Boolean(originalRoomImage) &&
      historyArr.some((t: any) => t?.role === 'model' && typeof t?.imageUrl === 'string' && t.imageUrl.length > 0);

    const buildMultiTurnContents = () => {
      const contents: any[] = [];
      const roles: string[] = [];
      const turn1Parts: any[] = [];

      const origParsed = parseDataUrl(originalRoomImage);
      const rRole =
        'IMAGEN 1 — AMBIENTE A MODIFICAR (reemplazar únicamente el piso respetando luz, sombras y todo lo demás exactamente igual):';
      roles.push(rRole);
      if (includeImageRoleLabels !== false) turn1Parts.push({ text: rRole });
      turn1Parts.push({ inlineData: { mimeType: origParsed.mimeType, data: origParsed.data } });

      refsArray.forEach((refUrl, idx) => {
        const rParsed = parseDataUrl(refUrl);
        const refLabel =
          Array.isArray(referenceLabels) && referenceLabels[idx]
            ? referenceLabels[idx]
            : `Ref #${idx + 1}`;
        const refRole = `IMAGEN ${idx + 2} — REFERENCIA DE PISO (${refLabel}; usar solo el piso/madera de esta foto):`;
        roles.push(refRole);
        if (includeImageRoleLabels !== false) turn1Parts.push({ text: refRole });
        turn1Parts.push({ inlineData: { mimeType: rParsed.mimeType, data: rParsed.data } });
      });

      turn1Parts.push({
        text:
          initialPromptText ||
          'Reemplazá únicamente el piso de la Imagen 1 usando la madera de referencia, respetando iluminación y dejando todo lo demás igual.',
      });
      contents.push({ role: 'user', parts: turn1Parts });

      for (const turn of historyArr) {
        const turnParts: any[] = [];
        if (turn?.text) turnParts.push({ text: turn.text });
        if (turn?.imageUrl) {
          const imgParsed = parseDataUrl(turn.imageUrl);
          const imgPart: any = {
            inlineData: { mimeType: imgParsed.mimeType, data: imgParsed.data },
          };
          if (turn.role === 'model' && turn.thoughtSignature) {
            imgPart.thoughtSignature = turn.thoughtSignature;
          }
          turnParts.push(imgPart);
        }
        if (turnParts.length > 0) {
          contents.push({ role: turn.role, parts: turnParts });
        }
      }

      contents.push({ role: 'user', parts: [{ text: promptText }] });
      return { contents, imageRoles: roles };
    };

    const modelsToTry =
      modelChoice === 'gemini-3.1-flash-lite-image'
        ? ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1']
        : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

    let generatedImageUrl: string | null = null;
    let assistantText = '';
    let thoughtSignature: string | undefined;
    let modelUsed = modelsToTry[0];
    let usedHistoryFlag = false;
    let usedRoles: string[] = [];

    for (const targetModel of modelsToTry) {
      const attemptMultiTurn = targetModel === 'gemini-nano-banana-2.1' && canUseMultiTurn;
      const strategies = attemptMultiTurn ? [true, false] : [false];

      for (const useHist of strategies) {
        try {
          const built = useHist ? buildMultiTurnContents() : buildSingleTurnAnchored();
          const imageConfig: Record<string, string> = { aspectRatio: selectedRatio };
          if (targetModel === 'gemini-nano-banana-2.1') {
            imageConfig.imageSize = validSize;
          }

          const resp = await ai.models.generateContent({
            model: targetModel,
            contents: built.contents,
            config: { imageConfig },
          });

          const candParts = resp?.candidates?.[0]?.content?.parts ?? [];
          thoughtSignature = extractThoughtSignature(candParts);
          generatedImageUrl = null;
          assistantText = '';

          for (const part of candParts) {
            if (part.inlineData?.data && !generatedImageUrl) {
              generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            } else if (part.text) {
              assistantText += (assistantText ? '\n' : '') + part.text;
            }
          }

          if (generatedImageUrl) {
            modelUsed = targetModel;
            usedHistoryFlag = useHist;
            usedRoles = built.imageRoles;
            break;
          }
        } catch (err: any) {
          console.warn(`Refine (${targetModel}, history=${useHist}) failed:`, err?.message);
        }
      }
      if (generatedImageUrl) break;
    }

    if (!generatedImageUrl) {
      return res.status(502).json({
        error: 'El modelo no devolvió una nueva imagen corregida. Intenta reformular la corrección.',
      });
    }

    const resolvedSize = modelUsed === 'gemini-nano-banana-2.1' ? validSize : undefined;

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      model: modelUsed,
      imageSize: resolvedSize,
      assistantText: assistantText || undefined,
      promptUsed: promptText,
      thoughtSignature,
      traceEntry: {
        id: `trace-ref-${Date.now()}`,
        stage: 'refine-floor',
        model: modelUsed,
        imageSize: resolvedSize,
        pipelineMode: 'direct',
        includeImageRoleLabels: includeImageRoleLabels !== false,
        imageRoles: usedRoles,
        promptText,
        usedConversationHistory: usedHistoryFlag,
        durationMs: Date.now() - startedAt,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Error refining floor image:', error);
    const rawMsg =
      typeof error === 'string'
        ? error
        : error?.message || error?.toString?.() || JSON.stringify(error) || '';
    return res.status(500).json({ error: rawMsg || 'Error interno al corregir la imagen.' });
  }
});

// Upgrade / Re-render a Flash Lite or 1K result in crisp native 2K with Nano Banana 2.1
app.post('/api/upgrade-2k', async (req, res) => {
  const startedAt = Date.now();
  try {
    const {
      currentResultImageUrl,
      originalRoomImageUrl,
      referenceImages = [],
      referenceLabels = [],
      aspectRatio = '4:3',
    } = req.body;

    if (!currentResultImageUrl || !originalRoomImageUrl) {
      return res.status(400).json({ error: 'Se requieren la imagen actual y la habitación original para escalar a 2K.' });
    }

    const ai = getAiClient();
    const parts: any[] = [];
    const imageRoles: string[] = [];

    const curParsed = parseDataUrl(currentResultImageUrl);
    const role1 =
      'IMAGEN 1 — BORRADOR ACTUAL A MEJORAR EN ALTA RESOLUCIÓN 2K (conservar diseño de tablas y tono del piso de esta imagen):';
    imageRoles.push(role1);
    parts.push({ text: role1 });
    parts.push({ inlineData: { mimeType: curParsed.mimeType, data: curParsed.data } });

    const origParsed = parseDataUrl(originalRoomImageUrl);
    const role2 =
      'IMAGEN 2 — HABITACIÓN ORIGINAL (ancla fiel de detalles de muebles, paredes, aberturas, sombras y luz original):';
    imageRoles.push(role2);
    parts.push({ text: role2 });
    parts.push({ inlineData: { mimeType: origParsed.mimeType, data: origParsed.data } });

    const refsArr: string[] = Array.isArray(referenceImages) ? referenceImages.slice(0, 2) : [];
    refsArr.forEach((ref, idx) => {
      if (typeof ref === 'string' && ref.length > 0) {
        const rParsed = parseDataUrl(ref);
        const label =
          Array.isArray(referenceLabels) && referenceLabels[idx]
            ? referenceLabels[idx]
            : `Ref #${idx + 1}`;
        const refRole = `IMAGEN ${idx + 3} — REFERENCIA DE MADERA (${label}; para textura fina de veta y poro en 2K):`;
        imageRoles.push(refRole);
        parts.push({ text: refRole });
        parts.push({ inlineData: { mimeType: rParsed.mimeType, data: rParsed.data } });
      }
    });

    const promptText =
      'Re-renderizá en máxima nitidez 2K el piso instalado en la Imagen 1 usando la fidelidad estructural, iluminación exacta y objetos intactos de la Imagen 2 y el detalle natural de veta y bisel de la madera de referencia. No modifiques el mobiliario ni el encuadre; mejorá únicamente la definición fotorrealista del piso y la integración de sombras.';
    parts.push({ text: promptText });

    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: selectedRatio,
          imageSize: '2K',
        },
      },
    });

    const candParts = response?.candidates?.[0]?.content?.parts ?? [];
    const thoughtSignature = extractThoughtSignature(candParts);
    let upgradedUrl: string | null = null;

    for (const part of candParts) {
      if (part.inlineData?.data) {
        upgradedUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!upgradedUrl) {
      return res.status(502).json({ error: 'Nano Banana 2.1 no devolvió la versión en 2K.' });
    }

    return res.json({
      success: true,
      imageUrl: upgradedUrl,
      model: 'gemini-nano-banana-2.1',
      imageSize: '2K',
      promptUsed: promptText,
      thoughtSignature,
      traceEntry: {
        id: `trace-2k-${Date.now()}`,
        stage: 'upgrade-2k',
        model: 'gemini-nano-banana-2.1',
        imageSize: '2K',
        pipelineMode: 'direct',
        includeImageRoleLabels: true,
        imageRoles,
        promptText,
        usedConversationHistory: false,
        durationMs: Date.now() - startedAt,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Error upgrading to 2K:', error);
    return res.status(500).json({ error: error?.message || 'Error al escalar a 2K.' });
  }
});

// Health check endpoint (includes serverApiKeyId hash — never exposes raw key)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    serverApiKeyId: deriveServerKeyId(process.env.GEMINI_API_KEY),
  });
});

// Floors CRUD endpoints partitioned cleanly by API key ID (`x-api-key-id`)
app.get('/api/floors', (req, res) => {
  try {
    const keyId = resolveRequestKeyId(req);
    const allFloors = readJsonArray(FLOORS_DB_PATH);
    const filtered = allFloors.filter(
      (f: any) => !f.apiKeyId || f.apiKeyId === 'default' || f.apiKeyId === keyId
    );
    res.json({ success: true, floors: filtered, apiKeyId: keyId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/floors', (req, res) => {
  try {
    const keyId = resolveRequestKeyId(req);
    const incoming = req.body;
    if (!incoming || !incoming.name) {
      return res.status(400).json({ error: 'Nombre del piso requerido' });
    }
    const newFloor = {
      ...incoming,
      apiKeyId: incoming.apiKeyId || keyId,
    };

    const allFloors = readJsonArray(FLOORS_DB_PATH);
    const existingIdx = allFloors.findIndex((f: any) => f.id === newFloor.id);
    if (existingIdx >= 0) {
      allFloors[existingIdx] = newFloor;
    } else {
      allFloors.unshift(newFloor);
    }
    writeJsonArray(FLOORS_DB_PATH, allFloors);

    const visibleFloors = allFloors.filter(
      (f: any) => !f.apiKeyId || f.apiKeyId === 'default' || f.apiKeyId === keyId
    );
    res.json({ success: true, floor: newFloor, floors: visibleFloors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/floors/:id', (req, res) => {
  try {
    const keyId = resolveRequestKeyId(req);
    const { id } = req.params;
    const allFloors = readJsonArray(FLOORS_DB_PATH);
    const remaining = allFloors.filter((f: any) => {
      if (f.id !== id) return true;
      // Only remove if belongs to this key or legacy default
      return Boolean(f.apiKeyId && f.apiKeyId !== 'default' && f.apiKeyId !== keyId);
    });
    writeJsonArray(FLOORS_DB_PATH, remaining);

    const visibleFloors = remaining.filter(
      (f: any) => !f.apiKeyId || f.apiKeyId === 'default' || f.apiKeyId === keyId
    );
    res.json({ success: true, floors: visibleFloors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Testing History endpoints partitioned by API key ID (`x-api-key-id`)
app.get('/api/history', (req, res) => {
  try {
    const keyId = resolveRequestKeyId(req);
    const allHistory = readJsonArray(HISTORY_DB_PATH);
    const filtered = allHistory.filter(
      (h: any) => h.apiKeyId === keyId || (!h.apiKeyId && keyId === 'default')
    );
    res.json({ success: true, history: filtered, apiKeyId: keyId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/history', (req, res) => {
  try {
    const keyId = resolveRequestKeyId(req);
    const incoming = req.body;
    if (!incoming || !incoming.id || !incoming.resultImageUrl) {
      return res.status(400).json({ error: 'Resultado inválido para guardar en historial.' });
    }

    const item = {
      ...incoming,
      apiKeyId: keyId,
    };

    const allHistory = readJsonArray(HISTORY_DB_PATH);
    const others = allHistory.filter((h: any) => h.apiKeyId !== keyId && h.id !== item.id);
    const sameKey = allHistory.filter((h: any) => h.apiKeyId === keyId && h.id !== item.id);
    const updatedKeyHistory = [item, ...sameKey].slice(0, 15);
    writeJsonArray(HISTORY_DB_PATH, [...updatedKeyHistory, ...others]);

    res.json({ success: true, history: updatedKeyHistory });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    const keyId = resolveRequestKeyId(req);
    const { id } = req.params;
    const allHistory = readJsonArray(HISTORY_DB_PATH);
    const remaining = allHistory.filter(
      (h: any) => !(h.id === id && (h.apiKeyId === keyId || !h.apiKeyId))
    );
    writeJsonArray(HISTORY_DB_PATH, remaining);

    const visibleHistory = remaining.filter(
      (h: any) => h.apiKeyId === keyId || (!h.apiKeyId && keyId === 'default')
    );
    res.json({ success: true, history: visibleHistory });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/history', (req, res) => {
  try {
    const keyId = resolveRequestKeyId(req);
    const allHistory = readJsonArray(HISTORY_DB_PATH);
    const remaining = allHistory.filter((h: any) => h.apiKeyId !== keyId);
    writeJsonArray(HISTORY_DB_PATH, remaining);
    res.json({ success: true, history: [] });
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
