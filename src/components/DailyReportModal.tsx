import React from 'react';
import { X, Printer, Download, FileSpreadsheet, Building2, Truck, Layers, CheckCircle } from 'lucide-react';
import { Trip, Location, Material } from '../types';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  locations: Location[];
  materials: Material[];
  onExportCsv: () => void;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  isOpen,
  onClose,
  trips,
  locations,
  materials,
  onExportCsv,
}) => {
  if (!isOpen) return null;

  const completedTrips = trips.filter((t) => t.status === 'Completed');
  const activeTrips = trips.filter((t) => t.status !== 'Completed');
  const totalDeliveredTonnes = completedTrips.reduce((sum, t) => sum + t.quantityTonnes, 0);

  const materialsMap = materials.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {} as Record<string, Material>);

  const sites = locations.filter((l) => l.type === 'destination');

  // Group deliveries per site
  const siteDeliveries = sites.map((site) => {
    const siteTrips = completedTrips.filter((t) => t.destinationId === site.id);
    const deliveredTonnes = siteTrips.reduce((s, t) => s + t.quantityTonnes, 0);
    const targetDemand = site.demand ? Object.values(site.demand).reduce((a, b) => a + b, 0) : 0;
    const fulfillmentPct = targetDemand > 0 ? Math.round((deliveredTonnes / targetDemand) * 100) : 100;
    return {
      site,
      tripCount: siteTrips.length,
      deliveredTonnes,
      targetDemand,
      fulfillmentPct,
    };
  });

  // Group deliveries per material
  const materialDeliveries = materials.map((mat) => {
    const matTrips = completedTrips.filter((t) => t.materialId === mat.id);
    const tonnesDelivered = matTrips.reduce((s, t) => s + t.quantityTonnes, 0);
    const transitTonnes = activeTrips
      .filter((t) => t.materialId === mat.id)
      .reduce((s, t) => s + t.quantityTonnes, 0);
    return {
      material: mat,
      deliveredTrips: matTrips.length,
      tonnesDelivered,
      transitTonnes,
    };
  });

  // Group per vehicle
  const vehicleStats: Record<string, { count: number; tonnes: number; driver: string; type: string }> = {};
  trips.forEach((t) => {
    if (!vehicleStats[t.vehicleNumber]) {
      vehicleStats[t.vehicleNumber] = {
        count: 0,
        tonnes: 0,
        driver: t.driverName,
        type: t.vehicleType,
      };
    }
    if (t.status === 'Completed') {
      vehicleStats[t.vehicleNumber].count += 1;
      vehicleStats[t.vehicleNumber].tonnes += t.quantityTonnes;
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-tactical font-bold text-xs">
              RPT
            </div>
            <div>
              <h3 className="text-white font-tactical font-bold text-sm tracking-wide">
                DAILY CONSTRUCTION LOGISTICS REPORT
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                Comprehensive Shift Haulage & Site Fulfillment Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-200 font-sans">
          {/* Summary KPIs Strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] text-neutral-400 font-mono uppercase">Total Haulage Delivered</div>
              <div className="text-xl font-bold font-tactical text-amber-400 mt-1">
                {totalDeliveredTonnes.toFixed(1)} <span className="text-xs text-neutral-400 font-normal">Tonnes</span>
              </div>
            </div>
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] text-neutral-400 font-mono uppercase">Completed Trips</div>
              <div className="text-xl font-bold font-tactical text-emerald-400 mt-1">
                {completedTrips.length} <span className="text-xs text-neutral-400 font-normal">Loads</span>
              </div>
            </div>
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] text-neutral-400 font-mono uppercase">Active Fleet in Motion</div>
              <div className="text-xl font-bold font-tactical text-blue-400 mt-1">
                {activeTrips.length} <span className="text-xs text-neutral-400 font-normal">Vehicles</span>
              </div>
            </div>
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <div className="text-[10px] text-neutral-400 font-mono uppercase">Average Trip Duration</div>
              <div className="text-xl font-bold font-tactical text-purple-400 mt-1">
                27.8 <span className="text-xs text-neutral-400 font-normal">Minutes</span>
              </div>
            </div>
          </div>

          {/* Section 1: Breakdown per Site */}
          <div className="bg-neutral-950/60 rounded-xl border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-tactical font-bold text-xs uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>1. Construction Site Deliveries & Target Fulfillment</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-neutral-900 text-neutral-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Site Location</th>
                    <th className="p-2.5">Facility Code</th>
                    <th className="p-2.5 text-right">Trips Received</th>
                    <th className="p-2.5 text-right">Delivered (T)</th>
                    <th className="p-2.5 text-right">Target Demand (T)</th>
                    <th className="p-2.5 text-right">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {siteDeliveries.map((s) => (
                    <tr key={s.site.id} className="hover:bg-neutral-900/40">
                      <td className="p-2.5 font-sans font-semibold text-neutral-200">{s.site.name}</td>
                      <td className="p-2.5 text-neutral-400">{s.site.code}</td>
                      <td className="p-2.5 text-right text-neutral-300">{s.tripCount}</td>
                      <td className="p-2.5 text-right font-bold text-amber-400">{s.deliveredTonnes.toFixed(1)} T</td>
                      <td className="p-2.5 text-right text-neutral-400">{s.targetDemand} T</td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            s.fulfillmentPct >= 100
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {s.fulfillmentPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Breakdown per Material */}
          <div className="bg-neutral-950/60 rounded-xl border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-tactical font-bold text-xs uppercase tracking-wide">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>2. Bulk Material Distribution Summary</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-neutral-900 text-neutral-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Material Specification</th>
                    <th className="p-2.5">Density</th>
                    <th className="p-2.5 text-right">Completed Loads</th>
                    <th className="p-2.5 text-right">Delivered Tonnes</th>
                    <th className="p-2.5 text-right">Volume (m³)</th>
                    <th className="p-2.5 text-right">Active In Transit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {materialDeliveries.map((m) => (
                    <tr key={m.material.id} className="hover:bg-neutral-900/40">
                      <td className="p-2.5 font-sans font-medium text-neutral-200 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: m.material.color }}
                        />
                        {m.material.name}
                      </td>
                      <td className="p-2.5 text-neutral-400">{m.material.density} T/m³</td>
                      <td className="p-2.5 text-right text-neutral-300">{m.deliveredTrips}</td>
                      <td className="p-2.5 text-right font-bold text-amber-400">{m.tonnesDelivered.toFixed(1)} T</td>
                      <td className="p-2.5 text-right text-neutral-400">
                        {(m.tonnesDelivered / m.material.density).toFixed(1)} m³
                      </td>
                      <td className="p-2.5 text-right text-blue-400">{m.transitTonnes.toFixed(1)} T</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Breakdown per Vehicle */}
          <div className="bg-neutral-950/60 rounded-xl border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-tactical font-bold text-xs uppercase tracking-wide">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>3. Vehicle Fleet & Driver Utilization</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-neutral-900 text-neutral-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Vehicle Plate</th>
                    <th className="p-2.5">Configuration</th>
                    <th className="p-2.5">Driver</th>
                    <th className="p-2.5 text-right">Completed Trips</th>
                    <th className="p-2.5 text-right">Total Tonnage Hauled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {Object.entries(vehicleStats).map(([vehNo, stat]) => (
                    <tr key={vehNo} className="hover:bg-neutral-900/40">
                      <td className="p-2.5 font-bold text-white">{vehNo}</td>
                      <td className="p-2.5 text-neutral-400 capitalize">{stat.type.replace('_', ' ')}</td>
                      <td className="p-2.5 text-neutral-300">{stat.driver}</td>
                      <td className="p-2.5 text-right text-neutral-300">{stat.count}</td>
                      <td className="p-2.5 text-right font-bold text-amber-400">{stat.tonnes.toFixed(1)} T</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-center text-[10px] text-neutral-500 font-mono">
          HaulTrack 3D Construction Operations • Generated on {new Date().toLocaleDateString()} at{' '}
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
