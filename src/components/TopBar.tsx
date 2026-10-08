import React from 'react';
import {
  Play,
  Pause,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Camera,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  Radio,
  Plus,
  Crosshair,
  Compass,
} from 'lucide-react';
import { SimulationSpeed, CameraPreset } from '../types';

interface TopBarProps {
  simulationSpeed: SimulationSpeed;
  isPaused: boolean;
  isNightMode: boolean;
  isMuted: boolean;
  followingTruckId: string | null;
  followingTruckNo?: string;
  onSpeedChange: (speed: SimulationSpeed) => void;
  onTogglePause: () => void;
  onToggleNightMode: () => void;
  onToggleMute: () => void;
  onCameraPreset: (preset: CameraPreset) => void;
  onUnfollowTruck: () => void;
  onOpenDispatch: () => void;
  onOpenDailyReport: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  simulationSpeed,
  isPaused,
  isNightMode,
  isMuted,
  followingTruckId,
  followingTruckNo,
  onSpeedChange,
  onTogglePause,
  onToggleNightMode,
  onToggleMute,
  onCameraPreset,
  onUnfollowTruck,
  onOpenDispatch,
  onOpenDailyReport,
  onExportCsv,
  onExportJson,
  onImportJson,
}) => {
  const speeds: SimulationSpeed[] = [1, 5, 10, 30, 60];

  return (
    <header className="h-14 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-3 md:px-5 flex items-center justify-between z-30 select-none">
      {/* Brand & Live Ops Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-black font-tactical text-lg shadow-lg shadow-amber-500/20 border border-amber-400">
            HT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-tactical font-bold text-base tracking-wide">HAULTRACK 3D</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                RTS LOGISTICS v2.4
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* Following Truck Banner */}
        {followingTruckId && (
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono">
            <Crosshair className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>TRACKING: {followingTruckNo || followingTruckId}</span>
            <button
              onClick={onUnfollowTruck}
              className="ml-1 text-[10px] text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-1.5 py-0.5 rounded"
            >
              Exit
            </button>
          </div>
        )}
      </div>

      {/* Simulation Controls (Center) */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Play / Pause */}
        <button
          onClick={onTogglePause}
          className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ${
            isPaused
              ? 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400'
              : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
          }`}
          title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
        >
          {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
        </button>

        {/* Speed Buttons */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                simulationSpeed === s && !isPaused
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Camera Presets Dropdown / Quick buttons */}
        <div className="relative group">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium"
            title="Camera Views"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Camera</span>
          </button>
          <div className="absolute right-0 mt-1 w-44 bg-neutral-900/95 backdrop-blur border border-neutral-800 rounded-lg shadow-xl py-1 text-xs hidden group-hover:block z-50">
            <button
              onClick={() => onCameraPreset('overview')}
              className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 text-neutral-200 flex items-center justify-between"
            >
              <span>Overview (Tactical)</span>
            </button>
            <div className="border-t border-neutral-800 my-1"></div>
            <div className="px-3 py-1 text-[10px] text-neutral-500 uppercase font-mono">Sources</div>
            <button
              onClick={() => onCameraPreset('quarry')}
              className="w-full text-left px-3 py-1 hover:bg-neutral-800 text-neutral-300"
            >
              Quarry Pit Alpha
            </button>
            <button
              onClick={() => onCameraPreset('crusher')}
              className="w-full text-left px-3 py-1 hover:bg-neutral-800 text-neutral-300"
            >
              Crusher Plant #1
            </button>
            <button
              onClick={() => onCameraPreset('stockpile')}
              className="w-full text-left px-3 py-1 hover:bg-neutral-800 text-neutral-300"
            >
              Stockpile Yard South
            </button>
            <div className="border-t border-neutral-800 my-1"></div>
            <div className="px-3 py-1 text-[10px] text-neutral-500 uppercase font-mono">Sites</div>
            <button
              onClick={() => onCameraPreset('site_metro')}
              className="w-full text-left px-3 py-1 hover:bg-neutral-800 text-neutral-300"
            >
              Metro Line 4 - Pier 18
            </button>
            <button
              onClick={() => onCameraPreset('site_highway')}
              className="w-full text-left px-3 py-1 hover:bg-neutral-800 text-neutral-300"
            >
              Highway Flyover Pier 12
            </button>
            <button
              onClick={() => onCameraPreset('site_building')}
              className="w-full text-left px-3 py-1 hover:bg-neutral-800 text-neutral-300"
            >
              Horizon Tower Site
            </button>
          </div>
        </div>
      </div>

      {/* Tools, Day/Night, Audio & Reports (Right) */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Day / Night Toggle */}
        <button
          onClick={onToggleNightMode}
          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors"
          title={isNightMode ? 'Switch to Daytime' : 'Switch to Night Mode (Floodlights)'}
        >
          {isNightMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Audio Synthesizer Toggle */}
        <button
          onClick={onToggleMute}
          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors"
          title={isMuted ? 'Unmute Tactical Audio' : 'Mute Sound Effects'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Daily Report Button */}
        <button
          onClick={onOpenDailyReport}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 text-xs font-medium"
          title="Printable Daily Logistics Report"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">Daily Report</span>
        </button>

        {/* CSV Export */}
        <button
          onClick={onExportCsv}
          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors"
          title="Export Deliveries to CSV"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
        </button>

        {/* JSON Backup / Restore Menu */}
        <div className="relative group">
          <button
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300"
            title="Backup or Restore Simulation Data (JSON)"
          >
            <Download className="w-4 h-4 text-neutral-400" />
          </button>
          <div className="absolute right-0 mt-1 w-40 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1 text-xs hidden group-hover:block z-50">
            <button
              onClick={onExportJson}
              className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 text-neutral-200 flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Export JSON State</span>
            </button>
            <button
              onClick={onImportJson}
              className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 text-neutral-200 flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-400" />
              <span>Import JSON State</span>
            </button>
          </div>
        </div>

        {/* Quick Dispatch CTA Button */}
        <button
          onClick={onOpenDispatch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 text-xs font-bold font-tactical shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>DISPATCH</span>
        </button>
      </div>
    </header>
  );
};
