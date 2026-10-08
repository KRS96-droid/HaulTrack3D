import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HaulTrackScene } from './scene/HaulTrackScene';
import {
  Trip,
  TripStatus,
  Location,
  Material,
  AlertItem,
  SimulationSpeed,
  CameraPreset,
} from './types';
import {
  INITIAL_MATERIALS,
  INITIAL_LOCATIONS,
  INITIAL_TRIPS,
  INITIAL_ALERTS,
  VEHICLE_TYPES,
} from './services/data';
import { soundEffects } from './services/audio';
import { TopBar } from './components/TopBar';
import { KPIStrip } from './components/KPIStrip';
import { DispatchPanel } from './components/DispatchPanel';
import { DashboardPanel } from './components/DashboardPanel';
import { Minimap } from './components/Minimap';
import { DeliveryChallanModal } from './components/DeliveryChallanModal';
import { DailyReportModal } from './components/DailyReportModal';
import { TruckDetailModal } from './components/TruckDetailModal';
import { LocationDetailModal } from './components/LocationDetailModal';
import { CustomMaterialModal } from './components/CustomMaterialModal';
import { Layers, Crosshair, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export default function App() {
  // --- STATE ---
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [locations, setLocations] = useState<Location[]>(INITIAL_LOCATIONS);
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);

  // Simulation controls
  const [simulationSpeed, setSimulationSpeed] = useState<SimulationSpeed>(5);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffects.getMuted());
  const [useMetricTonnes, setUseMetricTonnes] = useState<boolean>(true);

  // Panels & Modals
  const [isDispatchOpen, setIsDispatchOpen] = useState<boolean>(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(true);
  const [challanTrip, setChallanTrip] = useState<Trip | null>(null);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState<boolean>(false);
  const [isCustomMaterialOpen, setIsCustomMaterialOpen] = useState<boolean>(false);

  // Selected Entities
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [followingTripId, setFollowingTripId] = useState<string | null>(null);

  // 3D Scene Ref
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HaulTrackScene | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fast lookups
  const materialsMap = useMemo(() => {
    const map: Record<string, Material> = {};
    materials.forEach((m) => (map[m.id] = m));
    return map;
  }, [materials]);

  const locationsMap = useMemo(() => {
    const map: Record<string, Location> = {};
    locations.forEach((l) => (map[l.id] = l));
    return map;
  }, [locations]);

  const selectedTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const selectedLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  const followingTrip = useMemo(() => {
    return trips.find((t) => t.id === followingTripId) || null;
  }, [trips, followingTripId]);

  // --- 1. INITIALIZE 3D SCENE ---
  useEffect(() => {
    if (!sceneContainerRef.current) return;

    const scene = new HaulTrackScene(sceneContainerRef.current, {
      onSelectTruck: (tripId: string) => {
        setSelectedTripId(tripId);
        setSelectedLocationId(null);
        setFollowingTripId(tripId);
        soundEffects.playClick();
      },
      onSelectLocation: (locId: string) => {
        setSelectedLocationId(locId);
        setSelectedTripId(null);
        soundEffects.playClick();
      },
    });

    sceneRef.current = scene;

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Sync trips to 3D Scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.syncTrips(trips, materialsMap);
    }
  }, [trips, materialsMap]);

  // Sync stockpile meshes to 3D Scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateStockpileVisuals(locations);
    }
  }, [locations]);

  // Sync Night Mode
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setNightMode(isNightMode);
    }
  }, [isNightMode]);

  // --- 2. SIMULATION STATE MACHINE TICKER ---
  useEffect(() => {
    if (isPaused) return;

    // Simulation runs at 20 ticks per second (50ms interval)
    const intervalMs = 50;
    const interval = setInterval(() => {
      setTrips((prevTrips) => {
        let hasChanges = false;
        let newlyCompletedTrip: Trip | null = null;
        let deliveredEvents: Array<{ siteId: string; matId: string; tonnes: number }> = [];

        const updated = prevTrips.map((trip) => {
          if (trip.status === 'Completed') return trip;

          hasChanges = true;
          // Delayed trips advance 70% slower
          const speedMultiplier = trip.isDelayed ? 0.3 : 1.0;
          // Step progress: 1x = standard, scaled up by simulationSpeed
          const progressDelta = (0.012 * simulationSpeed * speedMultiplier) / 10;
          let nextProgress = trip.phaseProgress + progressDelta;

          if (nextProgress < 1.0) {
            return { ...trip, phaseProgress: nextProgress };
          }

          // Progress >= 1.0: Transition State Machine!
          nextProgress = 0.0;
          let nextStatus: TripStatus = trip.status;

          switch (trip.status) {
            case 'Waiting':
              nextStatus = 'Loading';
              break;

            case 'Loading':
              nextStatus = 'In Transit';
              break;

            case 'In Transit':
              nextStatus = 'Arrived';
              break;

            case 'Arrived':
              nextStatus = 'Unloading';
              soundEffects.playDumpHiss();
              break;

            case 'Unloading':
              // Deliver material payload to destination site!
              deliveredEvents.push({
                siteId: trip.destinationId,
                matId: trip.materialId,
                tonnes: trip.quantityTonnes,
              });
              nextStatus = 'Returning';
              break;

            case 'Returning':
              nextStatus = 'Completed';
              newlyCompletedTrip = { ...trip, status: 'Completed', phaseProgress: 1.0, completedAt: Date.now() };
              soundEffects.playSuccess();
              break;

            default:
              break;
          }

          return {
            ...trip,
            status: nextStatus,
            phaseProgress: nextProgress,
            completedAt: nextStatus === 'Completed' ? Date.now() : trip.completedAt,
          };
        });

        // If deliveries occurred, increase site received stock
        if (deliveredEvents.length > 0) {
          setLocations((prevLocs) =>
            prevLocs.map((loc) => {
              const matchedEvents = deliveredEvents.filter((e) => e.siteId === loc.id);
              if (matchedEvents.length === 0) return loc;

              const updatedRec = { ...(loc.received || {}) };
              matchedEvents.forEach((ev) => {
                updatedRec[ev.matId] = (updatedRec[ev.matId] || 0) + ev.tonnes;
              });

              return {
                ...loc,
                received: updatedRec,
                stocks: { ...loc.stocks, ...updatedRec },
              };
            })
          );
        }

        // Add alert for newly completed trip
        if (newlyCompletedTrip) {
          const finished: Trip = newlyCompletedTrip;
          const mat = materialsMap[finished.materialId];
          const dst = locationsMap[finished.destinationId];
          setAlerts((prevAlerts) => [
            {
              id: `alt-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'success',
              title: 'Delivery Complete',
              message: `${finished.vehicleNumber} delivered ${finished.quantityTonnes.toFixed(1)}T ${mat?.name || 'Material'} to ${dst?.name || 'Site'}.`,
              vehicleNumber: finished.vehicleNumber,
              locationId: finished.destinationId,
            },
            ...prevAlerts.slice(0, 20),
          ]);
        }

        return hasChanges ? updated : prevTrips;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPaused, simulationSpeed, materialsMap, locationsMap]);

  // --- 3. ACTIONS & DISPATCH LOGIC ---

  const handleDispatchTruck = (
    newTripData: Omit<
      Trip,
      | 'id'
      | 'ticketNo'
      | 'phaseProgress'
      | 'createdAt'
      | 'status'
      | 'isDelayed'
      | 'tareWeightTonnes'
      | 'grossWeightTonnes'
      | 'netWeightTonnes'
    >
  ): boolean => {
    const spec = VEHICLE_TYPES[newTripData.vehicleType];
    const tare = spec ? spec.tareWeightTonnes : 9.5;
    const net = newTripData.quantityTonnes;
    const gross = tare + net;

    // Deduct stock from source!
    setLocations((prevLocs) =>
      prevLocs.map((loc) => {
        if (loc.id !== newTripData.sourceId) return loc;
        const currentStock = loc.stocks[newTripData.materialId] || 0;
        const updatedStock = Math.max(0, currentStock - net);
        return {
          ...loc,
          stocks: {
            ...loc.stocks,
            [newTripData.materialId]: updatedStock,
          },
        };
      })
    );

    const ticketNo = `HT-2026-${String(trips.length + 41).padStart(4, '0')}`;
    const newTrip: Trip = {
      ...newTripData,
      id: `trip-${Date.now()}`,
      ticketNo,
      status: 'Waiting',
      phaseProgress: 0.05,
      isDelayed: false,
      tareWeightTonnes: tare,
      grossWeightTonnes: gross,
      netWeightTonnes: net,
      createdAt: Date.now(),
    };

    setTrips((prev) => [newTrip, ...prev]);

    // Add alert
    const src = locationsMap[newTrip.sourceId];
    const dst = locationsMap[newTrip.destinationId];
    const mat = materialsMap[newTrip.materialId];

    setAlerts((prev) => [
      {
        id: `alt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'info',
        title: 'New Trip Dispatched',
        message: `${newTrip.vehicleNumber} dispatched with ${newTrip.quantityTonnes.toFixed(1)}T ${mat?.name} from ${src?.name} to ${dst?.name}.`,
        vehicleNumber: newTrip.vehicleNumber,
        locationId: newTrip.sourceId,
      },
      ...prev.slice(0, 20),
    ]);

    // Automatically follow newly dispatched truck
    setSelectedTripId(newTrip.id);
    setFollowingTripId(newTrip.id);
    if (sceneRef.current) {
      sceneRef.current.followTruck(newTrip.id);
    }

    return true;
  };

  const handleAdvanceTripPhase = (tripId: string) => {
    setTrips((prevTrips) =>
      prevTrips.map((trip) => {
        if (trip.id !== tripId || trip.status === 'Completed') return trip;

        let nextStatus: TripStatus = trip.status;
        switch (trip.status) {
          case 'Waiting':
            nextStatus = 'Loading';
            break;
          case 'Loading':
            nextStatus = 'In Transit';
            break;
          case 'In Transit':
            nextStatus = 'Arrived';
            break;
          case 'Arrived':
            nextStatus = 'Unloading';
            soundEffects.playDumpHiss();
            break;
          case 'Unloading':
            // Deliver material
            setLocations((locs) =>
              locs.map((loc) => {
                if (loc.id !== trip.destinationId) return loc;
                const rec = { ...(loc.received || {}) };
                rec[trip.materialId] = (rec[trip.materialId] || 0) + trip.quantityTonnes;
                return { ...loc, received: rec, stocks: { ...loc.stocks, ...rec } };
              })
            );
            nextStatus = 'Returning';
            break;
          case 'Returning':
            nextStatus = 'Completed';
            soundEffects.playSuccess();
            break;
        }

        return {
          ...trip,
          status: nextStatus,
          phaseProgress: nextStatus === 'Completed' ? 1.0 : 0.05,
          completedAt: nextStatus === 'Completed' ? Date.now() : trip.completedAt,
        };
      })
    );
  };

  const handleToggleTripDelay = (tripId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        const newDelay = !trip.isDelayed;
        if (newDelay) {
          soundEffects.playAlert();
          setAlerts((al) => [
            {
              id: `alt-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'warning',
              title: 'Vehicle Delay Reported',
              message: `${trip.vehicleNumber} flagged for highway delay / transit breakdown.`,
              vehicleNumber: trip.vehicleNumber,
            },
            ...al.slice(0, 20),
          ]);
        }
        return { ...trip, isDelayed: newDelay };
      })
    );
  };

  const handleAddCustomMaterial = (newMat: Material) => {
    setMaterials((prev) => [...prev, newMat]);
    setAlerts((prev) => [
      {
        id: `alt-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'info',
        title: 'Custom Material Registered',
        message: `${newMat.name} added to logistics catalogue with density ${newMat.density} T/m³.`,
      },
      ...prev.slice(0, 20),
    ]);
  };

  // --- 4. EXPORT & BACKUP UTILITIES ---

  const handleExportCsv = () => {
    const headers = [
      'Ticket No',
      'Vehicle Number',
      'Vehicle Type',
      'Driver Name',
      'Driver Phone',
      'Material',
      'Quantity (Tonnes)',
      'Volume (m3)',
      'Source',
      'Destination',
      'Dispatch Time',
      'Status',
      'Is Delayed',
      'Gross Weight (T)',
      'Tare Weight (T)',
      'Net Weight (T)',
    ];

    const rows = trips.map((t) => [
      t.ticketNo,
      t.vehicleNumber,
      t.vehicleType,
      `"${t.driverName}"`,
      t.driverPhone,
      `"${materialsMap[t.materialId]?.name || t.materialId}"`,
      t.quantityTonnes.toFixed(2),
      t.quantityM3.toFixed(2),
      `"${locationsMap[t.sourceId]?.name || t.sourceId}"`,
      `"${locationsMap[t.destinationId]?.name || t.destinationId}"`,
      t.dispatchTime,
      t.status,
      t.isDelayed ? 'YES' : 'NO',
      t.grossWeightTonnes.toFixed(2),
      t.tareWeightTonnes.toFixed(2),
      t.netWeightTonnes.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HaulTrack_Deliveries_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const data = {
      materials,
      locations,
      trips,
      alerts,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HaulTrack_State_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.materials) setMaterials(json.materials);
        if (json.locations) setLocations(json.locations);
        if (json.trips) setTrips(json.trips);
        if (json.alerts) setAlerts(json.alerts);
        soundEffects.playSuccess();
      } catch (err) {
        alert('Invalid JSON state backup file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col select-none">
      {/* Hidden File Input for JSON restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TOP NAVIGATION BAR */}
      <TopBar
        simulationSpeed={simulationSpeed}
        isPaused={isPaused}
        isNightMode={isNightMode}
        isMuted={isMuted}
        followingTruckId={followingTripId}
        followingTruckNo={followingTrip?.vehicleNumber}
        onSpeedChange={setSimulationSpeed}
        onTogglePause={() => setIsPaused(!isPaused)}
        onToggleNightMode={() => setIsNightMode(!isNightMode)}
        onToggleMute={() => setIsMuted(soundEffects.toggleMute())}
        onCameraPreset={(preset: CameraPreset) => {
          soundEffects.playClick();
          sceneRef.current?.setCameraPreset(preset);
          setFollowingTripId(null);
        }}
        onUnfollowTruck={() => {
          setFollowingTripId(null);
          sceneRef.current?.followTruck(null);
        }}
        onOpenDispatch={() => {
          soundEffects.playClick();
          setIsDispatchOpen(true);
        }}
        onOpenDailyReport={() => {
          soundEffects.playClick();
          setIsDailyReportOpen(true);
        }}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* 3D WEBGL CANVAS VIEWPORT */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <div ref={sceneContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Toggle Buttons for Panels */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          {!isDispatchOpen && (
            <button
              onClick={() => {
                soundEffects.playClick();
                setIsDispatchOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md border border-neutral-800 text-xs font-tactical font-semibold text-amber-400 shadow-xl flex items-center gap-1.5 transition-all"
            >
              <span>+ Dispatch Panel</span>
            </button>
          )}
        </div>

        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {!isDashboardOpen && (
            <button
              onClick={() => {
                soundEffects.playClick();
                setIsDashboardOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md border border-neutral-800 text-xs font-tactical font-semibold text-neutral-200 shadow-xl flex items-center gap-1.5 transition-all"
            >
              <span>Operations Desk</span>
              <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>

        {/* BOTTOM HUD STRIP */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex items-end justify-between gap-4">
          {/* Radar Minimap (Bottom Left) */}
          <div className="pointer-events-auto">
            <Minimap
              locations={locations}
              trips={trips}
              materialsMap={materialsMap}
              followingTripId={followingTripId}
              onSelectLocation={(locId) => {
                setSelectedLocationId(locId);
                setSelectedTripId(null);
                const loc = locationsMap[locId];
                if (loc && sceneRef.current) {
                  sceneRef.current.setCameraPreset(loc.subType as CameraPreset);
                }
              }}
              onSelectTrip={(tripId) => {
                setSelectedTripId(tripId);
                setSelectedLocationId(null);
                setFollowingTripId(tripId);
                sceneRef.current?.followTruck(tripId);
              }}
            />
          </div>

          {/* Central KPI Metrics Bar */}
          <div className="pointer-events-auto hidden md:block">
            <KPIStrip
              trips={trips}
              useMetricTonnes={useMetricTonnes}
              onToggleUnit={() => setUseMetricTonnes(!useMetricTonnes)}
            />
          </div>

          {/* Quick Camera Reset / Controls Help */}
          <div className="pointer-events-auto hidden lg:flex items-center gap-2 bg-neutral-900/85 backdrop-blur-md border border-neutral-800 px-3 py-2 rounded-xl text-[10px] font-mono text-neutral-400">
            <span>🖱️ Drag: Orbit</span>
            <span>•</span>
            <span>Shift+Drag: Pan</span>
            <span>•</span>
            <span>Wheel: Zoom</span>
            <span>•</span>
            <span>Click 3D Object to Inspect</span>
          </div>
        </div>

        {/* INSPECTION OVERLAYS */}
        {selectedTrip && (
          <TruckDetailModal
            trip={selectedTrip}
            onClose={() => setSelectedTripId(null)}
            locationsMap={locationsMap}
            materialsMap={materialsMap}
            isFollowed={followingTripId === selectedTrip.id}
            onToggleFollow={(tripId) => {
              if (followingTripId === tripId) {
                setFollowingTripId(null);
                sceneRef.current?.followTruck(null);
              } else {
                setFollowingTripId(tripId);
                sceneRef.current?.followTruck(tripId);
              }
            }}
            onAdvancePhase={handleAdvanceTripPhase}
            onToggleDelay={handleToggleTripDelay}
            onOpenChallan={(trip) => setChallanTrip(trip)}
          />
        )}

        {selectedLocation && (
          <LocationDetailModal
            location={selectedLocation}
            onClose={() => setSelectedLocationId(null)}
            materialsMap={materialsMap}
            trips={trips}
            onOpenDispatch={() => {
              setIsDispatchOpen(true);
              setSelectedLocationId(null);
            }}
            onSelectTrip={(tripId) => {
              setSelectedTripId(tripId);
              setSelectedLocationId(null);
              setFollowingTripId(tripId);
              sceneRef.current?.followTruck(tripId);
            }}
          />
        )}
      </main>

      {/* DISPATCH FORM (LEFT PANEL) */}
      <DispatchPanel
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        materials={materials}
        locations={locations}
        activeTrips={trips}
        onDispatchTruck={handleDispatchTruck}
        onOpenCustomMaterial={() => setIsCustomMaterialOpen(true)}
      />

      {/* DASHBOARD OPERATIONS DESK (RIGHT PANEL) */}
      <DashboardPanel
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        trips={trips}
        locations={locations}
        materials={materials}
        alerts={alerts}
        followingTripId={followingTripId}
        onFocusTruck={(tripId) => {
          setSelectedTripId(tripId);
          setFollowingTripId(tripId);
          sceneRef.current?.followTruck(tripId);
          soundEffects.playClick();
        }}
        onAdvanceTripPhase={handleAdvanceTripPhase}
        onToggleTripDelay={handleToggleTripDelay}
        onOpenChallan={(trip) => setChallanTrip(trip)}
        onSelectLocation={(locId) => {
          setSelectedLocationId(locId);
          setSelectedTripId(null);
          const loc = locationsMap[locId];
          if (loc && sceneRef.current) {
            sceneRef.current.setCameraPreset(loc.subType as CameraPreset);
          }
        }}
      />

      {/* MODAL: DELIVERY CHALLAN (WEIGHBRIDGE E-WAY BILL) */}
      <DeliveryChallanModal
        trip={challanTrip}
        onClose={() => setChallanTrip(null)}
        locationsMap={locationsMap}
        materialsMap={materialsMap}
      />

      {/* MODAL: DAILY REPORT */}
      <DailyReportModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
        trips={trips}
        locations={locations}
        materials={materials}
        onExportCsv={handleExportCsv}
      />

      {/* MODAL: CUSTOM MATERIAL CREATOR */}
      <CustomMaterialModal
        isOpen={isCustomMaterialOpen}
        onClose={() => setIsCustomMaterialOpen(false)}
        onAddMaterial={handleAddCustomMaterial}
      />
    </div>
  );
}
