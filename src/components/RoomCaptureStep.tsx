import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { optimizeImageFile } from '../utils/imageUtils';

interface RoomCaptureStepProps {
  roomImage: string | null;
  aspectRatio: string;
  onRoomImageSelected: (dataUrl: string, aspectRatio: string) => void;
  onResetRoom: () => void;
}

export const RoomCaptureStep: React.FC<RoomCaptureStepProps> = ({
  roomImage,
  aspectRatio,
  onRoomImageSelected,
  onResetRoom,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG, HEIC, WebP).');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const { dataUrl, aspectRatio: detectedRatio } = await optimizeImageFile(file, 1600);
      onRoomImageSelected(dataUrl, detectedRatio);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('No se pudo procesar la imagen seleccionada. Prueba con otra foto.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileProcess(files[0]);
    }
  };

  return (
    <div className="w-full">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
        }}
      />

      {!roomImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all ${
            isDragging
              ? 'border-amber-500 bg-amber-950/20'
              : 'border-stone-700 hover:border-stone-600 bg-stone-800/40'
          }`}
        >
          {isProcessing ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-sm font-medium text-stone-200">Optimizando fotografía del ambiente...</p>
              <p className="text-xs text-stone-400">Ajustando resolución y balance lumínico</p>
            </div>
          ) : (
            <div className="flex flex-col items-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-900/40 border border-amber-700/50 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
                <Camera className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-bold text-stone-100 tracking-tight mb-1">
                Paso 1: Foto de tu Habitación
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 mb-6 leading-relaxed">
                Toma una foto con tu cámara o sube una imagen de tu living, dormitorio o local. No necesitas marcar esquinas ni medidas.
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-200 text-left w-full">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tomar Foto con Cámara</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 active:scale-[0.98] text-stone-100 font-medium text-sm flex items-center justify-center gap-2 border border-stone-600 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir desde Galería</span>
                </button>
              </div>

              <div className="mt-4 text-[11px] text-stone-500">
                O arrastra y suelta tu archivo de foto aquí
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-stone-700 bg-stone-800/80 shadow-md">
          <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[380px] w-full bg-stone-950 flex items-center justify-center overflow-hidden">
            <img
              src={roomImage}
              alt="Ambiente seleccionado"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md border border-stone-700 px-2.5 py-1 rounded-md text-[11px] text-stone-200 flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ambiente Listo · Proporción {aspectRatio}</span>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onResetRoom}
                className="px-3 py-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 backdrop-blur-md border border-stone-700 text-xs font-medium text-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cambiar Foto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
