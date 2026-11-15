import { FloorParametersConfig, PromptStrategyId } from '../types';

export const DEFAULT_FLOOR_PARAMETERS: FloorParametersConfig = {
  orientation: { enabled: false, value: 'vertical' },
  widthCm: { enabled: false, value: '18' },
  format: { enabled: false, value: 'recto' },
  tone: { enabled: false, value: 'natural' },
  finish: { enabled: false, value: 'mate' },
  lighting: { enabled: false, value: 'ventana' },
  floorNotes: { enabled: false, value: '' },
};

export function createInitialFloorParameters(options?: {
  widthCm?: number | string;
  plankFormat?: string;
  finish?: string;
  notes?: string;
}): FloorParametersConfig {
  const widthStr = options?.widthCm ? String(options.widthCm).trim() : '18';
  const formatVal =
    options?.plankFormat && ['recto', 'chevron', 'espiga', 'deck'].includes(options.plankFormat)
      ? (options.plankFormat as FloorParametersConfig['format']['value'])
      : 'recto';
  const notesStr = options?.notes ? options.notes.trim() : '';

  return {
    orientation: { enabled: false, value: 'vertical' },
    widthCm: { enabled: false, value: widthStr || '18' },
    format: { enabled: false, value: formatVal },
    tone: { enabled: false, value: 'natural' },
    finish: { enabled: false, value: 'mate' },
    lighting: { enabled: false, value: 'ventana' },
    floorNotes: { enabled: false, value: notesStr },
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
    'Neutralize any warm yellow artificial construction bulb cast to natural neutral 5500K daylight balance so the true oak/wood color, grain, natural knots, micro-bevels, and finish are accurate.',
    'COMPLETELY EXCLUDE any walls, wood ceilings, kitchen cabinets, stairs, people, tools, plastic sheets, rugs, text labels, borders, or collage margins.',
  ].join(' ');
}

/**
 * Picks up to maxCount diverse, high-signal indices (1..4) from a custom floor's photo list,
 * preferring close-ups and natural light photos before broad scene shots.
 */
