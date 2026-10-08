import * as THREE from 'three';
import { VehicleTypeId } from '../types';

export interface TruckMeshComponents {
  root: THREE.Group;
  cab: THREE.Mesh;
  tipperBedGroup: THREE.Group;
  cargoMesh: THREE.Mesh;
  hazardLight: THREE.Mesh;
  headlights: THREE.SpotLight[];
  headlightLenses: THREE.Mesh[];
  wheels: THREE.Mesh[];
  setCargoColor: (hexColor: string) => void;
  setTiltAngle: (radians: number) => void;
  setCargoVisible: (visible: boolean) => void;
  setHazardBlinking: (blinking: boolean, timeSec: number) => void;
  setNightMode: (isNight: boolean) => void;
}

export function createLowPolyTruck(
  vehicleType: VehicleTypeId,
  materialColor: string,
  tripId: string,
  vehicleNumber: string
): TruckMeshComponents {
  const root = new THREE.Group();
  root.name = `Truck_${vehicleNumber}`;
  root.userData = {
    isTruck: true,
    tripId,
    vehicleNumber,
    vehicleType,
  };

  // Materials
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.8,
    metalness: 0.4,
  });

  const cabMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Safety construction orange-yellow
    roughness: 0.4,
    metalness: 0.2,
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.2,
    metalness: 0.9,
  });

  const bedMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46, // Heavy gauge dump body gray
    roughness: 0.6,
    metalness: 0.3,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.95,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.3,
    metalness: 0.8,
  });

  const hazardMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
  });

  const headlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const cargoMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materialColor),
    roughness: 0.9,
    metalness: 0.05,
  });

  // Dimensions based on type
  let length = 7.0;
  let bedLength = 4.2;
  let axleCount = 3; // 10-wheeler default

  if (vehicleType === 'tipper_12') {
    length = 8.5;
    bedLength = 5.4;
    axleCount = 4;
  } else if (vehicleType === 'tipper_6') {
    length = 5.6;
    bedLength = 3.2;
    axleCount = 2;
  } else if (vehicleType === 'tractor_trolley') {
    length = 5.8;
    bedLength = 3.4;
    axleCount = 2;
  }

  const width = 2.4;
  const height = 2.6;

  // 1. Chassis
  const chassisGeo = new THREE.BoxGeometry(width - 0.4, 0.4, length);
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.set(0, 0.7, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // 2. Cab
  const cabLength = 2.0;
  const cabHeight = 1.8;
  const cabGeo = new THREE.BoxGeometry(width - 0.1, cabHeight, cabLength);
  const cab = new THREE.Mesh(cabGeo, cabMat);
  const cabZ = length / 2 - cabLength / 2;
  cab.position.set(0, 0.9 + cabHeight / 2, cabZ);
  cab.castShadow = true;
  root.add(cab);

  // Windshield & Side Windows
  const windshieldGeo = new THREE.BoxGeometry(width - 0.25, 0.75, 0.1);
  const windshield = new THREE.Mesh(windshieldGeo, windowMat);
  windshield.position.set(0, 0.9 + cabHeight * 0.65, cabZ + cabLength / 2 + 0.02);
  root.add(windshield);

  // Radiator Grille
  const grilleGeo = new THREE.BoxGeometry(width - 0.6, 0.6, 0.08);
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const grille = new THREE.Mesh(grilleGeo, grilleMat);
  grille.position.set(0, 0.9 + 0.35, cabZ + cabLength / 2 + 0.02);
  root.add(grille);

  // Exhaust Stack
  const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
  const exhaust = new THREE.Mesh(exhaustGeo, rimMat);
  exhaust.position.set(width / 2 - 0.15, 0.9 + cabHeight * 0.7, cabZ - cabLength / 2 - 0.1);
  root.add(exhaust);

  // Roof Hazard Beacon
  const beaconGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.18, 8);
  const hazardLight = new THREE.Mesh(beaconGeo, hazardMat);
  hazardLight.position.set(0, 0.9 + cabHeight + 0.1, cabZ);
  root.add(hazardLight);

  // Headlights
  const headlights: THREE.SpotLight[] = [];
  const headlightLenses: THREE.Mesh[] = [];

  [-0.75, 0.75].forEach((xOff) => {
    const lensGeo = new THREE.BoxGeometry(0.28, 0.18, 0.08);
    const lens = new THREE.Mesh(lensGeo, headlightMat);
    lens.position.set(xOff, 0.9 + 0.45, cabZ + cabLength / 2 + 0.03);
    root.add(lens);
    headlightLenses.push(lens);

    const spot = new THREE.SpotLight(0xfff7ed, 0, 35, Math.PI / 6, 0.4);
    spot.position.set(xOff, 0.9 + 0.45, cabZ + cabLength / 2 + 0.2);
    spot.target.position.set(xOff, 0, cabZ + cabLength / 2 + 15);
    root.add(spot);
    root.add(spot.target);
    headlights.push(spot);
  });

  // 3. Wheels
  const wheels: THREE.Mesh[] = [];
  const wheelRadius = 0.48;
  const wheelThickness = 0.32;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 12);
  wheelGeo.rotateZ(Math.PI / 2);

  const addWheelAxle = (zPos: number, isDualRear: boolean) => {
    const xOffsets = isDualRear ? [-width / 2 + 0.1, -width / 2 - 0.22, width / 2 - 0.1, width / 2 + 0.22] : [-width / 2 - 0.05, width / 2 + 0.05];
    xOffsets.forEach((xPos) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(xPos, wheelRadius, zPos);
      wheel.castShadow = true;

      // Rim cap
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, wheelThickness + 0.02, 10);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheel.add(rim);

      root.add(wheel);
      wheels.push(wheel);
    });
  };

  // Front steering axle
  addWheelAxle(cabZ, false);

  // Rear axles
  const rearStartZ = -(length / 2 - 1.2);
  if (axleCount === 2) {
    addWheelAxle(rearStartZ, true);
  } else if (axleCount === 3) {
    addWheelAxle(rearStartZ, true);
    addWheelAxle(rearStartZ + 1.2, true);
  } else {
    // 4 axles (tipper 12)
    addWheelAxle(rearStartZ, true);
    addWheelAxle(rearStartZ + 1.15, true);
    addWheelAxle(rearStartZ + 2.3, true);
  }

  // 4. Tipper Dump Bed on Hinge Pivot
  // Rear hinge pivot point at the back chassis
  const tipperBedGroup = new THREE.Group();
  const pivotZ = -length / 2 + 0.4;
  tipperBedGroup.position.set(0, 0.95, pivotZ);

  // Bed container relative to pivot
  const bedBody = new THREE.Group();
  bedBody.position.set(0, 0, (bedLength / 2));

  // Bottom plate
  const bedBottomGeo = new THREE.BoxGeometry(width - 0.1, 0.15, bedLength);
  const bedBottom = new THREE.Mesh(bedBottomGeo, bedMat);
  bedBottom.castShadow = true;
  bedBody.add(bedBottom);

  // Side walls
  const wallHeight = 1.35;
  const leftWallGeo = new THREE.BoxGeometry(0.12, wallHeight, bedLength);
  const leftWall = new THREE.Mesh(leftWallGeo, bedMat);
  leftWall.position.set(-width / 2 + 0.1, wallHeight / 2, 0);
  leftWall.castShadow = true;
  bedBody.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = width / 2 - 0.1;
  bedBody.add(rightWall);

  // Front wall (cab shield)
  const frontWallGeo = new THREE.BoxGeometry(width - 0.1, wallHeight + 0.35, 0.15);
  const frontWall = new THREE.Mesh(frontWallGeo, bedMat);
  frontWall.position.set(0, (wallHeight + 0.35) / 2, bedLength / 2);
  frontWall.castShadow = true;
  bedBody.add(frontWall);

  // Tailgate
  const tailgateGeo = new THREE.BoxGeometry(width - 0.1, wallHeight, 0.12);
  const tailgate = new THREE.Mesh(tailgateGeo, bedMat);
  tailgate.position.set(0, wallHeight / 2, -bedLength / 2);
  tailgate.castShadow = true;
  bedBody.add(tailgate);

  // Material Cargo Heap inside bed
  const cargoGeo = new THREE.ConeGeometry(width * 0.45, 1.1, 7);
  cargoGeo.scale(1.2, 0.9, bedLength * 0.4);
  const cargoMesh = new THREE.Mesh(cargoGeo, cargoMat);
  cargoMesh.position.set(0, 0.55, 0);
  cargoMesh.castShadow = true;
  bedBody.add(cargoMesh);

  tipperBedGroup.add(bedBody);
  root.add(tipperBedGroup);

  // Component controller methods
  const setCargoColor = (hexColor: string) => {
    cargoMat.color.set(hexColor);
  };

  const setTiltAngle = (radians: number) => {
    // Bed tilts upward backwards: positive rotation around X axis
    tipperBedGroup.rotation.x = radians;
  };

  const setCargoVisible = (visible: boolean) => {
    cargoMesh.visible = visible;
  };

  const setHazardBlinking = (blinking: boolean, timeSec: number) => {
    if (!blinking) {
      hazardMat.color.set(0x442200);
    } else {
      const flash = Math.sin(timeSec * 10) > 0;
      hazardMat.color.set(flash ? 0xffaa00 : 0x331500);
    }
  };

  const setNightMode = (isNight: boolean) => {
    const intensity = isNight ? 2.5 : 0;
    headlights.forEach((h) => (h.intensity = intensity));
    headlightMat.color.set(isNight ? 0xffffff : 0xcccccc);
  };

  return {
    root,
    cab,
    tipperBedGroup,
    cargoMesh,
    hazardLight,
    headlights,
    headlightLenses,
    wheels,
    setCargoColor,
    setTiltAngle,
    setCargoVisible,
    setHazardBlinking,
    setNightMode,
  };
}
