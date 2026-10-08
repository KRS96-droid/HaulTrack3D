import React, { useState } from 'react';
import {
  X,
  Truck,
  Box,
  BarChart3,
  Bell,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  FileText,
  Crosshair,
  FastForward,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Trip, TripStatus, Location, Material, AlertItem } from '../types';
import { soundEffects } from '../services/audio';

interface DashboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  locations: Location[];
  materials: Material[];
  alerts: AlertItem[];
  followingTripId: string | null;
  onFocusTruck: (tripId: string) => void;
  onAdvanceTripPhase: (tripId: string) => void;
  onToggleTripDelay: (tripId: string) => void;
  onOpenChallan: (trip: Trip) => void;
  onSelectLocation: (locationId: string) => void;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  isOpen,
  onClose,
  trips,
  locations,
  materials,
  alerts,
  followingTripId,
  onFocusTruck,
  onAdvanceTripPhase,
  onToggleTripDelay,
  onOpenChallan,
  onSelectLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'trips' | 'stocks' | 'charts' | 'alerts'>('trips');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const materialsMap = React.useMemo(() => {
    const map: Record<string, Material> = {};
    materials.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [materials]);

  const locationsMap = React.useMemo(() => {
    const map: Record<string, Location> = {};
    locations.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [locations]);

  // Status badge styling
  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'Waiting':
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
      case 'Loading':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse';
      case 'In Transit':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Arrived':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'Unloading':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse';
      case 'Returning':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/40';
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  // Filtered trips
  const filteredTrips = trips.filter((trip) => {
    if (statusFilter !== 'ALL' && trip.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVehicle = trip.vehicleNumber.toLowerCase().includes(q);
      const matchDriver = trip.driverName.toLowerCase().includes(q);
      const matchTicket = trip.ticketNo.toLowerCase().includes(q);
      const matchMat = materialsMap[trip.materialId]?.name.toLowerCase().includes(q);
      if (!matchVehicle && !matchDriver && !matchTicket && !matchMat) {
        return false;
      }
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-neutral-950/95 backdrop-blur-md border-l border-neutral-800 shadow-2xl z-40 flex flex-col select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
          <h2 className="text-white font-tactical font-bold text-sm tracking-wide">OPERATIONS CONTROL DESK</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/30 text-xs font-mono">
        <button
          onClick={() => setActiveTab('trips')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'trips'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Trips ({trips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stocks')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'stocks'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'charts'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all relative ${
            activeTab === 'alerts'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5 font-bold'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alerts</span>
          {alerts.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {/* ================= TAB 1: LIVE TRIPS ================= */}
        {activeTab === 'trips' && (
          <div className="space-y-3">
            {/* Search & Status Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by vehicle, ticket, driver..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-neutral-200 text-xs placeholder:text-neutral-500 outline-none focus:border-amber-500"
                />
              </div>

              {/* Status pill filters */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] font-mono">
                {['ALL', 'Waiting', 'Loading', 'In Transit', 'Arrived', 'Unloading', 'Returning', 'Completed'].map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-0.5 rounded border whitespace-nowrap transition-colors ${
                        statusFilter === st
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Trip Cards */}
            <div className="space-y-2.5">
              {filteredTrips.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 font-mono">
                  No trips matching filter criteria.
                </div>
              ) : (
                filteredTrips.map((trip) => {
                  const mat = materialsMap[trip.materialId];
                  const src = locationsMap[trip.sourceId];
                  const dst = locationsMap[trip.destinationId];
                  const isFollowed = followingTripId === trip.id;

                  return (
                    <div
                      key={trip.id}
                      className={`bg-neutral-900/70 border rounded-xl p-3 transition-all ${
                        isFollowed
                          ? 'border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-500/10'
                          : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-white text-xs">{trip.vehicleNumber}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono border font-semibold ${getStatusBadge(
                                trip.status
                              )}`}
                            >
                              {trip.status}
                            </span>
                            {trip.isDelayed && (
                              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                                DELAYED
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex items-center gap-1.5">
                            <span>{trip.ticketNo}</span>
                            <span>•</span>
                            <span>{trip.driverName}</span>
                          </div>
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-1">
                          {/* Follow in 3D Camera */}
                          <button
                            onClick={() => onFocusTruck(trip.id)}
                            className={`p-1.5 rounded transition-colors ${
                              isFollowed
                                ? 'bg-amber-500 text-black font-bold'
                                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                            }`}
                            title="Focus & Follow Truck in 3D"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                          </button>

                          {/* View Challan */}
                          <button
                            onClick={() => onOpenChallan(trip)}
                            className="p-1.5 rounded bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
                            title="View Weighbridge E-Way Challan"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Material & Route Details */}
                      <div className="bg-neutral-950/60 rounded-lg p-2 mb-2 border border-neutral-850">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-black/50"
                              style={{ backgroundColor: mat?.color || '#f59e0b' }}
                            />
                            <span className="font-semibold text-neutral-200 text-[11px]">{mat?.name}</span>
                          </div>
                          <span className="font-tactical font-bold text-amber-400 text-xs">
                            {trip.quantityTonnes.toFixed(1)} T <span className="text-[10px] text-neutral-400 font-mono font-normal">({trip.quantityM3.toFixed(1)} m³)</span>
                          </span>
                        </div>

                        {/* Route Path */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                          <span className="truncate max-w-[130px]" title={src?.name}>
                            {src?.code || 'SRC'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-neutral-500 shrink-0" />
                          <span className="truncate max-w-[130px] text-right" title={dst?.name}>
                            {dst?.code || 'DST'}
                          </span>
                        </div>
                      </div>

                      {/* Phase Progress Bar */}
                      <div className="space-y-1 mb-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                          <span>Lifecycle Progress</span>
                          <span>{Math.round(trip.phaseProgress * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              trip.isDelayed ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}
                            style={{ width: `${Math.max(4, Math.round(trip.phaseProgress * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom action controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[11px]">
                        {/* Toggle Delay flag */}
                        <button
                          onClick={() => onToggleTripDelay(trip.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                            trip.isDelayed
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>{trip.isDelayed ? 'Clear Delay' : 'Flag Delay'}</span>
                        </button>

                        {/* Advance State Machine */}
                        {trip.status !== 'Completed' ? (
                          <button
                            onClick={() => {
                              soundEffects.playClick();
                              onAdvanceTripPhase(trip.id);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-semibold transition-colors"
                          >
                            <span>Advance Phase</span>
                            <FastForward className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Delivered
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: STOCK LEVELS & INVENTORY ================= */}
        {activeTab === 'stocks' && (
          <div className="space-y-4">
            {/* Sources Section */}
            <div>
              <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-amber-400" />
                <span>SOURCE QUARRIES & PLANTS (BUFFER STOCK)</span>
              </div>

              <div className="space-y-2.5">
                {locations
                  .filter((l) => l.type === 'source')
                  .map((source) => {
                    const totalTonnage = Object.values(source.stocks).reduce((a, b) => a + b, 0);

                    return (
                      <div
                        key={source.id}
                        className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3 hover:border-neutral-700 transition-colors cursor-pointer"
                        onClick={() => onSelectLocation(source.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-white">{source.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              Supervisor: {source.supervisor} • {source.phone}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-tactical font-bold text-amber-400">{totalTonnage.toFixed(0)} T</div>
                            <div className="text-[9px] text-neutral-400 font-mono">Total on-site</div>
                          </div>
                        </div>

                        {/* Stock Bars */}
                        <div className="space-y-1.5 pt-1 border-t border-neutral-800">
                          {Object.entries(source.stocks).map(([matId, qty]) => {
                            const mat = materialsMap[matId];
                            const pct = Math.min(100, Math.round((qty / 800) * 100));

                            return (
                              <div key={matId} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-neutral-300 flex items-center gap-1">
                                    <span
                                      className="w-2 h-2 rounded-full inline-block"
                                      style={{ backgroundColor: mat?.color || '#ccc' }}
                                    />
                                    {mat?.name || matId}
                                  </span>
                                  <span className="text-neutral-400">{qty.toFixed(1)} T</span>
                                </div>
                                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: mat?.color || '#f59e0b',
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Sites Section */}
            <div>
              <div className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>CONSTRUCTION SITES (DELIVERED VS DEMAND)</span>
              </div>

              <div className="space-y-2.5">
                {locations
                  .filter((l) => l.type === 'destination')
                  .map((site) => {
                    const totalRec = site.received
                      ? Object.values(site.received).reduce((a, b) => a + b, 0)
                      : 0;
                    const totalDem = site.demand
                      ? Object.values(site.demand).reduce((a, b) => a + b, 0)
                      : 1;
                    const overallPct = Math.min(100, Math.round((totalRec / totalDem) * 100));

                    return (
                      <div
                        key={site.id}
                        className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3 hover:border-neutral-700 transition-colors cursor-pointer"
                        onClick={() => onSelectLocation(site.id)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <div className="font-semibold text-white">{site.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              Engineer: {site.supervisor}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-tactical font-bold text-emerald-400 text-sm">
                              {overallPct}%
                            </span>
                            <div className="text-[9px] text-neutral-400 font-mono">
                              {totalRec.toFixed(0)} / {totalDem.toFixed(0)} T
                            </div>
                          </div>
                        </div>

                        {/* Breakdown per material */}
                        {site.demand && (
                          <div className="space-y-1.5 pt-1.5 border-t border-neutral-800">
                            {Object.entries(site.demand).map(([matId, targetQty]) => {
                              const mat = materialsMap[matId];
                              const receivedQty = site.received?.[matId] || 0;
                              const pct = Math.min(100, Math.round((receivedQty / targetQty) * 100));

                              return (
                                <div key={matId} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[10px] font-mono">
                                    <span className="text-neutral-300 flex items-center gap-1">
                                      <span
                                        className="w-2 h-2 rounded-full inline-block"
                                        style={{ backgroundColor: mat?.color || '#ccc' }}
                                      />
                                      {mat?.name || matId}
                                    </span>
                                    <span className="text-neutral-400">
                                      {receivedQty.toFixed(1)} / {targetQty} T ({pct}%)
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-300"
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
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CHARTS & ANALYTICS ================= */}
        {activeTab === 'charts' && (
          <div className="space-y-4">
            {/* Delivered by Site */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3">
              <h3 className="text-white font-tactical font-bold text-xs uppercase mb-3 flex items-center justify-between">
                <span>Material Deliveries by Site</span>
                <span className="text-[10px] text-neutral-400 font-mono font-normal">Tonnage (T)</span>
              </h3>
              <div className="space-y-3">
                {locations
                  .filter((l) => l.type === 'destination')
                  .map((site) => {
                    const delivered = site.received
                      ? Object.values(site.received).reduce((a, b) => a + b, 0)
                      : 0;
                    const maxRef = 800;
                    const pct = Math.min(100, Math.round((delivered / maxRef) * 100));

                    return (
                      <div key={site.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-200 font-medium">{site.name}</span>
                          <span className="text-amber-400 font-mono font-bold">{delivered.toFixed(1)} T</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Material Distribution Breakdown */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3">
              <h3 className="text-white font-tactical font-bold text-xs uppercase mb-3">
                Material Share in Transit & Delivered
              </h3>
              <div className="space-y-2">
                {materials.map((mat) => {
                  const deliveredForMat = locations
                    .filter((l) => l.type === 'destination')
                    .reduce((sum, l) => sum + (l.received?.[mat.id] || 0), 0);

                  return (
                    <div key={mat.id} className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-sm border border-black/50"
                          style={{ backgroundColor: mat.color }}
                        />
                        <span className="text-neutral-300">{mat.name}</span>
                      </div>
                      <span className="text-neutral-400 font-bold">{deliveredForMat.toFixed(1)} T</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fleet Utilization Metric */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3">
              <h3 className="text-white font-tactical font-bold text-xs uppercase mb-2">
                Fleet Performance Indicators
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 font-mono uppercase">Avg Trip Time</div>
                  <div className="text-amber-400 font-tactical text-base font-bold">27.4 min</div>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 font-mono uppercase">On-Time Rate</div>
                  <div className="text-emerald-400 font-tactical text-base font-bold">94.2%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: ALERTS FEED ================= */}
        {activeTab === 'alerts' && (
          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 font-mono">
                No active logistics alerts.
              </div>
            ) : (
              alerts.map((alt) => {
                let badgeClass = 'border-blue-500/40 bg-blue-950/20 text-blue-300';
                if (alt.type === 'warning') badgeClass = 'border-amber-500/40 bg-amber-950/20 text-amber-300';
                if (alt.type === 'error') badgeClass = 'border-red-500/40 bg-red-950/20 text-red-300';
                if (alt.type === 'success') badgeClass = 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300';

                return (
                  <div
                    key={alt.id}
                    className={`border rounded-xl p-3 text-xs ${badgeClass} space-y-1`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{alt.title}</span>
                      <span className="text-[10px] font-mono text-neutral-400">{alt.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-neutral-300">{alt.message}</div>
                    {alt.vehicleNumber && (
                      <div className="text-[10px] font-mono text-neutral-400">
                        Vehicle: {alt.vehicleNumber}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
