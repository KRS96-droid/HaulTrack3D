import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  AlertTriangle,
  Scale,
  MapPin,
  Clock,
  Send,
  User,
  Phone,
  Layers,
  ChevronDown,
  Info,
  Check,
  PlusCircle,
} from 'lucide-react';
import { Material, VehicleTypeId, Location, Trip } from '../types';
import { VEHICLE_TYPES } from '../services/data';
import { soundEffects } from '../services/audio';

interface DispatchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  locations: Location[];
  activeTrips: Trip[];
  onDispatchTruck: (newTripData: Omit<Trip, 'id' | 'ticketNo' | 'phaseProgress' | 'createdAt' | 'status' | 'isDelayed' | 'tareWeightTonnes' | 'grossWeightTonnes' | 'netWeightTonnes'>) => boolean;
  onOpenCustomMaterial: () => void;
}

export const DispatchPanel: React.FC<DispatchPanelProps> = ({
  isOpen,
  onClose,
  materials,
  locations,
  activeTrips,
  onDispatchTruck,
  onOpenCustomMaterial,
}) => {
  // Preset demo vehicles for quick selection
  const SAMPLE_VEHICLES = [
    { no: 'KA-01-AB-1234', type: 'tipper_10', driver: 'Manjunath Gowda', phone: '+91 98450 71001' },
    { no: 'KA-04-DE-5678', type: 'tipper_12', driver: 'Rameshwar Yadav', phone: '+91 98450 71002' },
    { no: 'KA-05-GH-9012', type: 'tipper_10', driver: 'Santosh Kumar', phone: '+91 98450 71003' },
    { no: 'KA-51-LM-3344', type: 'tipper_6', driver: 'Babu Xavier', phone: '+91 98450 71004' },
    { no: 'KA-19-PQ-7788', type: 'tipper_12', driver: 'Gurpreet Singh', phone: '+91 98450 71005' },
    { no: 'KA-02-ZZ-4422', type: 'tractor_trolley', driver: 'Eshwar Reddy', phone: '+91 98450 71006' },
    { no: 'KA-03-MK-8899', type: 'tipper_10', driver: 'Vijay Shankar', phone: '+91 98450 71007' },
    { no: 'KA-09-RT-6655', type: 'tipper_12', driver: 'Hardeep Gill', phone: '+91 98450 71008' },
  ];

  // Form State
  const [vehicleNumber, setVehicleNumber] = useState('KA-03-MK-8899');
  const [vehicleType, setVehicleType] = useState<VehicleTypeId>('tipper_10');
  const [driverName, setDriverName] = useState('Vijay Shankar');
  const [driverPhone, setDriverPhone] = useState('+91 98450 71007');
  const [materialId, setMaterialId] = useState<string>('gsb');
  const [quantityValue, setQuantityValue] = useState<number>(18);
  const [isCubicMetres, setIsCubicMetres] = useState<boolean>(false);
  const [sourceId, setSourceId] = useState<string>('source_quarry');
  const [destinationId, setDestinationId] = useState<string>('site_metro');
  const [notes, setNotes] = useState<string>('Standard logistics dispatch order.');
  const [dispatchTime, setDispatchTime] = useState<string>('08:45 AM');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync capacity when vehicle type changes
  const currentVehicleSpec = VEHICLE_TYPES[vehicleType];
  const selectedMaterial = materials.find((m) => m.id === materialId) || materials[0];

  // Sources and Destinations
  const sources = locations.filter((l) => l.type === 'source');
  const destinations = locations.filter((l) => l.type === 'destination');
  const selectedSource = sources.find((s) => s.id === sourceId) || sources[0];
  const selectedDest = destinations.find((d) => d.id === destinationId) || destinations[0];

  // Available stock of selected material at selected source
  const availableStockTonnes = selectedSource?.stocks[materialId] ?? 0;

  // Calculate actual tonnes and m3
  const density = selectedMaterial ? selectedMaterial.density : 1.6;
  const quantityTonnes = isCubicMetres ? quantityValue * density : quantityValue;
  const quantityM3 = isCubicMetres ? quantityValue : quantityValue / density;

  // Capacity overload check
  const maxCap = isCubicMetres ? currentVehicleSpec.maxCapacityM3 : currentVehicleSpec.maxCapacityTonnes;
  const isOverloaded = quantityValue > maxCap;

  // Stock deficit check
  const isStockDeficit = quantityTonnes > availableStockTonnes;

  // Duplicate active vehicle check
  const activeVehicleNumbers = new Set(
    activeTrips.filter((t) => t.status !== 'Completed').map((t) => t.vehicleNumber.trim().toUpperCase())
  );
  const isVehicleBusy = activeVehicleNumbers.has(vehicleNumber.trim().toUpperCase());

  // Calculated distance & ETA
  const calculateEstimatedMinutes = () => {
    // Basic approximate matrix
    const matrix: Record<string, Record<string, number>> = {
      source_quarry: { site_metro: 28, site_highway: 34, site_building: 38 },
      source_crusher: { site_metro: 26, site_highway: 30, site_building: 35 },
      source_stockpile: { site_metro: 35, site_highway: 28, site_building: 22 },
    };
    return matrix[sourceId]?.[destinationId] || 25;
  };

  const estimatedMinutes = calculateEstimatedMinutes();

  const handleSelectSampleVehicle = (sample: typeof SAMPLE_VEHICLES[0]) => {
    setVehicleNumber(sample.no);
    setVehicleType(sample.type as VehicleTypeId);
    setDriverName(sample.driver);
    setDriverPhone(sample.phone);
    const spec = VEHICLE_TYPES[sample.type];
    setQuantityValue(isCubicMetres ? spec.maxCapacityM3 : spec.maxCapacityTonnes);
    setFormError(null);
  };

  const handleVehicleTypeChange = (typeId: VehicleTypeId) => {
    setVehicleType(typeId);
    const spec = VEHICLE_TYPES[typeId];
    setQuantityValue(isCubicMetres ? spec.maxCapacityM3 : spec.maxCapacityTonnes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!vehicleNumber.trim()) {
      setFormError('Please enter a valid vehicle registration number.');
      return;
    }
    if (isVehicleBusy) {
      setFormError(`Vehicle ${vehicleNumber} is currently on an active trip! Please complete or wait for return.`);
      return;
    }
    if (quantityTonnes <= 0) {
      setFormError('Quantity to load must be greater than 0.');
      return;
    }
    if (isStockDeficit) {
      setFormError(
        `Insufficient stock! ${selectedSource.name} only has ${availableStockTonnes.toFixed(1)}T of ${selectedMaterial.name}. Cannot dispatch ${quantityTonnes.toFixed(1)}T.`
      );
      return;
    }

    const success = onDispatchTruck({
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      vehicleType,
      driverName: driverName.trim() || 'Unassigned Driver',
      driverPhone: driverPhone.trim() || '+91 98000 00000',
      materialId,
      quantityTonnes: Number(quantityTonnes.toFixed(1)),
      quantityM3: Number(quantityM3.toFixed(1)),
      sourceId,
      destinationId,
      dispatchTime: dispatchTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estimatedMinutes,
      notes,
    });

    if (success) {
      soundEffects.playDispatchChirp();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-full sm:w-[420px] bg-neutral-950/95 backdrop-blur-md border-r border-neutral-800 shadow-2xl z-40 flex flex-col select-none">
      {/* Header */}
      <div className="hazard-stripes p-3 flex items-center justify-between border-b border-amber-500/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-neutral-900 rounded border border-amber-500/50 text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-tactical font-bold text-sm tracking-wide">FLEET DISPATCH STATION</h2>
            <div className="text-[11px] text-neutral-300 font-mono">Create new haul order & spawn truck in 3D</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Vehicle Selectors */}
      <div className="px-4 py-2 bg-neutral-900/60 border-b border-neutral-800/80 overflow-x-auto">
        <div className="text-[10px] text-neutral-400 uppercase font-mono mb-1.5">Quick Pick Ready Fleet:</div>
        <div className="flex gap-1.5 pb-1">
          {SAMPLE_VEHICLES.map((v) => {
            const isBusy = activeVehicleNumbers.has(v.no.toUpperCase());
            const isSelected = vehicleNumber === v.no;
            return (
              <button
                key={v.no}
                type="button"
                onClick={() => handleSelectSampleVehicle(v)}
                disabled={isBusy}
                className={`px-2 py-1 rounded text-[11px] font-mono whitespace-nowrap border transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-black font-bold border-amber-400'
                    : isBusy
                    ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed line-through'
                    : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                }`}
                title={isBusy ? 'Vehicle currently in transit' : `Select ${v.no}`}
              >
                {v.no.split('-')[1]}-{v.no.split('-')[3]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Error / Conflict Alert */}
        {formError && (
          <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-lg text-red-200 flex items-start gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-[11px] font-mono">{formError}</div>
          </div>
        )}

        {/* Vehicle Conflict Warning */}
        {isVehicleBusy && (
          <div className="p-2.5 bg-amber-950/50 border border-amber-500/40 rounded-lg text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px]">Vehicle {vehicleNumber} is already on an active trip!</span>
          </div>
        )}

        {/* Section: Vehicle & Driver */}
        <div className="space-y-3 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800">
          <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>Vehicle & Driver Info</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1">Vehicle Number</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => {
                  setVehicleNumber(e.target.value);
                  setFormError(null);
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono uppercase focus:border-amber-500 outline-none"
                placeholder="KA-01-AB-1234"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => handleVehicleTypeChange(e.target.value as VehicleTypeId)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-white focus:border-amber-500 outline-none"
              >
                {Object.values(VEHICLE_TYPES).map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name} ({vt.maxCapacityTonnes}T)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-neutral-400" /> Driver Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white focus:border-amber-500 outline-none"
                placeholder="e.g. Manjunath"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-neutral-400" /> Contact Phone
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-amber-500 outline-none"
                placeholder="+91 98450 00000"
              />
            </div>
          </div>
        </div>

        {/* Section: Material & Quantity */}
        <div className="space-y-3 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Material & Payload</span>
            </span>
            <button
              type="button"
              onClick={onOpenCustomMaterial}
              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+ Custom Material</span>
            </button>
          </div>

          {/* Material Picker Swatches */}
          <div className="grid grid-cols-3 gap-1.5">
            {materials.map((m) => {
              const isSelected = m.id === materialId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMaterialId(m.id);
                    setFormError(null);
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-neutral-800 border-amber-500 shadow-sm'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: m.color }} />
                    {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                  </div>
                  <div className="text-[11px] font-medium text-white truncate">{m.name}</div>
                  <div className="text-[9px] text-neutral-400 font-mono">{m.density} T/m³</div>
                </button>
              );
            })}
          </div>

          {/* Quantity Input with Tonnes / m3 Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-400 text-[11px] flex items-center gap-1">
                <Scale className="w-3 h-3 text-neutral-400" /> Quantity to Load
              </label>
              <div className="flex items-center bg-neutral-900 rounded p-0.5 border border-neutral-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setIsCubicMetres(false)}
                  className={`px-1.5 py-0.5 rounded ${!isCubicMetres ? 'bg-amber-500 text-black font-bold' : 'text-neutral-400'}`}
                >
                  Tonnes (T)
                </button>
                <button
                  type="button"
                  onClick={() => setIsCubicMetres(true)}
                  className={`px-1.5 py-0.5 rounded ${isCubicMetres ? 'bg-amber-500 text-black font-bold' : 'text-neutral-400'}`}
                >
                  Volume (m³)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={quantityValue}
                onChange={(e) => {
                  setQuantityValue(parseFloat(e.target.value) || 0);
                  setFormError(null);
                }}
                className={`flex-1 bg-neutral-900 border rounded-lg px-3 py-2 text-white font-tactical text-base font-bold outline-none ${
                  isOverloaded ? 'border-amber-500 bg-amber-950/20 text-amber-300' : 'border-neutral-700 focus:border-amber-500'
                }`}
              />
              <div className="text-neutral-400 font-mono text-xs w-28 text-right">
                <div>≈ {quantityTonnes.toFixed(1)} Tonnes</div>
                <div className="text-[10px] text-neutral-500">{quantityM3.toFixed(1)} m³</div>
              </div>
            </div>

            {/* Overload Warning Banner */}
            {isOverloaded && (
              <div className="mt-2 p-2 bg-amber-950/60 border border-amber-500/40 rounded-lg flex items-center gap-2 text-amber-300 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Load exceeds rated capacity ({maxCap} {isCubicMetres ? 'm³' : 'T'}). May cause highway penalty!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section: Route (From Source -> To Site) */}
        <div className="space-y-3 bg-neutral-900/40 p-3 rounded-xl border border-neutral-800">
          <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Route & Staging Bays</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Source */}
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1">FROM (Source)</label>
              <select
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setFormError(null);
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-amber-500 outline-none"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[10px] font-mono flex items-center justify-between">
                <span className="text-neutral-400">Available {selectedMaterial.name.split(' ')[0]}:</span>
                <span className={isStockDeficit ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {availableStockTonnes.toFixed(1)} T
                </span>
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1">TO (Site Destination)</label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-amber-500 outline-none"
              >
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[10px] font-mono flex items-center justify-between text-neutral-400">
                <span>Site Demand Target:</span>
                <span className="text-amber-400">
                  {selectedDest.demand?.[materialId] ? `${selectedDest.demand[materialId]} T` : 'Open'}
                </span>
              </div>
            </div>
          </div>

          {/* Stock Deficit Warning */}
          {isStockDeficit && (
            <div className="p-2 bg-red-950/70 border border-red-500/60 rounded-lg flex items-center gap-2 text-red-200 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>
                Source has only {availableStockTonnes}T in stock. Dispatching {quantityTonnes.toFixed(1)}T will be blocked.
              </span>
            </div>
          )}

          {/* Time & ETA */}
          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <span>Est. Transit Time:</span>
            </div>
            <div className="font-mono font-bold text-amber-400">
              ~{estimatedMinutes} mins <span className="text-[10px] text-neutral-400 font-normal">(Auto Route)</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-neutral-400 text-[11px] mb-1">Challan Order Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-300 text-xs focus:border-amber-500 outline-none"
            placeholder="e.g. High priority foundation concrete batching"
          />
        </div>
      </form>

      {/* Footer Dispatch Action Button */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-950/90">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isVehicleBusy || isStockDeficit}
          className={`w-full py-3 rounded-xl font-tactical font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
            isVehicleBusy || isStockDeficit
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 border border-amber-300 shadow-amber-500/25 active:scale-98 cursor-pointer'
          }`}
        >
          <Send className="w-4 h-4 fill-current" />
          <span>DISPATCH TRUCK TO 3D SCENE</span>
        </button>
      </div>
    </div>
  );
};
