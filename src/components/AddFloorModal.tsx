import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Upload, FileText, Check, Copy, Download, Tag } from 'lucide-react';
import { CustomFloorData, PlankPattern } from '../types';
import { optimizeImageFile } from '../utils/imageUtils';

interface AddFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFloor: (floor: CustomFloorData) => void;
}

export const AddFloorModal: React.FC<AddFloorModalProps> = ({
  isOpen,
  onClose,
  onSaveFloor,
}) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [plankFormat, setPlankFormat] = useState<PlankPattern>('recto');
  const [widthCm, setWidthCm] = useState('');
  const [finish, setFinish] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<{ id: string; name: string; dataUrl: string; type: string }[]>([]);
  const [copiedMd, setCopiedMd] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { dataUrl } = await optimizeImageFile(file, 1600);
        setImages((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            dataUrl,
            type: prev.length === 0 ? 'Primer plano (veta)' : 'Piso instalado',
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateMarkdown = () => {
    const lines = [
      `# ${name || 'Nombre del Piso'}`,
      '',
      `## Ficha Técnica del Piso`,
      `- **Especie / Material:** ${species || 'No especificado'}`,
      `- **Patrón de Colocación:** ${plankFormat.toUpperCase()}`,
      `- **Ancho de Tabla:** ${widthCm ? `${widthCm} cm` : 'No especificado'}`,
      `- **Acabado:** ${finish || 'No especificado'}`,
      `- **Fecha de Registro:** ${new Date().toISOString().split('T')[0]}`,
      '',
    ];

    if (notes.trim()) {
      lines.push(`## Observaciones y Variantes`, notes.trim(), '');
    }

    if (images.length > 0) {
      lines.push(`## Fotos de Referencia Asociadas`);
      images.forEach((img, idx) => {
        lines.push(`- Referencia ${idx + 1}: \`${img.name}.jpg\` (${img.type})`);
      });
      lines.push('');
    }

    return lines.join('\n');
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(name || 'piso').toLowerCase().replace(/\s+/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newFloor: CustomFloorData = {
      id: `custom-floor-${Date.now()}`,
      name: name.trim(),
      species: species.trim(),
      plankFormat,
      widthCm: widthCm.trim(),
      finish: finish.trim(),
      notes: notes.trim(),
      images,
      createdAt: Date.now(),
    };

    onSaveFloor(newFloor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-stone-100">Registrar Ficha de Piso</h3>
              <p className="text-[11px] text-stone-400">Guarda los datos técnicos del piso y prepara la ficha .md para Drive</p>
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs text-stone-200">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Nombre Obligatorio */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1">
              Nombre o Modelo del Piso <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Roble Miel Escandinavo, Pinotea Antigua, Lapacho Chocolate..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:outline-none text-stone-100 placeholder:text-stone-500 text-xs"
            />
          </div>

          {/* Grid de Especie y Ancho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1">
                Especie / Tipo de Madera (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Roble Europeo, Lapacho, Eucalipto, SPC..."
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:outline-none text-stone-100 placeholder:text-stone-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1">
                Ancho de Tabla en cm (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: 20 cm, 10.2 cm, 35.6 cm..."
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:outline-none text-stone-100 placeholder:text-stone-500 text-xs"
              />
            </div>
          </div>

          {/* Patrón y Acabado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1">
                Patrón de Colocación
              </label>
              <select
                value={plankFormat}
                onChange={(e) => setPlankFormat(e.target.value as PlankPattern)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:outline-none text-stone-100 text-xs cursor-pointer"
              >
                <option value="recto">Tablas Rectas (Paralelo)</option>
                <option value="chevron">Chevron (Espiga a 45° Francesa)</option>
                <option value="espiga">Herringbone (Espiga a 90° Clásica)</option>
                <option value="deck">Deck con Ranura / Buña</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1">
                Acabado Superficial (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Mate natural, Aceite UV, Hidrolaqueado..."
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:outline-none text-stone-100 placeholder:text-stone-500 text-xs"
              />
            </div>
          </div>

          {/* Observaciones técnicas */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1">
              Notas, Variantes o Código de Proveedor (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Selección rústica con nudos. Apto losa radiante. Tonos canela claro."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:outline-none text-stone-100 placeholder:text-stone-500 text-xs resize-none"
            />
          </div>

          {/* Fotos de referencia del piso */}
          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-stone-200 block">Fotos de Referencia del Piso ({images.length})</span>
                <span className="text-[11px] text-stone-400">Agrega fotos de close-up o piso colocado para este producto</span>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subir Foto</span>
              </button>
            </div>

            {images.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border border-dashed border-stone-800 hover:border-amber-600 rounded-xl text-center cursor-pointer text-stone-400 text-[11px] transition-colors"
              >
                <Upload className="w-6 h-6 text-amber-500 mx-auto mb-1.5 opacity-80" />
                <p className="font-medium text-stone-200">Haz clic para adjuntar 1 o más fotos de este piso</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Puedes subir un close-up de la madera, una foto del piso colocado, etc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative rounded-xl overflow-hidden border border-stone-800 bg-stone-900 flex flex-col">
                    <div className="relative aspect-[16/10] w-full bg-stone-950">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-stone-950/80 hover:bg-red-950 text-stone-300 hover:text-red-400 transition-colors"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-2 bg-stone-950 border-t border-stone-800 flex flex-col gap-1">
                      <span className="text-[10px] text-stone-400 truncate font-mono">
                        Ref #{idx + 1}: {img.name}
                      </span>
                      <select
                        value={img.type}
                        onChange={(e) => {
                          const val = e.target.value;
                          setImages((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, type: val } : item))
                          );
                        }}
                        className="w-full px-1.5 py-1 text-[10px] rounded bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none"
                      >
                        <option value="Primer plano (veta y poro)">Primer plano (veta y poro)</option>
                        <option value="Piso colocado / instalado">Piso colocado / instalado</option>
                        <option value="Muestra con luz natural">Muestra con luz natural</option>
                        <option value="Showroom / Catálogo">Showroom / Catálogo</option>
                      </select>
                    </div>
                  </div>
                ))}

                {/* Botón para sumar más fotos */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-dashed border-stone-800 hover:border-amber-600/80 bg-stone-950/50 hover:bg-stone-900/60 p-4 flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:text-stone-200 transition-all cursor-pointer min-h-[140px]"
                >
                  <Plus className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-[11px] text-stone-300">+ Agregar otra foto</span>
                  <span className="text-[10px] text-stone-500">Close-up, instalado, etc.</span>
                </button>
              </div>
            )}
          </div>

          {/* Vista previa de ficha .md para Drive */}
          <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Vista Previa del Archivo .md (para tu Drive):</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedMd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedMd ? 'Copiado' : 'Copiar .md'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Descargar .md</span>
                </button>
              </div>
            </div>
            <pre className="font-mono text-[10px] text-stone-400 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto p-2 bg-stone-900 rounded-lg">
              {generateMarkdown()}
            </pre>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Guardar Piso y Seleccionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
