import React from 'react';
import { Camera, Key, History, Smartphone, QrCode, Download, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenKeyModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenQrModal: () => void;
  onOpenPwaModal: () => void;
  onReset: () => void;
  historyCount: number;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenKeyModal,
  onOpenHistoryModal,
  onOpenQrModal,
  onOpenPwaModal,
  onReset,
  historyCount,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-8 py-2.5 sm:py-3 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 text-stone-100">
      {/* Zone 1: Wordmark */}
      <button
        onClick={onReset}
        className="flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
        title="Reiniciar y volver al inicio"
      >
        <span className="w-8 h-8 rounded-lg bg-amber-700/80 border border-amber-600/50 flex items-center justify-center font-bold text-amber-100 text-sm shadow-sm group-hover:bg-amber-600 transition-colors shrink-0">
          VP
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm sm:text-base font-bold tracking-tight text-stone-100 whitespace-nowrap truncate">
            Visualizador de Pisos
          </span>
          <span className="hidden sm:block text-[11px] text-stone-400 font-medium tracking-wide whitespace-nowrap">
            Nano Banana · Ensayo Fotorrealista
          </span>
        </div>
      </button>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-stone-300">
        <button
          onClick={onReset}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Camera className="w-3.5 h-3.5 text-stone-400" />
          <span>Transformador</span>
        </button>

        <button
          onClick={onOpenPwaModal}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 text-amber-400 font-semibold"
          title="Cómo agregar al escritorio en iPhone como aplicación nativa"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>App en iPhone</span>
        </button>

        <button
          onClick={onOpenQrModal}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <QrCode className="w-3.5 h-3.5 text-stone-400" />
          <span>QR Celular</span>
        </button>

        <button
          onClick={onOpenHistoryModal}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <History className="w-3.5 h-3.5 text-stone-400" />
          <span className="tabular-nums">Historial {historyCount > 0 ? `(${historyCount})` : ''}</span>
        </button>

        <button
          onClick={onOpenKeyModal}
          className={`px-2.5 py-1.5 rounded-lg border transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 font-semibold ${
            hasApiKey
              ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50'
              : 'bg-amber-950/40 border-amber-700/50 text-amber-300 hover:bg-amber-900/50'
          }`}
          title="Configurar clave de Gemini Nano Banana para GitHub Pages"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasApiKey ? 'IA Conectada' : 'Conectar Clave IA'}</span>
        </button>
      </nav>

      {/* Zone 3: Compact Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <a
          href="./visualizador-pisos.zip"
          download="visualizador-pisos.zip"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-amber-300 hover:text-amber-200 font-medium transition-colors cursor-pointer shadow-sm whitespace-nowrap shrink-0"
          title="Descargar el proyecto completo en archivo .ZIP para subir a GitHub"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Descargar Código (.ZIP)</span>
          <span className="lg:hidden">.ZIP</span>
        </a>

        <button
          onClick={onOpenKeyModal}
          className={`md:hidden min-h-[40px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
            hasApiKey
              ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
              : 'bg-stone-800 border-stone-700 text-amber-300'
          }`}
          title="Configurar clave Gemini Nano Banana"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasApiKey ? 'IA' : 'Clave'}</span>
        </button>

        <button
          onClick={onOpenHistoryModal}
          className="md:hidden min-h-[40px] min-w-[40px] px-2 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
          title="Ver historial de pruebas"
          aria-label="Historial"
        >
          <History className="w-3.5 h-3.5" />
          {historyCount > 0 && <span className="text-[10px] tabular-nums">{historyCount}</span>}
        </button>

        <button
          onClick={onReset}
          className="min-h-[40px] px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-600 active:scale-95 rounded-lg border border-amber-600/50 shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          Nueva Foto
        </button>
      </div>
    </header>
  );
};
