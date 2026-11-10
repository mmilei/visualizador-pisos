export type PlankPattern = 'recto' | 'chevron' | 'espiga' | 'deck';
export type PlankOrientation = 'vertical' | 'horizontal' | 'diagonal';

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

export interface TransformationResult {
  id: string;
  timestamp: number;
  roomImageUrl: string;
  resultImageUrl: string;
  floorTitle: string;
  floorDetails: string;
  referenceImages: string[];
  modelUsed: string;
}
