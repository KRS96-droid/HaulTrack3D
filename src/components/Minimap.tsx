import React from 'react';
import { Location, Trip, Material } from '../types';
import { Crosshair, MapPin } from 'lucide-react';

interface MinimapProps {
  locations: Location[];
  trips: Trip[];
  materialsMap: Record<string, Material>;
  followingTripId: string | null;
  onSelectLocation: (locId: string) => void;
  onSelectTrip: (tripId: string) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  locations,
  trips,
  materialsMap,
  followingTripId,
  onSelectLocation,
  onSelectTrip,
}) => {
  // World bounds in 3D: roughly -100 to 100 on X and Z
  const worldSize = 200;
  const mapSize = 160; // px

  const toMapCoords = (x: number, z: number) => {
    // Map [-100, 100] to [0, mapSize]
    const mapX = ((x + 100) / worldSize) * mapSize;
    const mapY = ((z + 100) / worldSize) * mapSize;
    return { mapX, mapY };
  };

  return (
    <div className="relative w-44 h-44 bg-neutral-950/85 backdrop-blur-md border border-neutral-800 rounded-2xl p-2 shadow-2xl overflow-hidden select-none">
      {/* Radar Sweep Effect */}
      <div className="absolute inset-0 rounded-2xl radar-sweep pointer-events-none animate-spin" style={{ animationDuration: '6s' }} />

      {/* Grid Lines */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none opacity-20">
        <div className="border-r border-b border-amber-500/50"></div>
        <div className="border-b border-amber-500/50"></div>
        <div className="border-r border-amber-500/50"></div>
        <div></div>
      </div>

      {/* Center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 text-amber-500">
        <div className="w-16 h-16 rounded-full border border-dashed border-amber-400"></div>
      </div>

      {/* Title */}
      <div className="absolute top-1.5 left-2.5 z-10 text-[9px] font-mono text-neutral-400 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="text-amber-400 font-bold">RADAR HUD</span>
      </div>

      {/* 2D Map Canvas Space */}
      <div className="relative w-full h-full">
        {/* Locations */}
        {locations.map((loc) => {
          const { mapX, mapY } = toMapCoords(loc.position[0], loc.position[2]);
          const isSource = loc.type === 'source';

          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
              style={{ left: `${mapX}px`, top: `${mapY}px` }}
              title={`${loc.name} (${loc.code})`}
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-mono font-bold shadow ${
                  isSource
                    ? 'bg-amber-500 text-black border border-amber-300'
                    : 'bg-blue-500 text-white border border-blue-300'
                }`}
              >
                {loc.code.substring(0, 1)}
              </div>
              {/* Tooltip on hover */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[9px] font-mono text-neutral-200 whitespace-nowrap hidden group-hover:block z-30 pointer-events-none">
                {loc.code}
              </div>
            </button>
          );
        })}

        {/* Moving Trucks */}
        {trips
          .filter((t) => t.status !== 'Completed' && t.currentPos)
          .map((trip) => {
            const pos = trip.currentPos!;
            const { mapX, mapY } = toMapCoords(pos[0], pos[2]);
            const mat = materialsMap[trip.materialId];
            const isFollowed = followingTripId === trip.id;

            return (
              <button
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
                style={{ left: `${mapX}px`, top: `${mapY}px` }}
                title={`${trip.vehicleNumber} - ${trip.status}`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full border border-black transition-transform ${
                    isFollowed
                      ? 'ring-2 ring-amber-400 scale-125'
                      : trip.isDelayed
                      ? 'ring-2 ring-red-500 animate-bounce'
                      : ''
                  }`}
                  style={{ backgroundColor: mat?.color || '#f59e0b' }}
                />
                {/* Truck tag */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 px-1 rounded bg-black/80 text-[8px] font-mono text-amber-300 whitespace-nowrap hidden group-hover:block z-30 pointer-events-none">
                  {trip.vehicleNumber.split('-')[1]}
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
};
