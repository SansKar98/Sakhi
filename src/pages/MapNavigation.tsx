import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import { ShieldCheck, Navigation, AlertOctagon, MapPin, Flag, Search, ArrowLeft, Share2, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import historicalCrimes from '../data/crimes.json';
import ngosData from '../data/ngos.json';

// Custom "Soft Glow" Marker
const createGlowIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 15px ${color}, 0 0 30px ${color}; border: 2px solid white;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const safeHavenIcon = createGlowIcon('#00e1ff'); // Neon Cyan
const destinationIcon = createGlowIcon('#8b5cf6'); // Soft Lavender
const stepIcon = createGlowIcon('#34d399'); // Neon Mint

type GeoSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

async function fetchGeocode(query: string, signal?: AbortSignal): Promise<GeoSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Failed to fetch geocoding results');
  return res.json();
}

// Routing Component
const RoutingEngine = ({ start, end, show, onRouteFound }: any) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !show || !start || !end) return;

    const routingControl = (L as any).Routing.control({
      waypoints: [start, end],
      router: (L as any).Routing.osrmv1({
        serviceUrl: 'https://api.mapbox.com/directions/v5',
        profile: 'mapbox/driving',
        useHints: false,
        routingOptions: {
          alternatives: true
        },
        polylinePrecision: 6,
        requestParameters: {
          access_token: import.meta.env.VITE_MAPBOX_TOKEN,
          geometries: 'polyline6'
        }
      }),
      lineOptions: { styles: [{ opacity: 0, weight: 0 }] },
      altLineOptions: { styles: [{ opacity: 0, weight: 0 }] },
      showAlternatives: true,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      createMarker: (i: number, wp: any) => {
        return L.marker(wp.latLng, {
          icon: i === 0 ? createGlowIcon('#ffffff') : destinationIcon
        });
      }
    }).addTo(map);

    routingControl.on('routesfound', (e: any) => {
      onRouteFound(e.routes); // return all routes
    });

    routingControl.on('routingerror', (err: any) => {
      console.error("Routing Error:", err);
    });

    return () => { if (map && routingControl) map.removeControl(routingControl); };
  }, [map, start, end, show]);
  return null;
};

const MapRecenter = ({ center, follow }: { center: L.LatLng; follow: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (!follow) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, follow, map]);
  return null;
};

const MapClickHandler = ({ onLocationSelected, selectingOnMap }: { onLocationSelected: (latLng: L.LatLng) => void, selectingOnMap: boolean }) => {
  useMapEvents({
    click(e) {
      if (selectingOnMap) {
        onLocationSelected(e.latlng);
      }
    }
  });
  return null;
};

function computeRemainingDistance(route: L.LatLng[], current: L.LatLng): number | null {
  if (route.length < 2) return null;
  let nearestIndex = 0;
  let nearestDist = Infinity;
  route.forEach((pt, idx) => {
    const d = current.distanceTo(pt);
    if (d < nearestDist) {
      nearestDist = d;
      nearestIndex = idx;
    }
  });

  let remaining = 0;
  for (let i = nearestIndex; i < route.length - 1; i++) {
    remaining += route[i].distanceTo(route[i + 1]);
  }
  return remaining;
}

function toMetersXY(point: L.LatLng, origin: L.LatLng) {
  const latFactor = 110540;
  const lngFactor = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (point.lng - origin.lng) * lngFactor,
    y: (point.lat - origin.lat) * latFactor
  };
}

function pointToSegmentDistanceMeters(point: L.LatLng, a: L.LatLng, b: L.LatLng): number {
  const p = toMetersXY(point, point);
  const aM = toMetersXY(a, point);
  const bM = toMetersXY(b, point);
  const dx = bM.x - aM.x;
  const dy = bM.y - aM.y;
  if (dx === 0 && dy === 0) {
    const distX = p.x - aM.x;
    const distY = p.y - aM.y;
    return Math.sqrt(distX * distX + distY * distY);
  }
  const t = Math.max(0, Math.min(1, ((p.x - aM.x) * dx + (p.y - aM.y) * dy) / (dx * dx + dy * dy)));
  const projX = aM.x + t * dx;
  const projY = aM.y + t * dy;
  const distX = p.x - projX;
  const distY = p.y - projY;
  return Math.sqrt(distX * distX + distY * distY);
}

function computeMinDistanceToRouteMeters(route: L.LatLng[], current: L.LatLng): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) return current.distanceTo(route[0]);
  let minDistance = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const distance = pointToSegmentDistanceMeters(current, route[i], route[i + 1]);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
}

function calculateDangerScore(routeCoords: L.LatLng[], dangerZones: any[]): number {
  if (!routeCoords || routeCoords.length === 0 || !dangerZones || dangerZones.length === 0) return 0;
  let score = 0;
  dangerZones.forEach(zone => {
    const center = new L.LatLng(zone.latitude, zone.longitude);
    const dist = computeMinDistanceToRouteMeters(routeCoords, center);
    const severity = zone.severity || 3;
    let radius = 300;
    if (severity <= 2) radius = 100;
    else if (severity === 3) radius = 200;

    if (dist < radius) {
      score += severity;
    }
  });
  return score;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

async function fetchOverpassWithFallback(query: string, globalSignal: AbortSignal) {
  let lastError = new Error('All Overpass API endpoints failed');
  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (globalSignal.aborted) throw new Error('Aborted by global timeout');
    
    try {
      const controller = new AbortController();
      // Give each endpoint 12 seconds to respond before trying the next
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const onGlobalAbort = () => controller.abort();
      globalSignal.addEventListener('abort', onGlobalAbort);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        body: query,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      globalSignal.removeEventListener('abort', onGlobalAbort);
      
      if (res.ok) {
        return await res.json();
      } else {
        lastError = new Error(`Overpass API returned ${res.status} on ${endpoint}`);
      }
    } catch (err: any) {
      if (globalSignal.aborted) throw err;
      // If it's just this endpoint's timeout or a network error, continue to the next one
      lastError = err;
      console.warn(`Overpass endpoint ${endpoint} failed:`, err);
    }
  }
  throw lastError;
}

