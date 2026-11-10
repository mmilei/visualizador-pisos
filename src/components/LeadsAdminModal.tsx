import React, { useEffect, useState } from 'react';
import { X, Users, Phone, Mail, MapPin, Calendar, Download, RefreshCw } from 'lucide-react';

interface LeadItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  floorInterest?: string;
  createdAt: number;
}

interface LeadsAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadsAdminModal: React.FC<LeadsAdminModalProps> = ({ isOpen, onClose }) => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.warn('Error fetching leads:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    if (leads.length === 0) return;
    const header = 'Nombre,Telefono,Email,Ciudad,Piso Interes,Fecha\n';
    const rows = leads
      .map(
        (l) =>
          `"${l.name}","${l.phone || ''}","${l.email || ''}","${l.city || ''}","${l.floorInterest || ''}","${new Date(
            l.createdAt
          ).toLocaleString()}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contactos-visualizador-${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">
                Usuarios Registrados ({leads.length})
              </h3>
              <p className="text-[11px] text-stone-400">
                Contactos que utilizaron el visualizador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              className="p-2 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
          {leads.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs">
              No hay contactos registrados todavía. Se guardarán cuando los usuarios prueben la app.
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="p-3.5 rounded-2xl border border-stone-800 bg-stone-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="text-sm font-bold text-stone-100 mb-1 flex items-center gap-2">
                    <span>{lead.name}</span>
                    {lead.floorInterest && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800/80 text-amber-300 font-medium">
                        {lead.floorInterest}
                      </span>
                    )}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-400 text-[11px]">
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-stone-300">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{lead.phone}</span>
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1 text-stone-300">
                        <Mail className="w-3 h-3 text-sky-400" />
                        <span>{lead.email}</span>
                      </span>
                    )}
                    {lead.city && (
                      <span className="flex items-center gap-1 text-stone-400">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{lead.city}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-stone-500 shrink-0 sm:text-right">
                  {new Date(lead.createdAt).toLocaleDateString([], {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {leads.length > 0 && (
          <div className="p-3.5 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
