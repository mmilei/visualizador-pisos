import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, QrCode, ExternalLink } from 'lucide-react';

interface MobileQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQrModal: React.FC<MobileQrModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&color=1c1917&bgcolor=fafaf9&data=${encodeURIComponent(
    currentUrl
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-stone-100">Abrir en el Celular</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="p-6 flex flex-col items-center text-center">
          <p className="text-xs text-stone-400 mb-4 leading-relaxed">
            Apunta la cámara de tu celular a este código para abrir la app y sacar fotos directamente de tus habitaciones.
          </p>

          <div className="p-3 bg-stone-50 rounded-2xl shadow-xl border border-stone-200/20 mb-4">
            <img
              src={qrImageUrl}
              alt="Código QR para abrir en celular"
              className="w-52 h-52 object-contain rounded-xl"
            />
          </div>

          <div className="w-full flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300">
            <span className="truncate flex-1 font-mono text-[11px] text-left px-1">
              {currentUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors shrink-0 cursor-pointer flex items-center gap-1 font-medium"
              title="Copiar enlace"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone-800 bg-stone-950/60 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
