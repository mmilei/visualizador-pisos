import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { RoomCaptureStep } from './components/RoomCaptureStep';
import { FloorSelectorStep } from './components/FloorSelectorStep';
import { ComparisonViewer } from './components/ComparisonViewer';
import { ParameterTogglePanel } from './components/ParameterTogglePanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { TestingHistoryModal } from './components/TestingHistoryModal';
import { MobileQrModal } from './components/MobileQrModal';
import { AddFloorModal } from './components/AddFloorModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { CATALOG_PRODUCTS } from './data/catalog';
import {
  FloorProduct,
  CustomFloorData,
  TransformationResult,
  FloorModelChoice,
  FloorQualityPreset,
  PipelineFlowMode,
  PromptStrategyId,
  ReferenceSelectionMode,
  FloorParametersConfig,
  ChatRefinementMessage,
  SavedPromptPreset,
  PromptTraceEntry,
} from './types';
import { urlToDataUrl, downscaleDataUrl } from './utils/imageUtils';
import { deriveApiKeyId } from './utils/apiKeyHash';
import {
  extractCleanFloorSwatchDirect,
  generateWithGoogleNanoBanana,
  MultiTurnHistoryTurn,
  refineWithGoogleNanoBanana,
  upgradeTo2KWithGoogleNanoBanana,
} from './utils/geminiDirect';
import {
  DEFAULT_FLOOR_PARAMETERS,
  createInitialFloorParameters,
  buildCleanFloorPrompt,
  selectBestReferenceIndices,
} from './utils/promptBuilder';
import { Sparkles, RefreshCw, AlertCircle, ArrowRight, Smartphone, Key } from 'lucide-react';

function sanitizeError(err: any): string {
  const str = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || '';
  if (
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('quota') ||
    str.includes('limit exceeded')
  ) {
    return 'Límite de cuota o saldo alcanzado en la API de Google Gemini Imagen. Los modelos fotorrealistas Nano Banana requieren facturación activa (Pay-as-you-go) en Google AI Studio.';
  }
  try {
    const parsed = JSON.parse(str);
    if (parsed.error?.message) return sanitizeError(parsed.error.message);
    if (parsed.error && typeof parsed.error === 'string') return sanitizeError(parsed.error);
  } catch {
    // ignore parse failure
  }
  return str.replace(/^Error:\s*/, '');
}

function asProductFromCustom(floor: CustomFloorData): FloorProduct {
  const patternLabel = floor.plankFormat ? floor.plankFormat.toUpperCase() : 'Libre';
  return {
    id: floor.id,
    name: floor.name,
    species: floor.species || 'Piso personalizado',
    plankFormat: floor.plankFormat,
    widthCm: parseFloat(floor.widthCm) || 0,
    lengthDescription: floor.widthCm ? `Ancho ${floor.widthCm} cm` : 'Formato libre',
    finish: floor.finish || '',
    textureUrl: floor.images[0]?.dataUrl || './texturas/roble-eslavonia-hd.jpg',
    toneHex: '#b5651d',
    description: floor.notes || 'Piso registrado con ficha técnica opcional.',
    highlightText: `${patternLabel} · ${floor.images.length} fotos`,
    isCustom: true,
    notes: floor.notes,
  };
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary) map.set(item.id, item);
  for (const item of primary) map.set(item.id, item);
  return Array.from(map.values());
}

