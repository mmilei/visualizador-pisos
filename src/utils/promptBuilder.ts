import { FloorParametersConfig } from '../types';

export const DEFAULT_FLOOR_PARAMETERS: FloorParametersConfig = {
  orientation: { enabled: false, value: 'vertical' },
  widthCm: { enabled: false, value: '18' },
  format: { enabled: false, value: 'recto' },
  tone: { enabled: false, value: 'natural' },
  finish: { enabled: false, value: 'mate' },
  lighting: { enabled: false, value: 'ventana' },
};

export function createInitialFloorParameters(productWidthCm?: number, productFormat?: string): FloorParametersConfig {
  return {
    orientation: { enabled: false, value: 'vertical' },
    widthCm: { enabled: false, value: productWidthCm ? String(productWidthCm) : '18' },
    format: {
      enabled: false,
      value: (productFormat as any) || 'recto',
    },
    tone: { enabled: false, value: 'natural' },
    finish: { enabled: false, value: 'mate' },
    lighting: { enabled: false, value: 'ventana' },
  };
}

export function buildCleanFloorPrompt(options: {
  productName: string;
  referenceCount: number;
  referenceLabels?: string[];
  params: FloorParametersConfig;
  customPrompt?: string;
}): string {
  const { productName, referenceCount, referenceLabels = [], params, customPrompt = '' } = options;

  const refDesc =
    referenceCount <= 1
      ? 'image 2'
      : `images 2 to ${referenceCount + 1}${
          referenceLabels.length > 0
            ? ` (${referenceLabels.map((l, idx) => `image ${idx + 2}: ${l}`).join(', ')})`
            : ''
        }`;

  const constraints: string[] = [];

  if (params.widthCm.enabled && params.widthCm.value.trim()) {
    constraints.push(`Use planks approximately ${params.widthCm.value.trim()} cm wide`);
  }

  if (params.orientation.enabled) {
    if (params.orientation.value === 'horizontal') {
      constraints.push('lay the planks horizontally (left to right across the room)');
    } else if (params.orientation.value === 'diagonal') {
      constraints.push('lay the planks diagonally at 45 degrees');
    } else {
      constraints.push('lay the planks vertically (running into the depth of the room toward the back wall/window)');
    }
  }

  if (params.format.enabled) {
    const formatMap: Record<string, string> = {
      recto: 'straight running-bond planks',
      chevron: '45-degree French Chevron pattern',
      espiga: '90-degree Herringbone pattern',
      deck: 'parallel deck planks with subtle shadow gaps',
    };
    constraints.push(`use ${formatMap[params.format.value] || params.format.value}`);
  }

  if (params.tone.enabled && params.tone.value.trim()) {
    const toneMap: Record<string, string> = {
      claro: 'lighter natural blonde wood tone',
      natural: 'balanced natural wood tone matching the sample',
      miel: 'warm golden honey tone',
      medio: 'medium toasted walnut/oak tone',
      oscuro: 'deep dark chocolate wood tone',
      nordico: 'cool muted Nordic grey-beige tone',
    };
    constraints.push(`adjust color tone toward ${toneMap[params.tone.value] || params.tone.value}`);
  }

  if (params.finish.enabled) {
    const finishMap: Record<string, string> = {
      mate: 'natural matte finish with zero plastic shine',
      satinado: 'soft satin low-sheen finish',
      brillante: 'glossy lacquered finish',
    };
    constraints.push(`surface finish: ${finishMap[params.finish.value] || params.finish.value}`);
  }

  if (params.lighting.enabled) {
    constraints.push(
      params.lighting.value === 'ventana'
        ? 'preserve natural window light sheen and soft reflections on the floor'
        : 'render soft even ambient lighting across the floor'
    );
  }

  const lines: string[] = [
    `Edit ONLY the ROOM IMAGE (first image): replace its floor surface with the wood flooring material shown in the FLOOR REFERENCE ${referenceCount <= 1 ? 'image' : `images (${referenceLabels.join(', ')})`} ("${productName}").`,
    'Do NOT copy furniture, mirrors, walls, doors, or camera framing from any reference photo—transfer ONLY the floor surface.',
  ];

  if (constraints.length > 0) {
    lines.push(`Floor details: ${constraints.join('; ')}.`);
  }

  if (customPrompt.trim()) {
    lines.push(`Additional request: ${customPrompt.trim()}`);
  }

  lines.push(
    'Keep the room walls, furniture, rugs, natural lighting, shadows under objects, and exact camera perspective identical to the ROOM IMAGE.'
  );

  return lines.join(' ');
}

export function buildRefinementPrompt(options: {
  instruction: string;
  hasReferenceImage: boolean;
  previousInstructions?: string[];
}): string {
  const { instruction, hasReferenceImage, previousInstructions = [] } = options;

  const parts: string[] = [
    `Edit ONLY the TARGET ROOM IMAGE (first image) following this user correction: "${instruction.trim()}".`,
  ];

  if (hasReferenceImage) {
    parts.push(
      'The second image is ONLY a wood floor material swatch for grain/color consistency—NEVER replace the room or output the second photo as the scene.'
    );
  }

  if (previousInstructions.length > 0) {
    parts.push(`Context from earlier adjustments: ${previousInstructions.slice(-3).join(' | ')}.`);
  }

  parts.push(
    'Keep the exact same room, furniture, beds, rugs, walls, windows, lighting, and camera angle from the first image, changing ONLY the requested floor aspect.'
  );

  return parts.join(' ');
}
