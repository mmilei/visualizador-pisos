import React from 'react';
import { X, Share, PlusSquare, Smartphone, Check, ArrowRight } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-stone-100">Instalar como App en iPhone</h3>
              <p className="text-[11px] text-stone-400">Sin descargar de la App Store, pantalla completa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-5 space-y-4 text-xs text-stone-300">
          <p className="text-stone-300 leading-relaxed">
            Puedes guardar esta web como una app nativa en la pantalla de inicio de tu iPhone o celular:
          </p>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950 border border-stone-800/80">
              <span className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-700/60 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div className="flex-1">
                <p className="font-semibold text-stone-100 flex items-center gap-1.5">
                  <span>Toca el botón Compartir</span>
                  <Share className="w-3.5 h-3.5 text-amber-400" />
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  En Safari (abajo en la barra del navegador), toca el ícono del cuadradito con la flecha hacia arriba.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950 border border-stone-800/80">
              <span className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-700/60 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="flex-1">
                <p className="font-semibold text-stone-100 flex items-center gap-1.5">
                  <span>Selecciona "Agregar a pantalla de inicio"</span>
                  <PlusSquare className="w-3.5 h-3.5 text-amber-400" />
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Desliza hacia abajo en el menú de opciones hasta encontrar "Agregar a Inicio" o "Add to Home Screen".
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950 border border-stone-800/80">
              <span className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-700/60 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div className="flex-1">
                <p className="font-semibold text-stone-100">
                  Toca "Agregar" arriba a la derecha
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  ¡Listo! Te quedará el ícono en tu pantalla de inicio y se abrirá a pantalla completa sin barras de navegación.
                </p>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-950/50 border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>En Android (Chrome): menú de 3 puntos $\rightarrow$ "Instalar aplicación".</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
