import React from 'react';
import { Camera, Code, History, Smartphone, QrCode, Download, Github } from 'lucide-react';

interface HeaderProps {
  onOpenWorkerModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenQrModal: () => void;
  onOpenPwaModal: () => void;
  onReset: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWorkerModal,
  onOpenHistoryModal,
  onOpenQrModal,
  onOpenPwaModal,
  onReset,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 text-stone-100">
      {/* Zone 1: Wordmark */}
      <button
        onClick={onReset}
        className="flex items-center gap-2.5 text-left group cursor-pointer"
        title="Reiniciar y volver al inicio"
      >
        <span className="w-8 h-8 rounded-lg bg-amber-700/80 border border-amber-600/50 flex items-center justify-center font-bold text-amber-100 text-sm shadow-sm group-hover:bg-amber-600 transition-colors">
          VP
        </span>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-stone-100 whitespace-nowrap shrink-0">
            Visualizador de Pisos
          </span>
          <span className="text-[11px] text-stone-400 font-medium tracking-wide">
            Modo Foto IA Multimodal
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
          <span>Historial {historyCount > 0 ? `(${historyCount})` : ''}</span>
        </button>

        <button
          onClick={onOpenWorkerModal}
          className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Code className="w-3.5 h-3.5 text-stone-400" />
          <span>Cloudflare Proxy</span>
        </button>
      </nav>

      {/* Zone 3: Download ZIP & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="/visualizador-pisos.zip"
          download="visualizador-pisos.zip"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-amber-300 hover:text-amber-200 font-medium transition-colors cursor-pointer shadow-sm"
          title="Descargar el proyecto completo en archivo .ZIP para subir a GitHub"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Descargar Código (.ZIP)</span>
          <span className="sm:hidden">.ZIP</span>
        </a>

        <button
          onClick={onOpenQrModal}
          className="md:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-800/80 hover:bg-amber-700 text-amber-200 rounded-lg border border-amber-600/50 transition-colors cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR</span>
        </button>

        <button
          onClick={onReset}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-600 active:scale-95 rounded-lg border border-amber-600/50 shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          Nueva Foto
        </button>
      </div>
    </header>
  );
};
