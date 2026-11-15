import React, { useState, useRef, useEffect } from 'react';
import {
  ChatRefinementMessage,
  FloorModelChoice,
  FloorQualityPreset,
  TransformationResult,
} from '../types';
import {
  Download,
  Sliders,
  SplitSquareVertical,
  Eye,
  RotateCcw,
  Maximize2,
  Minimize2,
  Send,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Check,
  Sparkles,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ComparisonViewerProps {
  result: TransformationResult;
  modelChoice: FloorModelChoice;
  imageSize: FloorQualityPreset;
  onSelectModelAndQuality: (model: FloorModelChoice, size: FloorQualityPreset) => void;
  onRefineResult: (options: {
    baseImageUrl: string;
    instruction: string;
    includeReference: boolean;
    rawMode: boolean;
  }) => Promise<void>;
  onUpgradeTo2K: () => Promise<void>;
  onSelectVersion: (
    imageUrl: string,
    modelUsed: string,
    imageSize?: FloorQualityPreset
  ) => void;
  isRefining: boolean;
  isUpgrading2K: boolean;
  refineError: string | null;
  onTryAnotherFloor: () => void;
  onResetAll: () => void;
}

const QUICK_CORRECTIONS = [
  'Girá la dirección de las tablas 90 grados',
  'Hacé el tono un poco más oscuro y natural',
  'Hacelo un poco más claro',
  'Sacale brillo, dejalo mate natural',
  'Tablas más anchas',
  'Tablas más angostas',
];

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  result,
  modelChoice,
  imageSize,
  onSelectModelAndQuality,
  onRefineResult,
  onUpgradeTo2K,
  onSelectVersion,
  isRefining,
  isUpgrading2K,
  refineError,
  onTryAnotherFloor,
  onResetAll,
}) => {
  const [viewMode, setViewMode] = useState<'slider' | 'toggle' | 'side-by-side'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showOriginalInToggle, setShowOriginalInToggle] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [rawChatMode, setRawChatMode] = useState(false);
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});
  const [roomAspectRatioCss, setRoomAspectRatioCss] = useState<string>('4 / 3');
  const [sliderWidthPx, setSliderWidthPx] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const messages: ChatRefinementMessage[] =
    result.messages && result.messages.length > 0
      ? result.messages
      : [
          {
            id: `msg-fallback-${result.id}`,
            role: 'assistant',
            text: `Listo, así quedó "${result.floorTitle}". ¿Así está bien o querés cambiar algo?`,
            imageUrl: result.resultImageUrl,
            modelUsed: result.modelUsed,
            imageSize: result.imageSize,
            versionNumber: 1,
            traceEntry: result.initialTraceEntry,
            timestamp: result.timestamp,
          },
        ];

  useEffect(() => {
    setIsApproved(false);
  }, [result.resultImageUrl]);

  useEffect(() => {
    if (messages.length > 1 || isRefining) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length, isRefining]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Keep slider overlay image aligned 1:1 with containerRef width across resizes & fullscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => setSliderWidthPx(el.clientWidth);
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [viewMode, isFullscreen, roomAspectRatioCss]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clamped = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(clamped);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.resultImageUrl;
    link.download = `piso-${result.floorTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    link.click();
  };

  const handleSendInstruction = async (textToSend?: string) => {
    const clean = (textToSend ?? chatInput).trim();
    if (!clean || isRefining || isUpgrading2K) return;
    if (!textToSend) setChatInput('');
    setIsApproved(false);

    await onRefineResult({
      baseImageUrl: result.resultImageUrl,
      instruction: clean,
      includeReference: true,
      rawMode: rawChatMode,
    });
  };

  const canUpgradeTo2K =
    result.modelUsed === 'gemini-3.1-flash-lite-image' || result.imageSize === '1K';

  const activeChatPreset =
    modelChoice === 'gemini-3.1-flash-lite-image'
      ? 'lite'
      : imageSize === '1K'
        ? '1k'
        : '2k';

  const toggleTrace = (id: string) => {
    setExpandedTraceIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-stone-950/98 p-3 sm:p-5 flex flex-col gap-3 overflow-y-auto backdrop-blur-xl'
          : 'w-full flex flex-col gap-4 sm:gap-5'
      }
    >
      {/* Top action & mode toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-stone-900 border border-stone-800/80">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-stone-100 truncate">
            {result.floorTitle}
          </h3>
          <p className="text-xs text-stone-400 mt-0.5 truncate tabular-nums">
            {result.floorDetails} · {result.modelUsed}
            {result.imageSize ? ` (${result.imageSize})` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-stone-800 rounded-xl border border-stone-700/80">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'slider'
                  ? 'bg-amber-700 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Deslizador</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('toggle')}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'toggle'
                  ? 'bg-amber-700 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Alternar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'side-by-side'
                  ? 'bg-amber-700 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Lado a Lado</span>
            </button>
          </div>

          {canUpgradeTo2K && (
            <button
              type="button"
              disabled={isUpgrading2K || isRefining}
              onClick={onUpgradeTo2K}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md"
              title="Re-renderizar este resultado borrador en resolución nativa 2K con Nano Banana 2.1"
            >
              {isUpgrading2K ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isUpgrading2K ? 'Escalando a 2K...' : 'Escalar a NB 2.1 (2K)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-xs font-medium text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ver a pantalla completa'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-xs font-medium text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Descargar</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: Image Stage + Confirmation & Chat */}
      <div
        className={
          isFullscreen
            ? 'flex-1 flex flex-col gap-4'
            : 'grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch'
        }
      >
        {/* Image Stage */}
        <div
          className={`${
            isFullscreen ? 'flex-1 min-h-[65vh] flex items-center justify-center' : 'lg:col-span-7 flex flex-col gap-3'
          }`}
        >
          <div
            className={`relative rounded-2xl border border-stone-800 bg-stone-950 overflow-hidden shadow-2xl flex items-center justify-center ${
              isFullscreen ? 'w-full h-full min-h-[65vh]' : 'w-full'
            }`}
          >
            {viewMode === 'slider' && (
              <div
                ref={containerRef}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleMouseMove}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                onTouchMove={handleTouchMove}
                style={{ aspectRatio: roomAspectRatioCss }}
                className={`relative w-full ${
                  isFullscreen ? 'max-h-[78vh] max-w-full' : 'max-h-[56vh] lg:max-h-[620px]'
                } select-none cursor-ew-resize overflow-hidden bg-stone-950`}
              >
                <img
                  src={result.roomImageUrl}
                  alt="Ambiente Original"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      setRoomAspectRatioCss(`${img.naturalWidth} / ${img.naturalHeight}`);
                    }
                  }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={result.resultImageUrl}
                    alt="Ambiente con nuevo piso"
                    className="absolute inset-0 h-full object-contain pointer-events-none"
                    style={{
                      width: sliderWidthPx > 0 ? `${sliderWidthPx}px` : '100%',
                      maxWidth: 'none',
                    }}
                  />
                </div>

                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] z-10 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-stone-900 border-2 border-amber-400 shadow-xl flex items-center justify-center text-amber-300">
                    <Sliders className="w-4 h-4" />
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 bg-stone-900/85 backdrop-blur-md border border-stone-700 text-stone-200 px-2.5 py-1 rounded-md text-[11px] font-semibold pointer-events-none">
                  Resultado IA
                </div>
                <div className="absolute bottom-3 right-3 bg-stone-900/85 backdrop-blur-md border border-stone-700 text-stone-200 px-2.5 py-1 rounded-md text-[11px] font-semibold pointer-events-none">
                  Original
                </div>
              </div>
            )}

            {viewMode === 'toggle' && (
              <div
                style={{ aspectRatio: roomAspectRatioCss }}
                className="relative w-full max-h-[56vh] lg:max-h-[620px] flex items-center justify-center bg-stone-950"
              >
                <img
                  src={showOriginalInToggle ? result.roomImageUrl : result.resultImageUrl}
                  alt="Vista alternada"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-4 inset-x-0 flex justify-center">
                  <button
                    type="button"
                    onMouseDown={() => setShowOriginalInToggle(true)}
                    onMouseUp={() => setShowOriginalInToggle(false)}
                    onMouseLeave={() => setShowOriginalInToggle(false)}
                    onTouchStart={() => setShowOriginalInToggle(true)}
                    onTouchEnd={() => setShowOriginalInToggle(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-900/90 backdrop-blur-md border border-amber-500/50 text-amber-300 text-xs font-bold shadow-lg hover:bg-stone-900 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Mantén presionado para ver piso original</span>
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'side-by-side' && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-800">
                <div className="p-3 flex flex-col items-center">
                  <span className="text-xs font-semibold text-stone-400 mb-2">Original</span>
                  <div
                    style={{ aspectRatio: roomAspectRatioCss }}
                    className="w-full max-h-[46vh] bg-stone-950 flex items-center justify-center overflow-hidden rounded-xl"
                  >
                    <img
                      src={result.roomImageUrl}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="p-3 flex flex-col items-center">
                  <span className="text-xs font-semibold text-amber-400 mb-2">
                    Con {result.floorTitle}
                  </span>
                  <div
                    style={{ aspectRatio: roomAspectRatioCss }}
                    className="w-full max-h-[46vh] bg-stone-950 flex items-center justify-center overflow-hidden rounded-xl"
                  >
                    <img
                      src={result.resultImageUrl}
                      alt="Resultado"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Immediate Confirmation & Conversational Refinement Chat Panel */}
        {!isFullscreen && (
          <div className="lg:col-span-5 rounded-2xl bg-stone-900 border border-amber-700/50 shadow-xl flex flex-col overflow-hidden lg:min-h-[480px] lg:max-h-[680px]">
            {/* Chat Header */}
            <div className="p-3.5 border-b border-stone-800 bg-stone-950/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-100 truncate">
                    ¿Así está bien o querés cambiar algo?
                  </h4>
                  <p className="text-[11px] text-stone-400 truncate">
                    Chat multi-turno con memoria sobre esta foto
                  </p>
                </div>
              </div>

              {/* Model + Quality selector for chat edits */}
              <div className="flex items-center gap-0.5 p-0.5 bg-stone-900 rounded-lg border border-stone-800 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectModelAndQuality('gemini-nano-banana-2.1', '2K')}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors cursor-pointer tabular-nums ${
                    activeChatPreset === '2k'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  2.1·2K
                </button>
                <button
                  type="button"
                  onClick={() => onSelectModelAndQuality('gemini-nano-banana-2.1', '1K')}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors cursor-pointer tabular-nums ${
                    activeChatPreset === '1k'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  2.1·1K
                </button>
                <button
                  type="button"
                  onClick={() => onSelectModelAndQuality('gemini-3.1-flash-lite-image', '1K')}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                    activeChatPreset === 'lite'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Lite
                </button>
              </div>
            </div>

            {/* Quick Decision Prompt Bar */}
            <div className="px-3.5 py-2.5 border-b border-stone-800/80 bg-stone-950/40 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsApproved(true)}
                className={`flex-1 min-h-[42px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isApproved
                    ? 'bg-emerald-700 border-emerald-500 text-white'
                    : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isApproved ? 'Versión confirmada' : 'Así está bien'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsApproved(false);
                  chatInputRef.current?.focus();
                }}
                className="flex-1 min-h-[42px] px-3 py-1.5 rounded-xl bg-amber-700/20 hover:bg-amber-700/35 border border-amber-600/50 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Quiero cambiar algo</span>
              </button>
            </div>

            {isApproved && (
              <div className="mx-3.5 mt-3 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/70 flex items-center justify-between gap-3 text-xs text-emerald-200">
                <span>Perfecto, quedó guardada en tu historial.</span>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            )}

            {/* Chat Message Thread */}
            <div className="flex-1 max-h-[280px] lg:max-h-none overflow-y-auto p-3.5 space-y-3 text-xs">
              {messages.map((msg) => {
                const trace = msg.traceEntry || (msg.versionNumber === 1 ? result.initialTraceEntry : undefined);
                const isTraceOpen = Boolean(expandedTraceIds[msg.id]);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-amber-700 text-white rounded-br-sm'
                          : 'bg-stone-950 border border-stone-800 text-stone-200 rounded-bl-sm'
                      }`}
                    >
                      <p>{msg.text}</p>

                      {msg.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onSelectVersion(
                              msg.imageUrl!,
                              msg.modelUsed || result.modelUsed,
                              msg.imageSize
                            )
                          }
                          className={`mt-2 w-full rounded-xl overflow-hidden border transition-all cursor-pointer block text-left ${
                            result.resultImageUrl === msg.imageUrl
                              ? 'border-amber-500 ring-2 ring-amber-500/30'
                              : 'border-stone-800 hover:border-stone-600 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={msg.imageUrl}
                            alt={`Versión ${msg.versionNumber || ''}`}
                            className="w-full h-24 object-cover"
                          />
                          <div className="px-2.5 py-1.5 bg-stone-900/90 flex items-center justify-between text-[10px] text-stone-300 tabular-nums">
                            <span className="font-semibold">
                              Versión {msg.versionNumber || 1}
                              {msg.imageSize ? ` · ${msg.imageSize}` : ''}
                            </span>
                            <span>
                              {result.resultImageUrl === msg.imageUrl
                                ? 'Activa en el visor'
                                : 'Ver en visor'}
                            </span>
                          </div>
                        </button>
                      )}

                      {trace && (
                        <div className="mt-2 pt-2 border-t border-stone-800/80">
                          <button
                            type="button"
                            onClick={() => toggleTrace(msg.id)}
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>Ver prompt e imágenes enviadas</span>
                            {isTraceOpen ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>

                          {isTraceOpen && (
                            <div className="mt-2 p-2 rounded-lg bg-stone-900 border border-stone-800 font-mono text-[10px] text-stone-300 space-y-1.5">
                              <div className="text-stone-400 tabular-nums">
                                {trace.stage} · {trace.model}
                                {trace.imageSize ? ` · ${trace.imageSize}` : ''}
                                {trace.durationMs ? ` · ${(trace.durationMs / 1000).toFixed(1)}s` : ''}
                                {trace.usedConversationHistory ? ' · multi-turno' : ''}
                              </div>
                              {trace.imageRoles.length > 0 && (
                                <div className="space-y-0.5 text-stone-400">
                                  {trace.imageRoles.map((r, idx) => (
                                    <div key={idx} className="truncate" title={r}>
                                      • {r}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <pre className="whitespace-pre-wrap break-words text-stone-200 pt-1 border-t border-stone-800 leading-relaxed">
                                {trace.promptText}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-stone-500 mt-1 px-1 tabular-nums">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {msg.modelUsed ? ` · ${msg.modelUsed}` : ''}
                      {msg.imageSize ? ` (${msg.imageSize})` : ''}
                    </span>
                  </div>
                );
              })}

              {(isRefining || isUpgrading2K) && (
                <div className="flex items-start">
                  <div className="rounded-2xl rounded-bl-sm bg-stone-950 border border-stone-800 px-3.5 py-2.5 text-stone-300 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>
                      {isUpgrading2K
                        ? 'Re-renderizando en Nano Banana 2.1 (2K)...'
                        : 'Aplicando corrección sobre esta imagen...'}
                    </span>
                  </div>
                </div>
              )}

              {refineError && (
                <div className="rounded-xl bg-red-950/50 border border-red-900/70 p-2.5 text-[11px] text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{refineError}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Corrections */}
            <div className="px-3.5 py-2 border-t border-stone-800/80 bg-stone-950/40 flex items-center gap-1.5 overflow-x-auto">
              {QUICK_CORRECTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isRefining || isUpgrading2K}
                  onClick={() => handleSendInstruction(q)}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 text-[11px] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Composer */}
            <div className="p-3 border-t border-stone-800 bg-stone-950/80 space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[11px] text-stone-400 hover:text-stone-200">
                <input
                  type="checkbox"
                  checked={rawChatMode}
                  onChange={(e) => setRawChatMode(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-900 text-amber-600 focus:ring-amber-500"
                />
                <span>Enviar texto literal sin envoltorio (modo chat puro)</span>
              </label>

              <div className="flex items-end gap-2">
                <textarea
                  ref={chatInputRef}
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendInstruction();
                    }
                  }}
                  placeholder="Escribí qué cambiar (ej: girá las tablas 90°, tono más natural, quitá brillo)..."
                  className="flex-1 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700/80 focus:border-amber-500 focus:outline-none text-xs text-stone-100 placeholder:text-stone-500 resize-none leading-relaxed"
                />
                <button
                  type="button"
                  disabled={!chatInput.trim() || isRefining || isUpgrading2K}
                  onClick={() => handleSendInstruction()}
                  className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                  aria-label="Enviar corrección"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900 border border-stone-800">
          <div className="text-xs text-stone-400">
            Cada corrección conserva el contexto de la conversación. Tocá una miniatura en el chat para volver a esa versión o escalar un borrador a 2K.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={onTryAnotherFloor}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
            >
              Cambiar Piso o Parámetros
            </button>
            <button
              type="button"
              onClick={onResetAll}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-[0.98] text-stone-200 border border-stone-700 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nueva Habitación</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
