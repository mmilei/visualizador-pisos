/**
 * Cliente directo de Google Gemini Nano Banana para GitHub Pages.
 * Permite ejecutar la IA fotorrealista directamente llamando a la API oficial de Google
 * utilizando una clave provista en el cliente (localStorage o parámetro de URL).
 */

import { PlankOrientation } from '../types';

export interface DirectNanoBananaParams {
  apiKey: string;
  roomImage: string;
  floorImages: string[];
  floorImageLabels?: string[];
  productName: string;
  woodDetails?: {
    species?: string;
    widthCm?: string | number;
    format?: string;
    finish?: string;
    notes?: string;
  };
  customPrompt?: string;
  plankOrientation?: PlankOrientation | string;
  aspectRatio?: string;
}

export async function generateWithGoogleNanoBanana(params: DirectNanoBananaParams): Promise<{
  imageUrl: string;
  model: string;
}> {
  const {
    apiKey,
    roomImage,
    floorImages,
    floorImageLabels = [],
    productName,
    woodDetails = {},
    customPrompt = '',
    plankOrientation = 'vertical',
    aspectRatio = '4:3',
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No se encontró una clave de Gemini API configurada.');
  }

  const cleanKey = apiKey.trim();
  const cleanRoom = roomImage.replace(/^data:image\/[a-z]+;base64,/, '');

  const parts: any[] = [
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanRoom,
      },
    },
  ];

  floorImages.forEach((img) => {
    const cleanFloor = img.replace(/^data:image\/[a-z]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanFloor,
      },
    });
  });

  const plankDirectionDesc =
    plankOrientation === 'horizontal'
      ? 'HORIZONTAL orientation (perpendicular to the room depth, running from left to right across the walls)'
      : 'VERTICAL orientation (parallel to the room depth, extending from the camera vantage point toward the background window/far wall)';

  const promptText = `
You are an expert architectural visualization neural engine.
IMAGE 1 is the user's REAL ROOM photograph.
The subsequent image(s) show a real wood flooring material: "${productName}".

SPECIFICATIONS:
- Wood Species: ${woodDetails.species || 'High-grade hardwood'}
- Plank Format: ${(woodDetails.format || 'recto').toUpperCase()}
- Plank Width: ${woodDetails.widthCm ? `${woodDetails.widthCm} cm` : '20 cm'}
- Required Plank Orientation: Lay all floor planks strictly with ${plankDirectionDesc}.
- Surface Finish: ${woodDetails.finish || 'Matte polyurethane satin'}
${customPrompt ? `- ADDITIONAL USER INSTRUCTIONS: "${customPrompt}"` : ''}

TASK:
Generate a photorealistic, professional photograph showing the EXACT SAME ROOM from image 1, where ONLY the existing floor surface has been replaced with the wood floor shown in the reference image(s).

STRICT PRESERVATION RULES:
1. Preserve the exact room architecture, walls, windows, doors, ceiling, structural pillars, baseboards, and wall finishes.
2. Keep all furniture, tables, chairs, sofas, decorations, rugs (unless on the floor being replaced), and objects in their exact positions and forms.
3. The camera angle, perspective, lens focal length, framing, and vantage point must remain 100% identical to image 1.

PHOTOREALISTIC FLOOR INTEGRATION RULES:
1. Lay the wood floor strictly following the specified orientation (${plankOrientation}) and scale (${woodDetails.widthCm || 20} cm plank width).
2. Match the exact wood species, tone, natural color variation, plank layout, texture, and grain from the reference image(s).
3. Cast soft, realistic contact shadows directly beneath all furniture legs, baseboards, and any objects touching the floor.
4. Render natural ambient lighting, window sheen, subtle specular gloss, and reflections consistent with the room's real light sources.
`.trim();

  parts.push({ text: promptText });

  const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '4:3';

  const modelsToTry = ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1'];
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