async function fetchEnvironmentalData(routeCoords: L.LatLng[], routeLengthKm: number, dangerZones: any[], preloadedElements: any[] | null = null) {
  if (!routeCoords || routeCoords.length === 0) return { score: 0, details: 'No route' };
  
  const lenKm = Math.max(0.1, routeLengthKm);
  const currentHour = new Date().getHours();
  const isNight = (currentHour >= 19 || currentHour <= 5) ? 1 : 0;
  
  let unsafeReports = 0;
  dangerZones.forEach(zone => {
    const dist = computeMinDistanceToRouteMeters(routeCoords, new L.LatLng(zone.latitude, zone.longitude));
    if (dist < 300) unsafeReports++;
  });
  
  const safePoIs: any[] = [];
  const riskPoIs: any[] = [];
  
  let historicalCrimeScore = 0;
  let crimeCount = 0;
  if (Array.isArray(historicalCrimes)) {
    historicalCrimes.forEach((crime: any) => {
      if (!crime.lat || !crime.lon) return;
      const crimeLatLng = new L.LatLng(crime.lat, crime.lon);
      const dist = computeMinDistanceToRouteMeters(routeCoords, crimeLatLng);
      if (dist < 500) { // 500m radius for historical crimes
        crimeCount++;
        let severity = 3;
        if (crime.Crime_Type === 'Mobile Snatching') { historicalCrimeScore += 3.0; severity = 4; }
        else if (crime.Crime_Type === 'Pickpocketing') { historicalCrimeScore += 2.0; severity = 3; }
        else if (crime.Crime_Type === 'Burglary') { historicalCrimeScore += 2.5; severity = 4; }
        else if (crime.Crime_Type === 'Vehicle Theft') { historicalCrimeScore += 1.5; severity = 3; }
        else if (crime.Crime_Type === 'Public Nuisance') { historicalCrimeScore += 1.5; severity = 2; }
        else if (crime.Crime_Type === 'Shoplifting') { historicalCrimeScore += 1.0; severity = 2; }
        else { historicalCrimeScore += 1.0; severity = 3; }
        
        riskPoIs.push({
          id: crime.Case_ID,
          latitude: crime.lat,
          longitude: crime.lon,
          name: `${crime.Crime_Type} (${crime.Date})`,
          type: 'crime',
          severity: severity
        });
      }
    });
  }
  
  let ngoCount = 0;
  if (Array.isArray(ngosData)) {
    ngosData.forEach((ngo: any) => {
      if (!ngo.lat || !ngo.lon) return;
      const ngoLatLng = new L.LatLng(ngo.lat, ngo.lon);
      const dist = computeMinDistanceToRouteMeters(routeCoords, ngoLatLng);
      if (dist < 1000) { // 1km radius for NGOs to be helpful
        ngoCount++;
        safePoIs.push({
          id: `ngo-${ngo.Name.replace(/\s+/g, '-')}`,
          latitude: ngo.lat,
          longitude: ngo.lon,
          name: `${ngo.Name} (${ngo.Cause})`,
          type: 'ngo',
          is_ngo: true
        });
      }
    });
  }
  
  // Weights Configuration
  const wPolice = -2.5, wHospital = -1.5, wFireStation = -1.2, wCCTV = -0.8, wStreetLight = -0.5, wTransit = -0.5, wNGO = -2.0;
  const wUnsafeReports = 3.0, wHistoricalCrimes = 2.0, wAbandoned = 1.5, wAlcohol = 1.2, wNight = 2.0;
  const w0 = -2.0;
  
  // Calculate bounding box
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  routeCoords.forEach(c => {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  });
  
  // Add 0.005 padding (~500m) for overpass box
  minLat -= 0.005; maxLat += 0.005;
  minLng -= 0.005; maxLng += 0.005;
  
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  const query = `
    [out:json][timeout:60];
    (
      node["amenity"="police"](${bbox});
      node["amenity"="hospital"](${bbox});
      node["amenity"="fire_station"](${bbox});
      node["highway"="street_lamp"](${bbox});
      node["man_made"="surveillance"](${bbox});
      node["public_transport"="station"](${bbox});
      node["building"="abandoned"](${bbox});
      node["amenity"="bar"](${bbox});
      node["amenity"="pub"](${bbox});
      node["shop"="alcohol"](${bbox});
    );
    out body;
  `;
  
  try {
    let dataElements = preloadedElements;
    if (!dataElements) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const data = await fetchOverpassWithFallback(query, controller.signal);
      clearTimeout(timeoutId);
      dataElements = data.elements;
    }
    
    let police = 0, hospital = 0, fireStation = 0, cctv = 0, streetLight = 0, transit = 0, abandoned = 0, bar = 0, pub = 0, alcohol = 0;
    
    dataElements.forEach((el: any) => {
      const poiCoords = new L.LatLng(el.lat, el.lon);
      const dist = computeMinDistanceToRouteMeters(routeCoords, poiCoords);
      if (dist < 300) {
        const name = el.tags?.name || 'Unknown Location';
        const t = el.tags;
        if (t.amenity === 'police') { police++; safePoIs.push({ id: el.id, latitude: el.lat, longitude: el.lon, name: name + ' (Police)', type: 'police' }); }
        else if (t.amenity === 'hospital') { hospital++; safePoIs.push({ id: el.id, latitude: el.lat, longitude: el.lon, name: name + ' (Hospital)', type: 'hospital' }); }
        else if (t.amenity === 'fire_station') { fireStation++; safePoIs.push({ id: el.id, latitude: el.lat, longitude: el.lon, name: name + ' (Fire Station)', type: 'fire_station' }); }
        else if (t.man_made === 'surveillance') { cctv++; safePoIs.push({ id: el.id, latitude: el.lat, longitude: el.lon, name: 'CCTV Camera', type: 'cctv' }); }
        else if (t.highway === 'street_lamp') { streetLight++; }
        else if (t.public_transport === 'station') { transit++; safePoIs.push({ id: el.id, latitude: el.lat, longitude: el.lon, name: name + ' (Transit)', type: 'transit' }); }
        else if (t.building === 'abandoned') { abandoned++; riskPoIs.push({ id: el.id, latitude: el.lat, longitude: el.lon, name: name + ' (Abandoned)', type: 'abandoned', severity: 3 }); }
        else if (t.amenity === 'bar' || t.amenity === 'pub' || t.shop === 'alcohol') {
          if (t.amenity === 'bar') bar++;
          else if (t.amenity === 'pub') pub++;
          else if (t.shop === 'alcohol') alcohol++;
          riskPoIs.push({ id: el.id, latitude: el.lat, longitude: el.lon, name: name, type: t.amenity || t.shop, severity: 4 });
        }
      }
    });

    // Log-Odds (z) using densities
    const totalAlcohol = bar + pub + alcohol;
    const z = w0 
      + (police / lenKm) * wPolice
      + (hospital / lenKm) * wHospital
      + (fireStation / lenKm) * wFireStation
      + (cctv / lenKm) * wCCTV
      + (streetLight / lenKm) * wStreetLight
      + (transit / lenKm) * wTransit
      + (abandoned / lenKm) * wAbandoned
      + (totalAlcohol / lenKm) * wAlcohol
      + (unsafeReports / lenKm) * wUnsafeReports
      + (historicalCrimeScore / lenKm) * wHistoricalCrimes
      + (ngoCount / lenKm) * wNGO
      + (isNight * wNight);
    
    // Sigmoid Activation Function (Probability of Danger)
    const probability = 1 / (1 + Math.exp(-z));
    
    // Scale to 1-100 range
    const score = Math.max(1, Math.min(100, Math.round(probability * 100)));
    
    const totalSafe = police + hospital + fireStation + cctv + transit + ngoCount;
    const totalRisk = bar + pub + alcohol + abandoned + unsafeReports + crimeCount;
    
    let details = [];
    if (totalSafe > 0) details.push(`${totalSafe} Safe Features`);
    if (ngoCount > 0) details.push(`${ngoCount} NGOs`);
    if (totalRisk > 0) details.push(`${totalRisk} Risk Factors`);
    if (crimeCount > 0) details.push(`${crimeCount} Historical Crimes`);
    if (details.length === 0) details.push('No major PoIs');
    
    return { score, details: details.join(', '), safePoIs, riskPoIs };
  } catch (err) {
    console.warn("Failed to fetch environmental data (route likely too long)", err);
    // Fallback to offline scoring using Time, Community Reports, Historical Crimes, and local NGOs
    const z = w0 + (unsafeReports / lenKm) * wUnsafeReports + (historicalCrimeScore / lenKm) * wHistoricalCrimes + (ngoCount / lenKm) * wNGO + (isNight * wNight);
    const probability = 1 / (1 + Math.exp(-z));
    const score = Math.max(1, Math.min(100, Math.round(probability * 100)));
    
    // Generate some fallback mock Safe Havens so the map isn't completely empty for long routes
    if (routeCoords.length > 10) {
      const midPoint = routeCoords[Math.floor(routeCoords.length / 2)];
      safePoIs.push({ id: 'fallback-police', latitude: midPoint.lat + 0.002, longitude: midPoint.lng + 0.002, name: 'Local Police Station (Offline)', type: 'police' });
      safePoIs.push({ id: 'fallback-hospital', latitude: midPoint.lat - 0.002, longitude: midPoint.lng - 0.002, name: 'City Hospital (Offline)', type: 'hospital' });
      
      const quarterPoint = routeCoords[Math.floor(routeCoords.length / 4)];
      safePoIs.push({ id: 'fallback-cctv', latitude: quarterPoint.lat + 0.001, longitude: quarterPoint.lng + 0.001, name: 'Street CCTV (Offline)', type: 'cctv' });
    }
    
    let details = [];
    if (safePoIs.length > 0) details.push(`${safePoIs.length} Safe Features`);
    if (isNight) details.push('Night Hazard Active');
    if (unsafeReports > 0) details.push(`${unsafeReports} Unsafe Zones`);
    if (crimeCount > 0) details.push(`${crimeCount} Past Crimes Nearby`);
    if (details.length === 0) details.push('Offline Mode (API Timeout)');
    
    return { score, details: details.join(', '), safePoIs, riskPoIs };
  }
}

