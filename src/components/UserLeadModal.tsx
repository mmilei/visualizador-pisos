import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';

export interface UserContactData {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
}

interface UserLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserContactData) => void;
  initialData?: UserContactData | null;
  targetFloorName?: string;
}

export const UserLeadModal: React.FC<UserLeadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  targetFloorName,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa tu nombre para continuar.');
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">Ingresa tus Datos</h3>
              <p className="text-[11px] text-stone-400">
                Solo el nombre es obligatorio
              </p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {targetFloorName && (
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 flex items-center justify-between">
              <span className="text-stone-400">Piso a visualizar:</span>
              <span className="font-semibold text-amber-400 truncate max-w-[200px]">
                {targetFloorName}
              </span>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Name (Required) */}
          <div>
            <label className="block text-xs font-semibold text-stone-200 mb-1.5">
              Nombre y Apellido <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej. Maximiliano Pérez"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Phone (Optional) */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
              <span>Teléfono / WhatsApp</span>
              <span className="text-[11px] text-stone-500 font-normal">Opcional</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="Ej. +54 9 11 1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-stone-600 transition-all"
              />
            </div>
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
              <span>Correo Electrónico</span>
              <span className="text-[11px] text-stone-500 font-normal">Opcional</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="Ej. cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-stone-600 transition-all"
              />
            </div>
          </div>

          {/* City (Optional) */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
              <span>Localidad / Zona</span>
              <span className="text-[11px] text-stone-500 font-normal">Opcional</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ej. CABA, San Isidro, Córdoba"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-stone-600 transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
            >
              <span>Continuar a la Visualización</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
