import React from 'react';
import { X, Printer, CheckCircle, QrCode, ShieldCheck, Truck } from 'lucide-react';
import { Trip, Location, Material } from '../types';

interface DeliveryChallanModalProps {
  trip: Trip | null;
  onClose: () => void;
  locationsMap: Record<string, Location>;
  materialsMap: Record<string, Material>;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({
  trip,
  onClose,
  locationsMap,
  materialsMap,
}) => {
  if (!trip) return null;

  const src = locationsMap[trip.sourceId];
  const dst = locationsMap[trip.destinationId];
  const mat = materialsMap[trip.materialId];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-tactical font-bold text-xs">
              DOC
            </div>
            <div>
              <h3 className="text-white font-tactical font-bold text-sm tracking-wide">
                DIGITAL WEIGHBRIDGE DELIVERY CHALLAN
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">Consignment Note & E-Way Transit Manifest</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Challan</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Challan Sheet (Styled like official construction weighbridge ticket) */}
        <div className="p-6 overflow-y-auto bg-neutral-900 font-sans text-neutral-100 space-y-5">
          {/* Company & Ticket Header */}
          <div className="border-b border-neutral-800 pb-4 flex items-start justify-between">
            <div>
              <div className="text-amber-500 font-tactical font-bold text-lg tracking-wider">
                HAULTRACK LOGISTICS & INFRASTRUCTURE LTD.
              </div>
              <div className="text-xs text-neutral-400">
                Heavy Material Transport & Weighbridge Telematics Division
              </div>
              <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                GSTIN: 29AAACH7890K1Z4 • E-Way Bill ID: 9482-0192-4820
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-neutral-400">CHALLAN NO.</div>
              <div className="font-tactical font-bold text-base text-white tracking-widest">{trip.ticketNo}</div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center justify-end gap-1 mt-1">
                <ShieldCheck className="w-3 h-3" /> VERIFIED & SEALED
              </div>
            </div>
          </div>

          {/* Source & Destination Matrix */}
          <div className="grid grid-cols-2 gap-4">
            {/* Consignor (Source) */}
            <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800">
              <div className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider mb-1">
                DISPATCH SOURCE (CONSIGNOR)
              </div>
              <div className="font-semibold text-sm text-white">{src?.name || trip.sourceId}</div>
              <div className="text-xs text-neutral-300 mt-0.5">Facility Code: {src?.code}</div>
              <div className="text-xs text-neutral-400 mt-1">Supervisor: {src?.supervisor}</div>
              <div className="text-xs text-neutral-400 font-mono">{src?.phone}</div>
            </div>

            {/* Consignee (Destination Site) */}
            <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800">
              <div className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider mb-1">
                DELIVERY DESTINATION (CONSIGNEE)
              </div>
              <div className="font-semibold text-sm text-white">{dst?.name || trip.destinationId}</div>
              <div className="text-xs text-neutral-300 mt-0.5">Site Code: {dst?.code}</div>
              <div className="text-xs text-neutral-400 mt-1">Site Engineer: {dst?.supervisor}</div>
              <div className="text-xs text-neutral-400 font-mono">{dst?.phone}</div>
            </div>
          </div>

          {/* Vehicle & Consignment Particulars */}
          <div className="bg-neutral-950/70 rounded-xl border border-neutral-800 p-4 space-y-3">
            <div className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">
              FLEET & MATERIAL SPECIFICATIONS
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Vehicle Number:</span>
                <span className="font-mono font-bold text-white text-sm">{trip.vehicleNumber}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Vehicle Configuration:</span>
                <span className="font-medium text-neutral-200 capitalize">{trip.vehicleType.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Authorized Driver:</span>
                <span className="font-medium text-neutral-200">{trip.driverName}</span>
                <span className="text-[10px] text-neutral-400 font-mono block">{trip.driverPhone}</span>
              </div>
            </div>

            <div className="border-t border-neutral-850 pt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Material Description:</span>
                <span className="font-bold text-amber-400 flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: mat?.color || '#f59e0b' }}
                  />
                  {mat?.name}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Density / Bulk Weight:</span>
                <span className="font-mono text-neutral-300">{mat?.density || 1.6} Tonnes / m³</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Dispatch Time / Status:</span>
                <span className="font-mono text-neutral-300">
                  {trip.dispatchTime} ({trip.status})
                </span>
              </div>
            </div>
          </div>

          {/* Weighbridge Measurement Table */}
          <div className="overflow-hidden border border-neutral-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-950 text-neutral-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Weighment Parameter</th>
                  <th className="p-3 text-right">Metric Tonnes (T)</th>
                  <th className="p-3 text-right">Kilograms (kg)</th>
                  <th className="p-3 text-right">Cubic Metres (m³)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/50 font-mono">
                <tr>
                  <td className="p-3 text-neutral-300">Gross Weight (Loaded Truck)</td>
                  <td className="p-3 text-right text-white font-bold">{trip.grossWeightTonnes.toFixed(2)} T</td>
                  <td className="p-3 text-right text-neutral-400">{Math.round(trip.grossWeightTonnes * 1000)} kg</td>
                  <td className="p-3 text-right text-neutral-500">—</td>
                </tr>
                <tr>
                  <td className="p-3 text-neutral-300">Tare Weight (Empty Vehicle)</td>
                  <td className="p-3 text-right text-neutral-400">{trip.tareWeightTonnes.toFixed(2)} T</td>
                  <td className="p-3 text-right text-neutral-400">{Math.round(trip.tareWeightTonnes * 1000)} kg</td>
                  <td className="p-3 text-right text-neutral-500">—</td>
                </tr>
                <tr className="bg-amber-500/10 text-amber-300 font-bold">
                  <td className="p-3 font-semibold">NET CONSIGNMENT WEIGHT</td>
                  <td className="p-3 text-right text-amber-400 text-sm font-tactical">
                    {trip.netWeightTonnes.toFixed(2)} T
                  </td>
                  <td className="p-3 text-right">{Math.round(trip.netWeightTonnes * 1000)} kg</td>
                  <td className="p-3 text-right">{trip.quantityM3.toFixed(2)} m³</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures & QR Code */}
          <div className="pt-4 border-t border-neutral-800 flex items-end justify-between">
            <div className="space-y-1">
              <div className="h-10 border-b border-dashed border-neutral-700 w-44 flex items-end pb-1 text-[11px] text-neutral-400 italic font-mono">
                Raghavan Nair (Scale Op.)
              </div>
              <div className="text-[10px] text-neutral-500 uppercase font-mono">
                Weighbridge Officer Signature
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-10 border-b border-dashed border-neutral-700 w-44 flex items-end pb-1 text-[11px] text-neutral-400 italic font-mono">
                {trip.driverName}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase font-mono">
                Driver Acceptance Signature
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-10 border-b border-dashed border-neutral-700 w-44 flex items-end pb-1 text-[11px] text-neutral-400 italic font-mono">
                Er. Patil (Site Verified)
              </div>
              <div className="text-[10px] text-neutral-500 uppercase font-mono">
                Receiving Engineer Stamp
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-center text-[10px] text-neutral-500 font-mono">
          Electronic delivery challan generated automatically by HaulTrack 3D Systems • Valid without physical seal
        </div>
      </div>
    </div>
  );
};
