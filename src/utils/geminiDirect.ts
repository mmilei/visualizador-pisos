/**
 * Cliente directo de Google Gemini Nano Banana para GitHub Pages y Chat de Correcciones.
 * Envía prompts limpios basados únicamente en los parámetros activados por el usuario.
 */

import { FloorModelChoice, FloorParametersConfig } from '../types';
import { buildCleanFloorPrompt, buildRefinementPrompt, DEFAULT_FLOOR_PARAMETERS } from './promptBuilder';

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

  const parts: any[] = [
    {
      inlineData: {
        mimeType: roomParsed.mimeType,
        data: roomParsed.data,
      },
    },
  ];

  floorImages.forEach((img) => {
    const parsed = parseDataUrl(img);
    parts.push({
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    });
  });

  const promptText = buildCleanFloorPrompt({
    productName,
    referenceCount: floorImages.length,
    referenceLabels: floorImageLabels,
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
      inlineData: {
        mimeType: baseParsed.mimeType,
        data: baseParsed.data,
      },
    },
  ];

  if (referenceImageUrl) {
    const refParsed = parseDataUrl(referenceImageUrl);
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
