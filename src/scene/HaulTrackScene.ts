import * as THREE from 'three';
import { Trip, Location, CameraPreset } from '../types';
import { RoadNetwork } from './RoadNetwork';
import { createLowPolyTruck, TruckMeshComponents } from './TruckMesh';

export interface SceneCallbacks {
  onSelectTruck?: (tripId: string) => void;
  onSelectLocation?: (locationId: string) => void;
}

export class HaulTrackScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private roadNetwork: RoadNetwork;
  private callbacks: SceneCallbacks;

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private floodlights: THREE.PointLight[] = [];
  private isNightMode: boolean = false;

  // Trucks
  private truckMeshes: Map<string, TruckMeshComponents> = new Map();
  private wheelRotation = 0;

  // Dynamic Stockpile Meshes
  private sourcePiles: Map<string, THREE.Mesh> = new Map();
  private sitePiles: Map<string, THREE.Mesh> = new Map();

  // Animated elements (cranes, excavators)
  private metroCraneArm: THREE.Group | null = null;
  private excavatorCabin: THREE.Group | null = null;
  private conveyorBelts: THREE.Mesh[] = [];

  // Camera navigation & controls
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraPos = new THREE.Vector3(0, 95, 115);
  private desiredCameraPos = new THREE.Vector3(0, 95, 115);
  private desiredTarget = new THREE.Vector3(0, 0, 0);
  private followingTripId: string | null = null;

  // Mouse & Touch Orbit Controls state
  private isDragging = false;
  private isPanning = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private spherical = { radius: 150, theta: Math.PI / 4, phi: Math.PI / 3.8 };

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();

  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();

  constructor(container: HTMLElement, callbacks: SceneCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep industrial navy
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0035);

    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 1, 1000);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraTarget);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 3. Lighting
    this.ambientLight = new THREE.AmbientLight(0xcfd8dc, 0.7);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    this.dirLight.position.set(120, 180, 90);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 450;
    const d = 140;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 4. Road Network
    this.roadNetwork = new RoadNetwork();
    this.scene.add(this.roadNetwork.createRoadMeshGroup());

    // 5. Build Environment
    this.buildTerrain();
    this.buildQuarry();
    this.buildCrusherPlant();
    this.buildStockpileDepot();
    this.buildMetroSite();
    this.buildHighwaySite();
    this.buildCommercialBuildingSite();

    // 6. Event listeners
    this.setupEventListeners();

    // 7. Start render loop
    this.animate();
  }

  // --- SCENE BUILDERS ---

  private buildTerrain() {
    // Stylized terrain ground plane
    const groundGeo = new THREE.PlaneGeometry(360, 360, 48, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1b2028, // Dark slate earth
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Perimeter low-poly hills/berms
    const bermGeo = new THREE.ConeGeometry(24, 14, 6);
    const bermMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 1.0,
      flatShading: true,
    });

    const bermPositions = [
      [-140, 7, -140], [-60, 6, -145], [40, 8, -150], [130, 9, -135],
      [-150, 7, 0], [150, 8, -20], [-140, 6, 120], [140, 7, 130],
      [-40, 7, 150], [60, 8, 145]
    ];

    bermPositions.forEach(([x, y, z]) => {
      const hill = new THREE.Mesh(bermGeo, bermMat);
      hill.position.set(x, y, z);
      hill.scale.set(1 + Math.random() * 0.4, 0.8 + Math.random() * 0.5, 1 + Math.random() * 0.4);
      hill.receiveShadow = true;
      this.scene.add(hill);
    });
  }

  private addFloodlight(x: number, y: number, z: number, color = 0xffe8bb) {
    // Mast
    const mastGeo = new THREE.CylinderGeometry(0.2, 0.35, y, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.6 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(x, y / 2, z);
    mast.castShadow = true;
    this.scene.add(mast);

    // Lamp head
    const lampGeo = new THREE.BoxGeometry(1.2, 0.4, 0.8);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(x, y + 0.2, z);
    this.scene.add(lamp);

    // Light source
    const light = new THREE.PointLight(color, 0, 45, 1.2);
    light.position.set(x, y + 0.1, z);
    this.scene.add(light);
    this.floodlights.push(light);
  }

  private buildQuarry() {
    const qGroup = new THREE.Group();
    qGroup.position.set(-75, 0, -65);
    qGroup.name = 'Location_source_quarry';
    qGroup.userData = { isLocation: true, locationId: 'source_quarry' };

    // Terraced quarry pit steps
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(18 - i * 4, 25 - i * 4, 16);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x333b47,
        roughness: 0.95,
        flatShading: true,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.5 - i * 1.4;
      ring.receiveShadow = true;
      qGroup.add(ring);
    }

    // Excavator 3D model
    const excGroup = new THREE.Group();
    excGroup.position.set(-6, 0, 4);

    // Tracks
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const track1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 4.2), trackMat);
    track1.position.set(-1.2, 0.35, 0);
    const track2 = track1.clone();
    track2.position.x = 1.2;
    excGroup.add(track1, track2);

    // Rotating Cabin
    const cabin = new THREE.Group();
    cabin.position.set(0, 0.75, 0);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 3.4), bodyMat);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    cabin.add(body);

    // Boom & Arm
    const boomMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.6), boomMat);
    boom.position.set(0, 2.6, 2.0);
    boom.rotation.x = Math.PI / 4;
    boom.castShadow = true;
    cabin.add(boom);

    // Bucket
    const bucketMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
    const bucket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.2), bucketMat);
    bucket.position.set(0, 3.8, 4.2);
    bucket.rotation.x = -Math.PI / 6;
    cabin.add(bucket);

    excGroup.add(cabin);
    this.excavatorCabin = cabin;
    qGroup.add(excGroup);

    // Stockpile pile cone
    const pileGeo = new THREE.ConeGeometry(5.5, 3.8, 12);
    const pileMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373, // GSB / quarry rock
      roughness: 0.9,
      flatShading: true,
    });
    const pile = new THREE.Mesh(pileGeo, pileMat);
    pile.position.set(8, 1.9, -6);
    pile.castShadow = true;
    pile.receiveShadow = true;
    qGroup.add(pile);
    this.sourcePiles.set('source_quarry', pile);

    // Loading platform / hazard zone
    const padGeo = new THREE.PlaneGeometry(12, 10);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x262e3b, roughness: 0.8 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.12, 0);
    pad.receiveShadow = true;
    qGroup.add(pad);

    this.scene.add(qGroup);
    this.addFloodlight(-75, 12, -65);
  }

  private buildCrusherPlant() {
    const cGroup = new THREE.Group();
    cGroup.position.set(0, 0, -85);
    cGroup.name = 'Location_source_crusher';
    cGroup.userData = { isLocation: true, locationId: 'source_crusher' };

    // Primary Hopper
    const hopperMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.6 });
    const hopperGeo = new THREE.CylinderGeometry(5.5, 2.5, 5, 8);
    const hopper = new THREE.Mesh(hopperGeo, hopperMat);
    hopper.position.set(-6, 3.5, 0);
    hopper.castShadow = true;
    cGroup.add(hopper);

    // Structural tower
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 6), towerMat);
    tower.position.set(6, 4.5, -4);
    tower.castShadow = true;
    cGroup.add(tower);

    // Conveyor belt
    const convGeo = new THREE.BoxGeometry(1.6, 0.4, 16);
    const convMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    const conveyor = new THREE.Mesh(convGeo, convMat);
    conveyor.position.set(0, 5.0, -2);
    conveyor.rotation.x = -0.22;
    conveyor.rotation.y = 0.6;
    conveyor.castShadow = true;
    cGroup.add(conveyor);
    this.conveyorBelts.push(conveyor);

    // Material discharge pile
    const pileGeo = new THREE.ConeGeometry(5.2, 3.6, 12);
    const pileMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Jelly coarse basalt
      roughness: 0.9,
      flatShading: true,
    });
    const pile = new THREE.Mesh(pileGeo, pileMat);
    pile.position.set(10, 1.8, 6);
    pile.castShadow = true;
    pile.receiveShadow = true;
    cGroup.add(pile);
    this.sourcePiles.set('source_crusher', pile);

    this.scene.add(cGroup);
    this.addFloodlight(0, 14, -85);
  }

  private buildStockpileDepot() {
    const sGroup = new THREE.Group();
    sGroup.position.set(75, 0, -60);
    sGroup.name = 'Location_source_stockpile';
    sGroup.userData = { isLocation: true, locationId: 'source_stockpile' };

    // Concrete bay dividers
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    for (let i = -1; i <= 1; i++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 2.5, 0.6), wallMat);
      wall.position.set(0, 1.25, i * 7);
      wall.castShadow = true;
      sGroup.add(wall);
    }

    // Material heaps in bays (Sand golden, GSB tan, Dust pale)
    const sandPileMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.85, flatShading: true });
    const sandPile = new THREE.Mesh(new THREE.ConeGeometry(4.8, 3.5, 12), sandPileMat);
    sandPile.position.set(-2, 1.75, -3.5);
    sandPile.castShadow = true;
    sGroup.add(sandPile);
    this.sourcePiles.set('source_stockpile', sandPile);

    // Site portacabin office
    const officeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const office = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 3.2), officeMat);
    office.position.set(-10, 1.4, 8);
    office.castShadow = true;
    sGroup.add(office);

    // Weighbridge scale pad
    const wbGeo = new THREE.BoxGeometry(5.0, 0.25, 10.0);
    const wbMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const weighbridge = new THREE.Mesh(wbGeo, wbMat);
    weighbridge.position.set(0, 0.15, 8);
    sGroup.add(weighbridge);

    this.scene.add(sGroup);
    this.addFloodlight(75, 12, -60);
  }

  private buildMetroSite() {
    const mGroup = new THREE.Group();
    mGroup.position.set(-75, 0, 65);
    mGroup.name = 'Location_site_metro';
    mGroup.userData = { isLocation: true, locationId: 'site_metro' };

    // Concrete viaduct piers under construction
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    for (let x = -8; x <= 8; x += 8) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 7, 12), pierMat);
      col.position.set(x, 3.5, -4);
      col.castShadow = true;
      mGroup.add(col);

      // Pier cap hammerhead
      const cap = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 3), pierMat);
      cap.position.set(x, 7.5, -4);
      cap.castShadow = true;
      mGroup.add(cap);
    }

    // Tower Crane
    const craneGroup = new THREE.Group();
    craneGroup.position.set(8, 0, 4);

    const mastMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 1.2), mastMat);
    mast.position.y = 9;
    mast.castShadow = true;
    craneGroup.add(mast);

    // Slewing arm (jib) that rotates
    const armGroup = new THREE.Group();
    armGroup.position.y = 18;

    const jib = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 20), mastMat);
    jib.position.set(0, 0.3, 6);
    armGroup.add(jib);

    const counterJib = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 6), mastMat);
    counterJib.position.set(0, 0.3, -5);
    armGroup.add(counterJib);

    // Counterweight block
    const cw = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    cw.position.set(0, 0.4, -7);
    armGroup.add(cw);

    craneGroup.add(armGroup);
    this.metroCraneArm = armGroup;
    mGroup.add(craneGroup);

    // Receiving aggregate pile (starts smaller, grows with deliveries)
    const pileGeo = new THREE.ConeGeometry(4.5, 2.5, 12);
    const pileMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9, flatShading: true });
    const pile = new THREE.Mesh(pileGeo, pileMat);
    pile.position.set(-6, 1.25, 6);
    pile.castShadow = true;
    pile.receiveShadow = true;
    mGroup.add(pile);
    this.sitePiles.set('site_metro', pile);

    this.scene.add(mGroup);
    this.addFloodlight(-75, 16, 65);
  }

  private buildHighwaySite() {
    const hGroup = new THREE.Group();
    hGroup.position.set(5, 0, 80);
    hGroup.name = 'Location_site_highway';
    hGroup.userData = { isLocation: true, locationId: 'site_highway' };

    // Elevated flyover road deck section
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 8), deckMat);
    deck.position.set(0, 6, 0);
    deck.castShadow = true;
    hGroup.add(deck);

    // Support pillars
    const colMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    [-7, 7].forEach((x) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 6, 12), colMat);
      col.position.set(x, 3, 0);
      col.castShadow = true;
      hGroup.add(col);
    });

    // Asphalt roller / road machine
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const rollerBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 3.8), rollerMat);
    rollerBody.position.set(2, 6.8 + 0.8, 0);
    hGroup.add(rollerBody);

    // Receiving aggregate pile
    const pileGeo = new THREE.ConeGeometry(4.5, 2.2, 12);
    const pileMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    const pile = new THREE.Mesh(pileGeo, pileMat);
    pile.position.set(-8, 1.1, 8);
    pile.castShadow = true;
    pile.receiveShadow = true;
    hGroup.add(pile);
    this.sitePiles.set('site_highway', pile);

    this.scene.add(hGroup);
    this.addFloodlight(5, 14, 80);
  }

  private buildCommercialBuildingSite() {
    const bGroup = new THREE.Group();
    bGroup.position.set(75, 0, 60);
    bGroup.name = 'Location_site_building';
    bGroup.userData = { isLocation: true, locationId: 'site_building' };

    // Excavated foundation pit with concrete base
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 16), slabMat);
    slab.position.set(0, 0.4, 0);
    slab.receiveShadow = true;
    bGroup.add(slab);

    // Rebar / columns sticking out
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
    for (let x = -7; x <= 7; x += 4.5) {
      for (let z = -5; z <= 5; z += 5) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.5, 0.6), rebarMat);
        bar.position.set(x, 2.65, z);
        bar.castShadow = true;
        bGroup.add(bar);
      }
    }

    // Concrete mixer batcher container
    const mixerMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 });
    const mixer = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4.5, 12), mixerMat);
    mixer.position.set(10, 2.5, 7);
    mixer.rotation.z = Math.PI / 4;
    mixer.castShadow = true;
    bGroup.add(mixer);

    // Receiving aggregate pile
    const pileGeo = new THREE.ConeGeometry(4.5, 2.2, 12);
    const pileMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9, flatShading: true });
    const pile = new THREE.Mesh(pileGeo, pileMat);
    pile.position.set(-8, 1.1, 7);
    pile.castShadow = true;
    pile.receiveShadow = true;
    bGroup.add(pile);
    this.sitePiles.set('site_building', pile);

    this.scene.add(bGroup);
    this.addFloodlight(75, 14, 60);
  }

  // --- TRUCK & SIMULATION SYNC ---

  public syncTrips(trips: Trip[], materialsMap: Record<string, { color: string }>) {
    const activeTripIds = new Set<string>();

    trips.forEach((trip) => {
      // Completed trips don't drive on road
      if (trip.status === 'Completed') return;

      activeTripIds.add(trip.id);
      const matColor = materialsMap[trip.materialId]?.color || '#f59e0b';

      let truckComp = this.truckMeshes.get(trip.id);
      if (!truckComp) {
        truckComp = createLowPolyTruck(trip.vehicleType, matColor, trip.id, trip.vehicleNumber);
        this.scene.add(truckComp.root);
        this.truckMeshes.set(trip.id, truckComp);
      }

      // Update color and night mode
      truckComp.setCargoColor(matColor);
      truckComp.setNightMode(this.isNightMode);

      // State machine visual animation
      const isReturn = trip.status === 'Returning';
      const isMoving = trip.status === 'In Transit' || trip.status === 'Returning';

      // 1. Position and Orientation along road route
      let routeProgress = trip.phaseProgress;
      if (trip.status === 'Waiting' || trip.status === 'Loading') {
        routeProgress = 0.01;
      } else if (trip.status === 'Arrived' || trip.status === 'Unloading') {
        routeProgress = 0.99;
      }

      const { position, tangent } = this.roadNetwork.getPointOnRoute(
        trip.sourceId,
        trip.destinationId,
        routeProgress,
        isReturn
      );

      truckComp.root.position.copy(position);

      // Align truck with direction of travel
      if (tangent.lengthSq() > 0.001) {
        const targetRotY = Math.atan2(tangent.x, tangent.z);
        truckComp.root.rotation.y = targetRotY;
      }

      // 2. Dump bed tilt angle
      if (trip.status === 'Unloading') {
        // Bed tilts up to ~45 degrees (0.75 rad) during unloading
        const tilt = Math.sin(trip.phaseProgress * Math.PI) * 0.78;
        truckComp.setTiltAngle(tilt);
        truckComp.setCargoVisible(trip.phaseProgress < 0.6); // Empties out midway
      } else if (trip.status === 'Returning') {
        truckComp.setTiltAngle(0);
        truckComp.setCargoVisible(false); // Returning empty
      } else {
        truckComp.setTiltAngle(0);
        truckComp.setCargoVisible(true);
      }

      // 3. Hazard beacon flashing
      const shouldBlink = trip.isDelayed || trip.status === 'Unloading' || trip.status === 'Loading';
      truckComp.setHazardBlinking(shouldBlink, this.clock.getElapsedTime());

      // Store live position on trip for 2D minimap/tooltips
      trip.currentPos = [position.x, position.y, position.z];
      trip.currentRotationY = truckComp.root.rotation.y;
    });

    // Remove deleted / completed trips
    this.truckMeshes.forEach((meshComp, id) => {
      if (!activeTripIds.has(id)) {
        this.scene.remove(meshComp.root);
        this.truckMeshes.delete(id);
      }
    });

    // If following a truck, lock camera to it
    if (this.followingTripId) {
      const followedTruck = this.truckMeshes.get(this.followingTripId);
      if (followedTruck) {
        const truckPos = followedTruck.root.position;
        this.desiredTarget.set(truckPos.x, truckPos.y + 2, truckPos.z);
        this.desiredCameraPos.set(truckPos.x - 22, truckPos.y + 24, truckPos.z + 28);
      }
    }
  }

  /**
   * Updates stockpile cone sizes in real time based on source stock & site received deliveries
   */
  public updateStockpileVisuals(locations: Location[]) {
    locations.forEach((loc) => {
      if (loc.type === 'source') {
        const pile = this.sourcePiles.get(loc.id);
        if (pile) {
          // Total stock tonnes
          const totalStock = Object.values(loc.stocks).reduce((a, b) => a + b, 0);
          const scaleFactor = Math.max(0.3, Math.min(1.8, totalStock / 800));
          pile.scale.set(scaleFactor, scaleFactor, scaleFactor);
          pile.position.y = (3.6 * scaleFactor) / 2;
        }
      } else {
        const pile = this.sitePiles.get(loc.id);
        if (pile && loc.received) {
          const totalReceived = Object.values(loc.received).reduce((a, b) => a + b, 0);
          const scaleFactor = Math.max(0.4, Math.min(1.9, totalReceived / 400));
          pile.scale.set(scaleFactor, scaleFactor, scaleFactor);
          pile.position.y = (2.4 * scaleFactor) / 2;
        }
      }
    });
  }

  // --- DAY / NIGHT & LIGHTING ---

  public setNightMode(isNight: boolean) {
    this.isNightMode = isNight;
    if (isNight) {
      this.scene.background = new THREE.Color(0x060913);
      this.scene.fog = new THREE.FogExp2(0x060913, 0.005);
      this.ambientLight.color.set(0x1e293b);
      this.ambientLight.intensity = 0.35;
      this.dirLight.color.set(0x60a5fa);
      this.dirLight.intensity = 0.35;
      this.floodlights.forEach((fl) => (fl.intensity = 2.8));
    } else {
      this.scene.background = new THREE.Color(0x0f172a);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0035);
      this.ambientLight.color.set(0xcfd8dc);
      this.ambientLight.intensity = 0.7;
      this.dirLight.color.set(0xfffbeb);
      this.dirLight.intensity = 1.8;
      this.floodlights.forEach((fl) => (fl.intensity = 0));
    }

    // Update truck headlights
    this.truckMeshes.forEach((truck) => truck.setNightMode(isNight));
  }

  // --- CAMERA CONTROLS & PRESETS ---

  public setCameraPreset(preset: CameraPreset) {
    this.followingTripId = null;

    switch (preset) {
      case 'overview':
        this.desiredTarget.set(0, 0, 0);
        this.desiredCameraPos.set(0, 115, 135);
        break;
      case 'quarry':
        this.desiredTarget.set(-75, 2, -65);
        this.desiredCameraPos.set(-75, 36, -30);
        break;
      case 'crusher':
        this.desiredTarget.set(0, 2, -85);
        this.desiredCameraPos.set(0, 36, -45);
        break;
      case 'stockpile':
        this.desiredTarget.set(75, 2, -60);
        this.desiredCameraPos.set(75, 36, -25);
        break;
      case 'site_metro':
        this.desiredTarget.set(-75, 3, 65);
        this.desiredCameraPos.set(-75, 42, 105);
        break;
      case 'site_highway':
        this.desiredTarget.set(5, 3, 80);
        this.desiredCameraPos.set(5, 38, 120);
        break;
      case 'site_building':
        this.desiredTarget.set(75, 3, 60);
        this.desiredCameraPos.set(75, 38, 100);
        break;
    }
  }

  public followTruck(tripId: string | null) {
    this.followingTripId = tripId;
    if (tripId) {
      const truck = this.truckMeshes.get(tripId);
      if (truck) {
        const p = truck.root.position;
        this.desiredTarget.set(p.x, p.y + 1, p.z);
        this.desiredCameraPos.set(p.x - 22, p.y + 24, p.z + 28);
      }
    }
  }

  public getFollowingTruckId(): string | null {
    return this.followingTripId;
  }

  // --- INTERACTION & EVENT LISTENERS ---

  private setupEventListeners() {
    const dom = this.renderer.domElement;

    // Mouse Drag (Orbit & Pan)
    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.isPanning = e.button === 2 || e.shiftKey;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
      this.followingTripId = null; // Exit follow mode on user pan
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      if (this.isPanning) {
        // Pan
        const factor = 0.14 * (this.camera.position.y / 60);
        const right = new THREE.Vector3().crossVectors(
          new THREE.Vector3().subVectors(this.camera.position, this.cameraTarget).normalize(),
          this.camera.up
        ).normalize();

        this.cameraTarget.addScaledVector(right, -deltaX * factor);
        this.desiredTarget.copy(this.cameraTarget);

        const forward = new THREE.Vector3().crossVectors(this.camera.up, right).normalize();
        this.cameraTarget.addScaledVector(forward, -deltaY * factor);
        this.desiredTarget.copy(this.cameraTarget);
      } else {
        // Orbit
        this.spherical.theta -= deltaX * 0.007;
        this.spherical.phi = Math.max(0.15, Math.min(Math.PI / 2.1, this.spherical.phi - deltaY * 0.007));

        this.updateCameraPosFromSpherical();
      }
    });

    // Zoom
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.followingTripId = null;
      this.spherical.radius = Math.max(25, Math.min(260, this.spherical.radius + e.deltaY * 0.12));
      this.updateCameraPosFromSpherical();
    }, { passive: false });

    // Click / Raycast Selection
    dom.addEventListener('click', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouseVec, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== this.scene) {
          if (cur.userData?.isTruck && cur.userData.tripId) {
            this.callbacks.onSelectTruck?.(cur.userData.tripId);
            this.followTruck(cur.userData.tripId);
            return;
          }
          if (cur.userData?.isLocation && cur.userData.locationId) {
            this.callbacks.onSelectLocation?.(cur.userData.locationId);
            return;
          }
          cur = cur.parent;
        }
      }
    });

    // Resize Handler
    window.addEventListener('resize', this.handleResize);
  }

  private updateCameraPosFromSpherical() {
    const sinPhi = Math.sin(this.spherical.phi);
    const cosPhi = Math.cos(this.spherical.phi);
    const sinTheta = Math.sin(this.spherical.theta);
    const cosTheta = Math.cos(this.spherical.theta);

    this.desiredCameraPos.set(
      this.desiredTarget.x + this.spherical.radius * sinPhi * sinTheta,
      this.desiredTarget.y + this.spherical.radius * cosPhi,
      this.desiredTarget.z + this.spherical.radius * sinPhi * cosTheta
    );
  }

  public handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // --- ANIMATION LOOP ---

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // 1. Smooth Camera Lerp
    this.cameraTarget.lerp(this.desiredTarget, 0.08);
    this.camera.position.lerp(this.desiredCameraPos, 0.08);
    this.camera.lookAt(this.cameraTarget);

    // 2. Animate low-poly construction equipment
    if (this.metroCraneArm) {
      this.metroCraneArm.rotation.y += delta * 0.15; // Slow RTS crane rotation
    }
    if (this.excavatorCabin) {
      this.excavatorCabin.rotation.y = Math.sin(this.clock.getElapsedTime() * 0.8) * 0.35;
    }

    // 3. Wheel spin
    this.wheelRotation += delta * 6;

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
