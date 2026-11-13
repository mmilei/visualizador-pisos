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
  FloorParametersConfig,
  ChatRefinementMessage,
} from './types';
import { urlToDataUrl } from './utils/imageUtils';
import {
  generateWithGoogleNanoBanana,
  refineWithGoogleNanoBanana,
} from './utils/geminiDirect';
import {
  DEFAULT_FLOOR_PARAMETERS,
  createInitialFloorParameters,
  buildCleanFloorPrompt,
} from './utils/promptBuilder';
import { Sparkles, RefreshCw, AlertCircle, ArrowRight, Smartphone, Key } from 'lucide-react';

function sanitizeError(err: any): string {
  const str = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || '');
  if (str.includes('429') || str.includes('RESOURCE_EXHAUSTED') || str.includes('quota') || str.includes('limit exceeded')) {
    return 'Límite de cuota o saldo alcanzado en la API de Google Gemini Imagen. Los modelos fotorrealistas Nano Banana requieren asociar facturación activa (Pay-as-you-go) en Google AI Studio (~$0.03 por imagen).';
  }
  try {
    const parsed = JSON.parse(str);
    if (parsed.error?.message) {
      return sanitizeError(parsed.error.message);
    }
    if (parsed.error && typeof parsed.error === 'string') {
      return sanitizeError(parsed.error);
    }
  } catch (e) {}
  return str.replace(/^Error:\s*/, '');
}

function asProductFromCustom(floor: CustomFloorData): FloorProduct {
  return {
    id: floor.id,
    name: floor.name,
    species: floor.species || 'Piso personalizado',
    plankFormat: floor.plankFormat,
    widthCm: parseFloat(floor.widthCm) || 20,
    lengthDescription: floor.widthCm ? `Ancho ${floor.widthCm} cm` : 'Formato personalizado',
    finish: floor.finish || 'Personalizado',
    textureUrl: floor.images[0]?.dataUrl || './texturas/roble-eslavonia-hd.jpg',
    toneHex: '#b5651d',
    description: floor.notes || 'Piso registrado por el usuario con ficha técnica.',
    highlightText: `${floor.plankFormat.toUpperCase()} · ${floor.images.length} fotos`,
    isCustom: true,
    notes: floor.notes,
  };
}

