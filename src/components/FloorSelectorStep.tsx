import React, { useRef } from 'react';
import { CATALOG_PRODUCTS } from '../data/catalog';
import { FloorProduct, CustomFloorData } from '../types';
import { Check, Plus, Trash2, Tag, Pencil, Download, Upload } from 'lucide-react';

interface FloorSelectorStepProps {
  selectedProduct: FloorProduct | null;
  onSelectProduct: (product: FloorProduct) => void;
  customFloors: CustomFloorData[];
  onOpenAddFloorModal: () => void;
  onEditCustomFloor: (floor: CustomFloorData) => void;
  onRemoveCustomFloor: (id: string) => void;
  activeTab: 'catalog' | 'custom';
  setActiveTab: (tab: 'catalog' | 'custom') => void;
  onExportWorkspace?: () => void;
  onImportWorkspace?: (file: File) => void;
}

export const FloorSelectorStep: React.FC<FloorSelectorStepProps> = ({
  selectedProduct,
  onSelectProduct,
  customFloors,
  onOpenAddFloorModal,
  onEditCustomFloor,
  onRemoveCustomFloor,
  activeTab,
  setActiveTab,
  onExportWorkspace,
  onImportWorkspace,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-stone-100 tracking-tight">
            Paso 2: Selecciona el Piso de Referencia
          </h3>
          <p className="text-xs text-stone-400">
            Elige un piso guardado (o de catálogo) y ajustá abajo qué parámetros entran o salen del prompt
          </p>
        </div>

        {/* Tab switch + Add & Sync actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-stone-800 rounded-xl border border-stone-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-amber-700 text-white shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Mis Pisos Guardados ({customFloors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-amber-700 text-white shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Catálogo ({CATALOG_PRODUCTS.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAddFloorModal}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar Piso</span>
          </button>

          {onImportWorkspace && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportWorkspace(file);
                  if (importInputRef.current) importInputRef.current.value = '';
                }}
              />
              {onExportWorkspace && (
                <button
                  type="button"
                  onClick={onExportWorkspace}
                  className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Exportar pisos e historial de esta API key (.json)"
                >
                  <Download className="w-3.5 h-3.5 text-stone-400" />
                  <span className="hidden md:inline">Respaldar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Importar respaldo .json desde otro dispositivo"
              >
                <Upload className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden md:inline">Importar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'catalog' ? (
        /* Catalog Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {CATALOG_PRODUCTS.map((prod) => {
            const isSelected = selectedProduct?.id === prod.id;
            return (
              <div
                key={prod.id}
                onClick={() => onSelectProduct(prod)}
                className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-950/20 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/50'
                    : 'border-stone-800 bg-stone-900/60 hover:border-stone-700 hover:bg-stone-800/40'
                }`}
              >
                <div>
                  <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden mb-3 bg-stone-950 border border-stone-800 shadow-inner">
                    <img
                      src={prod.textureUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 block shadow-sm"
                        style={{ backgroundColor: prod.toneHex }}
                        title="Tono de madera"
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-900/30 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="w-8 h-8 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="text-sm font-bold text-stone-100 group-hover:text-amber-400 transition-colors">
                      {prod.name}
                    </h4>
                  </div>

                  <p className="text-[11px] text-stone-400 mb-2 line-clamp-1">{prod.species}</p>
                </div>

                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-stone-300 font-medium truncate max-w-[170px]">
                    {prod.highlightText}
                  </span>
                  <span className="text-stone-500 tabular-nums shrink-0">{prod.widthCm} cm</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Custom User Registered Floors */
        <div className="space-y-4">
          {customFloors.length === 0 ? (
            <div
              onClick={onOpenAddFloorModal}
              className="p-8 border-2 border-dashed border-stone-800 hover:border-amber-600 rounded-2xl text-center cursor-pointer transition-all bg-stone-950/40 flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-950/50 border border-amber-700/50 flex items-center justify-center text-amber-400 mb-3">
                <Tag className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-stone-200 mb-1">
                Aún no has registrado ningún piso personalizado
              </h4>
              <p className="text-xs text-stone-400 max-w-md mb-4 leading-relaxed">
                Registra un piso con sus fotos de referencia y opcionalmente su ficha técnica. Al generar podrás elegir exactamente qué entra en el prompt.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddFloorModal();
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primer Piso</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {customFloors.map((floor) => {
                const isSelected = selectedProduct?.id === floor.id;
                const primaryImage = floor.images[0]?.dataUrl || './texturas/roble-eslavonia-hd.jpg';
                const patternLabel = floor.plankFormat ? floor.plankFormat.toUpperCase() : 'Libre';

                return (
                  <div
                    key={floor.id}
                    onClick={() => {
                      const asProduct: FloorProduct = {
                        id: floor.id,
                        name: floor.name,
                        species: floor.species || 'Piso personalizado',
                        plankFormat: floor.plankFormat,
                        widthCm: parseFloat(floor.widthCm) || 0,
                        lengthDescription: floor.widthCm
                          ? `Ancho ${floor.widthCm} cm`
                          : 'Formato libre',
                        finish: floor.finish || '',
                        textureUrl: primaryImage,
                        toneHex: '#b5651d',
                        description: floor.notes || 'Piso registrado con ficha técnica opcional.',
                        highlightText: `${patternLabel} · ${floor.images.length} fotos`,
                        isCustom: true,
                        notes: floor.notes,
                      };
                      onSelectProduct(asProduct);
                    }}
                    className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-950/20 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/50'
                        : 'border-stone-800 bg-stone-900/60 hover:border-stone-700 hover:bg-stone-800/40'
                    }`}
                  >
                    <div>
                      <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden mb-3 bg-stone-950 border border-stone-800 shadow-inner">
                        <img
                          src={primaryImage}
                          alt={floor.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-900/30 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="w-8 h-8 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
                              <Check className="w-5 h-5 stroke-[2.5]" />
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-stone-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-stone-300 font-medium tabular-nums">
                          {floor.images.length} foto{floor.images.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4 className="text-sm font-bold text-stone-100 group-hover:text-amber-400 transition-colors">
                          {floor.name}
                        </h4>
                      </div>

                      <p className="text-[11px] text-stone-400 mb-1 line-clamp-1">
                        {floor.species || 'Material sin especificar'}
                      </p>

                      {floor.notes && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 italic mb-2">
                          "{floor.notes}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] gap-2">
                      <span className="text-amber-400 font-medium truncate">
                        {floor.cleanSwatchUrl
                          ? 'Muestra limpia lista'
                          : floor.plankFormat
                            ? `Patrón: ${floor.plankFormat.toUpperCase()}`
                            : 'Sin patrón fijo'}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCustomFloor(floor);
                          }}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-stone-400 hover:text-amber-400 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                          title="Editar ficha y fotos del piso"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCustomFloor(floor.id);
                          }}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-stone-500 hover:text-red-400 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                          title="Eliminar piso guardado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
