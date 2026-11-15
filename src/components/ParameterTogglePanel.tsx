import React, { useState } from 'react';
import {
  FloorModelChoice,
  FloorParametersConfig,
  FloorQualityPreset,
  PipelineFlowMode,
  PlankOrientation,
  PlankPattern,
  PromptStrategyId,
  ReferenceSelectionMode,
  SavedPromptPreset,
} from '../types';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Bookmark,
  Check,
  Compass,
  Image as ImageIcon,
  Layers,
  RotateCcw,
  Sparkles,
  Terminal,
  Trash2,
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

  // Flow & Model / Quality
  pipelineMode: PipelineFlowMode;
  onChangePipelineMode: (mode: PipelineFlowMode) => void;
  modelChoice: FloorModelChoice;
  imageSize: FloorQualityPreset;
  onSelectModelAndQuality: (model: FloorModelChoice, size: FloorQualityPreset) => void;

  // 1..4 References (text-only outside Mis Pisos Guardados)
  availablePhotos: ReferencePhotoItem[];
  refSelectionMode: ReferenceSelectionMode;
  onChangeRefSelectionMode: (mode: ReferenceSelectionMode) => void;
  selectedPhotoIndices: number[];
  effectivePhotoIndices: number[];
  onTogglePhotoIndex: (idx: number) => void;
  hasCleanSwatch?: boolean;

  // Prompt transparency & presets
  promptStrategy: PromptStrategyId;
  onChangePromptStrategy: (strategy: PromptStrategyId) => void;
  customPrompt: string;
  onChangeCustomPrompt: (val: string) => void;
  exactPrompt: string;
  isPromptManuallyEdited: boolean;
  onEditExactPrompt: (val: string) => void;
  onResetManualPrompt: () => void;
  includeImageRoleLabels: boolean;
  onToggleImageRoleLabels: (val: boolean) => void;

  savedPresets: SavedPromptPreset[];
  onSavePreset: (name: string, promptText: string) => void;
  onApplyPreset: (preset: SavedPromptPreset) => void;
  onDeletePreset: (id: string) => void;
}

