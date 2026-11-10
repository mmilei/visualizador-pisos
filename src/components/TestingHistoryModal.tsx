import React from 'react';
import { X, Trash2, Calendar, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { TransformationResult } from '../types';

interface TestingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TransformationResult[];
  onSelectResult: (result: TransformationResult) => void;
  onClearHistory: () => void;
  onRemoveItem: (id: string) => void;
}

export const TestingHistoryModal: React.FC<TestingHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectResult,
  onClearHistory,
  onRemoveItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/50">
          <div>
            <h3 className="text-base font-bold text-stone-100">
              Historial de Pruebas ({history.length})
            </h3>
            <p className="text-xs text-stone-400">
              Compara visualmente los resultados generados durante esta sesión
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs">
              Aún no has generado transformaciones de piso en esta sesión.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
                className="group p-3 rounded-xl border border-stone-800 hover:border-amber-600/70 bg-stone-950/60 hover:bg-stone-950 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {/* Thumbnails */}
                  <div className="flex items-center -space-x-4 shrink-0">
                    <img
                      src={item.roomImageUrl}
                      alt="Original"
                      className="w-12 h-12 rounded-lg object-cover border border-stone-700 shadow-sm"
                    />
                    <img
                      src={item.resultImageUrl}
                      alt="Resultado"
                      className="w-12 h-12 rounded-lg object-cover border-2 border-amber-500 shadow-md"
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-stone-200 group-hover:text-amber-400 transition-colors">
                      {item.floorTitle}
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.modelUsed}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800/80">
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Ver comparativa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="p-1.5 text-stone-500 hover:text-red-400 transition-colors ml-2"
                    title="Eliminar de historial"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-3 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded transition-colors"
            >
              Borrar todo el historial
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
