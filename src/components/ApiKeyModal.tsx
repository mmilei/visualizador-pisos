import React, { useState, useEffect } from 'react';
import { X, Key, Check, ShieldCheck, Sparkles, ExternalLink, Trash2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [inputVal, setInputVal] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInputVal(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputVal.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleRemove = () => {
    setInputVal('');
    onSaveApiKey('');
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-100">Clave de Google Gemini (Nano Banana)</h3>
              <p className="text-[11px] text-stone-400">Para generación fotográfica con IA real en GitHub Pages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-stone-300">
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Conexión directa a Google Gemini Nano Banana</span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              Pega aquí tu clave de API de Google AI Studio. Se guarda <strong>únicamente en tu navegador</strong> y nunca se publica en GitHub ni en servidores de terceros.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-200">
              Tu Gemini API Key:
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder:text-stone-600 text-xs focus:outline-none focus:border-amber-500 font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!inputVal.trim()}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-40 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                {saved ? <Check className="w-4 h-4 text-emerald-200" /> : <Key className="w-4 h-4" />}
                <span>{saved ? '¡Guardada!' : 'Guardar'}</span>
              </button>
            </div>
          </div>

          {apiKey && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800">
              <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4" /> Clave activa y guardada en este dispositivo
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Quitar
              </button>
            </div>
          )}

          <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-[11px] text-stone-400 space-y-1.5">
            <span className="font-semibold text-stone-300 block">Compartir con tu hermano sin configurar:</span>
            <p className="leading-relaxed">
              Puedes enviarle a tu hermano el enlace con la clave en la URL:
            </p>
            <code className="block p-2 rounded-lg bg-stone-900 border border-stone-800 text-amber-300 text-[10px] break-all select-all font-mono">
              https://mmilei.github.io/visualizador-pisos/?key={apiKey || 'TU_CLAVE'}
            </code>
            <p className="text-[10px] text-stone-500">
              Al abrirlo, la app guarda la clave automáticamente en su celular y limpia la barra de direcciones para mayor privacidad.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/60 flex justify-between items-center">
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            Obtener clave en Google AI Studio <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
