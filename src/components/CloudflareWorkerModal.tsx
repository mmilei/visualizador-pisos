import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, DollarSign, Terminal } from 'lucide-react';

interface CloudflareWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudflareWorkerModal: React.FC<CloudflareWorkerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const workerCode = `/**
 * Cloudflare Worker Proxy para Visualizador de Pisos (GitHub Pages)
 * Recibe la foto del ambiente y las referencias del piso, llama a Gemini Flash
 * de forma segura protegiendo la GEMINI_API_KEY en variables de entorno de Cloudflare.
 */
export default {
  async fetch(request, env) {
    // Manejo de CORS para GitHub Pages
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const { roomImage, floorImages, productName, aspectRatio } = await request.json();

      if (!roomImage || !floorImages || floorImages.length === 0) {
        return new Response(JSON.stringify({ error: "Faltan imágenes requeridas" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Preparar partes para Gemini API
      const parts = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: roomImage.replace(/^data:image\\/[a-z]+;base64,/, ""),
          },
        },
      ];

      for (const floorImg of floorImages) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: floorImg.replace(/^data:image\\/[a-z]+;base64,/, ""),
          },
        });
      }

      parts.push({
        text: \`You are an architectural visualization engine. The first image is a room. The following image(s) show a wood floor product "\${productName || 'wood floor'}". Replace ONLY the floor of image 1 with this wood floor. Maintain exact furniture, walls, windows and camera angle. Add soft contact shadows beneath furniture and natural window reflections.\`,
      });

      const response = await fetch(
        \`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent?key=\${env.GEMINI_API_KEY}\`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              imageConfig: { aspectRatio: aspectRatio || "4:3" },
            },
          }),
        }
      );

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};`;

  const handleCopy = () => {
    navigator.clipboard.writeText(workerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/50">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-stone-100">
              Cloudflare Worker Proxy (para GitHub Pages)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-200 block">Seguridad Total</span>
                <span className="text-[11px] text-stone-400">
                  La <code className="text-amber-300">GEMINI_API_KEY</code> reside como secreto en Cloudflare y nunca se expone en GitHub Pages ni en el navegador del cliente.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-start gap-2.5">
              <DollarSign className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-200 block">Costo Estimado</span>
                <span className="text-[11px] text-stone-400">
                  Aproximadamente <strong className="text-stone-200">USD 0.03 a 0.05</strong> por imagen generada en Gemini Flash Image. Cloudflare Workers incluye 100.000 req/día gratis.
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-stone-200">
                Código del Worker (<code className="text-amber-400">worker.js</code>):
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] text-stone-300 overflow-x-auto max-h-[260px] leading-snug">
              {workerCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