export function selectBestReferenceIndices(
  images: { type?: string; name?: string }[],
  maxCount = 4
): number[] {
  if (!images || images.length === 0) return [0];
  if (images.length <= maxCount) return images.map((_, i) => i);

  const scored = images.map((img, idx) => {
    const t = `${img.type || ''} ${img.name || ''}`.toLowerCase();
    let score = 0;
    if (t.includes('primer plano') || t.includes('veta') || t.includes('close')) score += 4;
    if (t.includes('luz natural') || t.includes('muestra') || t.includes('sample')) score += 3;
    if (t.includes('showroom') || t.includes('catálogo') || t.includes('catalogo')) score += 2;
    if (t.includes('colocado') || t.includes('instalado') || t.includes('full-floor')) score += 1;
    // Slight preference for earlier uploaded images when tied
    score += (images.length - idx) * 0.01;
    return { idx, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map((item) => item.idx)
    .sort((a, b) => a - b);
}

/**
 * Builds the transparent prompt dynamically ONLY from toggled-ON ("Adentro") parameters.
 * When parameters are OFF ("Afuera"), ZERO hidden constraints are injected.
 */
export function buildCleanFloorPrompt(options: {
  productName: string;
  referenceCount: number;
  referenceLabels?: string[];
  params: FloorParametersConfig;
  customPrompt?: string;
  strategyId?: PromptStrategyId;
}): string {
  const {
    productName,
    referenceCount,
    referenceLabels = [],
    params,
    customPrompt = '',
    strategyId = 'chat_direct',
  } = options;

  if (strategyId === 'blank') {
    return customPrompt.trim();
  }

  const refCountWord =
    referenceCount <= 1
      ? 'la foto de referencia (Imagen 2)'
      : `las ${referenceCount} fotos de referencia (Imágenes 2 a ${referenceCount + 1}${
          referenceLabels.length > 0 ? `: ${referenceLabels.join(', ')}` : ''
        })`;

  const refDescEn =
    referenceCount <= 1
      ? 'the reference photo (Image 2)'
      : `the ${referenceCount} reference photos (Images 2 to ${referenceCount + 1}${
          referenceLabels.length > 0 ? `: ${referenceLabels.join(', ')}` : ''
        })`;

  const includedLinesEs: string[] = [];
  const includedLinesEn: string[] = [];

  if (params.widthCm.enabled && params.widthCm.value.trim()) {
    const w = params.widthCm.value.trim();
    includedLinesEs.push(`Ancho aproximado de tabla: ${w} cm (en proporción realista respecto a zócalos y puertas de la foto)`);
    includedLinesEn.push(`approximate plank width of ${w} cm (proportionally scaled to baseboards and doors)`);
  }

  if (params.orientation.enabled) {
    if (params.orientation.value === 'horizontal') {
      includedLinesEs.push('Dirección de las tablas: horizontal (de izquierda a derecha)');
      includedLinesEn.push('lay the planks horizontally (left to right across the room)');
    } else if (params.orientation.value === 'diagonal') {
      includedLinesEs.push('Dirección de las tablas: diagonal a 45°');
      includedLinesEn.push('lay the planks diagonally at 45 degrees');
    } else {
      includedLinesEs.push('Dirección de las tablas: vertical (hacia el fondo del ambiente)');
      includedLinesEn.push('lay the planks vertically (running into the depth of the room toward the back wall)');
    }
  }

  if (params.format.enabled && params.format.value) {
    const formatEs: Record<string, string> = {
      recto: 'Patrón de colocación: tablas rectas paralelas',
      chevron: 'Patrón de colocación: Chevron francés a 45°',
      espiga: 'Patrón de colocación: Espiga (Herringbone) a 90°',
      deck: 'Patrón de colocación: tablas tipo Deck con buña',
    };
    const formatEn: Record<string, string> = {
      recto: 'straight running-bond planks (discard any existing herringbone/chevron/tile pattern)',
      chevron: '45-degree French Chevron pattern',
      espiga: '90-degree Herringbone pattern',
      deck: 'parallel deck planks with subtle shadow gaps',
    };
    includedLinesEs.push(formatEs[params.format.value] || `Patrón: ${params.format.value}`);
    includedLinesEn.push(`use ${formatEn[params.format.value] || params.format.value}`);
  }

  if (params.tone.enabled && params.tone.value.trim()) {
    const toneEs: Record<string, string> = {
      claro: 'Tono: madera clara luminosa',
      natural: 'Tono: natural equilibrado fiel a la muestra',
      miel: 'Tono: miel dorado cálido',
      medio: 'Tono: tostado medio',
      oscuro: 'Tono: oscuro chocolate',
      nordico: 'Tono: nórdico grisáceo neutro',
    };
    const toneEn: Record<string, string> = {
      claro: 'lighter natural blonde wood tone',
      natural: 'balanced natural wood tone matching the sample',
      miel: 'warm golden honey tone',
      medio: 'medium toasted walnut/oak tone',
      oscuro: 'deep dark chocolate wood tone',
      nordico: 'cool muted Nordic grey-beige tone',
    };
    includedLinesEs.push(toneEs[params.tone.value] || `Tono: ${params.tone.value}`);
    includedLinesEn.push(`color tone: ${toneEn[params.tone.value] || params.tone.value}`);
  }

  if (params.finish.enabled && params.finish.value.trim()) {
    const finEs: Record<string, string> = {
      mate: 'Acabado superficial: mate natural sin brillo plástico',
      satinado: 'Acabado superficial: satinado suave',
      brillante: 'Acabado superficial: brillante hidrolaqueado',
    };
    const finEn: Record<string, string> = {
      mate: 'natural matte finish with zero plastic shine',
      satinado: 'soft satin low-sheen finish',
      brillante: 'glossy lacquered finish',
    };
    includedLinesEs.push(finEs[params.finish.value] || `Acabado: ${params.finish.value}`);
    includedLinesEn.push(`surface finish: ${finEn[params.finish.value] || params.finish.value}`);
  }

  if (params.lighting.enabled) {
    includedLinesEs.push(
      params.lighting.value === 'ventana'
        ? 'Reflejo de iluminación: respetar brillo direccional de luz natural de ventana sobre el piso'
        : 'Reflejo de iluminación: luz pareja suave sin reflejos marcados'
    );
    includedLinesEn.push(
      params.lighting.value === 'ventana'
        ? 'preserve natural window light sheen and directional reflections on the floor'
        : 'render soft even ambient lighting across the floor'
    );
  }

  if (params.floorNotes?.enabled && params.floorNotes.value.trim()) {
    includedLinesEs.push(`Detalle de ficha: ${params.floorNotes.value.trim()}`);
    includedLinesEn.push(`product notes: ${params.floorNotes.value.trim()}`);
  }

  if (strategyId === 'strict_demolish') {
    const lines: string[] = [
      `Perform a FULL FLOOR REPLACEMENT on Image 1 (the target room) using the wood flooring shown in ${refDescEn}${productName ? ` ("${productName}")` : ''}.`,
      'CRITICAL: Completely DEMOLISH and ERASE the existing floor in Image 1 — remove 100% of old floor boards, tiles, herringbone/chevron patterns, old plank seams, grout lines, and pre-existing surface glare. Do NOT trace over or tint the old floor layout.',
      'Create a brand-new floor from scratch in accurate 3D room perspective matching the wood tone, grain, knots, bevels, and sheen from the reference photo(s) (using the most clear floor detail across the references and ignoring walls, ceilings, furniture, people, or text in them).',
    ];
    if (includedLinesEn.length > 0) {
      lines.push(`Included floor specs: ${includedLinesEn.join('; ')}.`);
    }
    if (customPrompt.trim()) {
      lines.push(`Additional request: ${customPrompt.trim()}`);
    }
    lines.push(
      'Preserve existing room lighting, natural window highlights, and furniture contact shadows exactly. Everything other than the floor (walls, baseboards, doors, windows, furniture, rugs, and camera angle) must remain 100% identical.'
    );
    return lines.join(' ');
  }

  // Default: 'chat_direct' — clean, natural Gemini/ChatGPT chat style
  const chatLines: string[] = [
    `Reemplazá únicamente el piso de la Foto 1 (el ambiente a editar) con el piso de madera mostrado en ${refCountWord}${productName ? ` ("${productName}")` : ''}.`,
    'Creá el piso nuevo desde cero (eliminando el diseño, juntas y color del piso viejo de la Foto 1; sin copiar muebles, techos, personas ni textos que aparezcan en las fotos de referencia).',
    'Respetá exactamente la iluminación original del ambiente, los reflejos de ventanas y las sombras reales debajo de muebles y alfombras. Todo lo que no sea el piso (paredes, zócalos, muebles, alfombras, aberturas y encuadre) debe quedar exactamente igual.',
  ];

  if (includedLinesEs.length > 0) {
    chatLines.push(`Especificaciones activas: ${includedLinesEs.join('. ')}.`);
  }

  if (customPrompt.trim()) {
    chatLines.push(customPrompt.trim());
  }

  return chatLines.join('\n\n');
}

export function buildRefinementPrompt(options: {
  instruction: string;
  hasReferenceImage: boolean;
  previousInstructions?: string[];
  rawMode?: boolean;
}): string {
  const { instruction, hasReferenceImage, previousInstructions = [], rawMode = false } = options;
  const clean = instruction.trim();

  if (rawMode) {
    return clean;
  }

  const parts: string[] = [
    `Aplicá únicamente esta corrección sobre el piso de la imagen actual del ambiente: "${clean}".`,
  ];

  if (hasReferenceImage) {
    parts.push(
      'Usá las fotos de referencia adjuntas únicamente para mantener fidelidad del material de madera (nunca reemplaces la habitación por la foto de referencia).'
    );
  }

  if (previousInstructions.length > 0) {
    parts.push(`Ajustes previos en esta conversación: ${previousInstructions.slice(-3).join(' | ')}.`);
  }

  parts.push(
    'Respetá exactamente la iluminación original, sombras de contacto, paredes, zócalos, alfombras, muebles y encuadre: todo lo que no sea el piso debe quedar idéntico.'
  );

  return parts.join(' ');
}

export function buildImageRoleLabel(options: {
  index: number;
  isRoom: boolean;
  label?: string;
}): string {
  if (options.isRoom) {
    return 'IMAGEN 1 — AMBIENTE A MODIFICAR (reemplazar únicamente el piso respetando luz, sombras y todo lo demás exactamente igual):';
  }
  const suffix = options.label ? ` (${options.label})` : '';
  return `IMAGEN ${options.index + 1} — REFERENCIA DE PISO${suffix} (usar solo el piso/madera de esta foto; ignorar muebles, paredes, techos o textos):`;
}
