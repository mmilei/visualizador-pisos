/**
 * Cliente directo de Google Gemini Nano Banana para GitHub Pages y Chat de Correcciones.
 * Incluye extracción limpia de muestra cenital (swatch) y reemplazo estructural destructivo.
 */

import { FloorModelChoice, FloorParametersConfig } from '../types';
import {
  buildCleanFloorPrompt,
  buildRefinementPrompt,
  buildSwatchExtractionPrompt,
  DEFAULT_FLOOR_PARAMETERS,
} from './promptBuilder';

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
    data: dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
  };
}

export async function extractCleanFloorSwatchDirect(params: {
  apiKey: string;
  floorImages: string[];
  floorImageLabels?: string[];
  productName: string;
  modelChoice?: FloorModelChoice;
}): Promise<{ swatchUrl: string; model: string }> {
  const {
    apiKey,
    floorImages,
    floorImageLabels = [],
    productName,
    modelChoice = 'gemini-nano-banana-2.1',
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No se encontró una clave de Gemini API configurada.');
  }

  const cleanKey = apiKey.trim();
  // Cap at 4 representative photos to prevent payload bloat and context dilution
  const capped = floorImages.slice(0, 4);
  const cappedLabels = floorImageLabels.slice(0, 4);

  const parts: any[] = [];
  capped.forEach((img, idx) => {
    const parsed = parseDataUrl(img);
    const label = cappedLabels[idx] || `Photo #${idx + 1}`;
    parts.push({
      text: `INPUT PHOTO ${idx + 1} (${label}) — examine ONLY the floor planks in this photo:`,
    });
    parts.push({
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    });
  });

  parts.push({
    text: buildSwatchExtractionPrompt({
      productName,
      referenceLabels: cappedLabels,
    }),
  });

  const modelsToTry: FloorModelChoice[] =
    modelChoice === 'gemini-3.1-flash-lite-image'
      ? ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1']
      : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

  let lastErrorMsg = '';
  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              imageConfig: {
                aspectRatio: '1:1',
              },
            },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        lastErrorMsg = data?.error?.message || `HTTP ${response.status} en ${model}`;
        continue;
      }

      for (const part of data?.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return {
            swatchUrl: `data:${mime};base64,${part.inlineData.data}`,
            model,
          };
        }
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
    }
  }

  throw new Error(lastErrorMsg || 'No se pudo sintetizar la muestra limpia del piso.');
}

export interface DirectNanoBananaParams {
  apiKey: string;
  roomImage: string;
  floorImages: string[];
  floorImageLabels?: string[];
  productName: string;
  parameters?: FloorParametersConfig;
  customPrompt?: string;
  aspectRatio?: string;
  modelChoice?: FloorModelChoice;
}

