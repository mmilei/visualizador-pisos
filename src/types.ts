export type PlankPattern = 'recto' | 'chevron' | 'espiga' | 'deck' | '';
export type PlankOrientation = 'vertical' | 'horizontal' | 'diagonal';
export type FloorModelChoice = 'gemini-nano-banana-2.1' | 'gemini-3.1-flash-lite-image';
export type FloorQualityPreset = '1K' | '2K';
export type PipelineFlowMode = 'direct' | 'gemini_prepass';
export type PromptStrategyId = 'chat_direct' | 'strict_demolish' | 'blank';
export type ReferenceSelectionMode = 'auto' | 'manual';

export interface FloorParametersConfig {
  orientation: { enabled: boolean; value: PlankOrientation };
  widthCm: { enabled: boolean; value: string };
  format: { enabled: boolean; value: PlankPattern };
  tone: { enabled: boolean; value: string };
  finish: { enabled: boolean; value: string };
  lighting: { enabled: boolean; value: 'ventana' | 'ambiente' };
  floorNotes: { enabled: boolean; value: string };
}

export interface FloorProduct {
  id: string;
  name: string;
  species: string;
  plankFormat: PlankPattern;
  widthCm: number;
  lengthDescription: string;
  finish: string;
  textureUrl: string;
  installedFloorUrl?: string;
  toneHex: string;
  description: string;
  highlightText: string;
  isCustom?: boolean;
  notes?: string;
}

export interface CustomFloorReference {
  id: string;
  name: string;
  dataUrl: string;
  type: 'close-up' | 'full-floor' | 'sample';
}

export interface CustomFloorData {
  id: string;
  name: string;
  species: string;
  plankFormat: PlankPattern;
  widthCm: string;
  finish: string;
  notes: string;
  images: { id: string; name: string; dataUrl: string; type: string }[];
  cleanSwatchUrl?: string;
  apiKeyId?: string;
  createdAt: number;
}

export interface SavedPromptPreset {
  id: string;
  name: string;
  promptText: string;
  strategyId?: PromptStrategyId;
  createdAt: number;
}

export interface PromptTraceEntry {
  id: string;
  stage: 'extract-swatch' | 'generate-floor' | 'refine-floor' | 'upgrade-2k';
  model: string;
  imageSize?: FloorQualityPreset;
  pipelineMode: PipelineFlowMode;
  includeImageRoleLabels: boolean;
  imageRoles: string[];
  promptText: string;
  usedConversationHistory: boolean;
  durationMs?: number;
  timestamp: number;
}

export interface ChatRefinementMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  modelUsed?: string;
  imageSize?: FloorQualityPreset;
  versionNumber?: number;
  thoughtSignature?: string;
  traceEntry?: PromptTraceEntry;
  timestamp: number;
}

export interface TransformationResult {
  id: string;
  timestamp: number;
  apiKeyId?: string;
  roomImageUrl: string;
  resultImageUrl: string;
  floorTitle: string;
  floorDetails: string;
  referenceImages: string[];
  referenceLabelsUsed?: string[];
  modelUsed: string;
  imageSize?: FloorQualityPreset;
  pipelineMode?: PipelineFlowMode;
  promptUsed?: string;
  aspectRatio?: string;
  initialTraceEntry?: PromptTraceEntry;
  messages?: ChatRefinementMessage[];
}
