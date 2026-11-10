import React, { useState, useRef, useEffect } from 'react';
import { TransformationResult } from '../types';
import { Download, Sliders, SplitSquareVertical, Eye, ZoomIn, ZoomOut, CheckCircle2, RotateCcw } from 'lucide-react';

interface ComparisonViewerProps {
  result: TransformationResult;
  onTryAnotherFloor: () => void;
  onResetAll: () => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  result,
  onTryAnotherFloor,
  onResetAll,
}) => {
  const [viewMode, setViewMode] = useState<'slider' | 'toggle' | 'side-by-side'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [showOriginalInToggle, setShowOriginalInToggle] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle slider drag
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

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top action & mode toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-base font-bold text-stone-100">
              {result.floorTitle}
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            {result.floorDetails} · Generado con {result.modelUsed}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode switch */}
          <div className="flex items-center gap-1 p-1 bg-stone-800 rounded-xl border border-stone-700/80">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'slider'
                  ? 'bg-amber-700 text-white font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Deslizador</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('toggle')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'toggle'
                  ? 'bg-amber-700 text-white font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Alternar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-amber-700 text-white font-semibold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Lado a Lado</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Descargar</span>
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative rounded-2xl border border-stone-800 bg-stone-950 overflow-hidden shadow-2xl">
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
            className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[640px] select-none cursor-ew-resize overflow-hidden"
          >
            {/* Background Image: Original Room */}
            <img
              src={result.roomImageUrl}
              alt="Ambiente Original"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* Foreground Clipped Image: Generated Room with New Floor */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={result.resultImageUrl}
                alt="Ambiente con nuevo piso"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{
                  width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                  maxWidth: 'none',
                }}
              />
            </div>

            {/* Split Divider Line & Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] z-10 pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-stone-900 border-2 border-amber-400 shadow-xl flex items-center justify-center text-amber-300">
                <Sliders className="w-4 h-4" />
              </div>
            </div>

            {/* Badges on sides */}
            <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-md border border-stone-700 text-stone-200 px-2.5 py-1 rounded-md text-[11px] font-semibold pointer-events-none">
              Nuevo Piso: {result.floorTitle}
            </div>
            <div className="absolute bottom-3 right-3 bg-stone-900/80 backdrop-blur-md border border-stone-700 text-stone-200 px-2.5 py-1 rounded-md text-[11px] font-semibold pointer-events-none">
              Original
            </div>
          </div>
        )}

        {viewMode === 'toggle' && (
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[640px] flex items-center justify-center bg-stone-950">
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
                onTouchStart={() => setShowOriginalInToggle(true)}
                onTouchEnd={() => setShowOriginalInToggle(false)}
                className="px-4 py-2 rounded-xl bg-stone-900/90 backdrop-blur-md border border-amber-500/50 text-amber-300 text-xs font-bold shadow-lg hover:bg-stone-900 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Mantén presionado para ver piso original</span>
              </button>
            </div>
          </div>
        )}

        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-800">
            <div className="p-3 flex flex-col items-center">
              <span className="text-xs font-semibold text-stone-400 mb-2">Original</span>
              <div className="aspect-[4/3] w-full bg-stone-950 flex items-center justify-center overflow-hidden rounded-xl">
                <img
                  src={result.roomImageUrl}
                  alt="Original"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="p-3 flex flex-col items-center">
              <span className="text-xs font-semibold text-amber-400 mb-2">Con {result.floorTitle}</span>
              <div className="aspect-[4/3] w-full bg-stone-950 flex items-center justify-center overflow-hidden rounded-xl">
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

      {/* Reference Images Strip if available */}
      {result.referenceImages && result.referenceImages.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-300">
              Muestras de Referencia ({result.referenceImages.length} foto{result.referenceImages.length !== 1 ? 's' : ''})
            </span>
            <span className="text-[11px] text-stone-500">
              Fotos enviadas a la IA para sintetizar el piso
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {result.referenceImages.map((refImg, i) => (
              <div
                key={i}
                className="relative h-16 w-24 rounded-lg overflow-hidden border border-stone-700/80 shrink-0 bg-stone-950 group"
              >
                <img src={refImg} alt={`Referencia ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[9px] text-stone-300 font-mono">
                  Ref #{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900 border border-stone-800">
        <div className="flex items-center gap-2 text-xs text-stone-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Fidelidad de cámara y mobiliario preservada · Iluminación y sombras calculadas por IA
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onTryAnotherFloor}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            Probar Otro Piso en este Ambiente
          </button>
          <button
            type="button"
            onClick={onResetAll}
            className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-[0.98] text-stone-200 border border-stone-700 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nueva Habitación</span>
          </button>
        </div>
      </div>
    </div>
  );
};