const AdentroAfueraSwitch: React.FC<{
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
    className="min-h-[44px] px-2 -mr-2 flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 rounded-lg shrink-0"
  >
    <span
      className={`text-[11px] font-semibold tabular-nums ${
        enabled ? 'text-amber-400' : 'text-stone-500'
      }`}
    >
      {enabled ? 'Adentro' : 'Afuera'}
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
  pipelineMode,
  onChangePipelineMode,
  modelChoice,
  imageSize,
  onSelectModelAndQuality,
  availablePhotos,
  refSelectionMode,
  onChangeRefSelectionMode,
  selectedPhotoIndices,
  effectivePhotoIndices,
  onTogglePhotoIndex,
  hasCleanSwatch = false,
  promptStrategy,
  onChangePromptStrategy,
  customPrompt,
  onChangeCustomPrompt,
  exactPrompt,
  isPromptManuallyEdited,
  onEditExactPrompt,
  onResetManualPrompt,
  includeImageRoleLabels,
  onToggleImageRoleLabels,
  savedPresets,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}) => {
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const activeCount = [
    params.orientation.enabled,
    params.widthCm.enabled,
    params.format.enabled,
    params.tone.enabled,
    params.finish.enabled,
    params.lighting.enabled,
    params.floorNotes?.enabled,
  ].filter(Boolean).length;

  const activeQualityKey =
    modelChoice === 'gemini-3.1-flash-lite-image'
      ? 'lite'
      : imageSize === '1K'
        ? 'nb21-1k'
        : 'nb21-2k';

  const handleSavePresetSubmit = () => {
    const cleanName = presetNameInput.trim();
    if (!cleanName || !exactPrompt.trim()) return;
    onSavePreset(cleanName, exactPrompt);
    setPresetNameInput('');
    setShowPresetForm(false);
  };

  const attachmentLabels =
    pipelineMode === 'gemini_prepass' && availablePhotos.length > 1
      ? ['Muestra limpia IA 5500K (extraída con Gemini)']
      : effectivePhotoIndices.map(
          (idx) => `Foto ${idx + 1} (${availablePhotos[idx]?.type || availablePhotos[idx]?.name || 'Referencia'})`
        );

  return (
    <div className="space-y-5">
      {/* Row 1: Flow Mode & Model/Quality Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-stone-800/80">
        {/* Pipeline Flow Switch */}
        <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 flex flex-col justify-between gap-2.5">
          <div>
            <span className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Flujo de Generación</span>
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {pipelineMode === 'direct'
                ? 'Igual que el chat: manda tu habitación + 1 a 4 fotos directo a Nano Banana.'
                : 'Paso previo con Gemini: limpia luz amarilla (5500K) y extrae una muestra pura antes.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => onChangePipelineMode('direct')}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                pipelineMode === 'direct'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Directo (estilo chat)
            </button>
            <button
              type="button"
              onClick={() => onChangePipelineMode('gemini_prepass')}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                pipelineMode === 'gemini_prepass'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Pasar por Gemini antes
            </button>
          </div>
        </div>

        {/* Model & Quality Preset Switch */}
        <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 flex flex-col justify-between gap-2.5">
          <div>
            <span className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modelo y Resolución</span>
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {activeQualityKey === 'nb21-2k'
                ? 'Nano Banana 2.1 directo en 2K nativo (máxima nitidez de veta y biseles).'
                : activeQualityKey === 'nb21-1k'
                  ? 'Nano Banana 2.1 en 1K (más rápido; luego podés escalarlo a 2K si convence).'
                  : 'Flash Lite rápido para probar ideas; después podés escalar a NB 2.1 (2K) en 1 clic.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => onSelectModelAndQuality('gemini-nano-banana-2.1', '2K')}
              className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                activeQualityKey === 'nb21-2k'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              NB 2.1 · 2K
            </button>
            <button
              type="button"
              onClick={() => onSelectModelAndQuality('gemini-nano-banana-2.1', '1K')}
              className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                activeQualityKey === 'nb21-1k'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              NB 2.1 · 1K
            </button>
            <button
              type="button"
              onClick={() => onSelectModelAndQuality('gemini-3.1-flash-lite-image', '1K')}
              className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeQualityKey === 'lite'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Flash Lite
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Text-only 1..4 Reference Photo Selector (strictly NO sample thumbnails rendered here) */}
      {(availablePhotos.length > 1 || hasCleanSwatch) && (
        <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-100 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Fotos de referencia a enviar (1 a 4)</span>
              </span>
              <span className="text-[11px] text-stone-400 block mt-0.5">
                {pipelineMode === 'gemini_prepass'
                  ? hasCleanSwatch
                    ? 'Usa la muestra limpia ya extraída para este piso (o cambiá arriba a Directo).'
                    : 'Extraerá una muestra limpia combinando hasta 4 fotos antes de generar.'
                  : refSelectionMode === 'auto'
                    ? `Automático: enviará ${Math.min(availablePhotos.length, 4)} de ${availablePhotos.length} foto${availablePhotos.length > 1 ? 's' : ''} priorizando primer plano y luz natural.`
                    : `Manual: elegiste ${selectedPhotoIndices.length} de 4 fotos máx. para combinar.`}
              </span>
            </div>

            {pipelineMode === 'direct' && availablePhotos.length > 1 && (
              <div className="flex items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => onChangeRefSelectionMode('auto')}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    refSelectionMode === 'auto'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Auto (1–4)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeRefSelectionMode('manual')}
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    refSelectionMode === 'manual'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Elegir (1–4)
                </button>
              </div>
            )}
          </div>

          {pipelineMode === 'direct' && availablePhotos.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/80">
              {availablePhotos.map((photo, idx) => {
                const isSelected = effectivePhotoIndices.includes(idx);
                const disabled = refSelectionMode === 'auto';
                return (
                  <button
                    key={photo.id || idx}
                    type="button"
                    disabled={disabled}
                    onClick={() => onTogglePhotoIndex(idx)}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors tabular-nums ${
                      isSelected
                        ? 'bg-amber-600/90 border-amber-500 text-white font-semibold'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    } ${disabled ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    <span>
                      Foto {idx + 1} · {photo.type || photo.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Row 3: Dynamic Adentro / Afuera Parameters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-100">
              Parámetros del Prompt (Adentro / Afuera)
            </h3>
            <span className="text-xs text-stone-500" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-stone-400 tabular-nums">
              {activeCount === 0
                ? 'Todo afuera (copia pura)'
                : `${activeCount} adentro del prompt`}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Decidí en el momento qué especificaciones entran o quedan afuera y mirá cómo cambia el prompt abajo en vivo.
          </p>
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onResetAllParams}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span>Sacar todos afuera</span>
          </button>
        )}
      </div>

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
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-100 block">Dirección de tablas</span>
              <span className="text-[11px] text-stone-400 truncate block">
                {params.orientation.enabled
                  ? `Adentro: ${params.orientation.value}`
                  : 'Afuera · respeta perspectiva natural'}
              </span>
            </div>
            <AdentroAfueraSwitch
              enabled={params.orientation.enabled}
              label="Incluir dirección de tablas en el prompt"
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
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-100 block">Ancho aproximado (cm)</span>
              <span className="text-[11px] text-stone-400 tabular-nums truncate block">
                {params.widthCm.enabled
                  ? `Adentro: ${params.widthCm.value || '18'} cm`
                  : `Afuera${params.widthCm.value ? ` (guardado: ${params.widthCm.value} cm)` : ''}`}
              </span>
            </div>
            <AdentroAfueraSwitch
              enabled={params.widthCm.enabled}
              label="Incluir ancho de tabla en el prompt"
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
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-100 block">Patrón de colocación</span>
              <span className="text-[11px] text-stone-400 truncate block">
                {params.format.enabled
                  ? `Adentro: ${params.format.value || 'recto'}`
                  : `Afuera${params.format.value ? ` (guardado: ${params.format.value})` : ''}`}
              </span>
            </div>
            <AdentroAfueraSwitch
              enabled={params.format.enabled}
              label="Incluir patrón de colocación en el prompt"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  format: {
                    enabled: !params.format.enabled,
                    value: params.format.value || 'recto',
                  },
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
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-100 block">Tono / Calidez</span>
              <span className="text-[11px] text-stone-400 truncate block">
                {params.tone.enabled
                  ? `Adentro: ${params.tone.value}`
                  : 'Afuera · toma el color exacto de la foto'}
              </span>
            </div>
            <AdentroAfueraSwitch
              enabled={params.tone.enabled}
              label="Incluir tono en el prompt"
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
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-100 block">Acabado y brillo</span>
              <span className="text-[11px] text-stone-400 truncate block">
                {params.finish.enabled
                  ? `Adentro: ${params.finish.value}`
                  : 'Afuera · brillo natural según referencia'}
              </span>
            </div>
            <AdentroAfueraSwitch
              enabled={params.finish.enabled}
              label="Incluir acabado superficial en el prompt"
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
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-100 block">Reflejo de iluminación</span>
              <span className="text-[11px] text-stone-400 truncate block">
                {params.lighting.enabled
                  ? params.lighting.value === 'ventana'
                    ? 'Adentro: Luz natural ventana'
                    : 'Adentro: Iluminación pareja'
                  : 'Afuera · mantiene la luz original'}
              </span>
            </div>
            <AdentroAfueraSwitch
              enabled={params.lighting.enabled}
              label="Incluir reflejo de iluminación en el prompt"
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

        {/* 7. Notas y especie de ficha */}
        <div
          className={`md:col-span-2 p-3.5 rounded-2xl border transition-colors ${
            params.floorNotes?.enabled
              ? 'bg-stone-900 border-amber-700/60'
              : 'bg-stone-900/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-stone-100 block">
                Notas / Especie de la ficha técnica
              </span>
              <span className="text-[11px] text-stone-400 truncate block">
                {params.floorNotes?.enabled
                  ? params.floorNotes.value.trim()
                    ? `Adentro: ${params.floorNotes.value.trim()}`
                    : 'Adentro · escribí el detalle abajo'
                  : params.floorNotes?.value?.trim()
                    ? `Afuera · guardado: "${params.floorNotes.value.trim()}"`
                    : 'Afuera · sin detalles de ficha incluidos'}
              </span>
            </div>
            <AdentroAfueraSwitch
              enabled={Boolean(params.floorNotes?.enabled)}
              label="Incluir notas de ficha técnica en el prompt"
              onToggle={() =>
                onChangeParams({
                  ...params,
                  floorNotes: {
                    enabled: !params.floorNotes?.enabled,
                    value: params.floorNotes?.value || '',
                  },
                })
              }
            />
          </div>

          {params.floorNotes?.enabled && (
            <div className="mt-3 pt-3 border-t border-stone-800">
              <input
                type="text"
                value={params.floorNotes.value}
                onChange={(e) =>
                  onChangeParams({
                    ...params,
                    floorNotes: { enabled: true, value: e.target.value },
                  })
                }
                placeholder="Ej: Roble europeo selección rústica con nudos naturales y microbisel..."
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Always-Visible Transparent Editable Prompt Console */}
      <div className="p-4 rounded-2xl bg-stone-900 border border-amber-700/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Prompt Exacto que se Enviará a Nano Banana</span>
            </h4>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {isPromptManuallyEdited
                ? 'Editado manualmente · este texto literal se envía sin cambios ocultos.'
                : 'Sincronizado en vivo con tus switches Adentro/Afuera · podés editarlo directo antes de generar.'}
            </p>
          </div>

          {/* Strategy Presets */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800 self-start sm:self-auto">
            {(
              [
                { id: 'chat_direct', label: 'Chat directo' },
                { id: 'strict_demolish', label: 'Demolición estricta' },
                { id: 'blank', label: 'En blanco / libre' },
              ] as { id: PromptStrategyId; label: string }[]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onChangePromptStrategy(st.id)}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  promptStrategy === st.id
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional quick extra instruction (stays even when switching Adentro/Afuera) */}
        {promptStrategy !== 'blank' && (
          <div>
            <label className="block text-[11px] font-medium text-stone-400 mb-1">
              Nota rápida opcional (se suma al automático cuando alternás Adentro/Afuera):
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => onChangeCustomPrompt(e.target.value)}
              placeholder="Ej: Mantené exactamente el zócalo blanco existente y dejá las juntas bien finitas..."
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-xs text-stone-100 placeholder:text-stone-500"
            />
          </div>
        )}

        {/* Full Editable Prompt Textarea */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-[11px] font-semibold text-stone-300">
              Cuerpo literal del prompt ({exactPrompt.length} caracteres):
            </label>
            <div className="flex items-center gap-2">
              {isPromptManuallyEdited && (
                <button
                  type="button"
                  onClick={onResetManualPrompt}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resincronizar automático</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPresetForm((v) => !v)}
                className="text-[11px] text-stone-300 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Bookmark className="w-3 h-3 text-amber-400" />
                <span>Guardar plantilla</span>
              </button>
            </div>
          </div>

          <textarea
            rows={6}
            value={exactPrompt}
            onChange={(e) => onEditExactPrompt(e.target.value)}
            placeholder="Escribí exactamente el prompt que querés probar en Nano Banana..."
            className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-amber-500 focus:outline-none text-xs font-mono text-stone-200 placeholder:text-stone-500 leading-relaxed resize-y"
          />
        </div>

        {/* Save Prompt Preset Inline Form */}
        {showPresetForm && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-stone-950 border border-stone-800">
            <input
              type="text"
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSavePresetSubmit();
                }
              }}
              placeholder="Nombre de la plantilla (ej: Luz rasante natural)"
              className="flex-1 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!presetNameInput.trim() || !exactPrompt.trim()}
                onClick={handleSavePresetSubmit}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowPresetForm(false)}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Saved Presets List */}
        {savedPresets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-stone-400 mr-1">Mis plantillas:</span>
            {savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="inline-flex items-center rounded-lg bg-stone-950 border border-stone-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className="px-2.5 py-1 text-[11px] text-stone-200 hover:text-amber-300 hover:bg-stone-900 transition-colors cursor-pointer"
                  title="Cargar esta plantilla en el editor de prompt"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePreset(preset.id)}
                  className="px-1.5 py-1 text-stone-500 hover:text-red-400 border-l border-stone-800 cursor-pointer"
                  title="Borrar plantilla"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image Role Labels Switch + Exact Payload Readout */}
        <div className="pt-2.5 border-t border-stone-800/80 flex flex-col gap-2 text-[11px] text-stone-400">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-stone-300">
              <input
                type="checkbox"
                checked={includeImageRoleLabels}
                onChange={(e) => onToggleImageRoleLabels(e.target.checked)}
                className="rounded border-stone-700 bg-stone-950 text-amber-600 focus:ring-amber-500"
              />
              <span>Incluir rótulos antes de cada imagen (IMAGEN 1, IMAGEN 2...)</span>
            </label>

            <span className="text-stone-400 tabular-nums font-medium">
              {modelChoice === 'gemini-nano-banana-2.1'
                ? `Nano Banana 2.1 · ${imageSize}`
                : 'Flash Lite'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/70 space-y-1 font-mono text-[10px] text-stone-400">
            <div>IMAGEN 1 · Habitación original a editar</div>
            {attachmentLabels.map((lbl, idx) => (
              <div key={idx}>
                IMAGEN {idx + 2} · {lbl}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
