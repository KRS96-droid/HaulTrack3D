import * as THREE from 'three';

export interface RoutePoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
}

/**
 * Road Network for HaulTrack 3D
 * Connects 3 Sources to 3 Destinations via realistic road paths.
 */
export class RoadNetwork {
  private routes: Map<string, THREE.CatmullRomCurve3> = new Map();
  private returnRoutes: Map<string, THREE.CatmullRomCurve3> = new Map();

  // Waypoints for natural RTS road geography
  private waypoints = {
    // Sources
    source_quarry: new THREE.Vector3(-75, 0.2, -65),
    source_crusher: new THREE.Vector3(0, 0.2, -85),
    source_stockpile: new THREE.Vector3(75, 0.2, -60),

    // Arterial junction points
    north_junction: new THREE.Vector3(0, 0.2, -40),
    central_hub: new THREE.Vector3(0, 0.2, 0),
    south_junction: new THREE.Vector3(0, 0.2, 40),

    // Feeder waypoints
    quarry_ramp: new THREE.Vector3(-45, 0.2, -50),
    stockpile_ramp: new THREE.Vector3(45, 0.2, -45),
    metro_ramp: new THREE.Vector3(-45, 0.2, 45),
    building_ramp: new THREE.Vector3(50, 0.2, 45),

    // Destinations
    site_metro: new THREE.Vector3(-75, 0.2, 65),
    site_highway: new THREE.Vector3(5, 0.2, 80),
    site_building: new THREE.Vector3(75, 0.2, 60),
  };

  constructor() {
    this.buildAllRoutes();
  }

  private buildAllRoutes() {
    const sources = ['source_quarry', 'source_crusher', 'source_stockpile'];
    const destinations = ['site_metro', 'site_highway', 'site_building'];

    for (const src of sources) {
      for (const dst of destinations) {
        const key = `${src}->${dst}`;
        const forwardPoints = this.createWaypointsForPair(src, dst, false);
        const curve = new THREE.CatmullRomCurve3(forwardPoints, false, 'catmullrom', 0.2);
        this.routes.set(key, curve);

        const returnPoints = this.createWaypointsForPair(src, dst, true);
        const returnCurve = new THREE.CatmullRomCurve3(returnPoints, false, 'catmullrom', 0.2);
        this.returnRoutes.set(key, returnCurve);
      }
    }
  }

  private createWaypointsForPair(sourceId: string, destId: string, isReturn: boolean): THREE.Vector3[] {
    const wp = this.waypoints;
    const points: THREE.Vector3[] = [];

    // Lane offset so trucks driving in opposite directions don't clip head-on
    const laneOffset = isReturn ? 1.5 : -1.5;

    // Helper to get offset vector perpendicular to general movement
    const addOffset = (v: THREE.Vector3, offsetX = 0, offsetZ = 0) => {
      return new THREE.Vector3(v.x + offsetX, v.y, v.z + offsetZ);
    };

    if (!isReturn) {
      // Forward path: Source -> Destination
      if (sourceId === 'source_quarry') {
        points.push(addOffset(wp.source_quarry, 0, 0));
        points.push(addOffset(wp.quarry_ramp, 0, laneOffset));
        points.push(addOffset(wp.north_junction, laneOffset, 0));
      } else if (sourceId === 'source_crusher') {
        points.push(addOffset(wp.source_crusher, 0, 0));
        points.push(addOffset(wp.north_junction, laneOffset, -5));
      } else {
        // Stockpile
        points.push(addOffset(wp.source_stockpile, 0, 0));
        points.push(addOffset(wp.stockpile_ramp, 0, laneOffset));
        points.push(addOffset(wp.north_junction, laneOffset, 0));
      }

      // Middle spine
      points.push(addOffset(wp.central_hub, laneOffset, 0));
      points.push(addOffset(wp.south_junction, laneOffset, 0));

      // Branch to destination
      if (destId === 'site_metro') {
        points.push(addOffset(wp.metro_ramp, 0, laneOffset));
        points.push(addOffset(wp.site_metro, 0, 0));
      } else if (destId === 'site_highway') {
        points.push(addOffset(wp.site_highway, laneOffset, 0));
      } else {
        // Building
        points.push(addOffset(wp.building_ramp, 0, laneOffset));
        points.push(addOffset(wp.site_building, 0, 0));
      }
    } else {
      // Return path: Destination -> Source
      if (destId === 'site_metro') {
        points.push(addOffset(wp.site_metro, 0, 0));
        points.push(addOffset(wp.metro_ramp, 0, laneOffset));
      } else if (destId === 'site_highway') {
        points.push(addOffset(wp.site_highway, laneOffset, 0));
      } else {
        points.push(addOffset(wp.site_building, 0, 0));
        points.push(addOffset(wp.building_ramp, 0, laneOffset));
      }

      // Middle spine going north
      points.push(addOffset(wp.south_junction, laneOffset, 0));
      points.push(addOffset(wp.central_hub, laneOffset, 0));
      points.push(addOffset(wp.north_junction, laneOffset, 0));

      // Branch back to source
      if (sourceId === 'source_quarry') {
        points.push(addOffset(wp.quarry_ramp, 0, laneOffset));
        points.push(addOffset(wp.source_quarry, 0, 0));
      } else if (sourceId === 'source_crusher') {
        points.push(addOffset(wp.source_crusher, 0, 0));
      } else {
        points.push(addOffset(wp.stockpile_ramp, 0, laneOffset));
        points.push(addOffset(wp.source_stockpile, 0, 0));
      }
    }

    return points;
  }