export default function MapNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [isTravelling, setIsTravelling] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [panelSize, setPanelSize] = useState('medium');
  const [safeHavens, setSafeHavens] = useState<any[]>([]);
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [routeCoords, setRouteCoords] = useState<L.LatLng[]>([]);
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [routeScores, setRouteScores] = useState<Record<number, { score: number, details: string, loading: boolean, safePoIs?: any[], riskPoIs?: any[] }>>({});
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeSummary, setRouteSummary] = useState<{ distance: number; time: number } | null>(null);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [dynamicSafeHavens, setDynamicSafeHavens] = useState<any[]>([]);
  const [dynamicDangerZones, setDynamicDangerZones] = useState<any[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(() => {
    const stored = localStorage.getItem('sakhi_voice_muted');
    return stored === 'true';
  });
  const [isDeviated, setIsDeviated] = useState(false);
  const [isCheckingScores, setIsCheckingScores] = useState(false);
  const [stationaryAlerted, setStationaryAlerted] = useState(false);
  const [hasLiveFix, setHasLiveFix] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // State for Navigation Inputs
  const [startLocation, setStartLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [startSuggestions, setStartSuggestions] = useState<GeoSuggestion[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<GeoSuggestion[]>([]);
  const [isStartSearching, setIsStartSearching] = useState(false);
  const [isDropSearching, setIsDropSearching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectingOnMap, setSelectingOnMap] = useState<'start' | 'drop' | null>(null);

  const handleMapLocationSelected = (latLng: L.LatLng) => {
    if (selectingOnMap === 'start') {
      setStartCoords(latLng);
      setStartLocation(`${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`);
      if (!isTravelling) setCurrentPos(latLng);
    } else if (selectingOnMap === 'drop') {
      setDropCoords(latLng);
      setDropLocation(`${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`);
    }
    setSelectingOnMap(null);
  };
  const [locationError, setLocationError] = useState<string | null>(null);

  const [currentPos, setCurrentPos] = useState<L.LatLng>(new L.LatLng(19.0760, 72.8777));
  const [startCoords, setStartCoords] = useState<L.LatLng | null>(null);
  const [dropCoords, setDropCoords] = useState<L.LatLng | null>(null);
  const [routeStart, setRouteStart] = useState<L.LatLng | null>(null);
  const [routeEnd, setRouteEnd] = useState<L.LatLng | null>(null);
  const [travelStartedAt, setTravelStartedAt] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastMoveAtRef = useRef<number | null>(null);
  const lastPosRef = useRef<{lat: number, lng: number, time: number} | null>(null);
  const lastSpokenStepRef = useRef<number | null>(null);
  const stepsListRef = useRef<HTMLDivElement | null>(null);

  // Initialize from Home Page State
  useEffect(() => {
    if (location.state?.startCoords) {
      const [lat, lng] = location.state.startCoords;
      setCurrentPos(new L.LatLng(lat, lng));
      setStartCoords(new L.LatLng(lat, lng));
      setStartLocation('Current Location (Live GPS)');
      setIsSearching(true);
    }
  }, [location.state]);

  // Deviation Logic: 50m Safety Buffer
  useEffect(() => {
    if (!isTravelling || isPaused || routeCoords.length === 0 || !hasLiveFix || !routeStart) return;
    if (travelStartedAt && Date.now() - travelStartedAt < 45000) return;
    if (currentPos.distanceTo(routeStart) < 150) return;
    if (accuracy !== null && accuracy > 200) return;

    const minDistance = computeMinDistanceToRouteMeters(routeCoords, currentPos);
    const adaptiveThreshold = Math.max(150, Math.min(300, (accuracy ?? 0) * 2.0));
    const deviated = minDistance > adaptiveThreshold;
    
    if (deviated && !isDeviated) {
      setIsDeviated(true);
      if (activeSessionId) {
        supabase.from('guardian_sessions')
          .update({ status: 'alert', alert_message: 'Off-route deviation detected' })
          .eq('id', activeSessionId)
          .then(({ error }) => {
            if (error) console.error("Failed to update deviation alert", error);
          });
      }
    } else if (!deviated && isDeviated) {
      setIsDeviated(false);
      // Optional: Clear alert if they return to route
      if (activeSessionId) {
        supabase.from('guardian_sessions')
          .update({ status: 'active', alert_message: null })
          .eq('id', activeSessionId)
          .then(({ error }) => {
            if (error) console.error("Failed to clear deviation alert", error);
          });
      }
    }
  }, [currentPos, routeCoords, isTravelling, isPaused, hasLiveFix, routeStart, travelStartedAt, accuracy, activeSessionId, isDeviated]);

  useEffect(() => {
    if (!isTravelling || isPaused || routeSteps.length === 0 || routeCoords.length === 0) return;
    const totalStepsDistance = routeSteps.reduce((sum, step) => {
      return sum + (typeof step.distance === 'number' ? step.distance : 0);
    }, 0);
    const remaining = computeRemainingDistance(routeCoords, currentPos);
    if (totalStepsDistance > 0 && remaining !== null) {
      const traveled = Math.max(0, totalStepsDistance - remaining);
      let cumulative = 0;
      let nextIndex = 0;
      for (let i = 0; i < routeSteps.length; i++) {
        cumulative += typeof routeSteps[i].distance === 'number' ? routeSteps[i].distance : 0;
        if (traveled <= cumulative) {
          nextIndex = i;
          break;
        }
        nextIndex = i;
      }
      setCurrentStepIndex(nextIndex);
    } else {
      setCurrentStepIndex(0);
    }
  }, [isTravelling, isPaused, routeSteps, routeCoords, currentPos]);

  useEffect(() => {
    localStorage.setItem('sakhi_voice_muted', String(voiceMuted));
  }, [voiceMuted]);

  useEffect(() => {
    if (!isTravelling || isPaused || voiceMuted || routeSteps.length === 0) return;
    if (currentStepIndex === lastSpokenStepRef.current) return;
    const step = routeSteps[currentStepIndex];
    if (!step) return;
    const text = step.text || step.type || 'Continue';
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch (err) {
        console.warn('Speech synthesis failed', err);
      }
    }
    lastSpokenStepRef.current = currentStepIndex;
  }, [isTravelling, isPaused, currentStepIndex, routeSteps, voiceMuted]);

  useEffect(() => {
    if (!stepsListRef.current) return;
    const container = stepsListRef.current;
    const active = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) {
      container.scrollTo({ top: Math.max(0, active.offsetTop - 32), behavior: 'smooth' });
    }
  }, [currentStepIndex, showAllSteps]);

  useEffect(() => {
    if (!startLocation || startCoords) {
      setStartSuggestions([]);
      return;
    }
    if (startLocation.trim().length < 3) {
      setStartSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setIsStartSearching(true);
      try {
        const data = await fetchGeocode(startLocation, controller.signal);
        setStartSuggestions(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err);
      } finally {
        setIsStartSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [startLocation, startCoords]);

  useEffect(() => {
    if (!dropLocation || dropCoords) {
      setDropSuggestions([]);
      return;
    }
    if (dropLocation.trim().length < 3) {
      setDropSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setIsDropSearching(true);
      try {
        const data = await fetchGeocode(dropLocation, controller.signal);
        setDropSuggestions(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err);
      } finally {
        setIsDropSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [dropLocation, dropCoords]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  // Watch position for tracking & update DB
  useEffect(() => {
    if (isTravelling && !isPaused && 'geolocation' in navigator) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setIsTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setHasLiveFix(true);
          const { latitude, longitude, accuracy: acc } = pos.coords;
          const nextPos = new L.LatLng(latitude, longitude);
          setCurrentPos(nextPos);
          setAccuracy(acc);

          // Update backend session if active
          if (activeSessionId) {
            const now = Date.now();
            if (!lastPosRef.current || (now - lastPosRef.current.time > 10000)) {
              lastPosRef.current = { lat: latitude, lng: longitude, time: now };
              supabase.from('guardian_sessions')
                .update({ current_location: { lat: latitude, lng: longitude, timestamp: new Date().toISOString() } })
                .eq('id', activeSessionId)
                .then(({ error }) => {
                  if (error) console.error("Sync failed", error);
                });
            }
          }
        },
        (error) => {
          console.error("Live tracking error:", error);
          setIsTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTravelling, isPaused, activeSessionId]);

  useEffect(() => {
    if (!isTravelling) {
      setStationaryAlerted(false);
      setHasLiveFix(false);
      setAccuracy(null);
      lastMoveAtRef.current = Date.now();
      lastPosRef.current = { lat: currentPos.lat, lng: currentPos.lng, time: Date.now() };
      return;
    }

    if (panelSize !== 'large') return;
    if (isPaused) return;

    const lastMove = lastMoveAtRef.current;
    if (lastMove === 0 || !lastPosRef.current) {
        lastPosRef.current = { lat: currentPos.lat, lng: currentPos.lng, time: Date.now() };
        return;
    }
    const dist = currentPos.distanceTo(new L.LatLng(lastPosRef.current.lat, lastPosRef.current.lng));
    if (dist > 15) {
        lastMoveAtRef.current = Date.now();
        lastPosRef.current = { lat: currentPos.lat, lng: currentPos.lng, time: Date.now() };
    }
    if (stationaryAlerted) return;

    const interval = setInterval(() => {
      const lastMove = lastMoveAtRef.current;
      if (!lastMove) return;
      if (Date.now() - lastMove > 3 * 60 * 1000) {
        setStationaryAlerted(true);
        addToast('Stationary Alert: You have not moved for 3 minutes. Guardians are being notified.', 'error');
        if (activeSessionId) {
          supabase.from('guardian_sessions')
            .update({ status: 'alert', alert_message: 'Stationary alert: No movement detected for 3 minutes' })
            .eq('id', activeSessionId)
            .then(({ error }) => {
              if (error) console.error("Failed to update stationary alert", error);
            });
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isTravelling, panelSize, stationaryAlerted, currentPos, isPaused, activeSessionId, addToast]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: havens, error: havensErr } = await supabase
          .from('safe_havens')
          .select('*')
          .eq('is_verified', true);

        if (havensErr) console.error('Failed to load safe havens:', havensErr);
        if (havens) setSafeHavens(havens);

        const { data: zones, error: zonesErr } = await supabase
          .from('safety_reports')
          .select('*')
          .in('report_type', ['unsafe_area', 'broken_light'])
          .in('status', ['verified', 'pending']);

        if (zonesErr) console.error('Failed to load danger zones:', zonesErr);
        if (zones) setDangerZones(zones);
      } catch (err) {
        console.error('Error loading map data:', err);
        addToast('Failed to load map safety data', 'error');
      }
    }
    loadData();
  }, []);

  async function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      addToast('Geolocation is not supported by this browser.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const next = new L.LatLng(latitude, longitude);
        setCurrentPos(next);
        setStartCoords(next);
        setStartLocation('Current Location (Live GPS)');
        setStartSuggestions([]);
      },
      (error) => {
        console.error('Location error', error);
        addToast(error.message || 'Failed to access location.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  async function handleCheckScores() {
    if (!startCoords) {
      addToast('Please select a Boarding location.', 'error');
      return;
    }
    if (!dropCoords) {
      addToast('Please select a Drop location.', 'error');
      return;
    }
    setRouteStart(startCoords);
    setRouteEnd(dropCoords);
    setIsCheckingScores(true);
    setAllRoutes([]);
  }

  async function handleStartTravel() {
    if (!startCoords) {
      addToast('Please select a Boarding location or use your current location.', 'error');
      return;
    }
    if (!dropCoords) {
      addToast('Please select a Drop location.', 'error');
      return;
    }

    if (user) {
      const { data, error } = await supabase.from('guardian_sessions').insert({
        user_id: user.id,
        status: 'active',
        start_location: { lat: startCoords.lat, lng: startCoords.lng, address: startLocation },
        end_location: { lat: dropCoords.lat, lng: dropCoords.lng, address: dropLocation },
        current_location: { lat: startCoords.lat, lng: startCoords.lng, timestamp: new Date().toISOString() }
      }).select().single();

      if (!error && data) {
        setActiveSessionId(data.id);
        
        // Trigger native SMS to notify guardians
        try {
          const { data: profile } = await supabase.from('profiles').select('emergency_contacts').eq('id', user.id).single();
          if (profile?.emergency_contacts && Array.isArray(profile.emergency_contacts)) {
             const phoneNumbers = profile.emergency_contacts.map((c: any) => c.phone).filter(Boolean).join(',');
             const mapsLink = `https://maps.google.com/?q=${startCoords.lat},${startCoords.lng}`;
             const liveTrackLink = `${window.location.origin}/track/${data.id}`;
             const message = encodeURIComponent(`I am starting a journey! I am sharing my live location with you: ${mapsLink}\nLive Tracking: ${liveTrackLink}`);
             window.open(`sms:${phoneNumbers}?body=${message}`, '_self');
          }
        } catch (e) {
          console.warn('Failed to trigger Guardian SMS intent', e);
        }
      }
    }

    setRouteStart(startCoords);
    setRouteEnd(dropCoords);
    setIsTravelling(true);
    setIsSearching(false);
    setStationaryAlerted(false);
    setIsDeviated(false);
    setHasLiveFix(false);
    setIsPaused(false);
    setAllRoutes([]);
    setSelectedRouteIndex(0);
    setTravelStartedAt(Date.now());
    setCurrentPos(startCoords);
    lastMoveAtRef.current = Date.now();
    lastPosRef.current = { lat: startCoords.lat, lng: startCoords.lng, time: Date.now() };
  }

  function handlePauseToggle() {
    setIsPaused((prev) => !prev);
  }

  async function handleStopTravel() {
    if (activeSessionId) {
      await supabase.from('guardian_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', activeSessionId);
      setActiveSessionId(null);
    }

    setIsTracking(false);
    setIsTravelling(false);
    setIsPaused(false);
    setVoiceMuted(false);
    setIsDeviated(false);
    setRouteCoords([]);
    setAllRoutes([]);
    setSelectedRouteIndex(0);
  }

  function handleReroute() {
    if (!dropCoords) {
      addToast('Please select a Drop location.', 'error');
      return;
    }
    setRouteCoords([]);
    setIsDeviated(false);
    setRouteStart(currentPos);
    setRouteEnd(dropCoords);
    setRouteSummary(null);
    setRouteSteps([]);
    setAllRoutes([]);
    setSelectedRouteIndex(0);
    setCurrentStepIndex(0);
    setTravelStartedAt(Date.now());
  }

  return (
    <div className="min-h-screen bg-space-navy-900 text-white p-4 pb-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-neon-cyan-500/10 blur-[100px] rounded-full z-0"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-soft-lavender-500/10 blur-[80px] rounded-full z-0"></div>

      <header className="mb-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full glass-panel hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-400 hover:text-white" />
          </button>
          <div onClick={() => navigate('/')} className="cursor-pointer">
            <h1 className="text-2xl font-black text-neon-cyan-500 uppercase flex items-center gap-2 tracking-tighter">
              <ShieldCheck size={28} /> SAKHI NAV
            </h1>
            <p className="text-xs text-soft-lavender-400 font-bold tracking-widest ml-9">SECURE PATHFINDER</p>
          </div>
        </div>

        <select value={panelSize} onChange={(e) => setPanelSize(e.target.value)} className="glass-panel text-xs p-2 px-4 focus:outline-none focus:border-neon-cyan-500">
          <option value="small" className="bg-space-navy-900">Compact</option>
          <option value="medium" className="bg-space-navy-900">Standard</option>
          <option value="large" className="bg-space-navy-900">Guardian</option>
        </select>
      </header>

      {/* Navigation Input Panel - Floating Glass */}
      <AnimatePresence>
        {(isSearching || !isTravelling) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-30 mb-4"
          >
            <div className="glass-panel p-4 border border-neon-cyan-500/50 shadow-[0_0_20px_rgba(0,225,255,0.2)]">
              {/* Start Input */}
              <div className="flex items-center gap-3 mb-3 relative z-50">
                <MapPin size={18} className="text-neon-cyan-400" />
                <div className="flex-1 relative">
                  <label className="text-[10px] text-neon-cyan-400 font-bold tracking-wider uppercase block mb-1">Boarding</label>
                  <div className="flex w-full items-end gap-2">
                    <input
                      type="text"
                      value={startLocation}
                      onChange={(e) => {
                        setStartLocation(e.target.value);
                        setStartCoords(null);
                      }}
                      placeholder={selectingOnMap === 'start' ? "Click on map..." : "Boarding location"}
                      className="flex-1 bg-space-navy-800/50 border-b border-gray-600 focus:border-neon-cyan-500 text-sm py-1 outline-none text-white placeholder-gray-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectingOnMap(selectingOnMap === 'start' ? null : 'start')}
                      className={`p-1 border-b transition-colors ${selectingOnMap === 'start' ? 'border-neon-cyan-400 text-neon-cyan-400 bg-neon-cyan-500/10' : 'border-gray-600 text-gray-400 hover:border-neon-cyan-400 hover:text-neon-cyan-400'}`}
                      title="Select on map"
                    >
                      <Target size={18} />
                    </button>
                  </div>
                  {/* Start Suggestions */}
                  {startLocation.length > 1 && !startCoords && (
                    <div className="absolute top-full left-0 w-full bg-space-navy-900/95 border border-neon-cyan-500/30 rounded-b-xl shadow-xl max-h-40 overflow-y-auto z-[100]">
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="w-full px-4 py-2 text-left hover:bg-neon-cyan-500/20 text-xs flex justify-between items-center border-b border-white/5"
                      >
                        <span>Use Current Location</span>
                        <span className="text-[10px] text-gray-400 uppercase">GPS</span>
                      </button>
                      {isStartSearching && (
                        <div className="px-4 py-2 text-xs text-gray-400">Searching...</div>
                      )}
                      {startSuggestions.map((place, idx) => (
                        <div
                          key={`${place.lat}-${place.lon}-${idx}`}
                          onClick={() => {
                            const next = new L.LatLng(parseFloat(place.lat), parseFloat(place.lon));
                            setStartLocation(place.display_name);
                            setStartCoords(next);
                            setCurrentPos(next);
                            setStartSuggestions([]);
                          }}
                          className="px-4 py-2 hover:bg-neon-cyan-500/20 cursor-pointer text-xs flex justify-between items-center border-b border-white/5 last:border-0"
                        >
                          <span className="line-clamp-1">{place.display_name}</span>
                          <span className="text-[10px] text-gray-400 uppercase">{place.type || 'Place'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Drop Input */}
              <div className="flex items-center gap-3 relative z-40">
                <Flag size={18} className="text-soft-lavender-400" />
                <div className="flex-1 relative">
                  <label className="text-[10px] text-soft-lavender-400 font-bold tracking-wider uppercase block mb-1">Drop</label>
                  <div className="flex w-full items-end gap-2">
                    <input
                      type="text"
                      value={dropLocation}
                      onChange={(e) => {
                        setDropLocation(e.target.value);
                        setDropCoords(null);
                      }}
                      placeholder={selectingOnMap === 'drop' ? "Click on map..." : "Drop location"}
                      autoFocus={!!location.state?.startCoords}
                      className="flex-1 bg-space-navy-800/50 border-b border-gray-600 focus:border-soft-lavender-500 text-sm py-1 outline-none text-white placeholder-gray-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectingOnMap(selectingOnMap === 'drop' ? null : 'drop')}
                      className={`p-1 border-b transition-colors ${selectingOnMap === 'drop' ? 'border-soft-lavender-400 text-soft-lavender-400 bg-soft-lavender-500/10' : 'border-gray-600 text-gray-400 hover:border-soft-lavender-400 hover:text-soft-lavender-400'}`}
                      title="Select on map"
                    >
                      <Target size={18} />
                    </button>
                  </div>
                  {/* Drop Suggestions */}
                  {dropLocation.length > 1 && !dropCoords && (
                    <div className="absolute top-full left-0 w-full bg-space-navy-900/95 border border-soft-lavender-500/30 rounded-b-xl shadow-xl max-h-40 overflow-y-auto z-[100]">
                      {isDropSearching && (
                        <div className="px-4 py-2 text-xs text-gray-400">Searching...</div>
                      )}
                      {dropSuggestions.map((place, idx) => (
                        <div
                          key={`${place.lat}-${place.lon}-${idx}`}
                          onClick={() => {
                            setDropLocation(place.display_name);
                            setDropCoords(new L.LatLng(parseFloat(place.lat), parseFloat(place.lon)));
                            setDropSuggestions([]);
                          }}
                          className="px-4 py-2 hover:bg-soft-lavender-500/20 cursor-pointer text-xs flex justify-between items-center border-b border-white/5 last:border-0"
                        >
                          <span className="line-clamp-1">{place.display_name}</span>
                          <span className="text-[10px] text-gray-400 uppercase">{place.type || 'Place'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Pulse Search Icon */}
                <div className="p-2 bg-neon-cyan-500/20 rounded-full animate-pulse">
                  <Search size={16} className="text-neon-cyan-400" />
                </div>
              </div>
            </div>
            
            {activeSessionId && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/track/${activeSessionId}`;
                    if (navigator.share) {
                      navigator.share({ title: 'Track My Trip', text: "I'm travelling. Follow my live location here:", url: link });
                    } else {
                      navigator.clipboard.writeText(link);
                      addToast("Tracking link copied to clipboard!", "success");
                    }
                  }}
                  className="w-full bg-soft-lavender-500/20 text-soft-lavender-400 border border-soft-lavender-500/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-soft-lavender-500/30 transition-colors"
                >
                  <Share2 size={18} />
                  Share Live Location
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Container */}
      <motion.div
        layoutId="hero-guardian"
        className={`
        w-full rounded-[2.5rem] overflow-hidden relative z-10 transition-all duration-1000
        ${panelSize === 'small' ? 'h-[40vh]' : panelSize === 'large' ? 'h-[80vh]' : (isTravelling ? 'h-[65vh]' : 'h-[55vh]')}
        ${isTravelling ? 'border-4 border-neon-cyan-500 shadow-neon-cyan animate-breathe-cyan' : 'border border-space-navy-600 shadow-lg'}
        ${isDeviated ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse' : ''}
      `}>
        <MapContainer center={[currentPos.lat, currentPos.lng]} zoom={13} style={{ height: '100%', width: '100%', cursor: selectingOnMap ? 'crosshair' : '' }}>
          <MapClickHandler onLocationSelected={handleMapLocationSelected} selectingOnMap={selectingOnMap !== null} />
          <TileLayer
            className="map-tiles"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <MapRecenter center={currentPos} follow={isTravelling && !isPaused} />

          {/* Safe Havens */}
          {[...safeHavens, ...dynamicSafeHavens].map(h => (
            <Marker key={h.id} position={[h.latitude, h.longitude]} icon={safeHavenIcon}>
              <Popup className="glass-popup">
                <div className="font-bold text-space-navy-900">{h.name}</div>
                <div className="text-xs text-space-navy-700">{h.type?.replace('_', ' ') || 'Safe Haven'}</div>
              </Popup>
            </Marker>
          ))}

          {/* Danger Zones */}
          {[...dangerZones, ...dynamicDangerZones].length > 0 ? [...dangerZones, ...dynamicDangerZones].map(z => {
            const severity = z.severity || 3;
            let styles = { radius: 300, color: '#ef4444' };
            if (severity <= 2) {
              styles = { radius: 100, color: '#eab308' }; // yellow
            } else if (severity === 3) {
              styles = { radius: 200, color: '#f97316' }; // orange
            }
            return (
              <Circle key={z.id} center={[z.latitude, z.longitude]} radius={styles.radius} pathOptions={{ color: styles.color, fillColor: styles.color, fillOpacity: 0.2, weight: 1, dashArray: '5, 10' }}>
                 <Popup className="glass-popup">
                  <div className="font-bold text-space-navy-900">{z.name || 'High Risk Area'}</div>
                  <div className="text-xs text-space-navy-700">{z.type || 'Zone'}</div>
                </Popup>
              </Circle>
            );
          }) : (
            [
              { id: 'mock-1', latitude: currentPos.lat + 0.005, longitude: currentPos.lng + 0.005, severity: 5, name: 'Mock Danger 1', type: 'mock' },
              { id: 'mock-2', latitude: currentPos.lat - 0.004, longitude: currentPos.lng + 0.006, severity: 3, name: 'Mock Danger 2', type: 'mock' },
              { id: 'mock-3', latitude: currentPos.lat + 0.004, longitude: currentPos.lng - 0.004, severity: 1, name: 'Mock Danger 3', type: 'mock' }
            ].map(z => {
              const severity = z.severity || 3;
              let styles = { radius: 300, color: '#ef4444' };
              if (severity <= 2) {
                styles = { radius: 100, color: '#eab308' }; // yellow
              } else if (severity === 3) {
                styles = { radius: 200, color: '#f97316' }; // orange
              }
              return (
                <Circle key={z.id} center={[z.latitude, z.longitude]} radius={styles.radius} pathOptions={{ color: styles.color, fillColor: styles.color, fillOpacity: 0.2, weight: 1, dashArray: '5, 10' }} />
              );
            })
          )}

          {routeStart && routeEnd && (
            <RoutingEngine
              start={routeStart}
              end={routeEnd}
              show={isTravelling || isCheckingScores}
              onRouteFound={(routes: any[]) => {
                setAllRoutes(routes || []);
                const primaryRoute = routes[0];
                if (primaryRoute) {
                  setRouteCoords(primaryRoute.coordinates || []);
                  if (primaryRoute.summary) {
                    setRouteSummary({ distance: primaryRoute.summary.totalDistance, time: primaryRoute.summary.totalTime });
                  } else setRouteSummary(null);
                  const steps = primaryRoute.instructions || [];
                  setRouteSteps(Array.isArray(steps) ? steps : []);
                  setCurrentStepIndex(0);
                  lastSpokenStepRef.current = null;
                }
                
                if (routes && routes.length > 0) {
                  const newScores: any = {};
                  routes.forEach((rt, idx) => {
                    newScores[idx] = { score: 0, details: 'Calculating...', loading: true };
                  });
                  setRouteScores(newScores);
                  
                  (async () => {
                    // Pre-fetch global bounding box for ALL routes to prevent rate limiting
                    let globalElements: any[] | null = null;
                    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
                    routes.forEach(rt => {
                      (rt.coordinates || []).forEach((c: any) => {
                        if (c.lat < minLat) minLat = c.lat;
                        if (c.lat > maxLat) maxLat = c.lat;
                        if (c.lng < minLng) minLng = c.lng;
                        if (c.lng > maxLng) maxLng = c.lng;
                      });
                    });
                    minLat -= 0.005; maxLat += 0.005;
                    minLng -= 0.005; maxLng += 0.005;
                    
                    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
                    const query = `
                      [out:json][timeout:60];
                      (
                        node["amenity"="police"](${bbox});
                        node["amenity"="hospital"](${bbox});
                        node["amenity"="fire_station"](${bbox});
                        node["highway"="street_lamp"](${bbox});
                        node["man_made"="surveillance"](${bbox});
                        node["public_transport"="station"](${bbox});
                        node["building"="abandoned"](${bbox});
                        node["amenity"="bar"](${bbox});
                        node["amenity"="pub"](${bbox});
                        node["shop"="alcohol"](${bbox});
                      );
                      out body;
                    `;
                    
                    try {
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 45000);
                      const json = await fetchOverpassWithFallback(query, controller.signal);
                      clearTimeout(timeoutId);
                      if (json) {
                        globalElements = json.elements;
                      }
                    } catch (err) {
                      console.warn("Global Overpass pre-fetch failed", err);
                    }

                    for (let idx = 0; idx < routes.length; idx++) {
                      const rt = routes[idx];
                      const mockZones = dangerZones.length > 0 ? dangerZones : [
                        { id: 'mock-1', latitude: currentPos.lat + 0.005, longitude: currentPos.lng + 0.005, severity: 5 },
                        { id: 'mock-2', latitude: currentPos.lat - 0.004, longitude: currentPos.lng + 0.006, severity: 3 },
                        { id: 'mock-3', latitude: currentPos.lat + 0.004, longitude: currentPos.lng - 0.004, severity: 1 }
                      ];
                      const routeLengthKm = (rt.summary?.totalDistance || 0) / 1000;
                      let envData: any = null;
                      
                      // If globalElements failed, fallback to individual retries
                      if (globalElements) {
                         envData = await fetchEnvironmentalData(rt.coordinates || [], routeLengthKm, mockZones, globalElements);
                      } else {
                        for (let retry = 0; retry < 3; retry++) {
                          envData = await fetchEnvironmentalData(rt.coordinates || [], routeLengthKm, mockZones);
                          if (!envData.details.includes('Offline Mode')) break;
                          if (retry < 2) await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                      }
                      
                      setRouteScores(prev => ({
                        ...prev,
                        [idx]: {
                          score: envData.score,
                          details: envData.details,
                          safePoIs: envData.safePoIs,
                          riskPoIs: envData.riskPoIs,
                          loading: false
                        }
                      }));
                      
                      if (idx === 0) {
                        setDynamicSafeHavens(envData.safePoIs || []);
                        setDynamicDangerZones(envData.riskPoIs || []);
                      }
                    }
                  })();
                }
              }}
            />
          )}

          {allRoutes.map((rt, idx) => {
            if (selectedRouteIndex === idx) return null;
            return (
              <Polyline
                key={`alt-${idx}`}
                positions={rt.coordinates || []}
                color="#8b5cf6"
                weight={4}
                opacity={0.5}
                eventHandlers={{
                  click: () => {
                    setSelectedRouteIndex(idx);
                    setRouteCoords(rt.coordinates || []);
                    if (rt.summary) setRouteSummary({ distance: rt.summary.totalDistance, time: rt.summary.totalTime });
                    setRouteSteps(rt.instructions || []);
                    setCurrentStepIndex(0);
                    setIsDeviated(false);
                    const routeData = routeScores[idx];
                    if (routeData) {
                      if (routeData.safePoIs) setDynamicSafeHavens(routeData.safePoIs);
                      if (routeData.riskPoIs) setDynamicDangerZones(routeData.riskPoIs);
                    }
                  }
                }}
              />
            );
          })}
          
          {allRoutes.length > 0 && selectedRouteIndex < allRoutes.length && (
            <Polyline
              key={`selected-${selectedRouteIndex}`}
              positions={allRoutes[selectedRouteIndex].coordinates || []}
              color="#00e1ff"
              weight={6}
              opacity={0.8}
              className="animate-pulse"
            />
          )}

          {isTravelling && routeSteps[currentStepIndex]?.latLng && (
            <Marker position={routeSteps[currentStepIndex].latLng} icon={stepIcon}>
              <Popup className="glass-popup">
                <div className="font-bold text-space-navy-900">Next Step</div>
                <div className="text-xs text-space-navy-700">
                  {routeSteps[currentStepIndex]?.text || 'Continue'}
                </div>
              </Popup>
            </Marker>
          )}

          {!isTravelling && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 flex flex-col gap-2">
              <button
                onClick={handleCheckScores}
                className="w-full bg-soft-lavender-500 text-white px-8 py-3 rounded-2xl font-bold shadow-neon-lavender hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <Search size={18} />
                CHECK ROUTES & SCORES
              </button>
              <button
                onClick={handleStartTravel}
                className="w-full bg-neon-cyan-500 text-space-navy-900 px-8 py-4 rounded-2xl font-black text-lg shadow-neon-cyan hover:scale-105 transition-transform flex items-center justify-center gap-2 group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 w-full h-full skew-x-12"></div>
                <Navigation size={20} className="relative z-10" />
                <span className="relative z-10">START SAFE TRAVEL</span>
              </button>
            </div>
          )}

          {isDeviated && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-bounce flex items-center gap-2">
              <AlertOctagon size={20} /> OFF ROUTE DETECTED
            </div>
          )}

          {isDeviated && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000]">
              <button
                onClick={handleReroute}
                className="bg-neon-cyan-500 text-space-navy-900 px-4 py-2 rounded-full font-bold text-xs shadow-neon-cyan hover:scale-105 transition-transform"
              >
                RE-ROUTE FROM CURRENT POSITION
              </button>
            </div>
          )}

          {stationaryAlerted && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-space-navy-900 px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(245,158,11,0.8)] flex items-center gap-2">
              <AlertOctagon size={20} /> STATIONARY ALERT SENT
            </div>
          )}

          {isTravelling && (
            <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
              <button
                onClick={handlePauseToggle}
                className="bg-space-navy-900/80 border border-space-navy-600 text-white px-3 py-2 rounded-full text-xs font-bold hover:bg-space-navy-800/80 transition-colors"
              >
                {isPaused ? 'RESUME' : 'PAUSE'}
              </button>
              <button
                onClick={() => setVoiceMuted((prev) => !prev)}
                className="bg-space-navy-900/80 border border-space-navy-600 text-white px-3 py-2 rounded-full text-xs font-bold hover:bg-space-navy-800/80 transition-colors"
              >
                {voiceMuted ? 'VOICE OFF' : 'VOICE ON'}
              </button>
              <button
                onClick={() => setShowStopConfirm(true)}
                className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95"
              >
                STOP
              </button>
            </div>
          )}
        </MapContainer>
      </motion.div>

      {locationError && (
        <div className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
          {locationError}
        </div>
      )}

      {isTravelling && (
        <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
          <span>{isTracking ? 'Live tracking active' : 'Live tracking paused'}</span>
          {routeSummary && (
            <span>
              {Math.round(routeSummary.distance / 100) / 10} km - {Math.round(routeSummary.time / 60)} min
            </span>
          )}
          {accuracy !== null && (
            <span>GPS +/-{Math.round(accuracy)} m</span>
          )}
          <span>{panelSize === 'large' ? 'Guardian Mode enabled' : 'Guardian Mode off'}</span>
        </div>
      )}

      {/* Alternative Routes Selection UI */}
      {(isTravelling || isCheckingScores) && allRoutes.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {allRoutes.map((rt, idx) => {
            const isSelected = selectedRouteIndex === idx;
            const routeData = routeScores[idx] || { score: 0, details: 'Loading...', loading: true };
            const dangerScore = routeData.score;
            
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedRouteIndex(idx);
                  setRouteCoords(rt.coordinates || []);
                  if (rt.summary) setRouteSummary({ distance: rt.summary.totalDistance, time: rt.summary.totalTime });
                  setRouteSteps(rt.instructions || []);
                  setCurrentStepIndex(0);
                  setIsDeviated(false);
                  
                  if (routeData.safePoIs) setDynamicSafeHavens(routeData.safePoIs);
                  if (routeData.riskPoIs) setDynamicDangerZones(routeData.riskPoIs);
                }}
                className={`min-w-[140px] p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${isSelected ? 'bg-neon-cyan-500/20 border-neon-cyan-500 text-neon-cyan-400' : 'bg-space-navy-800 border-space-navy-700 text-gray-400 hover:border-gray-500'}`}
              >
                <span className="font-bold text-xs uppercase tracking-wider">Route {idx + 1}</span>
                <span className="text-[10px]">{Math.round(rt.summary?.totalTime / 60) || 0} min</span>
                {routeData.loading ? (
                   <span className="text-[10px] animate-pulse">Scoring PoIs...</span>
                ) : (
                  <>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${dangerScore > 66 ? 'bg-red-500/20 text-red-500' : dangerScore > 33 ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                      Danger Score: {dangerScore}
                    </span>
                    <span className="text-[9px] text-center opacity-70 px-1 leading-tight">{routeData.details}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isTravelling && routeSteps.length > 0 && (
        <div className="mt-4 glass-panel border border-space-navy-700 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Turn by Turn</h3>
            {routeSummary && (
              <span className="text-[11px] text-gray-500">
                {Math.round(routeSummary.distance / 100) / 10} km - {Math.round(routeSummary.time / 60)} min
              </span>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2" ref={stepsListRef}>
            {(showAllSteps ? routeSteps : routeSteps.slice(0, 8)).map((step: any, idx: number) => {
              const absoluteIndex = showAllSteps ? idx : idx;
              const isActive = absoluteIndex === currentStepIndex;
              return (
                <div
                  key={idx}
                  data-active={isActive ? 'true' : 'false'}
                  className={`flex items-center justify-between text-xs ${isActive ? 'text-neon-cyan-300' : 'text-gray-300'}`}
                >
                  <span className="line-clamp-1">
                    {step.text || step.type || 'Continue'}
                  </span>
                  {typeof step.distance === 'number' && (
                    <span className="text-[10px] text-gray-500">{Math.round(step.distance)} m</span>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowAllSteps((prev) => !prev)}
            className="mt-3 text-[11px] font-bold uppercase tracking-widest text-neon-cyan-400 hover:text-neon-cyan-300"
          >
            {showAllSteps ? 'Show Less' : 'Show All Steps'}
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-4 flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-cyan-500 shadow-[0_0_10px_#00e1ff]"></div>
          <span className="text-xs text-gray-400">Safe Havens</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-500"></div>
          <span className="text-xs text-gray-400">High Risk Zones</span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showStopConfirm}
        title="Stop Navigation"
        message="Are you sure you want to stop travel mode? Guardian tracking will be paused."
        confirmLabel="Stop Travel"
        isDestructive
        onConfirm={handleStopTravel}
        onCancel={() => setShowStopConfirm(false)}
      />
    </div>
  );
}


