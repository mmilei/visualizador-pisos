import { FloorParametersConfig } from '../types';

export const DEFAULT_FLOOR_PARAMETERS: FloorParametersConfig = {
  orientation: { enabled: false, value: 'vertical' },
  widthCm: { enabled: false, value: '18' },
  format: { enabled: false, value: 'recto' },
  tone: { enabled: false, value: 'natural' },
  finish: { enabled: false, value: 'mate' },
  lighting: { enabled: false, value: 'ventana' },
};

export function createInitialFloorParameters(
  productWidthCm?: number,
  productFormat?: string
): FloorParametersConfig {
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

export function buildSwatchExtractionPrompt(options: {
  productName: string;
  referenceLabels?: string[];
}): string {
  const { productName, referenceLabels = [] } = options;
  const labelHint =
    referenceLabels.length > 0 ? ` (${referenceLabels.join(', ')})` : '';

  return [
    `Inspect the provided reference photo(s)${labelHint} of the wood flooring product "${productName}".`,
    'Generate ONE clean, flat, straight-on orthographic top-down studio texture sample of ONLY this flooring material filling 100% of the frame edge-to-edge.',
    'Extract the exact wood species color, plank grain, natural knots, micro-bevel seams, plank proportions, and matte/satin sheen of the actual FLOOR planks shown.',
    'COMPLETELY EXCLUDE any walls, wood ceilings, kitchen cabinets, stairs, people, tools, plastic sheets, rugs, text labels, borders, or white collage margins.',
    'The output must look like a pure seamless overhead photograph of newly installed planks under even neutral lighting, with straight parallel vertical planks unless the floor in the photos is explicitly chevron/herringbone.',
  ].join(' ');
}

export function buildCleanFloorPrompt(options: {
  productName: string;
  referenceCount: number;
  referenceLabels?: string[];
  params: FloorParametersConfig;
  customPrompt?: string;
}): string {
  const {
    productName,
    referenceCount,
    referenceLabels = [],
    params,
    customPrompt = '',
  } = options;

  const refDesc =
    referenceCount <= 1
      ? 'the second image'
      : `the reference images${
          referenceLabels.length > 0 ? ` (${referenceLabels.join(', ')})` : ''
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
      constraints.push(
        'lay the planks vertically (running into the depth of the room toward the back wall/window)'
      );
    }
  }

  if (params.format.enabled) {
    const formatMap: Record<string, string> = {
      recto: 'straight running-bond planks (discard any existing herringbone/chevron/tile pattern)',
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
    `Perform a FULL FLOOR REPLACEMENT on Image 1 (the target room) using the flooring material from ${refDesc} ("${productName}").`,
    'CRITICAL: Completely DEMOLISH and ERASE the existing floor in Image 1 — remove 100% of old floor boards, tiles, parquet/herringbone/chevron patterns, old plank seams, grout lines, knots, and pre-existing surface glare. Do NOT trace over, tint, or reuse the old floor seam layout.',
    'Install brand-new continuous flooring from scratch across the entire floor area in accurate 3D room perspective, replicating the exact wood color, plank proportions, grain, knots, bevels, and surface sheen of the reference floor.',
  ];

  if (constraints.length > 0) {
    lines.push(`Requested floor specifications: ${constraints.join('; ')}.`);
  }

  if (customPrompt.trim()) {
    lines.push(`Additional request: ${customPrompt.trim()}`);
  }

  lines.push(
    'Preserve ONLY non-floor elements from Image 1 (walls, baseboards, doors, windows, furniture, rugs, and natural contact shadows cast by furniture onto the new floor). Never copy furniture, ceilings, people, or text from any reference photo.'
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
