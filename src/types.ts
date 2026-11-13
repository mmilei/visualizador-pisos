export type PlankPattern = 'recto' | 'chevron' | 'espiga' | 'deck';
export type PlankOrientation = 'vertical' | 'horizontal' | 'diagonal';
export type FloorModelChoice = 'gemini-nano-banana-2.1' | 'gemini-3.1-flash-lite-image';

export interface FloorParametersConfig {
  orientation: { enabled: boolean; value: PlankOrientation };
  widthCm: { enabled: boolean; value: string };
  format: { enabled: boolean; value: PlankPattern };
  tone: { enabled: boolean; value: string };
  finish: { enabled: boolean; value: string };
  lighting: { enabled: boolean; value: 'ventana' | 'ambiente' };
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
  createdAt: number;
}

export interface ChatRefinementMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  modelUsed?: string;
  versionNumber?: number;
  timestamp: number;
}

export interface TransformationResult {
  id: string;
  timestamp: number;
  roomImageUrl: string;
  resultImageUrl: string;
  floorTitle: string;
  floorDetails: string;
  referenceImages: string[];
  modelUsed: string;
  promptUsed?: string;
  aspectRatio?: string;
  messages?: ChatRefinementMessage[];
}
