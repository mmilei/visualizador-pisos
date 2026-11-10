import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RoomCaptureStep } from './components/RoomCaptureStep';
import { FloorSelectorStep } from './components/FloorSelectorStep';
import { ComparisonViewer } from './components/ComparisonViewer';
import { CloudflareWorkerModal } from './components/CloudflareWorkerModal';
import { TestingHistoryModal } from './components/TestingHistoryModal';
import { MobileQrModal } from './components/MobileQrModal';
import { AddFloorModal } from './components/AddFloorModal';
import { PlacementParametersModal } from './components/PlacementParametersModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { CATALOG_PRODUCTS } from './data/catalog';
import { FloorProduct, CustomFloorData, TransformationResult, PlankOrientation } from './types';
import { urlToDataUrl } from './utils/imageUtils';
import { simulateFloorComposite } from './utils/localSimulation';
import { Sparkles, RefreshCw, AlertCircle, ArrowRight, Play, Sliders, ArrowUpDown, ArrowLeftRight, Smartphone } from 'lucide-react';

function sanitizeError(err: any): string {
  const str = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || '');
  if (str.includes('429') || str.includes('RESOURCE_EXHAUSTED') || str.includes('quota') || str.includes('limit exceeded')) {
    return 'Límite de cuota alcanzado en la API de Gemini Imagen. Los modelos de generación fotorrealista requieren asociar facturación activa (Pay-as-you-go) en Google AI Studio (~$0.03 por imagen). Para ensayar inmediatamente tu ambiente sin costo, pulsa "Probar Simulación Local".';
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
    textureUrl: floor.images[0]?.dataUrl || '/texturas/roble-eslavonia-hd.jpg',
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

  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [plankOrientation, setPlankOrientation] = useState<PlankOrientation>('vertical');
  const [customWidthCm, setCustomWidthCm] = useState<string>('');
  const [finishPreference, setFinishPreference] = useState<string>('satinado');
  const [lightingPreference, setLightingPreference] = useState<string>('ventana');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<TransformationResult | null>(null);
  const [history, setHistory] = useState<TransformationResult[]>([]);

  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [isAddFloorModalOpen, setIsAddFloorModalOpen] = useState<boolean>(false);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load history and custom floors from server database and localStorage
  useEffect(() => {
    // 1. Fetch from server database
    fetch('/api/floors')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.floors) && data.floors.length > 0) {
          setCustomFloors(data.floors);
          try {
            localStorage.setItem('vp_custom_floors', JSON.stringify(data.floors));
          } catch (e) {}
          // Select first custom floor as default
          setSelectedProduct(asProductFromCustom(data.floors[0]));
          setActiveTab('custom');
          return;
        }
      })
      .catch((e) => {
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
          setActiveTab('custom');
        }
      }
    } catch (e) {
      console.warn('Could not load from localStorage', e);
    }
  }, []);

  const saveToHistory = (newResult: TransformationResult) => {
    const updated = [newResult, ...history.slice(0, 19)];
    setHistory(updated);
    try {
      localStorage.setItem('vp_testing_history', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
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

    // Persist to server database
    fetch('/api/floors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(floor),
    }).catch((err) => console.warn('Could not persist floor to server:', err));

    const asProduct = asProductFromCustom(floor);
    setSelectedProduct(asProduct);
    setActiveTab('custom');
    if (floor.notes) {
      setCustomPrompt((prev) => (prev ? prev : floor.notes));
    }
    setErrorMessage(null);
  };

  const handleRemoveCustomFloor = (id: string) => {
    const updated = customFloors.filter((f) => f.id !== id);
    setCustomFloors(updated);
    try {
      localStorage.setItem('vp_custom_floors', JSON.stringify(updated));
    } catch (e) {}

    // Delete from server database
    fetch(`/api/floors/${id}`, { method: 'DELETE' }).catch((e) => {});

    if (selectedProduct?.id === id) {
      if (updated.length > 0) {
        setSelectedProduct(asProductFromCustom(updated[0]));
        setActiveTab('custom');
      } else {
        setSelectedProduct(CATALOG_PRODUCTS[0]);
        setActiveTab('catalog');
      }
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
      setGenerationStep('Preparando texturas y fotos de referencia...');

      let floorImages: string[] = [];
      let floorImageLabels: string[] = [];
      const floorTitle = selectedProduct.name;
      const floorDetails = `${selectedProduct.species} · Ancho: ${selectedProduct.widthCm} cm · ${selectedProduct.highlightText}`;
      const woodDetails: any = {
        name: selectedProduct.name,
        species: selectedProduct.species,
        format: selectedProduct.plankFormat,
        widthCm: selectedProduct.widthCm,
        finish: selectedProduct.finish,
        notes: selectedProduct.notes,
      };

      if (selectedProduct.isCustom) {
        const floorObj = customFloors.find((f) => f.id === selectedProduct.id);
        if (floorObj && floorObj.images.length > 0) {
          floorImages = floorObj.images.map((img) => img.dataUrl);
          floorImageLabels = floorObj.images.map((img) => `${img.name} (${img.type})`);
        } else {
          floorImages = [selectedProduct.textureUrl];
          floorImageLabels = ['Textura principal'];
        }
      } else {
        const textureBase64 = await urlToDataUrl(selectedProduct.textureUrl);
        floorImages = [textureBase64];
        floorImageLabels = ['Muestra fotográfica HD de catálogo'];
      }

      setGenerationStep(`Procesando con IA multimodal (${floorImages.length} foto${floorImages.length !== 1 ? 's' : ''} de referencia)...`);

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
          woodDetails: {
            ...woodDetails,
            widthCm: customWidthCm || woodDetails.widthCm,
            finish: finishPreference || woodDetails.finish,
          },
          customPrompt: customPrompt.trim(),
          plankOrientation,
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ocurrió un error al generar la imagen con el piso.');
      }

      setGenerationStep('Finalizando detalles fotorrealistas...');

      const newResult: TransformationResult = {
        id: `res-${Date.now()}`,
        timestamp: Date.now(),
        roomImageUrl: roomImage,
        resultImageUrl: data.imageUrl,
        floorTitle,
        floorDetails,
        referenceImages: floorImages,
        modelUsed: data.model || 'gemini-3.1-flash-lite-image',
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

  const handleRunLocalSimulation = async () => {
    if (!roomImage) {
      setErrorMessage('Por favor toma o sube primero una foto de tu ambiente.');
      return;
    }

    if (!selectedProduct) {
      setErrorMessage('Selecciona un piso del catálogo o registra una ficha de piso.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setGenerationStep('Generando simulación lumínica local sin consumir créditos...');

      const texture = selectedProduct.textureUrl;

      const simUrl = await simulateFloorComposite(roomImage, texture, {
        speciesName: selectedProduct.name,
        toneHex: selectedProduct.toneHex || '#c4965e',
        pattern: selectedProduct.plankFormat,
        orientation: plankOrientation,
      });

      const newResult: TransformationResult = {
        id: `sim-${Date.now()}`,
        timestamp: Date.now(),
        roomImageUrl: roomImage,
        resultImageUrl: simUrl,
        floorTitle: `${selectedProduct.name} (Simulación Local)`,
        floorDetails: `Ancho ${selectedProduct.widthCm} cm · ${selectedProduct.species} · ${plankOrientation.toUpperCase()}`,
        referenceImages: [texture],
        modelUsed: 'Canvas Lighting Engine (Offline)',
      };

      setCurrentResult(newResult);
      saveToHistory(newResult);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('No se pudo generar la simulación local: ' + err.message);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleResetAll = () => {
    setRoomImage(null);
    setCurrentResult(null);
    setErrorMessage(null);
  };

  const handleTryAnotherFloor = () => {
    setCurrentResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <Header
        onOpenWorkerModal={() => setIsWorkerModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        onReset={handleResetAll}
        historyCount={history.length}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* If viewing a generated result */}
        {currentResult ? (
          <ComparisonViewer
            result={currentResult}
            onTryAnotherFloor={handleTryAnotherFloor}
            onResetAll={handleResetAll}
          />
        ) : (
          /* Workflow: Capture Room + Choose Floor */
          <div className="flex flex-col gap-8">
            {/* Hero Kicker */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-800/80 pb-5">
              <div className="flex flex-col gap-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-medium text-stone-400">
                  <span className="text-amber-500 font-semibold">Visualizador Arquitectónico</span>
                  <span aria-hidden="true" className="text-stone-600">·</span>
                  <span>Fichas Técnicas & Ensayos Fotorrealistas</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
                  Visualiza el piso de madera en tu propio espacio
                </h1>
                <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xl">
                  Fotografía tu ambiente, selecciona una madera de tus pisos guardados y evalúa la dirección de tablas y tonalidad con luz natural.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPwaModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
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

                {roomImage && (
                  <button
                    type="button"
                    onClick={handleRunLocalSimulation}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Probar Simulación Local (Sin Créditos)</span>
                  </button>
                )}
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

            {/* Step 2: Floor Selection */}
            <section className="space-y-4 pt-2 border-t border-stone-800/80">
              <FloorSelectorStep
                selectedProduct={selectedProduct}
                onSelectProduct={(prod) => {
                  setSelectedProduct(prod);
                  setErrorMessage(null);
                }}
                customFloors={customFloors}
                onOpenAddFloorModal={() => setIsAddFloorModalOpen(true)}
                onRemoveCustomFloor={handleRemoveCustomFloor}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />

              {/* Orientación de las tablas */}
              <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">Orientación de las Tablas</span>
                  <span className="text-[11px] text-stone-400">Dirección en que se colocan las maderas en el ambiente</span>
                </div>

                <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPlankOrientation('vertical')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      plankOrientation === 'vertical'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Tablas en profundidad hacia el fondo"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Vertical (Hacia el fondo)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlankOrientation('horizontal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      plankOrientation === 'horizontal'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                    title="Tablas a lo ancho de izquierda a derecha"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Horizontal (A lo ancho)</span>
                  </button>
                </div>
              </div>

              {/* Space to Prompt about the Floor (Indicaciones específicas sobre la madera y colocación) */}
              <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 shadow-sm space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-stone-200">
                      Indicaciones o Prompt para la IA sobre el Piso (Opcional)
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    Se envía en el prompt junto a la orientación ({plankOrientation === 'horizontal' ? 'Horizontal' : 'Vertical'}) y medidas
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={`Ej: Colocar tablas de ${customWidthCm || selectedProduct?.widthCm || 20} cm en sentido ${plankOrientation === 'horizontal' ? 'horizontal a lo ancho' : 'vertical hacia el ventanal'}, nudos marcados, reflejo satinado suave...`}
                  className="w-full p-3 rounded-xl bg-stone-950 border border-stone-700/80 focus:border-amber-500 focus:outline-none text-xs text-stone-100 placeholder:text-stone-500 resize-none leading-relaxed"
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-stone-500 font-medium mr-1">Sugerencias rápidas:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPrompt((p) =>
                        p ? `${p}, tablas orientadas longitudinalmente hacia la luz de la ventana` : 'Tablas orientadas longitudinalmente hacia la luz de la ventana'
                      )
                    }
                    className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] transition-colors cursor-pointer"
                  >
                    + Hacia la ventana
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPrompt((p) =>
                        p ? `${p}, acabado mate natural sin brillos plásticos` : 'Acabado mate natural sin brillos plásticos'
                      )
                    }
                    className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] transition-colors cursor-pointer"
                  >
                    + Acabado mate
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPrompt((p) =>
                        p ? `${p}, juntas finas biseladas bien definidas` : 'Juntas finas biseladas bien definidas'
                      )
                    }
                    className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] transition-colors cursor-pointer"
                  >
                    + Juntas biseladas
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPrompt((p) =>
                        p ? `${p}, veta rústica con nudos auténticos visibles` : 'Veta rústica con nudos auténticos visibles'
                      )
                    }
                    className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] transition-colors cursor-pointer"
                  >
                    + Veta con nudos
                  </button>
                </div>
              </div>
            </section>

            {/* Sticky/Fixed Launch Bar */}
            <div className="sticky bottom-4 z-20 pt-4">
              <div className="p-3 sm:p-4 rounded-2xl bg-stone-900/95 backdrop-blur-md border border-stone-700/80 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-stone-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-stone-100">
                      Piso: {selectedProduct?.name} ({customWidthCm || selectedProduct?.widthCm} cm · {plankOrientation.toUpperCase()})
                    </span>
                    <span className="text-[11px] text-stone-400 block sm:inline sm:ml-2">
                      · {!roomImage ? 'Falta tomar foto del ambiente' : 'Ambiente listo'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                  {/* Botón 2: Parametrizar colocación */}
                  <button
                    type="button"
                    onClick={() => setIsPlacementModalOpen(true)}
                    className="flex-1 sm:flex-none min-h-[46px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-[0.98] text-stone-200 text-xs font-semibold border border-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Ajustar orientación horizontal/vertical, medidas y luz"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Parametrizar Colocación</span>
                  </button>

                  {/* Botón Simulación Inmediata (Local) */}
                  <button
                    type="button"
                    disabled={!roomImage || isGenerating}
                    onClick={handleRunLocalSimulation}
                    className="flex-1 sm:flex-none min-h-[46px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-[0.98] disabled:opacity-40 text-stone-300 text-xs font-medium border border-stone-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Prueba inmediata en el navegador sin gastar créditos"
                  >
                    <Play className="w-3.5 h-3.5 text-stone-400" />
                    <span>Simulación Inmediata</span>
                  </button>

                  {/* Botón 1: 1 Clic Transformación */}
                  <button
                    type="button"
                    disabled={!roomImage || isGenerating || !selectedProduct}
                    onClick={handleTransformFloor}
                    className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>{generationStep || 'Generando piso con IA...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>Transformar Piso (1 Clic)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
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

      {/* Placement Parameters Modal */}
      <PlacementParametersModal
        isOpen={isPlacementModalOpen}
        onClose={() => setIsPlacementModalOpen(false)}
        orientation={plankOrientation}
        onChangeOrientation={setPlankOrientation}
        customWidthCm={customWidthCm}
        onChangeCustomWidth={setCustomWidthCm}
        finishPreference={finishPreference}
        onChangeFinishPreference={setFinishPreference}
        lightingPreference={lightingPreference}
        onChangeLightingPreference={setLightingPreference}
        onApplyAndRun={handleTransformFloor}
      />

      {/* Cloudflare Worker Code Modal */}
      <CloudflareWorkerModal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
      />

      {/* Testing History Modal */}
      <TestingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onSelectResult={(result) => {
          setCurrentResult(result);
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