export default function App() {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('4:3');

  const [selectedProduct, setSelectedProduct] = useState<FloorProduct | null>(CATALOG_PRODUCTS[0]);
  const [customFloors, setCustomFloors] = useState<CustomFloorData[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('custom');

  // All placement/style constraints start OFF so the model applies the reference cleanly unless opted in
  const [floorParams, setFloorParams] = useState<FloorParametersConfig>(() => ({
    ...DEFAULT_FLOOR_PARAMETERS,
  }));
  const [modelChoice, setModelChoice] = useState<FloorModelChoice>('gemini-nano-banana-2.1');
  const [selectedPhotoIndices, setSelectedPhotoIndices] = useState<number[]>([0]);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<TransformationResult | null>(null);
  const [history, setHistory] = useState<TransformationResult[]>([]);

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('vp_gemini_api_key') || '';
    } catch {
      return '';
    }
  });

  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [isAddFloorModalOpen, setIsAddFloorModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load history, custom floors, and check URL for API key (?key=... o ?apiKey=...)
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

    fetch('/api/floors')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.floors) && data.floors.length > 0) {
          setCustomFloors(data.floors);
          try {
            localStorage.setItem('vp_custom_floors', JSON.stringify(data.floors));
          } catch (e) {}
          const firstProd = asProductFromCustom(data.floors[0]);
          setSelectedProduct(firstProd);
          setSelectedPhotoIndices([0]);
          setActiveTab('custom');
        }
      })
      .catch(() => {
        console.warn('Backend /api/floors not reachable, using localStorage fallback');
      });

    try {
      const savedHistory = localStorage.getItem('vp_testing_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) setHistory(parsed);
      }

      const savedFloors = localStorage.getItem('vp_custom_floors');
      if (savedFloors) {
        const parsed = JSON.parse(savedFloors);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomFloors(parsed);
          setSelectedProduct(asProductFromCustom(parsed[0]));
          setSelectedPhotoIndices([0]);
          setActiveTab('custom');
        }
      }
    } catch (e) {
      console.warn('Could not load from localStorage', e);
    }
  }, []);

  // Derive available reference photos for the currently selected product
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

  const activeParamCount = useMemo(
    () =>
      [
        floorParams.orientation.enabled,
        floorParams.widthCm.enabled,
        floorParams.format.enabled,
        floorParams.tone.enabled,
        floorParams.finish.enabled,
        floorParams.lighting.enabled,
      ].filter(Boolean).length,
    [floorParams]
  );

  const selectedLabelsForPreview = useMemo(() => {
    if (availablePhotos.length === 0) return [];
    const indices = selectedPhotoIndices.filter((i) => i >= 0 && i < availablePhotos.length);
    const activeIndices = indices.length > 0 ? indices : [0];
    return activeIndices.map((i) => availablePhotos[i]?.type || `Foto ${i + 1}`);
  }, [availablePhotos, selectedPhotoIndices]);

  const promptPreview = useMemo(
    () =>
      buildCleanFloorPrompt({
        productName: selectedProduct?.name || 'Piso seleccionado',
        referenceCount: selectedLabelsForPreview.length || 1,
        referenceLabels: selectedLabelsForPreview,
        params: floorParams,
        customPrompt,
      }),
    [selectedProduct?.name, selectedLabelsForPreview, floorParams, customPrompt]
  );

  const saveToHistory = (newResult: TransformationResult) => {
    const updated = [newResult, ...history.filter((h) => h.id !== newResult.id).slice(0, 19)];
    setHistory(updated);
    try {
      localStorage.setItem('vp_testing_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  };

  const updateResultInHistory = (updatedResult: TransformationResult) => {
    setHistory((prev) => {
      const next = prev.map((item) => (item.id === updatedResult.id ? updatedResult : item));
      try {
        localStorage.setItem('vp_testing_history', JSON.stringify(next));
      } catch (e) {
        console.warn('Could not update history in localStorage', e);
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('vp_testing_history');
    } catch (e) {}
  };

  const handleRemoveHistoryItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem('vp_testing_history', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSaveCustomFloor = (floor: CustomFloorData) => {
    const updated = [floor, ...customFloors.filter((f) => f.id !== floor.id)];
    setCustomFloors(updated);
    try {
      localStorage.setItem('vp_custom_floors', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save custom floor', e);
    }

    fetch('/api/floors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(floor),
    }).catch((err) => console.warn('Could not persist floor to server:', err));

    const asProduct = asProductFromCustom(floor);
    setSelectedProduct(asProduct);
    setSelectedPhotoIndices([0]);
    setFloorParams(createInitialFloorParameters(asProduct.widthCm, asProduct.plankFormat));
    setActiveTab('custom');
    setErrorMessage(null);
  };

  const handleRemoveCustomFloor = (id: string) => {
    const updated = customFloors.filter((f) => f.id !== id);
    setCustomFloors(updated);
    try {
      localStorage.setItem('vp_custom_floors', JSON.stringify(updated));
    } catch (e) {}

    fetch(`/api/floors/${id}`, { method: 'DELETE' }).catch(() => {});

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
    // Keep all toggles OFF when switching products, just prefill inactive default width/format hints
    setFloorParams((prev) => ({
      ...prev,
      widthCm: prev.widthCm.enabled ? prev.widthCm : { enabled: false, value: String(prod.widthCm || 18) },
      format: prev.format.enabled ? prev.format : { enabled: false, value: prod.plankFormat || 'recto' },
    }));
    setErrorMessage(null);
  };

  const handleTogglePhotoIndex = (idx: number) => {
    setSelectedPhotoIndices((prev) => {
      if (prev.includes(idx)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== idx);
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const handleResetAllParams = () => {
    setFloorParams(createInitialFloorParameters(selectedProduct?.widthCm, selectedProduct?.plankFormat));
    setCustomPrompt('');
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
      setErrorMessage('Por favor selecciona un piso del catálogo o registra uno en Mis Pisos.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setRefineError(null);
      setGenerationStep('Preparando imagen del ambiente y muestra...');

      let floorImages: string[] = [];
      let floorImageLabels: string[] = [];
      const floorTitle = selectedProduct.name;

      if (selectedProduct.isCustom) {
        const floorObj = customFloors.find((f) => f.id === selectedProduct.id);
        if (floorObj && floorObj.images.length > 0) {
          const validIndices = selectedPhotoIndices.filter((i) => i >= 0 && i < floorObj.images.length);
          const indicesToSend = validIndices.length > 0 ? validIndices : [0];
          floorImages = indicesToSend.map((i) => floorObj.images[i].dataUrl);
          floorImageLabels = indicesToSend.map((i) => `${floorObj.images[i].type || floorObj.images[i].name}`);
        } else {
          floorImages = [selectedProduct.textureUrl];
          floorImageLabels = ['Muestra principal'];
        }
      } else {
        const textureBase64 = await urlToDataUrl(selectedProduct.textureUrl);
        floorImages = [textureBase64];
        floorImageLabels = ['Muestra de catálogo'];
      }

      const cleanPromptText = buildCleanFloorPrompt({
        productName: floorTitle,
        referenceCount: floorImages.length,
        referenceLabels: floorImageLabels,
        params: floorParams,
        customPrompt: customPrompt.trim(),
      });

      const floorDetailsSummary =
        activeParamCount === 0
          ? `Modo natural · ${floorImages.length} foto${floorImages.length > 1 ? 's' : ''}`
          : `${activeParamCount} parámetro${activeParamCount > 1 ? 's' : ''} activo${activeParamCount > 1 ? 's' : ''} · ${floorImages.length} foto${floorImages.length > 1 ? 's' : ''}`;

      let generatedResult: { imageUrl: string; model: string; promptUsed?: string } | null = null;

      // 1. Intentar con el backend del servidor si está disponible
      try {
        setGenerationStep(`Generando con ${modelChoice === 'gemini-nano-banana-2.1' ? 'Nano Banana 2.1' : 'Flash Lite'}...`);
        const response = await fetch('/api/generate-floor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomImage,
            floorImages,
            floorImageLabels,
            productName: floorTitle,
            promptText: cleanPromptText,
            customPrompt: customPrompt.trim(),
            aspectRatio,
            modelChoice,
          }),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data && data.success && data.imageUrl) {
              generatedResult = data;
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend server not reachable, attempting direct Google Nano Banana API call:', backendErr);
      }

      // 2. Si no hay backend (ej: en GitHub Pages), llamar directamente a Google Gemini Nano Banana
      if (!generatedResult) {
        const activeKey = getActiveClientKey();

        if (!activeKey) {
          setIsKeyModalOpen(true);
          throw new Error(
            'Para generar con Google Nano Banana en GitHub Pages, ingresa tu Gemini API Key tocando "Conectar Clave IA" o comparte el link con ?key=...'
          );
        }

        setGenerationStep(`Generando directo con Google ${modelChoice === 'gemini-nano-banana-2.1' ? 'Nano Banana 2.1' : 'Flash Lite'}...`);
        generatedResult = await generateWithGoogleNanoBanana({
          apiKey: activeKey,
          roomImage,
          floorImages,
          floorImageLabels,
          productName: floorTitle,
          parameters: floorParams,
          customPrompt: customPrompt.trim(),
          aspectRatio,
          modelChoice,
        });
      }

      setGenerationStep('Preparando visor y chat de correcciones...');
      const modelUsed = generatedResult.model || modelChoice;
      const initialAssistantMessage: ChatRefinementMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        text:
          activeParamCount === 0
            ? `Primera versión generada con "${floorTitle}" aplicando la muestra natural sin restricciones extra. ¿Querés corregir dirección, tono, ancho de tabla o brillo?`
            : `Primera versión generada con "${floorTitle}" (${activeParamCount} parámetro${activeParamCount > 1 ? 's' : ''} activo${activeParamCount > 1 ? 's' : ''}). Decime qué querés ajustar sobre esta imagen.`,
        imageUrl: generatedResult.imageUrl,
        modelUsed,
        versionNumber: 1,
        timestamp: Date.now(),
      };

      const newResult: TransformationResult = {
        id: `res-${Date.now()}`,
        timestamp: Date.now(),
        roomImageUrl: roomImage,
        resultImageUrl: generatedResult.imageUrl,
        floorTitle,
        floorDetails: floorDetailsSummary,
        referenceImages: floorImages,
        modelUsed,
        promptUsed: generatedResult.promptUsed || cleanPromptText,
        aspectRatio,
        messages: [initialAssistantMessage],
      };

      setCurrentResult(newResult);
      saveToHistory(newResult);
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
  }: {
    baseImageUrl: string;
    instruction: string;
    includeReference: boolean;
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
              versionNumber: 1,
              timestamp: currentResult.timestamp,
            },
          ];

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

    const referenceImageUrl =
      includeReference && currentResult.referenceImages?.length
        ? currentResult.referenceImages[0]
        : undefined;

    try {
      let refined: { imageUrl: string; model: string; assistantText?: string; promptUsed?: string } | null =
        null;

      // 1. Try server endpoint
      try {
        const resp = await fetch('/api/refine-floor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseImageUrl,
            referenceImageUrl,
            instruction: cleanInstruction,
            previousInstructions,
            aspectRatio: currentResult.aspectRatio || aspectRatio,
            modelChoice,
          }),
        });

        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await resp.json();
            if (data && data.success && data.imageUrl) {
              refined = data;
            }
          }
        }
      } catch (backendErr) {
        console.warn('Backend /api/refine-floor unreachable, calling Google Gemini directly:', backendErr);
      }

      // 2. Fallback to direct Google Nano Banana API (GitHub Pages)
      if (!refined) {
        const activeKey = getActiveClientKey();
        if (!activeKey) {
          setIsKeyModalOpen(true);
          throw new Error(
            'Necesitas tu clave de Gemini API para aplicar correcciones desde GitHub Pages.'
          );
        }

        refined = await refineWithGoogleNanoBanana({
          apiKey: activeKey,
          baseImageUrl,
          referenceImageUrl,
          instruction: cleanInstruction,
          previousInstructions,
          aspectRatio: currentResult.aspectRatio || aspectRatio,
          modelChoice,
        });
      }

      const modelUsed = refined.model || modelChoice;
      const assistantMsg: ChatRefinementMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        text: refined.assistantText || `Corrección aplicada: "${cleanInstruction}".`,
        imageUrl: refined.imageUrl,
        modelUsed,
        versionNumber: nextVersionNumber,
        timestamp: Date.now(),
      };

      const finalizedResult: TransformationResult = {
        ...optimisticResult,
        resultImageUrl: refined.imageUrl,
        modelUsed,
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

  const handleSelectVersion = (imageUrl: string, modelUsed: string) => {
    if (!currentResult) return;
    setRefineError(null);
    setCurrentResult({
      ...currentResult,
      resultImageUrl: imageUrl,
      modelUsed,
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
        hasApiKey={!!geminiApiKey}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {currentResult ? (
          <ComparisonViewer
            result={currentResult}
            modelChoice={modelChoice}
            onChangeModelChoice={setModelChoice}
            onRefineResult={handleRefineResult}
            onSelectVersion={handleSelectVersion}
            isRefining={isRefining}
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
                  <span className="text-amber-500 font-semibold">Visualizador Arquitectónico</span>
                  <span aria-hidden="true" className="text-stone-600">·</span>
                  <span>Parámetros Opcionales + Chat de Corrección</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                  Visualiza el piso de madera en tu propio espacio
                </h1>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xl">
                  Subí la foto del ambiente, elegí el piso (sin restricciones forzadas por defecto) y luego corregí cualquier detalle por chat directo sobre el resultado.
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
                    <p className="font-semibold text-red-100">Aviso de Cuota / Transformación</p>
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

            {/* Step 2: Floor Selection + Toggleable Parameters */}
            <section className="space-y-6 pt-2 border-t border-stone-800/80">
              <FloorSelectorStep
                selectedProduct={selectedProduct}
                onSelectProduct={handleSelectProduct}
                customFloors={customFloors}
                onOpenAddFloorModal={() => setIsAddFloorModalOpen(true)}
                onRemoveCustomFloor={handleRemoveCustomFloor}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />

              <ParameterTogglePanel
                params={floorParams}
                onChangeParams={setFloorParams}
                onResetAllParams={handleResetAllParams}
                modelChoice={modelChoice}
                onChangeModelChoice={setModelChoice}
                availablePhotos={availablePhotos}
                selectedPhotoIndices={selectedPhotoIndices}
                onTogglePhotoIndex={handleTogglePhotoIndex}
                promptPreview={promptPreview}
                customPrompt={customPrompt}
                onChangeCustomPrompt={setCustomPrompt}
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
                    {activeParamCount === 0
                      ? 'Sin parámetros forzados'
                      : `${activeParamCount} parámetro${activeParamCount > 1 ? 's' : ''} activo${activeParamCount > 1 ? 's' : ''}`}{' '}
                    · {selectedPhotoIndices.length} foto{selectedPhotoIndices.length > 1 ? 's' : ''} muestra
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!roomImage || isGenerating || !selectedProduct}
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

      {/* Add Floor Technical Data Modal */}
      <AddFloorModal
        isOpen={isAddFloorModalOpen}
        onClose={() => setIsAddFloorModalOpen(false)}
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
                      versionNumber: 1,
                      timestamp: result.timestamp,
                    },
                  ],
          };
          setCurrentResult(hydrated);
          setRefineError(null);
        }}
        onClearHistory={handleClearHistory}
        onRemoveItem={handleRemoveHistoryItem}
      />

      {/* Mobile QR Modal */}
      <MobileQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* iPhone PWA Install Modal */}
      <InstallPwaModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />
    </div>
  );
}
