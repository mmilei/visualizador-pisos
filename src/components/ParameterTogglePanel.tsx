import React, { useState } from 'react';
import {
  FloorModelChoice,
  FloorParametersConfig,
  PlankOrientation,
  PlankPattern,
} from '../types';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Compass,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface ReferencePhotoItem {
  id: string;
  name: string;
  dataUrl: string;
  type: string;
}

interface ParameterTogglePanelProps {
  params: FloorParametersConfig;
  onChangeParams: (next: FloorParametersConfig) => void;
  onResetAllParams: () => void;
  modelChoice: FloorModelChoice;
  onChangeModelChoice: (model: FloorModelChoice) => void;
  availablePhotos: ReferencePhotoItem[];
  selectedPhotoIndices: number[];
  onTogglePhotoIndex: (idx: number) => void;
  hasCleanSwatch?: boolean;
  useOptimizedSwatch?: boolean;
  onToggleOptimizedSwatch?: (val: boolean) => void;
  promptPreview: string;
  customPrompt: string;
  onChangeCustomPrompt: (val: string) => void;
}

const SwitchButton: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  label: string;
}> = ({ enabled, onToggle, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onToggle}
    className="min-h-[44px] px-2 -mr-2 flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 rounded-lg"
  >
    <span className={`text-[11px] font-semibold ${enabled ? 'text-amber-400' : 'text-stone-500'}`}>
      {enabled ? 'Prendido' : 'Apagado'}
    </span>
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ${
        enabled ? 'bg-amber-600 border-amber-500' : 'bg-stone-800 border-stone-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </span>
  </button>
);

export const ParameterTogglePanel: React.FC<ParameterTogglePanelProps> = ({
  params,
  onChangeParams,
  onResetAllParams,
  modelChoice,
  onChangeModelChoice,
  availablePhotos,
  selectedPhotoIndices,
  onTogglePhotoIndex,
  hasCleanSwatch = false,
  useOptimizedSwatch = true,
  onToggleOptimizedSwatch,
  promptPreview,
  customPrompt,
  onChangeCustomPrompt,
}) => {
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const activeCount = [
    params.orientation.enabled,
    params.widthCm.enabled,
    params.format.enabled,
    params.tone.enabled,
    params.finish.enabled,
    params.lighting.enabled,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header row + Model selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-100">
              Parámetros Opcionales
            </h3>
            <span className="text-xs text-stone-500" aria-hidden="true">·</span>
            <span className="text-xs text-stone-400 tabular-nums">
              {activeCount === 0
                ? 'Todo apagado (copia limpia)'
                : `${activeCount} parámetro${activeCount > 1 ? 's' : ''} activo${activeCount > 1 ? 's' : ''}`}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Por defecto no se fuerza nada. Prendé solo lo que quieras indicarle a la IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetAllParams}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
              <span>Apagar todos</span>
            </button>
          )}

          {/* Model switch */}
          <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => onChangeModelChoice('gemini-nano-banana-2.1')}
              className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                modelChoice === 'gemini-nano-banana-2.1'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Mayor fidelidad arquitectónica y textura"
            >
              Nano Banana 2.1
            </button>
            <button
              type="button"
              onClick={() => onChangeModelChoice('gemini-3.1-flash-lite-image')}
              className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                modelChoice === 'gemini-3.1-flash-lite-image'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Versión rápida y económica"
            >
              Flash Lite
            </button>
          </div>
        </div>
      </div>

      {/* Text-only Reference Photo / Swatch Mode Selector (no sample thumbnails shown outside Mis Pisos Guardados) */}
      {(availablePhotos.length > 1 || hasCleanSwatch) && (
        <div className="p-3 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-200 block">
                Referencia de madera para la IA
              </span>
              <span className="text-[11px] text-stone-400">
                {useOptimizedSwatch
                  ? hasCleanSwatch
                    ? 'Usa una muestra limpia extraída de tus fotos (evita copiar muebles o techos)'
                    : 'En la primera pasada sintetiza una muestra pura de tablas y la guarda para las siguientes'
                  : `Manual: enviando ${selectedPhotoIndices.length} foto${selectedPhotoIndices.length > 1 ? 's' : ''} (máx. 2)`}
              </span>
            </div>

            {onToggleOptimizedSwatch && (
              <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onToggleOptimizedSwatch(true)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    useOptimizedSwatch
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Muestra limpia IA
                </button>
                <button
                  type="button"
                  onClick={() => onToggleOptimizedSwatch(false)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    !useOptimizedSwatch
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Elegir fotos (máx. 2)
                </button>
              </div>
            )}
          </div>

          {!useOptimizedSwatch && availablePhotos.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/80">
              {availablePhotos.map((photo, idx) => {
                const isSelected = selectedPhotoIndices.includes(idx);
                return (
                  <button
                    key={photo.id || idx}
                    type="button"
                    onClick={() => onTogglePhotoIndex(idx)}
                    className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer tabular-nums ${
                      isSelected
                        ? 'bg-amber-600 border-amber-500 text-white font-semibold'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    <span>Foto {idx + 1}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toggleable Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. Dirección de las tablas */}
        <div
          className={`p-3.5 rounded-2xl border transition-colors ${
            params.orientation.enabled
              ? 'bg-stone-900 border-amber-700/60'
              : 'bg-stone-900/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-100 block">Dirección de las tablas</span>
              <span className="text-[11px] text-stone-400">
                {params.orientation.enabled
                  ? `Fijado en ${params.orientation.value}`
                  : 'Apagado · respeta la perspectiva natural'}
              </span>
            </div>
            <SwitchButton
              enabled={params.orientation.enabled}
              label="Activar dirección de tablas"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  orientation: { ...params.orientation, enabled: !params.orientation.enabled },
                })
              }
            />
          </div>

          {params.orientation.enabled && (
            <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-stone-800">
              {(
                [
                  { id: 'vertical', label: 'Vertical', Icon: ArrowUpDown },
                  { id: 'horizontal', label: 'Horizontal', Icon: ArrowLeftRight },
                  { id: 'diagonal', label: 'Diagonal 45°', Icon: Compass },
                ] as { id: PlankOrientation; label: string; Icon: any }[]
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onChangeParams({
                      ...params,
                      orientation: { enabled: true, value: id },
                    })
                  }
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    params.orientation.value === id
                      ? 'bg-amber-600 border-amber-500 text-white font-semibold'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Ancho / Medida de tabla */}
        <div
          className={`p-3.5 rounded-2xl border transition-colors ${
            params.widthCm.enabled
              ? 'bg-stone-900 border-amber-700/60'
              : 'bg-stone-900/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-100 block">Ancho aproximado (cm)</span>
              <span className="text-[11px] text-stone-400 tabular-nums">
                {params.widthCm.enabled
                  ? `Aprox. ${params.widthCm.value || '18'} cm`
                  : 'Apagado · proporción libre según muestra'}
              </span>
            </div>
            <SwitchButton
              enabled={params.widthCm.enabled}
              label="Activar ancho de tabla"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  widthCm: { ...params.widthCm, enabled: !params.widthCm.enabled },
                })
              }
            />
          </div>

          {params.widthCm.enabled && (
            <div className="mt-3 pt-3 border-t border-stone-800 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {['10.2', '15', '18', '20.3', '25', '35.6'].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() =>
                      onChangeParams({
                        ...params,
                        widthCm: { enabled: true, value: w },
                      })
                    }
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg border text-xs tabular-nums transition-colors cursor-pointer ${
                      params.widthCm.value === w
                        ? 'bg-amber-600 border-amber-500 text-white font-semibold'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    {w} cm
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-400">Otra medida:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={params.widthCm.value}
                  onChange={(e) =>
                    onChangeParams({
                      ...params,
                      widthCm: { enabled: true, value: e.target.value },
                    })
                  }
                  placeholder="Ej: 18"
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100 tabular-nums focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-stone-500">cm</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Patrón de colocación */}
        <div
          className={`p-3.5 rounded-2xl border transition-colors ${
            params.format.enabled
              ? 'bg-stone-900 border-amber-700/60'
              : 'bg-stone-900/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-100 block">Patrón de colocación</span>
              <span className="text-[11px] text-stone-400">
                {params.format.enabled
                  ? `Fijado en ${params.format.value}`
                  : 'Apagado · sigue el diseño de la muestra'}
              </span>
            </div>
            <SwitchButton
              enabled={params.format.enabled}
              label="Activar patrón de colocación"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  format: { ...params.format, enabled: !params.format.enabled },
                })
              }
            />
          </div>

          {params.format.enabled && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-stone-800">
              {(
                [
                  { id: 'recto', label: 'Recto' },
                  { id: 'chevron', label: 'Chevron 45°' },
                  { id: 'espiga', label: 'Espiga 90°' },
                  { id: 'deck', label: 'Deck' },
                ] as { id: PlankPattern; label: string }[]
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onChangeParams({
                      ...params,
                      format: { enabled: true, value: id },
                    })
                  }
                  className={`min-h-[38px] px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    params.format.value === id
                      ? 'bg-amber-600 border-amber-500 text-white font-semibold'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Tono / Calidez */}
        <div
          className={`p-3.5 rounded-2xl border transition-colors ${
            params.tone.enabled
              ? 'bg-stone-900 border-amber-700/60'
              : 'bg-stone-900/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-100 block">Tono / Calidez</span>
              <span className="text-[11px] text-stone-400">
                {params.tone.enabled
                  ? `Tono: ${params.tone.value}`
                  : 'Apagado · toma el color exacto de la foto'}
              </span>
            </div>
            <SwitchButton
              enabled={params.tone.enabled}
              label="Activar tono"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  tone: { ...params.tone, enabled: !params.tone.enabled },
                })
              }
            />
          </div>

          {params.tone.enabled && (
            <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-stone-800">
              {[
                { id: 'claro', label: 'Claro' },
                { id: 'natural', label: 'Natural' },
                { id: 'miel', label: 'Miel cálido' },
                { id: 'medio', label: 'Tostado' },
                { id: 'oscuro', label: 'Oscuro' },
                { id: 'nordico', label: 'Nórdico gris' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onChangeParams({
                      ...params,
                      tone: { enabled: true, value: id },
                    })
                  }
                  className={`min-h-[38px] px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    params.tone.value === id
                      ? 'bg-amber-600 border-amber-500 text-white font-semibold'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Acabado superficial */}
        <div
          className={`p-3.5 rounded-2xl border transition-colors ${
            params.finish.enabled
              ? 'bg-stone-900 border-amber-700/60'
              : 'bg-stone-900/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-100 block">Acabado y brillo</span>
              <span className="text-[11px] text-stone-400">
                {params.finish.enabled
                  ? `Acabado: ${params.finish.value}`
                  : 'Apagado · brillo natural según referencia'}
              </span>
            </div>
            <SwitchButton
              enabled={params.finish.enabled}
              label="Activar acabado"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  finish: { ...params.finish, enabled: !params.finish.enabled },
                })
              }
            />
          </div>

          {params.finish.enabled && (
            <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-stone-800">
              {[
                { id: 'mate', label: 'Mate natural' },
                { id: 'satinado', label: 'Satinado' },
                { id: 'brillante', label: 'Brillante' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onChangeParams({
                      ...params,
                      finish: { enabled: true, value: id },
                    })
                  }
                  className={`min-h-[38px] px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    params.finish.value === id
                      ? 'bg-amber-600 border-amber-500 text-white font-semibold'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 6. Iluminación */}
        <div
          className={`p-3.5 rounded-2xl border transition-colors ${
            params.lighting.enabled
              ? 'bg-stone-900 border-amber-700/60'
              : 'bg-stone-900/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-100 block">Reflejo de iluminación</span>
              <span className="text-[11px] text-stone-400">
                {params.lighting.enabled
                  ? params.lighting.value === 'ventana'
                    ? 'Foco: Luz de ventana'
                    : 'Foco: Iluminación pareja'
                  : 'Apagado · mantiene la luz del cuarto'}
              </span>
            </div>
            <SwitchButton
              enabled={params.lighting.enabled}
              label="Activar reflejo de iluminación"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  lighting: { ...params.lighting, enabled: !params.lighting.enabled },
                })
              }
            />
          </div>

          {params.lighting.enabled && (
            <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-stone-800">
              {[
                { id: 'ventana' as const, label: 'Luz natural ventana' },
                { id: 'ambiente' as const, label: 'Iluminación pareja' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    onChangeParams({
                      ...params,
                      lighting: { enabled: true, value: id },
                    })
                  }
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    params.lighting.value === id
                      ? 'bg-amber-600 border-amber-500 text-white font-semibold'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Optional free prompt + live prompt inspector */}
      <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Indicación adicional libre (opcional)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowPromptPreview((v) => !v)}
            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            {showPromptPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPromptPreview ? 'Ocultar prompt exacto' : 'Ver prompt exacto'}</span>
          </button>
        </div>

        <textarea
          rows={2}
          value={customPrompt}
          onChange={(e) => onChangeCustomPrompt(e.target.value)}
          placeholder="Ej: Dejar las tablas un poco más oscuras o respetar el sentido hacia el ventanal..."
          className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-xs text-stone-100 placeholder:text-stone-500 resize-none leading-relaxed"
        />

        {showPromptPreview && (
          <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/90 text-[11px] text-stone-300 font-mono leading-relaxed">
            {promptPreview}
          </div>
        )}
      </div>
    </div>
  );
};
