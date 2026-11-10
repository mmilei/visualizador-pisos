import React from 'react';
import { X, Sliders, ArrowUpDown, ArrowLeftRight, Compass, Sparkles, Check } from 'lucide-react';
import { PlankOrientation } from '../types';

interface PlacementParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orientation: PlankOrientation;
  onChangeOrientation: (o: PlankOrientation) => void;
  customWidthCm: string;
  onChangeCustomWidth: (w: string) => void;
  finishPreference: string;
  onChangeFinishPreference: (f: string) => void;
  lightingPreference: string;
  onChangeLightingPreference: (l: string) => void;
  onApplyAndRun: () => void;
}

export const PlacementParametersModal: React.FC<PlacementParametersModalProps> = ({
  isOpen,
  onClose,
  orientation,
  onChangeOrientation,
  customWidthCm,
  onChangeCustomWidth,
  finishPreference,
  onChangeFinishPreference,
  lightingPreference,
  onChangeLightingPreference,
  onApplyAndRun,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-stone-100">Parámetros de Colocación del Piso</h3>
              <p className="text-[11px] text-stone-400">Ajusta la orientación y escala antes de generar con la IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-stone-200">
          {/* 1. Orientación de las tablas */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-2">
              Orientación de las Tablas en la Habitación
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onChangeOrientation('vertical')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  orientation === 'vertical'
                    ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/50'
                    : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${orientation === 'vertical' ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400'}`}>
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-stone-100 block text-xs">Vertical (Longitudinal)</span>
                  <span className="text-[11px] text-stone-400 leading-tight block mt-0.5">
                    Hacia el fondo o ventana. Alarga visualmente la habitación.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChangeOrientation('horizontal')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  orientation === 'horizontal'
                    ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/50'
                    : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${orientation === 'horizontal' ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400'}`}>
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-stone-100 block text-xs">Horizontal (Transversal)</span>
                  <span className="text-[11px] text-stone-400 leading-tight block mt-0.5">
                    A lo ancho (izq. a der.). Ensancha visualmente el espacio.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Ancho de tabla personalizado */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-200">
                Ancho de Tabla Estimado (cm)
              </label>
              <span className="text-[11px] text-amber-400 font-mono font-medium">
                {customWidthCm ? `${customWidthCm} cm` : 'Del producto'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {['10.2', '15', '20.3', '25', '35.6'].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onChangeCustomWidth(w)}
                  className={`flex-1 py-1.5 rounded-xl border text-center text-[11px] font-medium transition-all cursor-pointer ${
                    customWidthCm === w
                      ? 'border-amber-500 bg-amber-600 text-white shadow-sm font-bold'
                      : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {w} cm
                </button>
              ))}
            </div>
          </div>

          {/* 3. Acabado de brillo */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5">
              Acabado y Reflejo Lumínico
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'mate', label: 'Mate Natural', desc: 'Sin brillos' },
                { id: 'satinado', label: 'Satinado', desc: 'Reflejo sedoso' },
                { id: 'brillante', label: 'Alto Brillo', desc: 'Efecto laqueado' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFinishPreference(item.id)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    finishPreference === item.id
                      ? 'border-amber-500 bg-amber-950/40 text-amber-200 font-semibold'
                      : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <span className="block text-xs">{item.label}</span>
                  <span className="text-[10px] text-stone-500">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Iluminación predominante */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5">
              Foco de Iluminación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeLightingPreference('ventana')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  lightingPreference === 'ventana'
                    ? 'border-amber-500 bg-amber-950/40 text-amber-200 font-semibold'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="block text-xs">Luz Natural de Ventana</span>
                <span className="text-[10px] text-stone-500">Reflejos y sol en el piso</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeLightingPreference('ambiente')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  lightingPreference === 'ambiente'
                    ? 'border-amber-500 bg-amber-950/40 text-amber-200 font-semibold'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="block text-xs">Iluminación Difusa</span>
                <span className="text-[10px] text-stone-500">Luz pareja y sombras suaves</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onApplyAndRun();
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Aplicar y Transformar Piso</span>
          </button>
        </div>
      </div>
    </div>
  );
};
