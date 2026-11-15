/**
 * Cliente directo de Google Gemini Nano Banana para GitHub Pages y modo sin backend.
 * Soporta:
 *  - Flujo directo (1 ambiente + 1..4 referencias en 1K/2K nativo o Flash Lite)
 *  - Paso previo opcional por Gemini (extracción de muestra limpia neutra 5500K)
 *  - Chat multi-turn real con continuidad de thoughtSignature y anclaje
 *  - Escalamiento de Flash Lite / 1K a Nano Banana 2.1 (2K)
 *  - Trazabilidad exacta (PromptTraceEntry) de cada llamada
 */

import {
  FloorModelChoice,
  FloorParametersConfig,
  FloorQualityPreset,
  PipelineFlowMode,
  PromptStrategyId,
  PromptTraceEntry,
} from '../types';
import {
  buildCleanFloorPrompt,
  buildImageRoleLabel,
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

export async function extractCleanFloorSwatchDirect(params: {
  apiKey: string;
  floorImages: string[];
  floorImageLabels?: string[];
  productName: string;
  modelChoice?: FloorModelChoice;
}): Promise<{ swatchUrl: string; model: string; traceEntry: PromptTraceEntry }> {
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

  const startedAt = Date.now();
  const cleanKey = apiKey.trim();
  const capped = floorImages.slice(0, 4);
  const cappedLabels = floorImageLabels.slice(0, 4);

  const imageRoles: string[] = [];
  const parts: any[] = [];
  capped.forEach((img, idx) => {
    const parsed = parseDataUrl(img);
    const label = cappedLabels[idx] || `Foto #${idx + 1}`;
    const roleText = `FOTO ${idx + 1} (${label}) — extraer únicamente la madera del piso`;
    imageRoles.push(roleText);
    parts.push({ text: roleText });
    parts.push({
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    });
  });

  const promptText = buildSwatchExtractionPrompt({
    productName,
    referenceLabels: cappedLabels,
  });
  parts.push({ text: promptText });

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
            traceEntry: {
              id: `trace-swatch-${Date.now()}`,
              stage: 'extract-swatch',
              model,
              pipelineMode: 'gemini_prepass',
              includeImageRoleLabels: true,
              imageRoles,
              promptText,
              usedConversationHistory: false,
              durationMs: Date.now() - startedAt,
              timestamp: Date.now(),
            },
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
  promptText?: string;
  parameters?: FloorParametersConfig;
  strategyId?: PromptStrategyId;
  customPrompt?: string;
  includeImageRoleLabels?: boolean;
  aspectRatio?: string;
  modelChoice?: FloorModelChoice;
  imageSize?: FloorQualityPreset;
  pipelineMode?: PipelineFlowMode;
}

export async function generateWithGoogleNanoBanana(params: DirectNanoBananaParams): Promise<{
  imageUrl: string;
  model: string;
  imageSize?: FloorQualityPreset;
  promptUsed: string;
  thoughtSignature?: string;
  traceEntry: PromptTraceEntry;
}> {
  const {
    apiKey,
    roomImage,
    floorImages,
    floorImageLabels = [],
    productName,
    promptText: explicitPrompt,
    parameters = DEFAULT_FLOOR_PARAMETERS,
    strategyId = 'chat_direct',
    customPrompt = '',
    includeImageRoleLabels = true,
    aspectRatio = '4:3',
    modelChoice = 'gemini-nano-banana-2.1',
    imageSize = '2K',
    pipelineMode = 'direct',
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No se encontró una clave de Gemini API configurada.');
  }

  const startedAt = Date.now();
  const cleanKey = apiKey.trim();
  const roomParsed = parseDataUrl(roomImage);

  // Support 1 to 4 reference photos cleanly
  const cappedFloorImages = floorImages.slice(0, 4);
  const cappedLabels = floorImageLabels.slice(0, 4);

  const imageRoles: string[] = [];
  const parts: any[] = [];

  const roomRole = buildImageRoleLabel({ index: 0, isRoom: true });
  imageRoles.push(roomRole);
  if (includeImageRoleLabels) {
    parts.push({ text: roomRole });
  }
  parts.push({
    inlineData: {
      mimeType: roomParsed.mimeType,
      data: roomParsed.data,
    },
  });

  cappedFloorImages.forEach((img, idx) => {
    const parsed = parseDataUrl(img);
    const label = cappedLabels[idx] || `Referencia #${idx + 1}`;
    const refRole = buildImageRoleLabel({ index: idx + 1, isRoom: false, label });
    imageRoles.push(refRole);
    if (includeImageRoleLabels) {
      parts.push({ text: refRole });
    }
    parts.push({
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    });
  });

  const promptText =
    typeof explicitPrompt === 'string' && explicitPrompt.trim().length > 0
      ? explicitPrompt.trim()
      : buildCleanFloorPrompt({
          productName,
          referenceCount: cappedFloorImages.length,
          referenceLabels: cappedLabels,
          params: parameters,
          customPrompt,
          strategyId,
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
      const imageConfig: Record<string, string> = {
        aspectRatio: selectedRatio,
      };
      if (model === 'gemini-nano-banana-2.1') {
        imageConfig.imageSize = imageSize;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              imageConfig,
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

      const candParts = data?.candidates?.[0]?.content?.parts ?? [];
      const thoughtSignature = extractThoughtSignature(candParts);

      for (const part of candParts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          const resolvedSize: FloorQualityPreset | undefined =
            model === 'gemini-nano-banana-2.1' ? imageSize : undefined;
          return {
            imageUrl: `data:${mime};base64,${part.inlineData.data}`,
            model,
            imageSize: resolvedSize,
            promptUsed: promptText,
            thoughtSignature,
            traceEntry: {
              id: `trace-gen-${Date.now()}`,
              stage: 'generate-floor',
              model,
              imageSize: resolvedSize,
              pipelineMode,
              includeImageRoleLabels,
              imageRoles,
              promptText,
              usedConversationHistory: false,
              durationMs: Date.now() - startedAt,
              timestamp: Date.now(),
            },
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

export interface MultiTurnHistoryTurn {
  role: 'user' | 'model';
  text?: string;
  imageUrl?: string;
  thoughtSignature?: string;
}

export interface DirectRefineParams {
  apiKey: string;
  baseImageUrl: string;
  originalRoomImage?: string;
  referenceImages?: string[];
  referenceLabels?: string[];
  initialPromptText?: string;
  conversationHistory?: MultiTurnHistoryTurn[];
  instruction: string;
  previousInstructions?: string[];
  rawMode?: boolean;
  includeImageRoleLabels?: boolean;
  aspectRatio?: string;
  modelChoice?: FloorModelChoice;
  imageSize?: FloorQualityPreset;
}

export async function refineWithGoogleNanoBanana(params: DirectRefineParams): Promise<{
  imageUrl: string;
  model: string;
  imageSize?: FloorQualityPreset;
  assistantText?: string;
  promptUsed: string;
  thoughtSignature?: string;
  traceEntry: PromptTraceEntry;
}> {
  const {
    apiKey,
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
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No se encontró una clave de Gemini API configurada.');
  }

  const startedAt = Date.now();
  const cleanKey = apiKey.trim();

  const promptText = buildRefinementPrompt({
    instruction,
    hasReferenceImage: referenceImages.length > 0,
    previousInstructions,
    rawMode,
  });

  const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

  // Build single-turn anchored fallback payload cleanly
  const buildSingleTurnAnchored = (): { contents: any[]; imageRoles: string[] } => {
    const roles: string[] = [];
    const singleParts: any[] = [];

    const baseParsed = parseDataUrl(baseImageUrl);
    const baseRole = 'IMAGEN 1 — RESULTADO ACTUAL A CORREGIR (mantener habitaciones, luz y muebles exactos; aplicar cambio pedido al piso):';
    roles.push(baseRole);
    if (includeImageRoleLabels) singleParts.push({ text: baseRole });
    singleParts.push({ inlineData: { mimeType: baseParsed.mimeType, data: baseParsed.data } });

    if (originalRoomImage && originalRoomImage !== baseImageUrl) {
      const origParsed = parseDataUrl(originalRoomImage);
      const origRole = 'IMAGEN 2 — HABITACIÓN ORIGINAL (ancla de muebles, zócalos, paredes e iluminación real):';
      roles.push(origRole);
      if (includeImageRoleLabels) singleParts.push({ text: origRole });
      singleParts.push({ inlineData: { mimeType: origParsed.mimeType, data: origParsed.data } });
    }

    const cappedRefs = referenceImages.slice(0, 4);
    cappedRefs.forEach((refUrl, idx) => {
      const refParsed = parseDataUrl(refUrl);
      const refRole = `IMAGEN ${roles.length + 1} — REFERENCIA DE PISO (${referenceLabels[idx] || `Ref #${idx + 1}`}; solo madera/material, jamás copiar el cuarto de esta foto):`;
      roles.push(refRole);
      if (includeImageRoleLabels) singleParts.push({ text: refRole });
      singleParts.push({ inlineData: { mimeType: refParsed.mimeType, data: refParsed.data } });
    });

    singleParts.push({ text: promptText });
    return { contents: [{ role: 'user', parts: singleParts }], imageRoles: roles };
  };

  // Build true multi-turn contents when model is NB 2.1 and prior history exists
  const canUseMultiTurn =
    modelChoice === 'gemini-nano-banana-2.1' &&
    Boolean(originalRoomImage) &&
    conversationHistory.length > 0 &&
    conversationHistory.some((t) => t.role === 'model' && t.imageUrl);

  const buildMultiTurnContents = (): { contents: any[]; imageRoles: string[] } => {
    const contents: any[] = [];
    const roles: string[] = [];

    // Turn 1 user: original room + 1..4 references + initial prompt
    const turn1Parts: any[] = [];
    const roomParsed = parseDataUrl(originalRoomImage!);
    const rRole = buildImageRoleLabel({ index: 0, isRoom: true });
    roles.push(rRole);
    if (includeImageRoleLabels) turn1Parts.push({ text: rRole });
    turn1Parts.push({ inlineData: { mimeType: roomParsed.mimeType, data: roomParsed.data } });

    referenceImages.slice(0, 4).forEach((refUrl, idx) => {
      const refParsed = parseDataUrl(refUrl);
      const refRole = buildImageRoleLabel({
        index: idx + 1,
        isRoom: false,
        label: referenceLabels[idx] || `Ref #${idx + 1}`,
      });
      roles.push(refRole);
      if (includeImageRoleLabels) turn1Parts.push({ text: refRole });
      turn1Parts.push({ inlineData: { mimeType: refParsed.mimeType, data: refParsed.data } });
    });

    turn1Parts.push({
      text:
        initialPromptText ||
        'Reemplazá únicamente el piso de la Imagen 1 usando la madera de referencia, respetando iluminación y dejando todo lo demás igual.',
    });
    contents.push({ role: 'user', parts: turn1Parts });

    // Append prior assistant/user turns
    for (const turn of conversationHistory) {
      const turnParts: any[] = [];
      if (turn.text) {
        turnParts.push({ text: turn.text });
      }
      if (turn.imageUrl) {
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

    // Current user instruction
    contents.push({ role: 'user', parts: [{ text: promptText }] });
    return { contents, imageRoles: roles };
  };

  const modelsToTry: FloorModelChoice[] =
    modelChoice === 'gemini-3.1-flash-lite-image'
      ? ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1']
      : ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];

  let lastErrorMsg = '';

  for (const model of modelsToTry) {
    const attemptMultiTurn = model === 'gemini-nano-banana-2.1' && canUseMultiTurn;
    const strategies = attemptMultiTurn ? [true, false] : [false];

    for (const useHistory of strategies) {
      try {
        const built = useHistory ? buildMultiTurnContents() : buildSingleTurnAnchored();
        const imageConfig: Record<string, string> = { aspectRatio: selectedRatio };
        if (model === 'gemini-nano-banana-2.1') {
          imageConfig.imageSize = imageSize;
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: built.contents,
              generationConfig: { imageConfig },
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          lastErrorMsg = data?.error?.message || `HTTP ${response.status} en ${model}`;
          console.warn(`Refine (${model}, history=${useHistory}) failed:`, lastErrorMsg);
          continue;
        }

        const candParts = data?.candidates?.[0]?.content?.parts ?? [];
        const thoughtSignature = extractThoughtSignature(candParts);
        let foundImageUrl: string | null = null;
        let foundText = '';

        for (const part of candParts) {
          if (part.inlineData?.data && !foundImageUrl) {
            const mime = part.inlineData.mimeType || 'image/png';
            foundImageUrl = `data:${mime};base64,${part.inlineData.data}`;
          } else if (part.text) {
            foundText += (foundText ? '\n' : '') + part.text;
          }
        }

        if (foundImageUrl) {
          const resolvedSize: FloorQualityPreset | undefined =
            model === 'gemini-nano-banana-2.1' ? imageSize : undefined;
          return {
            imageUrl: foundImageUrl,
            model,
            imageSize: resolvedSize,
            assistantText: foundText || undefined,
            promptUsed: promptText,
            thoughtSignature,
            traceEntry: {
              id: `trace-ref-${Date.now()}`,
              stage: 'refine-floor',
              model,
              imageSize: resolvedSize,
              pipelineMode: 'direct',
              includeImageRoleLabels,
              imageRoles: built.imageRoles,
              promptText,
              usedConversationHistory: useHistory,
              durationMs: Date.now() - startedAt,
              timestamp: Date.now(),
            },
          };
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err);
      }
    }
  }

  throw new Error(
    lastErrorMsg ||
      'No se pudo aplicar la corrección sobre la imagen. Verifica la clave o intenta con otra indicación.'
  );
}

/**
 * Escalado / mejora limpia a 2K nativo usando Nano Banana 2.1 sobre un render hecho con Flash Lite o 1K.
 */
export async function upgradeTo2KWithGoogleNanoBanana(params: {
  apiKey: string;
  currentResultImageUrl: string;
  originalRoomImageUrl: string;
  referenceImages?: string[];
  referenceLabels?: string[];
  aspectRatio?: string;
}): Promise<{
  imageUrl: string;
  model: string;
  imageSize: FloorQualityPreset;
  promptUsed: string;
  thoughtSignature?: string;
  traceEntry: PromptTraceEntry;
}> {
  const {
    apiKey,
    currentResultImageUrl,
    originalRoomImageUrl,
    referenceImages = [],
    referenceLabels = [],
    aspectRatio = '4:3',
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No se encontró una clave de Gemini API configurada.');
  }

  const startedAt = Date.now();
  const cleanKey = apiKey.trim();
  const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

  const parts: any[] = [];
  const imageRoles: string[] = [];

  const curParsed = parseDataUrl(currentResultImageUrl);
  const role1 = 'IMAGEN 1 — BORRADOR ACTUAL A MEJORAR EN ALTA RESOLUCIÓN 2K (conservar diseño de tablas y tono del piso de esta imagen):';
  imageRoles.push(role1);
  parts.push({ text: role1 });
  parts.push({ inlineData: { mimeType: curParsed.mimeType, data: curParsed.data } });

  const origParsed = parseDataUrl(originalRoomImageUrl);
  const role2 = 'IMAGEN 2 — HABITACIÓN ORIGINAL (ancla fiel de detalles de muebles, paredes, aberturas, sombras y luz original):';
  imageRoles.push(role2);
  parts.push({ text: role2 });
  parts.push({ inlineData: { mimeType: origParsed.mimeType, data: origParsed.data } });

  referenceImages.slice(0, 2).forEach((ref, idx) => {
    const rParsed = parseDataUrl(ref);
    const refRole = `IMAGEN ${idx + 3} — REFERENCIA DE MADERA (${referenceLabels[idx] || `Ref #${idx + 1}`}; para textura fina de veta y poro en 2K):`;
    imageRoles.push(refRole);
    parts.push({ text: refRole });
    parts.push({ inlineData: { mimeType: rParsed.mimeType, data: rParsed.data } });
  });

  const promptText =
    'Re-renderizá en máxima nitidez 2K el piso instalado en la Imagen 1 usando la fidelidad estructural, iluminación exacta y objetos intactos de la Imagen 2 y el detalle natural de veta y bisel de la madera de referencia. No modifiques el mobiliario ni el encuadre; mejorá únicamente la definición fotorrealista del piso y la integración de sombras.';
  parts.push({ text: promptText });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent?key=${cleanKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          imageConfig: {
            aspectRatio: selectedRatio,
            imageSize: '2K',
          },
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status} al escalar a 2K`);
  }

  const candParts = data?.candidates?.[0]?.content?.parts ?? [];
  const thoughtSignature = extractThoughtSignature(candParts);

  for (const part of candParts) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType || 'image/png';
      return {
        imageUrl: `data:${mime};base64,${part.inlineData.data}`,
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
      };
    }
  }

  throw new Error('Nano Banana 2.1 no devolvió la versión en 2K.');
}