export async function generateWithGoogleNanoBanana(params: DirectNanoBananaParams): Promise<{
  imageUrl: string;
  model: string;
  promptUsed: string;
}> {
  const {
    apiKey,
    roomImage,
    floorImages,
    floorImageLabels = [],
    productName,
    parameters = DEFAULT_FLOOR_PARAMETERS,
    customPrompt = '',
    aspectRatio = '4:3',
    modelChoice = 'gemini-nano-banana-2.1',
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No se encontró una clave de Gemini API configurada.');
  }

  const cleanKey = apiKey.trim();
  const roomParsed = parseDataUrl(roomImage);

  // Cap at max 2 references so the model never gets overwhelmed by conflicting scenes
  const cappedFloorImages = floorImages.slice(0, 2);
  const cappedLabels = floorImageLabels.slice(0, 2);

  const parts: any[] = [
    {
      text: 'IMAGE 1 — TARGET ROOM (keep walls, baseboards, furniture, rugs, and windows; COMPLETELY DEMOLISH and strip out the old floor surface and seams):',
    },
    {
      inlineData: {
        mimeType: roomParsed.mimeType,
        data: roomParsed.data,
      },
    },
  ];

  cappedFloorImages.forEach((img, idx) => {
    const parsed = parseDataUrl(img);
    const label = cappedLabels[idx] || `Sample #${idx + 1}`;
    parts.push({
      text: `IMAGE ${idx + 2} — NEW FLOOR MATERIAL REFERENCE (${label} — extract ONLY the wood planks, tone, grain, knots, bevels, and finish; ignore any surroundings):`,
    });
    parts.push({
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    });
  });

  const promptText = buildCleanFloorPrompt({
    productName,
    referenceCount: cappedFloorImages.length,
    referenceLabels: cappedLabels,
    params: parameters,
    customPrompt,
  });

  parts.push({ text: promptText });

  const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

  const modelsToTry: FloorModelChoice[] =
    modelChoice === 'gemini-3.1-flash-lite-image'
      ? ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1']
      : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

  let lastErrorMsg = '';

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              imageConfig: {
                aspectRatio: selectedRatio,
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} en ${model}`;
        lastErrorMsg = errorMsg;
        console.warn(`Attempt with ${model} failed:`, errorMsg);
        continue;
      }

      for (const part of data?.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return {
            imageUrl: `data:${mime};base64,${part.inlineData.data}`,
            model,
            promptUsed: promptText,
          };
        }
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.warn(`Fetch error with ${model}:`, err);
    }
  }

  throw new Error(
    lastErrorMsg ||
      'No se pudo generar la imagen con Google Gemini Nano Banana. Verifica que tu clave de Gemini tenga facturación habilitada.'
  );
}

export interface DirectRefineParams {
  apiKey: string;
  baseImageUrl: string;
  referenceImageUrl?: string;
  instruction: string;
  previousInstructions?: string[];
  aspectRatio?: string;
  modelChoice?: FloorModelChoice;
}

export async function refineWithGoogleNanoBanana(params: DirectRefineParams): Promise<{
  imageUrl: string;
  model: string;
  assistantText?: string;
  promptUsed: string;
}> {
  const {
    apiKey,
    baseImageUrl,
    referenceImageUrl,
    instruction,
    previousInstructions = [],
    aspectRatio = '4:3',
    modelChoice = 'gemini-nano-banana-2.1',
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No se encontró una clave de Gemini API configurada.');
  }

  const cleanKey = apiKey.trim();
  const baseParsed = parseDataUrl(baseImageUrl);

  const parts: any[] = [
    {
      text: 'TARGET ROOM IMAGE TO EDIT (keep this exact room, furniture, bed, rug, walls, and camera angle; modify ONLY the floor as requested):',
    },
    {
      inlineData: {
        mimeType: baseParsed.mimeType,
        data: baseParsed.data,
      },
    },
  ];

  if (referenceImageUrl) {
    const refParsed = parseDataUrl(referenceImageUrl);
    parts.push({
      text: 'FLOOR MATERIAL REFERENCE ONLY (NEVER output this room or its furniture/mirrors; use only as wood texture/color reference):',
    });
    parts.push({
      inlineData: {
        mimeType: refParsed.mimeType,
        data: refParsed.data,
      },
    });
  }

  const promptText = buildRefinementPrompt({
    instruction,
    hasReferenceImage: !!referenceImageUrl,
    previousInstructions,
  });

  parts.push({ text: promptText });

  const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

  const modelsToTry: FloorModelChoice[] =
    modelChoice === 'gemini-3.1-flash-lite-image'
      ? ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1']
      : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

  let lastErrorMsg = '';

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              imageConfig: {
                aspectRatio: selectedRatio,
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} en ${model}`;
        lastErrorMsg = errorMsg;
        console.warn(`Refine attempt with ${model} failed:`, errorMsg);
        continue;
      }

      let foundImageUrl: string | null = null;
      let foundText = '';

      for (const part of data?.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data && !foundImageUrl) {
          const mime = part.inlineData.mimeType || 'image/png';
          foundImageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          foundText += (foundText ? '\n' : '') + part.text;
        }
      }

      if (foundImageUrl) {
        return {
          imageUrl: foundImageUrl,
          model,
          assistantText: foundText || undefined,
          promptUsed: promptText,
        };
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.warn(`Refine fetch error with ${model}:`, err);
    }
  }

  throw new Error(
    lastErrorMsg ||
      'No se pudo aplicar la corrección sobre la imagen. Verifica la clave o intenta con otra indicación.'
  );
}
