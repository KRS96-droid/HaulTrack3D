import React from 'react';
import {
  X,
  Truck,
  Crosshair,
  FastForward,
  AlertTriangle,
  FileText,
  MapPin,
  ArrowRight,
  User,
  Scale,
  Clock,
  Compass,
} from 'lucide-react';
import { Trip, Location, Material } from '../types';
import { soundEffects } from '../services/audio';

interface TruckDetailModalProps {
  trip: Trip | null;
  onClose: () => void;
  locationsMap: Record<string, Location>;
  materialsMap: Record<string, Material>;
  isFollowed: boolean;
  onToggleFollow: (tripId: string) => void;
  onAdvancePhase: (tripId: string) => void;
  onToggleDelay: (tripId: string) => void;
  onOpenChallan: (trip: Trip) => void;
}

export const TruckDetailModal: React.FC<TruckDetailModalProps> = ({
  trip,
  onClose,
  locationsMap,
  materialsMap,
  isFollowed,
  onToggleFollow,
  onAdvancePhase,
  onToggleDelay,
  onOpenChallan,
}) => {
  if (!trip) return null;

  const src = locationsMap[trip.sourceId];
  const dst = locationsMap[trip.destinationId];
  const mat = materialsMap[trip.materialId];

  return (
    <div className="absolute top-16 left-4 z-40 w-84 sm:w-96 bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl p-4 text-xs select-none">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-sm">{trip.vehicleNumber}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {trip.status}
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              Ticket: {trip.ticketNo} • {trip.vehicleType.replace('_', ' ').toUpperCase()}
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

      {/* Progress & Delay Alert */}
      {trip.isDelayed && (
        <div className="mb-3 p-2 bg-red-950/70 border border-red-500/50 rounded-lg text-red-200 text-[11px] flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Vehicle reported delay / slow transit along corridor!</span>
        </div>
      )}

      {/* Phase Progress bar */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span>Current Lifecycle Phase</span>
          <span className="font-bold text-amber-400">{Math.round(trip.phaseProgress * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              trip.isDelayed ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${Math.max(5, Math.round(trip.phaseProgress * 100))}%` }}
          />
        </div>
      </div>

      {/* Material & Weight particulars */}
      <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-850 mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border border-black/40"
              style={{ backgroundColor: mat?.color || '#f59e0b' }}
            />
            <span className="font-semibold text-neutral-100">{mat?.name}</span>
          </div>
          <span className="font-tactical font-bold text-amber-400 text-sm">
            {trip.quantityTonnes.toFixed(1)} T
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-800 text-[10px] font-mono text-neutral-400">
          <div>
            <span>Gross:</span> <span className="text-neutral-200">{trip.grossWeightTonnes.toFixed(1)}T</span>
          </div>
          <div>
            <span>Tare:</span> <span className="text-neutral-200">{trip.tareWeightTonnes.toFixed(1)}T</span>
          </div>
          <div>
            <span>Volume:</span> <span className="text-neutral-200">{trip.quantityM3.toFixed(1)}m³</span>
          </div>
        </div>
      </div>

      {/* Route & Driver */}
      <div className="space-y-2 mb-3 bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-850">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="truncate max-w-[140px]">
            <span className="text-neutral-500 block text-[9px]">FROM SOURCE</span>
            <span className="text-white font-medium">{src?.name}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          <div className="truncate max-w-[140px] text-right">
            <span className="text-neutral-500 block text-[9px]">TO SITE</span>
            <span className="text-white font-medium">{dst?.name}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] text-neutral-400 font-mono">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-neutral-400" /> {trip.driverName}
          </span>
          <span>{trip.driverPhone}</span>
        </div>

        {trip.currentPos && (
          <div className="flex items-center justify-between pt-1 text-[9px] text-neutral-400 font-mono">
            <span className="flex items-center gap-1">
              <Compass className="w-2.5 h-2.5 text-amber-500" /> Telemetry Pos:
            </span>
            <span>
              [{trip.currentPos[0].toFixed(1)}, {trip.currentPos[2].toFixed(1)}]
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onToggleFollow(trip.id)}
          className={`py-2 px-2.5 rounded-lg font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
            isFollowed
              ? 'bg-amber-500 text-black font-bold'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{isFollowed ? 'Unfollow' : 'Follow 3D'}</span>
        </button>

        <button
          onClick={() => onOpenChallan(trip)}
          className="py-2 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Weigh Challan</span>
        </button>

        <button
          onClick={() => onToggleDelay(trip.id)}
          className={`py-2 px-2.5 rounded-lg font-mono text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
            trip.isDelayed
              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{trip.isDelayed ? 'Clear Delay' : 'Flag Delay'}</span>
        </button>

        {trip.status !== 'Completed' && (
          <button
            onClick={() => {
              soundEffects.playClick();
              onAdvancePhase(trip.id);
            }}
            className="py-2 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Next Phase</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