export default function App() {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('4:3');

  const [selectedProduct, setSelectedProduct] = useState<FloorProduct | null>(CATALOG_PRODUCTS[0]);
  const [customFloors, setCustomFloors] = useState<CustomFloorData[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('custom');

  // Flow, Model, Quality & Reference selection
  const [pipelineMode, setPipelineMode] = useState<PipelineFlowMode>('direct');
  const [modelChoice, setModelChoice] = useState<FloorModelChoice>('gemini-nano-banana-2.1');
  const [imageSize, setImageSize] = useState<FloorQualityPreset>('2K');
  const [refSelectionMode, setRefSelectionMode] = useState<ReferenceSelectionMode>('auto');
  const [selectedPhotoIndices, setSelectedPhotoIndices] = useState<number[]>([0]);

  // Dynamic Adentro / Afuera parameters
  const [floorParams, setFloorParams] = useState<FloorParametersConfig>(() => ({
    ...DEFAULT_FLOOR_PARAMETERS,
  }));

  // Prompt transparency & user presets
  const [promptStrategy, setPromptStrategy] = useState<PromptStrategyId>('chat_direct');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [manualPromptText, setManualPromptText] = useState<string>('');
  const [isPromptManuallyEdited, setIsPromptManuallyEdited] = useState<boolean>(false);
  const [includeImageRoleLabels, setIncludeImageRoleLabels] = useState<boolean>(true);
  const [savedPresets, setSavedPresets] = useState<SavedPromptPreset[]>([]);

  // Execution states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isUpgrading2K, setIsUpgrading2K] = useState<boolean>(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<TransformationResult | null>(null);
  const [history, setHistory] = useState<TransformationResult[]>([]);

  // API Key & Workspace partitioning
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('vp_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [serverHasKey, setServerHasKey] = useState<boolean>(false);
  const [serverApiKeyId, setServerApiKeyId] = useState<string>('default');
  const [apiKeyId, setApiKeyId] = useState<string>('default');

  // Modals
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [isAddFloorModalOpen, setIsAddFloorModalOpen] = useState<boolean>(false);
  const [editingFloor, setEditingFloor] = useState<CustomFloorData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract ?key=... or ?apiKey=... on initial mount & check backend health
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const keyFromUrl = urlParams.get('key') || urlParams.get('apiKey');
        if (keyFromUrl && keyFromUrl.trim()) {
          const cleanKey = keyFromUrl.trim();
          setGeminiApiKey(cleanKey);
          localStorage.setItem('vp_gemini_api_key', cleanKey);
          urlParams.delete('key');
          urlParams.delete('apiKey');
          const remainingQuery = urlParams.toString();
          const cleanUrl =
            window.location.pathname +
            (remainingQuery ? `?${remainingQuery}` : '') +
            window.location.hash;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    } catch (e) {
      console.warn('Could not parse key from URL query:', e);
    }

    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((health) => {
        if (health && health.status === 'ok') {
          setServerHasKey(Boolean(health.hasApiKey));
          if (typeof health.serverApiKeyId === 'string' && health.serverApiKeyId) {
            setServerApiKeyId(health.serverApiKeyId);
          }
        }
      })
      .catch(() => {
        // Static GitHub Pages mode
      });
  }, []);

  // Derive deterministic apiKeyId whenever client key or server key changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (geminiApiKey.trim()) {
        const derived = await deriveApiKeyId(geminiApiKey);
        if (!cancelled) setApiKeyId(derived);
      } else if (serverApiKeyId && serverApiKeyId !== 'default') {
        if (!cancelled) setApiKeyId(serverApiKeyId);
      } else {
        if (!cancelled) setApiKeyId('default');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [geminiApiKey, serverApiKeyId]);

  // Load partitioned Floors, History & Prompt Presets whenever apiKeyId settles
  useEffect(() => {
    const floorsStorageKey = `vp_custom_floors_${apiKeyId}`;
    const historyStorageKey = `vp_testing_history_${apiKeyId}`;
    const presetsStorageKey = `vp_prompt_presets_${apiKeyId}`;

    let localFloors: CustomFloorData[] = [];
    let localHistory: TransformationResult[] = [];
    let localPresets: SavedPromptPreset[] = [];

    try {
      // Read partitioned or migrate legacy cache once
      const rawFloors = localStorage.getItem(floorsStorageKey) || localStorage.getItem('vp_custom_floors');
      if (rawFloors) {
        const parsed = JSON.parse(rawFloors);
        if (Array.isArray(parsed)) localFloors = parsed;
      }

      const rawHist =
        localStorage.getItem(historyStorageKey) || localStorage.getItem('vp_testing_history');
      if (rawHist) {
        const parsed = JSON.parse(rawHist);
        if (Array.isArray(parsed)) localHistory = parsed;
      }

      const rawPresets = localStorage.getItem(presetsStorageKey);
      if (rawPresets) {
        const parsed = JSON.parse(rawPresets);
        if (Array.isArray(parsed)) localPresets = parsed;
      }
    } catch (e) {
      console.warn('Could not read localStorage workspace:', e);
    }

    setCustomFloors(localFloors);
    setHistory(localHistory);
    setSavedPresets(localPresets);

    if (localFloors.length > 0) {
      const firstProd = asProductFromCustom(localFloors[0]);
      setSelectedProduct(firstProd);
      setFloorParams(
        createInitialFloorParameters({
          widthCm: firstProd.widthCm || '',
          plankFormat: firstProd.plankFormat,
          finish: firstProd.finish,
          notes: firstProd.notes,
        })
      );
      setSelectedPhotoIndices([0]);
      setActiveTab('custom');
    }

    // Sync with backend workspace partitioned by x-api-key-id
    const headers: HeadersInit = { 'x-api-key-id': apiKeyId };

    fetch('/api/floors', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.floors)) {
          const merged = mergeById(data.floors as CustomFloorData[], localFloors);
          if (merged.length > 0) {
            setCustomFloors(merged);
            try {
              localStorage.setItem(floorsStorageKey, JSON.stringify(merged));
            } catch {
              // quota
            }
            const firstProd = asProductFromCustom(merged[0]);
            setSelectedProduct((prev) => (prev?.isCustom ? prev : firstProd));
            setActiveTab('custom');
          }
        }
      })
      .catch(() => {});

    fetch('/api/history', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.history)) {
          const merged = mergeById(data.history as TransformationResult[], localHistory)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20);
          setHistory(merged);
          try {
            localStorage.setItem(historyStorageKey, JSON.stringify(merged));
          } catch {
            // quota
          }
        }
      })
      .catch(() => {});
  }, [apiKeyId]);

  const availablePhotos = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.isCustom) {
      const floorObj = customFloors.find((f) => f.id === selectedProduct.id);
      if (floorObj && floorObj.images.length > 0) {
        return floorObj.images;
      }
    }
    return [
      {
        id: selectedProduct.id,
        name: selectedProduct.name,
        dataUrl: selectedProduct.textureUrl,
        type: 'Muestra de catálogo',
      },
    ];
  }, [selectedProduct, customFloors]);

  const activeCustomFloor = useMemo(() => {
    if (!selectedProduct?.isCustom) return null;
    return customFloors.find((f) => f.id === selectedProduct.id) || null;
  }, [selectedProduct, customFloors]);

  // Determine exact 1..4 photo indices to use
  const effectivePhotoIndices = useMemo(() => {
    if (availablePhotos.length === 0) return [];
    if (refSelectionMode === 'auto') {
      return selectBestReferenceIndices(availablePhotos, 4);
    }
    const valid = selectedPhotoIndices.filter((i) => i >= 0 && i < availablePhotos.length);
    return (valid.length > 0 ? valid : [0]).slice(0, 4);
  }, [availablePhotos, refSelectionMode, selectedPhotoIndices]);

  const selectedLabelsForPreview = useMemo(() => {
    if (availablePhotos.length === 0) return [];
    if (pipelineMode === 'gemini_prepass' && activeCustomFloor) {
      return ['Muestra limpia IA 5500K'];
    }
    return effectivePhotoIndices.map(
      (i) => availablePhotos[i]?.type || availablePhotos[i]?.name || `Foto ${i + 1}`
    );
  }, [availablePhotos, effectivePhotoIndices, pipelineMode, activeCustomFloor]);

  const activeParamCount = useMemo(
    () =>
      [
        floorParams.orientation.enabled,
        floorParams.widthCm.enabled,
        floorParams.format.enabled,
        floorParams.tone.enabled,
        floorParams.finish.enabled,
        floorParams.lighting.enabled,
        floorParams.floorNotes?.enabled,
      ].filter(Boolean).length,
    [floorParams]
  );

  // Automatic live prompt synced with Adentro/Afuera switches
  const autoPrompt = useMemo(
    () =>
      buildCleanFloorPrompt({
        productName: selectedProduct?.name || '',
        referenceCount: selectedLabelsForPreview.length || 1,
        referenceLabels: selectedLabelsForPreview,
        params: floorParams,
        customPrompt,
        strategyId: promptStrategy,
      }),
    [selectedProduct?.name, selectedLabelsForPreview, floorParams, customPrompt, promptStrategy]
  );

  const exactPrompt = isPromptManuallyEdited ? manualPromptText : autoPrompt;

  const persistHistoryLocal = (items: TransformationResult[]) => {
    try {
      localStorage.setItem(`vp_testing_history_${apiKeyId}`, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  };

  const persistFloorsLocal = (floors: CustomFloorData[]) => {
    try {
      localStorage.setItem(`vp_custom_floors_${apiKeyId}`, JSON.stringify(floors));
    } catch (e) {
      console.warn('Could not save floors to localStorage', e);
    }
  };

  const saveToHistory = (newResult: TransformationResult) => {
    const tagged: TransformationResult = { ...newResult, apiKeyId };
    const updated = [tagged, ...history.filter((h) => h.id !== tagged.id)].slice(0, 20);
    setHistory(updated);
    persistHistoryLocal(updated);

    fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key-id': apiKeyId,
      },
      body: JSON.stringify(tagged),
    }).catch(() => {});
  };

  const updateResultInHistory = (updatedResult: TransformationResult) => {
    const tagged: TransformationResult = { ...updatedResult, apiKeyId };
    setHistory((prev) => {
      const next = prev.map((item) => (item.id === tagged.id ? tagged : item));
      persistHistoryLocal(next);
      return next;
    });

    fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key-id': apiKeyId,
      },
      body: JSON.stringify(tagged),
    }).catch(() => {});
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(`vp_testing_history_${apiKeyId}`);
    } catch {
      // ignore
    }
    fetch('/api/history', {
      method: 'DELETE',
      headers: { 'x-api-key-id': apiKeyId },
    }).catch(() => {});
  };

  const handleRemoveHistoryItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    persistHistoryLocal(updated);

    fetch(`/api/history/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key-id': apiKeyId },
    }).catch(() => {});
  };

  const handleSaveCustomFloor = (floor: CustomFloorData) => {
    const taggedFloor: CustomFloorData = { ...floor, apiKeyId };
    const updated = [taggedFloor, ...customFloors.filter((f) => f.id !== taggedFloor.id)];
    setCustomFloors(updated);
    persistFloorsLocal(updated);

    fetch('/api/floors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key-id': apiKeyId,
      },
      body: JSON.stringify(taggedFloor),
    }).catch((err) => console.warn('Could not persist floor to server:', err));

    const asProduct = asProductFromCustom(taggedFloor);
    setSelectedProduct(asProduct);
    setSelectedPhotoIndices([0]);
    setFloorParams(
      createInitialFloorParameters({
        widthCm: asProduct.widthCm || '',
        plankFormat: asProduct.plankFormat,
        finish: asProduct.finish,
        notes: asProduct.notes,
      })
    );
    setActiveTab('custom');
    setErrorMessage(null);
  };

  const handleRemoveCustomFloor = (id: string) => {
    const updated = customFloors.filter((f) => f.id !== id);
    setCustomFloors(updated);
    persistFloorsLocal(updated);

    fetch(`/api/floors/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key-id': apiKeyId },
    }).catch(() => {});

    if (selectedProduct?.id === id) {
      if (updated.length > 0) {
        const nextProd = asProductFromCustom(updated[0]);
        setSelectedProduct(nextProd);
        setSelectedPhotoIndices([0]);
        setActiveTab('custom');
      } else {
        setSelectedProduct(CATALOG_PRODUCTS[0]);
        setSelectedPhotoIndices([0]);
        setActiveTab('catalog');
      }
    }
  };

  const handleSelectProduct = (prod: FloorProduct) => {
    setSelectedProduct(prod);
    setSelectedPhotoIndices([0]);
    setFloorParams((prev) => ({
      ...prev,
      widthCm: prev.widthCm.enabled
        ? prev.widthCm
        : { enabled: false, value: prod.widthCm ? String(prod.widthCm) : '' },
      format: prev.format.enabled
        ? prev.format
        : { enabled: false, value: prod.plankFormat || 'recto' },
      finish: prev.finish.enabled
        ? prev.finish
        : { enabled: false, value: prod.finish || 'mate' },
      floorNotes: prev.floorNotes?.enabled
        ? prev.floorNotes
        : { enabled: false, value: prod.notes || prod.species || '' },
    }));
    setErrorMessage(null);
  };

  const handleTogglePhotoIndex = (idx: number) => {
    setSelectedPhotoIndices((prev) => {
      if (prev.includes(idx)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== idx);
      }
      // Allow up to 4 manual references cleanly
      const next = prev.length >= 4 ? [...prev.slice(1), idx] : [...prev, idx];
      return next.sort((a, b) => a - b);
    });
  };

  const handleResetAllParams = () => {
    setFloorParams(
      createInitialFloorParameters({
        widthCm: selectedProduct?.widthCm || '',
        plankFormat: selectedProduct?.plankFormat,
        finish: selectedProduct?.finish,
        notes: selectedProduct?.notes || selectedProduct?.species,
      })
    );
    setCustomPrompt('');
  };

  const handleSelectModelAndQuality = (model: FloorModelChoice, size: FloorQualityPreset) => {
    setModelChoice(model);
    setImageSize(size);
  };

  const handleChangePromptStrategy = (strategy: PromptStrategyId) => {
    setPromptStrategy(strategy);
    setIsPromptManuallyEdited(false);
    if (strategy === 'blank') {
      setManualPromptText('');
    }
  };

  const handleSavePreset = (name: string, promptText: string) => {
    const newPreset: SavedPromptPreset = {
      id: `preset-${Date.now()}`,
      name,
      promptText,
      strategyId: promptStrategy,
      createdAt: Date.now(),
    };
    const next = [newPreset, ...savedPresets];
    setSavedPresets(next);
    try {
      localStorage.setItem(`vp_prompt_presets_${apiKeyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleApplyPreset = (preset: SavedPromptPreset) => {
    setManualPromptText(preset.promptText);
    setIsPromptManuallyEdited(true);
  };

  const handleDeletePreset = (id: string) => {
    const next = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(next);
    try {
      localStorage.setItem(`vp_prompt_presets_${apiKeyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleExportWorkspace = () => {
    const payload = {
      apiKeyId,
      exportedAt: new Date().toISOString(),
      customFloors,
      history,
      savedPresets,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visualizador-pisos-respaldo-${apiKeyId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWorkspace = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.customFloors)) {
        const mergedFloors = mergeById(data.customFloors, customFloors);
        setCustomFloors(mergedFloors);
        persistFloorsLocal(mergedFloors);
        for (const f of data.customFloors) {
          fetch('/api/floors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key-id': apiKeyId },
            body: JSON.stringify({ ...f, apiKeyId }),
          }).catch(() => {});
        }
      }
      if (Array.isArray(data.history)) {
        const mergedHist = mergeById(data.history, history)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 20);
        setHistory(mergedHist);
        persistHistoryLocal(mergedHist);
        for (const h of data.history.slice(0, 10)) {
          fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key-id': apiKeyId },
            body: JSON.stringify({ ...h, apiKeyId }),
          }).catch(() => {});
        }
      }
      if (Array.isArray(data.savedPresets)) {
        const mergedPresets = mergeById(data.savedPresets, savedPresets);
        setSavedPresets(mergedPresets);
        try {
          localStorage.setItem(`vp_prompt_presets_${apiKeyId}`, JSON.stringify(mergedPresets));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setErrorMessage('No se pudo importar el archivo .json: verificá que sea un respaldo válido.');
      console.error(err);
    }
  };

  const getActiveClientKey = (): string => {
    if (geminiApiKey && geminiApiKey.trim()) return geminiApiKey.trim();
    try {
      return localStorage.getItem('vp_gemini_api_key') || '';
    } catch {
      return '';
    }
  };

  const handleTransformFloor = async () => {
    if (!roomImage) {
      setErrorMessage('Por favor toma o sube primero una foto de tu ambiente.');
      return;
    }

    if (!selectedProduct) {
      setErrorMessage('Por favor selecciona un piso de referencia.');
      return;
    }

    if (!exactPrompt.trim()) {
      setErrorMessage('El prompt no puede estar vacío.');
      return;
    }

    const activeClientKey = getActiveClientKey();

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setRefineError(null);
      setGenerationStep('Preparando imagen del ambiente y referencias...');

      let floorImages: string[] = [];
      let floorImageLabels: string[] = [];
      const floorTitle = selectedProduct.name;

      if (selectedProduct.isCustom) {
        const floorObj = customFloors.find((f) => f.id === selectedProduct.id);
        if (floorObj && floorObj.images.length > 0) {
          if (pipelineMode === 'gemini_prepass') {
            if (floorObj.cleanSwatchUrl) {
              floorImages = [floorObj.cleanSwatchUrl];
              floorImageLabels = ['Muestra limpia IA 5500K'];
            } else {
              setGenerationStep('Paso previo con Gemini: limpiando iluminación y extrayendo muestra...');
              const bestIndices = selectBestReferenceIndices(floorObj.images, 4);
              const scaledSources = await Promise.all(
                bestIndices.map((idx) => downscaleDataUrl(floorObj.images[idx].dataUrl, 1024, 0.85))
              );
              const sourceLabels = bestIndices.map(
                (idx) => floorObj.images[idx].type || floorObj.images[idx].name
              );

              let extractedSwatchUrl: string | null = null;
              if (activeClientKey) {
                const directSwatch = await extractCleanFloorSwatchDirect({
                  apiKey: activeClientKey,
                  floorImages: scaledSources,
                  floorImageLabels: sourceLabels,
                  productName: floorTitle,
                  modelChoice,
                });
                extractedSwatchUrl = directSwatch.swatchUrl;
              } else {
                const swatchResp = await fetch('/api/extract-swatch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    floorImages: scaledSources,
                    floorImageLabels: sourceLabels,
                    productName: floorTitle,
                    modelChoice,
                  }),
                });
                if (!swatchResp.ok) {
                  const errBody = await swatchResp.json().catch(() => ({}));
                  throw new Error(errBody.error || 'No se pudo conectar al servidor para extraer muestra.');
                }
                const swatchData = await swatchResp.json();
                extractedSwatchUrl = swatchData.swatchUrl;
              }

              const compactSwatch = await downscaleDataUrl(extractedSwatchUrl!, 1024, 0.9);
              const updatedFloor: CustomFloorData = {
                ...floorObj,
                cleanSwatchUrl: compactSwatch,
              };
              setCustomFloors((prev) => {
                const next = prev.map((f) => (f.id === floorObj.id ? updatedFloor : f));
                persistFloorsLocal(next);
                return next;
              });
              fetch('/api/floors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key-id': apiKeyId },
                body: JSON.stringify(updatedFloor),
              }).catch(() => {});

              floorImages = [compactSwatch];
              floorImageLabels = ['Muestra limpia IA 5500K'];
            }
          } else {
            // Direct chat mode: 1 to 4 selected reference photos
            const indicesToSend =
              effectivePhotoIndices.length > 0 ? effectivePhotoIndices.slice(0, 4) : [0];
            floorImages = await Promise.all(
              indicesToSend.map((i) => downscaleDataUrl(floorObj.images[i].dataUrl, 1280, 0.86))
            );
            floorImageLabels = indicesToSend.map(
              (i) => `${floorObj.images[i].type || floorObj.images[i].name}`
            );
          }
        } else {
          floorImages = [selectedProduct.textureUrl];
          floorImageLabels = ['Muestra principal'];
        }
      } else {
        const textureBase64 = await urlToDataUrl(selectedProduct.textureUrl);
        floorImages = [textureBase64];
        floorImageLabels = ['Muestra de catálogo'];
      }

      const finalPromptText = exactPrompt.trim();
      const qualityLabel =
        modelChoice === 'gemini-nano-banana-2.1' ? `NB 2.1 (${imageSize})` : 'Flash Lite';
      const refModeSummary =
        pipelineMode === 'gemini_prepass'
          ? 'Pre-paso Gemini 5500K'
          : `Directo · ${floorImages.length} ref${floorImages.length > 1 ? 's' : ''}`;
      const floorDetailsSummary =
        activeParamCount === 0
          ? `${refModeSummary}`
          : `${activeParamCount} param · ${refModeSummary}`;

      setGenerationStep(`Generando con ${qualityLabel}...`);

      let generatedResult: {
        imageUrl: string;
        model: string;
        imageSize?: FloorQualityPreset;
        promptUsed?: string;
        thoughtSignature?: string;
        traceEntry?: PromptTraceEntry;
      };

      if (activeClientKey) {
        generatedResult = await generateWithGoogleNanoBanana({
          apiKey: activeClientKey,
          roomImage,
          floorImages,
          floorImageLabels,
          productName: floorTitle,
          promptText: finalPromptText,
          includeImageRoleLabels,
          aspectRatio,
          modelChoice,
          imageSize,
          pipelineMode,
        });
      } else {
        let respOk = false;
        let serverData: any = null;
        try {
          const response = await fetch('/api/generate-floor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomImage,
              floorImages,
              floorImageLabels,
              productName: floorTitle,
              promptText: finalPromptText,
              customPrompt: customPrompt.trim(),
              includeImageRoleLabels,
              aspectRatio,
              modelChoice,
              imageSize,
              pipelineMode,
            }),
          });
          if (response.ok && (response.headers.get('content-type') || '').includes('application/json')) {
            serverData = await response.json();
            respOk = Boolean(serverData?.success && serverData?.imageUrl);
          } else {
            const errJson = await response.json().catch(() => null);
            if (errJson?.error) {
              throw new Error(errJson.error);
            }
          }
        } catch (backendErr: any) {
          if (backendErr?.message && !String(backendErr.message).includes('Failed to fetch')) {
            throw backendErr;
          }
        }

        if (!respOk || !serverData) {
          setIsKeyModalOpen(true);
          throw new Error(
            'Conectá tu Gemini API Key tocando "Conectar Clave IA" o compartiendo el enlace con ?key=...'
          );
        }
        generatedResult = serverData;
      }

      setGenerationStep('Preparando visor y chat de correcciones...');
      const modelUsed = generatedResult.model || modelChoice;
      const resolvedSize: FloorQualityPreset | undefined =
        generatedResult.imageSize || (modelUsed === 'gemini-nano-banana-2.1' ? imageSize : undefined);

      const initialAssistantMessage: ChatRefinementMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        text: `Listo, así quedó "${floorTitle}". ¿Así está bien o querés cambiar algo? Podés pedir cambios directo por acá.`,
        imageUrl: generatedResult.imageUrl,
        modelUsed,
        imageSize: resolvedSize,
        versionNumber: 1,
        thoughtSignature: generatedResult.thoughtSignature,
        traceEntry: generatedResult.traceEntry,
        timestamp: Date.now(),
      };

      const newResult: TransformationResult = {
        id: `res-${Date.now()}`,
        timestamp: Date.now(),
        apiKeyId,
        roomImageUrl: roomImage,
        resultImageUrl: generatedResult.imageUrl,
        floorTitle,
        floorDetails: floorDetailsSummary,
        referenceImages: floorImages,
        referenceLabelsUsed: floorImageLabels,
        modelUsed,
        imageSize: resolvedSize,
        pipelineMode,
        promptUsed: generatedResult.promptUsed || finalPromptText,
        aspectRatio,
        initialTraceEntry: generatedResult.traceEntry,
        messages: [initialAssistantMessage],
      };

      setCurrentResult(newResult);
      saveToHistory(newResult);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Error transforming floor:', err);
      setErrorMessage(sanitizeError(err));
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleRefineResult = async ({
    baseImageUrl,
    instruction,
    includeReference,
    rawMode,
  }: {
    baseImageUrl: string;
    instruction: string;
    includeReference: boolean;
    rawMode: boolean;
  }) => {
    if (!currentResult) return;
    const cleanInstruction = instruction.trim();
    if (!cleanInstruction) return;

    const existingMessages: ChatRefinementMessage[] =
      currentResult.messages && currentResult.messages.length > 0
        ? currentResult.messages
        : [
            {
              id: `msg-init-${currentResult.id}`,
              role: 'assistant',
              text: `Versión inicial de "${currentResult.floorTitle}".`,
              imageUrl: currentResult.resultImageUrl,
              modelUsed: currentResult.modelUsed,
              imageSize: currentResult.imageSize,
              versionNumber: 1,
              traceEntry: currentResult.initialTraceEntry,
              timestamp: currentResult.timestamp,
            },
          ];

    // Build real multi-turn conversation history BEFORE pushing the current user turn
    const conversationHistory: MultiTurnHistoryTurn[] = [];
    let skippedInitialAssistant = false;
    for (const m of existingMessages) {
      if (!skippedInitialAssistant && m.role === 'assistant' && m.imageUrl) {
        skippedInitialAssistant = true;
        conversationHistory.push({
          role: 'model',
          imageUrl: m.imageUrl,
          thoughtSignature: m.thoughtSignature,
        });
        continue;
      }
      conversationHistory.push({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.role === 'user' ? m.text : undefined,
        imageUrl: m.role === 'assistant' ? m.imageUrl : undefined,
        thoughtSignature: m.role === 'assistant' ? m.thoughtSignature : undefined,
      });
    }

    const userMsg: ChatRefinementMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      text: cleanInstruction,
      timestamp: Date.now(),
    };

    const previousInstructions = existingMessages
      .filter((m) => m.role === 'user')
      .map((m) => m.text);

    const nextVersionNumber =
      existingMessages.filter((m) => m.role === 'assistant' && m.imageUrl).length + 1;

    const optimisticResult: TransformationResult = {
      ...currentResult,
      messages: [...existingMessages, userMsg],
    };
    setCurrentResult(optimisticResult);
    setIsRefining(true);
    setRefineError(null);

    const refsToSend =
      includeReference && currentResult.referenceImages?.length
        ? currentResult.referenceImages.slice(0, 4)
        : [];
    const refLabelsToSend = currentResult.referenceLabelsUsed || [];
    const activeClientKey = getActiveClientKey();

    try {
      let refined: {
        imageUrl: string;
        model: string;
        imageSize?: FloorQualityPreset;
        assistantText?: string;
        promptUsed?: string;
        thoughtSignature?: string;
        traceEntry?: PromptTraceEntry;
      };

      if (activeClientKey) {
        refined = await refineWithGoogleNanoBanana({
          apiKey: activeClientKey,
          baseImageUrl,
          originalRoomImage: currentResult.roomImageUrl,
          referenceImages: refsToSend,
          referenceLabels: refLabelsToSend,
          initialPromptText: currentResult.promptUsed,
          conversationHistory,
          instruction: cleanInstruction,
          previousInstructions,
          rawMode,
          includeImageRoleLabels,
          aspectRatio: currentResult.aspectRatio || aspectRatio,
          modelChoice,
          imageSize,
        });
      } else {
        const resp = await fetch('/api/refine-floor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseImageUrl,
            originalRoomImage: currentResult.roomImageUrl,
            referenceImages: refsToSend,
            referenceLabels: refLabelsToSend,
            initialPromptText: currentResult.promptUsed,
            conversationHistory,
            instruction: cleanInstruction,
            previousInstructions,
            rawMode,
            includeImageRoleLabels,
            aspectRatio: currentResult.aspectRatio || aspectRatio,
            modelChoice,
            imageSize,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          if (!errData?.error) {
            setIsKeyModalOpen(true);
            throw new Error('Conectá tu clave de Gemini API para aplicar correcciones.');
          }
          throw new Error(errData.error);
        }
        refined = await resp.json();
      }

      const modelUsed = refined.model || modelChoice;
      const resolvedSize: FloorQualityPreset | undefined =
        refined.imageSize || (modelUsed === 'gemini-nano-banana-2.1' ? imageSize : undefined);

      const assistantMsg: ChatRefinementMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        text: refined.assistantText || `Corrección aplicada: "${cleanInstruction}".`,
        imageUrl: refined.imageUrl,
        modelUsed,
        imageSize: resolvedSize,
        versionNumber: nextVersionNumber,
        thoughtSignature: refined.thoughtSignature,
        traceEntry: refined.traceEntry,
        timestamp: Date.now(),
      };

      const finalizedResult: TransformationResult = {
        ...optimisticResult,
        resultImageUrl: refined.imageUrl,
        modelUsed,
        imageSize: resolvedSize,
        messages: [...(optimisticResult.messages || []), assistantMsg],
      };

      setCurrentResult(finalizedResult);
      updateResultInHistory(finalizedResult);
    } catch (err: any) {
      console.error('Error refining floor:', err);
      setRefineError(sanitizeError(err));
    } finally {
      setIsRefining(false);
    }
  };

  const handleUpgradeTo2K = async () => {
    if (!currentResult || isUpgrading2K || isRefining) return;
    setIsUpgrading2K(true);
    setRefineError(null);

    const existingMessages: ChatRefinementMessage[] =
      currentResult.messages && currentResult.messages.length > 0
        ? currentResult.messages
        : [
            {
              id: `msg-init-${currentResult.id}`,
              role: 'assistant',
              text: `Versión inicial de "${currentResult.floorTitle}".`,
              imageUrl: currentResult.resultImageUrl,
              modelUsed: currentResult.modelUsed,
              imageSize: currentResult.imageSize,
              versionNumber: 1,
              traceEntry: currentResult.initialTraceEntry,
              timestamp: currentResult.timestamp,
            },
          ];

    const nextVersionNumber =
      existingMessages.filter((m) => m.role === 'assistant' && m.imageUrl).length + 1;
    const activeClientKey = getActiveClientKey();

    try {
      let upgraded: {
        imageUrl: string;
        model: string;
        imageSize: FloorQualityPreset;
        promptUsed: string;
        thoughtSignature?: string;
        traceEntry: PromptTraceEntry;
      };

      if (activeClientKey) {
        upgraded = await upgradeTo2KWithGoogleNanoBanana({
          apiKey: activeClientKey,
          currentResultImageUrl: currentResult.resultImageUrl,
          originalRoomImageUrl: currentResult.roomImageUrl,
          referenceImages: currentResult.referenceImages,
          referenceLabels: currentResult.referenceLabelsUsed,
          aspectRatio: currentResult.aspectRatio || aspectRatio,
        });
      } else {
        const resp = await fetch('/api/upgrade-2k', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentResultImageUrl: currentResult.resultImageUrl,
            originalRoomImageUrl: currentResult.roomImageUrl,
            referenceImages: currentResult.referenceImages,
            referenceLabels: currentResult.referenceLabelsUsed,
            aspectRatio: currentResult.aspectRatio || aspectRatio,
          }),
        });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData?.error || 'No se pudo escalar a 2K.');
        }
        upgraded = await resp.json();
      }

      const upgradeMsg: ChatRefinementMessage = {
        id: `msg-2k-${Date.now()}`,
        role: 'assistant',
        text: 'Versión escalada en alta definición 2K con Nano Banana 2.1.',
        imageUrl: upgraded.imageUrl,
        modelUsed: 'gemini-nano-banana-2.1',
        imageSize: '2K',
        versionNumber: nextVersionNumber,
        thoughtSignature: upgraded.thoughtSignature,
        traceEntry: upgraded.traceEntry,
        timestamp: Date.now(),
      };

      const finalizedResult: TransformationResult = {
        ...currentResult,
        resultImageUrl: upgraded.imageUrl,
        modelUsed: 'gemini-nano-banana-2.1',
        imageSize: '2K',
        messages: [...existingMessages, upgradeMsg],
      };

      setCurrentResult(finalizedResult);
      updateResultInHistory(finalizedResult);
    } catch (err: any) {
      console.error('Error upgrading to 2K:', err);
      setRefineError(sanitizeError(err));
    } finally {
      setIsUpgrading2K(false);
    }
  };

  const handleSelectVersion = (
    imageUrl: string,
    selectedModelUsed: string,
    selectedSize?: FloorQualityPreset
  ) => {
    if (!currentResult) return;
    setRefineError(null);
    setCurrentResult({
      ...currentResult,
      resultImageUrl: imageUrl,
      modelUsed: selectedModelUsed,
      imageSize: selectedSize,
    });
  };

  const handleResetAll = () => {
    setRoomImage(null);
    setCurrentResult(null);
    setErrorMessage(null);
    setRefineError(null);
  };

  const handleTryAnotherFloor = () => {
    setCurrentResult(null);
    setErrorMessage(null);
    setRefineError(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <Header
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onReset={handleResetAll}
        historyCount={history.length}
        hasApiKey={Boolean(geminiApiKey.trim() || serverHasKey)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {currentResult ? (
          <ComparisonViewer
            result={currentResult}
            modelChoice={modelChoice}
            imageSize={imageSize}
            onSelectModelAndQuality={handleSelectModelAndQuality}
            onRefineResult={handleRefineResult}
            onUpgradeTo2K={handleUpgradeTo2K}
            onSelectVersion={handleSelectVersion}
            isRefining={isRefining}
            isUpgrading2K={isUpgrading2K}
            refineError={refineError}
            onTryAnotherFloor={handleTryAnotherFloor}
            onResetAll={handleResetAll}
          />
        ) : (
          <div className="flex flex-col gap-8">
            {/* Hero Kicker */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-800/80 pb-5">
              <div className="flex flex-col gap-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-medium text-stone-400">
                  <span className="text-amber-500 font-semibold">Estudio Directo Nano Banana</span>
                  <span aria-hidden="true" className="text-stone-600">
                    ·
                  </span>
                  <span>Control Total de Prompt + 1 a 4 Referencias</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                  Visualiza el piso de madera en tu propio espacio
                </h1>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xl">
                  Subí la foto del ambiente, elegí el piso con 1 a 4 fotos de referencia, decidí en vivo qué entra y qué sale del prompt y corregí por chat directo sobre la imagen.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPwaModalOpen(true)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                  <span>Instalar en iPhone</span>
                </button>
              </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/70 border border-red-800/80 text-xs sm:text-sm text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <p className="font-semibold text-red-100">Aviso de Transformación / API</p>
                    <p className="text-red-300 mt-0.5">{errorMessage}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className="self-start sm:self-auto min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Configurar Clave Gemini</span>
                </button>
              </div>
            )}

            {/* Step 1: Room Capture */}
            <section className="space-y-2">
              <RoomCaptureStep
                roomImage={roomImage}
                aspectRatio={aspectRatio}
                onRoomImageSelected={(dataUrl, ratio) => {
                  setRoomImage(dataUrl);
                  setAspectRatio(ratio);
                  setErrorMessage(null);
                }}
                onResetRoom={() => setRoomImage(null)}
              />
            </section>

            {/* Step 2: Floor Selection + Dynamic Adentro/Afuera + Live Editable Prompt Console */}
            <section className="space-y-6 pt-2 border-t border-stone-800/80">
              <FloorSelectorStep
                selectedProduct={selectedProduct}
                onSelectProduct={handleSelectProduct}
                customFloors={customFloors}
                onOpenAddFloorModal={() => {
                  setEditingFloor(null);
                  setIsAddFloorModalOpen(true);
                }}
                onEditCustomFloor={(floor) => {
                  setEditingFloor(floor);
                  setIsAddFloorModalOpen(true);
                }}
                onRemoveCustomFloor={handleRemoveCustomFloor}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onExportWorkspace={handleExportWorkspace}
                onImportWorkspace={handleImportWorkspace}
              />

              <ParameterTogglePanel
                params={floorParams}
                onChangeParams={setFloorParams}
                onResetAllParams={handleResetAllParams}
                pipelineMode={pipelineMode}
                onChangePipelineMode={setPipelineMode}
                modelChoice={modelChoice}
                imageSize={imageSize}
                onSelectModelAndQuality={handleSelectModelAndQuality}
                availablePhotos={availablePhotos}
                refSelectionMode={refSelectionMode}
                onChangeRefSelectionMode={setRefSelectionMode}
                selectedPhotoIndices={selectedPhotoIndices}
                effectivePhotoIndices={effectivePhotoIndices}
                onTogglePhotoIndex={handleTogglePhotoIndex}
                hasCleanSwatch={Boolean(activeCustomFloor?.cleanSwatchUrl)}
                promptStrategy={promptStrategy}
                onChangePromptStrategy={handleChangePromptStrategy}
                customPrompt={customPrompt}
                onChangeCustomPrompt={setCustomPrompt}
                exactPrompt={exactPrompt}
                isPromptManuallyEdited={isPromptManuallyEdited}
                onEditExactPrompt={(val) => {
                  setManualPromptText(val);
                  setIsPromptManuallyEdited(true);
                }}
                onResetManualPrompt={() => setIsPromptManuallyEdited(false)}
                includeImageRoleLabels={includeImageRoleLabels}
                onToggleImageRoleLabels={setIncludeImageRoleLabels}
                savedPresets={savedPresets}
                onSavePreset={handleSavePreset}
                onApplyPreset={handleApplyPreset}
                onDeletePreset={handleDeletePreset}
              />
            </section>

            {/* Sticky Launch Bar */}
            <div className="sticky bottom-4 z-20 pt-2">
              <div className="p-3 sm:p-4 rounded-2xl bg-stone-900/95 backdrop-blur-md border border-stone-700/80 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-xs text-stone-300 min-w-0">
                  <div className="font-semibold text-stone-100 truncate">
                    {selectedProduct?.name || 'Sin piso seleccionado'}
                  </div>
                  <div className="text-[11px] text-stone-400 tabular-nums mt-0.5">
                    {!roomImage ? 'Falta foto del ambiente' : 'Ambiente listo'} ·{' '}
                    {modelChoice === 'gemini-nano-banana-2.1'
                      ? `NB 2.1 (${imageSize})`
                      : 'Flash Lite'}{' '}
                    ·{' '}
                    {pipelineMode === 'gemini_prepass'
                      ? 'Pre-paso Gemini'
                      : `Directo (${effectivePhotoIndices.length} ref${effectivePhotoIndices.length > 1 ? 's' : ''})`}{' '}
                    ·{' '}
                    {isPromptManuallyEdited
                      ? 'Prompt editado'
                      : `${activeParamCount} adentro`}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!roomImage || isGenerating || !selectedProduct || !exactPrompt.trim()}
                  onClick={handleTransformFloor}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{generationStep || 'Generando con Google Nano Banana...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>Generar con Nano Banana</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Floor Technical Data Modal */}
      <AddFloorModal
        isOpen={isAddFloorModalOpen}
        editingFloor={editingFloor}
        onClose={() => {
          setIsAddFloorModalOpen(false);
          setEditingFloor(null);
        }}
        onSaveFloor={handleSaveCustomFloor}
      />

      {/* Gemini Nano Banana API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={geminiApiKey}
        onSaveApiKey={(key) => {
          setGeminiApiKey(key);
          if (key) {
            localStorage.setItem('vp_gemini_api_key', key);
          } else {
            localStorage.removeItem('vp_gemini_api_key');
          }
        }}
      />

      {/* Testing History Modal */}
      <TestingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        apiKeyId={apiKeyId}
        onSelectResult={(result) => {
          const hydrated: TransformationResult = {
            ...result,
            messages:
              result.messages && result.messages.length > 0
                ? result.messages
                : [
                    {
                      id: `msg-hist-${result.id}`,
                      role: 'assistant',
                      text: `Resultado guardado para "${result.floorTitle}". Podés pedir correcciones directo desde acá.`,
                      imageUrl: result.resultImageUrl,
                      modelUsed: result.modelUsed,
                      imageSize: result.imageSize,
                      versionNumber: 1,
                      traceEntry: result.initialTraceEntry,
                      timestamp: result.timestamp,
                    },
                  ],
          };
          setCurrentResult(hydrated);
          setRefineError(null);
        }}
        onReusePrompt={(promptText) => {
          setManualPromptText(promptText);
          setIsPromptManuallyEdited(true);
          setCurrentResult(null);
          setErrorMessage(null);
        }}
        onClearHistory={handleClearHistory}
        onRemoveItem={handleRemoveHistoryItem}
      />

      {/* Mobile QR Modal */}
      <MobileQrModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />

      {/* iPhone PWA Install Modal */}
      <InstallPwaModal isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} />
    </div>
  );
}
