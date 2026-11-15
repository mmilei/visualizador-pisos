import React, { useState } from 'react';
import { X, Trash2, ArrowRight, Terminal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { TransformationResult } from '../types';

interface TestingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TransformationResult[];
  apiKeyId?: string;
  onSelectResult: (result: TransformationResult) => void;
  onReusePrompt?: (promptText: string) => void;
  onClearHistory: () => void;
  onRemoveItem: (id: string) => void;
}

export const TestingHistoryModal: React.FC<TestingHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  apiKeyId,
  onSelectResult,
  onReusePrompt,
  onClearHistory,
  onRemoveItem,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
              Compartido por tu clave de API{apiKeyId && apiKeyId !== 'default' ? ` (${apiKeyId})` : ''} · revisá y reutilizá prompts anteriores
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs">
              Aún no hay pruebas guardadas para esta clave de API.
            </div>
          ) : (
            history.map((item) => {
              const isPromptExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectResult(item);
                    onClose();
                  }}
                  className="group p-3 rounded-xl border border-stone-800 hover:border-amber-600/70 bg-stone-950/60 hover:bg-stone-950 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
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

                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-stone-200 group-hover:text-amber-400 transition-colors truncate">
                          {item.floorTitle}
                        </h4>
                        <p className="text-[11px] text-stone-400 tabular-nums truncate">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · {item.modelUsed}
                          {item.imageSize ? ` (${item.imageSize})` : ''}
                          {item.pipelineMode === 'gemini_prepass' ? ' · Pre-paso Gemini' : ' · Directo'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800/80 shrink-0">
                      <span className="text-xs font-medium text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Ver</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.id);
                        }}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center text-stone-500 hover:text-red-400 transition-colors rounded-lg hover:bg-stone-900 cursor-pointer"
                        title="Eliminar de historial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.promptUsed && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 border-t border-stone-800/60 flex flex-col gap-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isPromptExpanded ? null : item.id)}
                          className="text-[11px] text-stone-400 hover:text-stone-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Terminal className="w-3 h-3 text-amber-500" />
                          <span>{isPromptExpanded ? 'Ocultar prompt usado' : 'Ver prompt usado'}</span>
                          {isPromptExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {onReusePrompt && (
                          <button
                            type="button"
                            onClick={() => {
                              onReusePrompt(item.promptUsed!);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reutilizar prompt</span>
                          </button>
                        )}
                      </div>

                      {isPromptExpanded && (
                        <pre className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 font-mono text-[10px] text-stone-300 whitespace-pre-wrap break-words leading-relaxed max-h-40 overflow-y-auto">
                          {item.promptUsed}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-3 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
            <button
              type="button"
              onClick={onClearHistory}
              className="min-h-[38px] text-xs text-red-400 hover:text-red-300 font-medium px-2.5 py-1 rounded-lg hover:bg-stone-900 transition-colors cursor-pointer"
            >
              Borrar todo el historial
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
