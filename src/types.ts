export type MaterialId = string;

export interface Material {
  id: MaterialId;
  name: string;
  density: number; // tonnes per cubic metre (default ~1.6)
  color: string; // Hex color code
  description: string;
  isCustom?: boolean;
}

export type VehicleTypeId = 'tipper_10' | 'tipper_12' | 'tipper_6' | 'tractor_trolley';

export interface VehicleTypeInfo {
  id: VehicleTypeId;
  name: string;
  wheels: number;
  tareWeightTonnes: number;
  maxCapacityTonnes: number;
  maxCapacityM3: number;
  description: string;
}

export type LocationType = 'source' | 'destination';
export type LocationSubType = 'quarry' | 'crusher' | 'stockpile' | 'site_metro' | 'site_highway' | 'site_building';

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  subType: LocationSubType;
  position: [number, number, number]; // [x, y, z] in 3D scene
  supervisor: string;
  phone: string;
  stocks: Record<string, number>; // materialId -> current quantity in tonnes
  demand?: Record<string, number>; // materialId -> target capacity in tonnes (for sites)
  received?: Record<string, number>; // materialId -> total delivered tonnes
  description: string;
}

export type TripStatus =
  | 'Waiting'
  | 'Loading'
  | 'In Transit'
  | 'Arrived'
  | 'Unloading'
  | 'Returning'
  | 'Completed';

export interface Trip {
  id: string;
  ticketNo: string;
  vehicleNumber: string;
  vehicleType: VehicleTypeId;
  driverName: string;
  driverPhone: string;
  materialId: MaterialId;
  quantityTonnes: number;
  quantityM3: number;
  sourceId: string;
  destinationId: string;
  dispatchTime: string;
  estimatedMinutes: number;
  status: TripStatus;
  phaseProgress: number; // 0.0 to 1.0 within current status
  isDelayed: boolean;
  delayReason?: string;
  notes?: string;
  tareWeightTonnes: number;
  grossWeightTonnes: number;
  netWeightTonnes: number;
  createdAt: number; // timestamp
  completedAt?: number;
  // Live GPS/3D coordinates for tracking
  currentPos?: [number, number, number];
  currentRotationY?: number;
}

export interface AlertItem {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  vehicleNumber?: string;
  locationId?: string;
}

export type SimulationSpeed = 1 | 5 | 10 | 30 | 60;

export type CameraPreset =
  | 'overview'
  | 'quarry'
  | 'crusher'
  | 'stockpile'
  | 'site_metro'
  | 'site_highway'
  | 'site_building';
