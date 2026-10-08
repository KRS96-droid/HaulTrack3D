import React from 'react';
import { X, MapPin, Box, User, Phone, Truck, Send, CheckCircle2 } from 'lucide-react';
import { Location, Material, Trip } from '../types';

interface LocationDetailModalProps {
  location: Location | null;
  onClose: () => void;
  materialsMap: Record<string, Material>;
  trips: Trip[];
  onOpenDispatch: () => void;
  onSelectTrip: (tripId: string) => void;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  location,
  onClose,
  materialsMap,
  trips,
  onOpenDispatch,
  onSelectTrip,
}) => {
  if (!location) return null;

  const isSource = location.type === 'source';

  // Connected active trips
  const connectedTrips = trips.filter((t) =>
    isSource ? t.sourceId === location.id : t.destinationId === location.id
  );

  return (
    <div className="absolute top-16 right-4 z-40 w-84 sm:w-96 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl p-4 text-xs select-none">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border font-tactical font-bold text-xs ${
              isSource
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            {location.code}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{location.name}</h3>
            <div className="text-[10px] text-neutral-400 font-mono">
              {isSource ? 'MATERIAL SOURCE FACILITY' : 'CONSTRUCTION PROJECT SITE'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-neutral-300 text-[11px] mb-3 leading-relaxed">{location.description}</p>

      {/* Supervisor Contact */}
      <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-850 mb-3 space-y-1">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="text-neutral-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-neutral-400" />
            <span>{isSource ? 'Plant Supervisor' : 'Resident Engineer'}:</span>
          </span>
          <span className="text-white font-medium">{location.supervisor}</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-neutral-500" /> Phone:
          </span>
          <span className="text-neutral-300">{location.phone}</span>
        </div>
      </div>

      {/* Material Stocks & Demand */}
      <div className="bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-850 mb-3 space-y-2">
        <div className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider flex items-center justify-between">
          <span>{isSource ? 'CURRENT AVAILABLE STOCK' : 'DELIVERIES VS DEMAND TARGET'}</span>
        </div>

        {isSource ? (
          <div className="space-y-1.5">
            {Object.entries(location.stocks).map(([matId, qty]) => {
              const mat = materialsMap[matId];
              const pct = Math.min(100, Math.round((qty / 800) * 100));
              return (
                <div key={matId} className="space-y-0.5">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-neutral-300 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: mat?.color || '#f59e0b' }}
                      />
                      {mat?.name || matId}
                    </span>
                    <span className="text-amber-400 font-bold">{qty.toFixed(1)} T</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: mat?.color || '#f59e0b' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {location.demand &&
              Object.entries(location.demand).map(([matId, targetQty]) => {
                const mat = materialsMap[matId];
                const receivedQty = location.received?.[matId] || 0;
                const pct = Math.min(100, Math.round((receivedQty / targetQty) * 100));

                return (
                  <div key={matId} className="space-y-0.5">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-neutral-300 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: mat?.color || '#f59e0b' }}
                        />
                        {mat?.name || matId}
                      </span>
                      <span className="text-neutral-400">
                        <span className="text-white font-bold">{receivedQty.toFixed(1)}</span> / {targetQty} T ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 100 ? '#10b981' : mat?.color || '#f59e0b',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Connected Active Trucks */}
      <div className="mb-3">
        <div className="text-[10px] uppercase font-mono text-neutral-400 mb-1.5 flex items-center justify-between">
          <span>Active Assigned Fleet ({connectedTrips.length})</span>
        </div>
        {connectedTrips.length === 0 ? (
          <div className="text-[11px] text-neutral-500 font-mono py-1">No active trucks assigned.</div>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {connectedTrips.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTrip(t.id)}
                className="px-2 py-1 bg-neutral-900 border border-neutral-800 hover:border-amber-500 rounded text-[10px] font-mono text-neutral-300 whitespace-nowrap transition-colors"
              >
                {t.vehicleNumber} ({t.status})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action */}
      <button
        onClick={onOpenDispatch}
        className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold font-tactical rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
      >
        <Send className="w-3.5 h-3.5 fill-current" />
        <span>DISPATCH TRUCK {isSource ? 'FROM HERE' : 'TO THIS SITE'}</span>
      </button>
    </div>
  );
};