  /**
   * Retrieves 3D position and tangent for a trip along its road route
   */
  public getPointOnRoute(
    sourceId: string,
    destinationId: string,
    progress: number,
    isReturn: boolean = false
  ): RoutePoint {
    const key = `${sourceId}->${destinationId}`;
    const curve = isReturn ? this.returnRoutes.get(key) : this.routes.get(key);

    const clampedT = Math.max(0.001, Math.min(0.999, progress));

    if (!curve) {
      // Fallback direct interpolation if route not cached
      const start = this.waypoints[sourceId as keyof typeof this.waypoints] || new THREE.Vector3(0, 0, -50);
      const end = this.waypoints[destinationId as keyof typeof this.waypoints] || new THREE.Vector3(0, 0, 50);
      const from = isReturn ? end : start;
      const to = isReturn ? start : end;
      const pos = new THREE.Vector3().lerpVectors(from, to, clampedT);
      const tangent = new THREE.Vector3().subVectors(to, from).normalize();
      return { position: pos, tangent };
    }

    const position = curve.getPointAt(clampedT);
    const tangent = curve.getTangentAt(clampedT);
    return { position, tangent };
  }

  /**
   * Builds 3D visual road network geometry: asphalt surface, shoulders, and center striping.
   */
  public createRoadMeshGroup(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'RoadNetworkVisuals';

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.9,
      metalness: 0.1,
    });

    const shoulderMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d382c, // Compacted dirt / gravel shoulder
      roughness: 1.0,
      metalness: 0.05,
    });

    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Construction amber dashed center line
    });

    // Generate road segments along primary corridors
    const segments: Array<[THREE.Vector3, THREE.Vector3, number]> = [
      // Central North-South Arterial
      [new THREE.Vector3(0, 0.05, -85), new THREE.Vector3(0, 0.05, 80), 8],
      // Quarry link
      [this.waypoints.source_quarry, this.waypoints.quarry_ramp, 7],
      [this.waypoints.quarry_ramp, this.waypoints.north_junction, 7],
      // Stockpile link
      [this.waypoints.source_stockpile, this.waypoints.stockpile_ramp, 7],
      [this.waypoints.stockpile_ramp, this.waypoints.north_junction, 7],
      // Metro site link
      [this.waypoints.south_junction, this.waypoints.metro_ramp, 7],
      [this.waypoints.metro_ramp, this.waypoints.site_metro, 7],
      // Building site link
      [this.waypoints.south_junction, this.waypoints.building_ramp, 7],
      [this.waypoints.building_ramp, this.waypoints.site_building, 7],
    ];

    segments.forEach(([start, end, width]) => {
      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

      const angle = Math.atan2(dir.x, dir.z);

      // Paved road surface
      const roadGeo = new THREE.PlaneGeometry(width, length);
      const roadMesh = new THREE.Mesh(roadGeo, roadMaterial);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = -angle;
      roadMesh.position.set(mid.x, 0.08, mid.z);
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      // Dirt shoulder on sides
      const shoulderGeo = new THREE.PlaneGeometry(width + 2.5, length);
      const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMaterial);
      shoulderMesh.rotation.x = -Math.PI / 2;
      shoulderMesh.rotation.z = -angle;
      shoulderMesh.position.set(mid.x, 0.04, mid.z);
      shoulderMesh.receiveShadow = true;
      group.add(shoulderMesh);

      // Center dashed yellow lane line
      const stripeGeo = new THREE.PlaneGeometry(0.35, length * 0.95);
      const stripeMesh = new THREE.Mesh(stripeGeo, stripeMaterial);
      stripeMesh.rotation.x = -Math.PI / 2;
      stripeMesh.rotation.z = -angle;
      stripeMesh.position.set(mid.x, 0.1, mid.z);
      group.add(stripeMesh);
    });

    // Central roundabout / junction hub circle
    const hubGeo = new THREE.CircleGeometry(7, 32);
    const hubMesh = new THREE.Mesh(hubGeo, roadMaterial);
    hubMesh.rotation.x = -Math.PI / 2;
    hubMesh.position.set(0, 0.09, 0);
    hubMesh.receiveShadow = true;
    group.add(hubMesh);

    // Roundabout inner safety curb island
    const curbGeo = new THREE.CylinderGeometry(2.5, 2.7, 0.4, 24);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.position.set(0, 0.2, 0);
    group.add(curbMesh);

    return group;
  }
}

/**
 * TELEMATICS / IOT ADAPTER FUNCTION
 * Clearly marked function for external GPS hardware/IoT integration.
 * Converts latitude/longitude bounding box to HaulTrack 3D scene coordinates.
 */
export interface GpsCoordinates {
  lat: number;
  lng: number;
  altitude?: number;
  speedKmh?: number;
  headingDeg?: number;
}

export function updateTruckPositionFromGps(
  vehicleId: string,
  gps: GpsCoordinates,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } = {
    minLat: 12.9100,
    maxLat: 12.9800,
    minLng: 77.5500,
    maxLng: 77.6500,
  }
): { x: number; y: number; z: number; rotationY: number } {
  // Normalize lat/lng to [-100, 100] world scale
  const normX = ((gps.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) - 0.5) * 180;
  const normZ = ((gps.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat) - 0.5) * 180;
  const rotationY = gps.headingDeg !== undefined ? (gps.headingDeg * Math.PI) / 180 : 0;

  return {
    x: normX,
    y: 0.2,
    z: normZ,
    rotationY,
  };
}
