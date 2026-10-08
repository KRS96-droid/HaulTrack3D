import React from 'react';
import { Truck, CheckCircle, Weight, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { Trip } from '../types';

interface KPIStripProps {
  trips: Trip[];
  useMetricTonnes: boolean;
  onToggleUnit: () => void;
}

export const KPIStrip: React.FC<KPIStripProps> = ({ trips, useMetricTonnes, onToggleUnit }) => {
  const activeTrips = trips.filter((t) => t.status !== 'Completed');
  const completedTrips = trips.filter((t) => t.status === 'Completed');

  const totalDeliveredTonnes = completedTrips.reduce((sum, t) => sum + t.quantityTonnes, 0);
  const totalInTransitTonnes = activeTrips
    .filter((t) => t.status === 'In Transit' || t.status === 'Arrived' || t.status === 'Unloading')
    .reduce((sum, t) => sum + t.quantityTonnes, 0);

  const delayedCount = activeTrips.filter((t) => t.isDelayed).length;

  const formatQuantity = (tonnes: number) => {
    if (useMetricTonnes) {
      return `${tonnes.toFixed(1)} T`;
    }
    // Approx m3 with avg density 1.6
    const m3 = tonnes / 1.6;
    return `${m3.toFixed(1)} m³`;
  };

  return (
    <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-4 text-xs font-medium">
      {/* Active Trucks */}
      <div className="flex items-center gap-2 pr-4 border-r border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Truck className="w-4 h-4" />
        </div>
        <div>
          <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">Active Fleet</div>
          <div className="text-white text-base font-bold font-tactical">{activeTrips.length} <span className="text-xs font-normal text-neutral-400">Trucks</span></div>
        </div>
      </div>

      {/* Completed Trips */}
      <div className="flex items-center gap-2 pr-4 border-r border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle className="w-4 h-4" />
        </div>
        <div>
          <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">Trips Completed</div>
          <div className="text-white text-base font-bold font-tactical">{completedTrips.length} <span className="text-xs font-normal text-neutral-400">Loads</span></div>
        </div>
      </div>

      {/* Total Delivered */}
      <div className="flex items-center gap-2 pr-4 border-r border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Weight className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">Delivered</span>
            <button
              onClick={onToggleUnit}
              title="Toggle Tonnes / Cubic Metres"
              className="text-[9px] bg-neutral-800 hover:bg-neutral-700 px-1 py-0.2 rounded text-neutral-300 font-mono"
            >
              {useMetricTonnes ? 'T' : 'm³'} ⇋
            </button>
          </div>
          <div className="text-white text-base font-bold font-tactical">{formatQuantity(totalDeliveredTonnes)}</div>
        </div>
      </div>

      {/* In Transit */}
      <div className="flex items-center gap-2 pr-4 border-r border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
          <ArrowRightLeft className="w-4 h-4" />
        </div>
        <div>
          <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">In Transit</div>
          <div className="text-white text-base font-bold font-tactical">{formatQuantity(totalInTransitTonnes)}</div>
        </div>
      </div>

      {/* Delayed / Alert */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${delayedCount > 0 ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse' : 'bg-neutral-800 text-neutral-500'}`}>
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">Delayed / Alert</div>
          <div className={`text-base font-bold font-tactical ${delayedCount > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
            {delayedCount} <span className="text-xs font-normal">Vehicles</span>
          </div>
        </div>
      </div>
    </div>
  );
};
