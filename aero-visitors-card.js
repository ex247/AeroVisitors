/*
 * AeroVisitors  -  Home Assistant Lovelace card
 *
 * Displays aircraft data from a local ADS-B receiver or Home Assistant sensor.
 *
 * Views:
 *   plate    -  one selected aircraft
 *   cluster  -  aircraft packed according to relative wingspan
 *   stacked  -  single column sorted by altitude
 *   weather    -  aircraft and cloud layers positioned by altitude, based on METAR data
 *
 * Install:
 * HACS install: install AeroVisitors as a Dashboard repository. HACS adds the resource automatically.
 * Manual install:
 *   1. Copy this file to /config/www/aero-visitors-card.js
 *   2. Add /local/aero-visitors-card.js as a JavaScript module resource.
 *   3. Put aircraft images in /config/www/aircraft/ (including cloud.svg).
 *   4. Aircraft images should be roughly 1500x100; transparent PNG works best.
 *
 * Images are named by ICAO aircraft type:
 *   A320.png, B738.png, C172.png
 *
 * Example:
 *   type: custom:aero-visitors-card
 *   adsb_source: url
 *   adsb_url: http://192.168.1.50:8080/data/aircraft.json  - your ADSB receiver IP address here
 *   view: stacked
 *   backdrop: auto
 *   radius: 25
 *
 * Sensor example:
 *   type: custom:aero-visitors-card
 *   adsb_source: sensor
 *   adsb_sensor: sensor.overhead_aircraft
 * The sensor must expose an aircraft or ac array in its attributes.
 * Example configuration:
 * Install the RESTful integration
 * create a yaml file with this and add it to the configuration.yaml
 * - resource: https://api.adsb.lol/v2/lat/40/lon/-70/dist/100
 *  scan_interval: 600
 *   timeout: 5
 *   sensor:
 *     - name: ADSB Feed LOL
 *       unique_id: adsb_feed_lol
 *       value_template: "{{ value_json.ac | length }}"
 *       json_attributes:
 *         - now
 *         - ac
 *         - msg
 *
 * The automatic background requires a Home Assistant weather entity.
 * METAR data on the weather view is based on configuring a METAR station code.
  
    */
const AEROVISITORS_CARD_VERSION = '1.0.0';
const VIEWS = ['plate', 'cluster', 'stacked', 'metar'];

//required under Datamask TOS
const METAR_ATTRIBUTION =
  'Weather data from NOAA National Weather Service and Datamask Aviation.';

const AIRCRAFT_ASSET_PATH = new URL('./aircraft/', import.meta.url).pathname.replace(/\/$/, '');
const CLOUD_IMAGE_URL = new URL('./aircraft/cloud.svg', import.meta.url).pathname;

const CLOUD_DEFINITIONS = {
  FEW: {  percent: 20, label: 'Few clouds' },
  SCT: {  percent: 45,  label: 'Scattered clouds' },
  BKN: {  percent: 75,  label: 'Broken clouds' },
  OVC: { percent: 150,  label: 'Overcast' },
};

// Wingspan in meters by ICAO type; rotor diameter for helicopters.
const WINGSPAN_M = {
  A318: 34.1, A319: 35.8, A320: 35.8, A321: 35.8, A19N: 35.8, A20N: 35.8, A21N: 35.8,
  A332: 60.3, A333: 60.3, A338: 64.0, A339: 64.0, A342: 60.3, A343: 60.3, A346: 63.5,
  A359: 64.8, A35K: 64.8, A388: 79.8, A306: 44.8, A310: 43.9, A225: 88.4,
  B712: 28.4, B733: 28.9, B734: 28.9, B735: 28.9, B736: 34.3, B737: 34.3, B738: 35.8,
  B739: 35.8, B37M: 35.9, B38M: 35.9, B39M: 35.9,
  B744: 64.4, B748: 68.4, B752: 38.0, B753: 38.0, B762: 47.6, B763: 47.6, B764: 51.9,
  B772: 60.9, B77L: 64.8, B77W: 64.8, B788: 60.1, B789: 60.1, B78X: 60.1,
  E170: 26.0, E75L: 26.0, E75S: 26.0, E190: 28.7, E195: 28.7, E290: 33.7, E295: 35.1,
  CRJ1: 21.4, CRJ2: 21.2, CRJ7: 23.2, CRJ9: 24.9, CRJX: 26.2,
  DH8A: 25.9, DH8B: 25.9, DH8C: 27.4, DH8D: 28.4, AT43: 24.6, AT72: 27.1, AT76: 27.1,
  BCS1: 35.1, BCS3: 35.1, SF34: 21.4, JS41: 18.3, MD11: 51.7, MD82: 32.9, MD83: 32.9,
  MD88: 32.9, MD90: 32.9, C130: 40.4, C17: 51.8, K35R: 39.9, B52: 56.4, P8: 37.6,
  C172: 11.0, C152: 10.2, C182: 11.0, C206: 10.9, C210: 11.2, PA28: 10.7, PA32: 11.0, PA46: 13.1,
  SR20: 10.7, SR22: 11.7, BE35: 10.2, BE36: 11.5, M20P: 11.1, DA40: 11.9, DA42: 13.4,
  C208: 15.9, PC12: 16.3, TBM7: 12.1, TBM8: 12.1, TBM9: 12.1, BE20: 16.6, BE9L: 15.3, BE10: 15.3,
  C25A: 15.9, C25B: 15.9, C25C: 15.9, C510: 12.9, C525: 14.4, C550: 13.8, C56X: 17.2,
  C680: 19.4, C700: 19.3, C750: 19.4, H25B: 15.7, LJ35: 12.0, LJ45: 14.5, LJ60: 13.4,
  GLF4: 23.7, GLF5: 28.5, GLF6: 30.4, GL5T: 28.7, GL7T: 31.4, GLEX: 28.7, E55P: 16.2,
  FA50: 18.9, FA7X: 26.2, FA8X: 26.3, F900: 19.3, F2TH: 19.3, CL30: 19.5, CL35: 19.5, CL60: 19.6,
  R44: 10.1, R22: 7.7, B06: 10.2, EC35: 10.2, EC45: 11.0, S76: 13.4, A109: 11.0, H60: 16.4, B407: 10.7,
};

// Used to estimate size when the aircraft type has no wingspan entry.
// based on ADSB category.
const CATEGORY_SPAN_M = {
  A1: 11, A2: 20, A3: 35, A4: 38, A5: 60, A6: 20, A7: 12, B2: 10,
};

const OPERATORS = {
  // US passenger airlines
  AAL: 'American', DAL: 'Delta', UAL: 'United', SWA: 'Southwest',
  JBU: 'JetBlue', ASA: 'Alaska', NKS: 'Spirit', FFT: 'Frontier',
  AAY: 'Allegiant', HAL: 'Hawaiian', SCX: 'Sun Country', MXY: 'Breeze', VXP: 'Avelo',

  // US regional airlines
  ENY: 'Envoy', RPA: 'Republic', SKW: 'SkyWest', JIA: 'PSA', EDV: 'Endeavor',
  PDT: 'Piedmont', ASH: 'Mesa', GJS: 'GoJet', QXE: 'Horizon', AWI: 'Air Wisconsin',
  CMT: 'CommuteAir', KAP: 'Cape Air',

  // US cargo airlines
  UPS: 'UPS', FDX: 'FedEx', GTI: 'Atlas Air', ABX: 'ABX Air', ATN: 'Air Transport International',
  PAC: 'Polar Air Cargo', CKS: 'Kalitta Air', WGN: 'Western Global', AJT: 'Amerijet', AMF: 'Ameriflight',
  IFL: 'IFL Group', SNC: 'Air Cargo Carriers', MTN: 'Mountain Air Cargo',

  // Canada and Mexico
  ACA: 'Air Canada', WJA: 'WestJet', TSC: 'Air Transat', POE: 'Porter',
  JZA: 'Jazz', FLE: 'Flair', CJT: 'Cargojet', AMX: 'Aeromexico', VOI: 'Volaris', VIV: 'Viva Aerobus',

  // Latin America and Caribbean
  AVA: 'Avianca', LRC: 'Avianca Costa Rica', CMP: 'Copa', LAN: 'LATAM Chile', TAM: 'LATAM Brasil',
  ARG: 'Aerolineas Argentinas', AZU: 'Azul', GLO: 'GOL', BWA: 'Caribbean Airlines', BHS: 'Bahamasair',

  // Europe
  BAW: 'British Airways', VIR: 'Virgin Atlantic', EIN: 'Aer Lingus', ICE: 'Icelandair', DLH: 'Lufthansa',
  AFR: 'Air France', KLM: 'KLM', SWR: 'Swiss', AUA: 'Austrian', IBE: 'Iberia',
  TAP: 'TAP Air Portugal', SAS: 'Scandinavian Airlines', FIN: 'Finnair', LOT: 'LOT Polish Airlines',
  ITY: 'ITA Airways',

  // Middle East, Turkey, and Africa
  THY: 'Turkish Airlines', UAE: 'Emirates', QTR: 'Qatar Airways', ETD: 'Etihad', ELY: 'El Al',
  ETH: 'Ethiopian Airlines', MSR: 'EgyptAir', RAM: 'Royal Air Maroc',

  // Asia and Pacific
  KAL: 'Korean Air', AAR: 'Asiana', ANA: 'All Nippon Airways', JAL: 'Japan Airlines',
  SIA: 'Singapore Airlines', CPA: 'Cathay Pacific', EVA: 'EVA Air', CAL: 'China Airlines',
  PAL: 'Philippine Airlines', QFA: 'Qantas', ANZ: 'Air New Zealand', FJI: 'Fiji Airways',

  // International cargo
  CLX: 'Cargolux', MNB: 'MNG Airlines Cargo', NCA: 'Nippon Cargo Airlines',
  CKK: 'China Cargo Airlines', BOX: 'AeroLogic', GEC: 'Lufthansa Cargo',
  MPH: 'Martinair', DHK: 'DHL',

  // Additional operators
  BCS: 'European Air Transport', CNS: 'Cobolt Air', AIC: 'Air India', EJA: 'Netjet',
  IFA: 'FAI Rent A Jet', GAF: 'German Air Force', PVL: 'Pal Airlines', SAM: 'USAF',
  CMB: 'US Transportation Command', RCH: 'US Military Command', XSR: 'Executive Flight Service'
};

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const DEFAULTS = {
  view: 'plate',
  adsb_source: 'url',
  adsb_url: '',
  adsb_sensor: '',

  latitude: undefined,
  longitude: undefined,
  radius: 25,
  units: 'auto',

  max_altitude_ft: 0,
  show_ground: false,
  refresh_s: 60,
  max_aircraft: 12,

  metar_enabled: false,
  metar_airport: 'KBHB',
  metar_airport_elevation_ft: 0,  
  metar_refresh: 60,
  show_clouds_stacked: false,

  cluster_scale: 0.92,
  stack_scale: 0.92,
  size_curve: 0.5,
  plate_pick: 'nearest',

  backdrop: 'white',
  backdrop_image: '',
  sun_entity: 'sun.sun',
  weather_entity: '',

  image_path: AIRCRAFT_ASSET_PATH,
  image_ext: 'png',
  image_fallback: 'default',
  image_faces: 'right',
  flip_to_heading: true,
  image_blend: 'normal',

  show_info: true,
  route_lookup: true,
  route_url: 'https://adsb.im/api/0/route',
  climb_fpm: 200,

  empty_text: 'Nothing but Clear Skies',
  hide_when_empty: false,
  show_clock: true,
  show_date: true,

  wingspans: {},
  operators: {},
};

function geoDistance(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;

  const dist = 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
  const y = Math.sin(dLon) * Math.cos(lat2 * rad);

  const x = Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
    Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos(dLon);

  return {
    dist,
    brg: (Math.atan2(y, x) / rad + 360) % 360,
  };
}

function fallbackSvg() {
  return `
    <svg class="aircraft-art fallback" viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g fill="currentColor" opacity=".75">
        <path d="M4 22C10 16 40 15 70 15L88 15 96 5 99 5 95 19C97 21 97 23 94 24L12 24C7 24 5 23 4 22Z"/>
        <path d="M40 20L58 20 49 35 43 35Z"/>
      </g>
    </svg>
  `;
}

const CSS = `
/* Card shell */
:host { display: block; width: 100%; height: var(--ov-panel-height, calc(100dvh - 80px)); min-height: 0; box-sizing: border-box; }
ha-card { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 0; box-sizing: border-box; overflow: hidden; 
		background: var(--ha-card-background, var(--card-background-color, #222)); }
.stage { --aircraft-text-color: #fff; --aircraft-text-shadow: 0 1px 3px rgba(0,0,0,.6); position: relative; flex: 1 1 0; min-height: 0;
		min-width: 0; width: 100%; overflow: hidden; color: var(--aircraft-text-color); font-family: var(--paper-font-body1_-_font-family, inherit); }
.stage > .bd { position: absolute; inset: 0; width: 100%; height: 100%; box-sizing: border-box; pointer-events: none; }
.content { position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; box-sizing: border-box; }
.stage:is([data-view=stacked],[data-view=metar]) .content { overflow-y: auto; overflow-x: hidden; overscroll-behavior-y: contain; }

/* Shared foreground colors */
.stage[data-bd=white] { --aircraft-text-color: #000; --aircraft-text-shadow: none; }
.stage[data-bd=plate] { --aircraft-text-color: #3a2a12; --aircraft-text-shadow: none; }
.stage[data-bd=none] { --aircraft-text-color: var(--primary-text-color); --aircraft-text-shadow: none; }
.stage:is([data-bd=clear],[data-bd=clouds],[data-bd=rainy],[data-bd=snowy]) { --aircraft-text-color: #111; --aircraft-text-shadow: none; }

/* Backdrops */
.bd-white { background: #fff; }
.bd-clear { background: linear-gradient(180deg,#2f80d8 0%,#7fbaf0 60%,#cfe8fb 100%); }
.bd-clouds { background: radial-gradient(ellipse 60% 16% at 18% 90%,#fff 35%,rgba(255,255,255,0) 100%), radial-gradient(ellipse 55% 18% at 72% 94%,#fff 35%,rgba(255,255,255,0) 100%), radial-gradient(ellipse 40% 10% at 46% 80%,rgba(255,255,255,.85) 30%,rgba(255,255,255,0) 100%), radial-gradient(ellipse 30% 8% at 88% 72%,rgba(255,255,255,.7) 30%,rgba(255,255,255,0) 100%), linear-gradient(180deg,#1f6fd0 0%,#6fb0ee 55%,#dcecfa 100%); }
.bd-sunset { background: radial-gradient(ellipse 70% 40% at 50% 100%,rgba(255,205,110,.95),rgba(255,122,69,0) 70%), linear-gradient(180deg,#1c2457 0%,#6b3a86 40%,#e0575b 72%,#ffb35c 100%); }
.bd-night { background: radial-gradient(1px 1px at 20px 30px,#fff,transparent), radial-gradient(1px 1px at 80px 70px,#fff,transparent), radial-gradient(1.5px 1.5px at 130px 20px,#fff,transparent), radial-gradient(1px 1px at 50px 110px,#fff,transparent), radial-gradient(1px 1px at 140px 120px,#cfd8ff,transparent), linear-gradient(180deg,#02040f 0%,#0a1633 60%,#14264f 100%); background-size: 160px 140px,160px 140px,160px 140px,160px 140px,160px 140px,100% 100%; }
.bd-night::after { content: ''; position: absolute; top: 9%; right: 10%; width: 8%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle at 35% 35%,#fff8e0,#d8d2b8); box-shadow: 0 0 30px 6px rgba(255,248,220,.3); }
.bd-storm { background: linear-gradient(180deg,#12151c 0%,#2b3240 50%,#4a5362 100%); }
.bd-rainy { background: linear-gradient(180deg,#829aab 0%,#afc2cf 55%,#dce6ec 100%); }
.bd-rainy::after { content: ''; position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(ellipse 1px 9px at 18px 20px,rgba(255,255,255,.65) 70%,transparent 100%), radial-gradient(ellipse 1px 7px at 53px 43px,rgba(255,255,255,.45) 70%,transparent 100%); background-size: 78px 72px,91px 83px; }
.bd-snowy { background: linear-gradient(180deg,#a9bbc9 0%,#d3dfe8 55%,#f2f6fa 100%); }
.bd-snowy::after { content: ''; position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(circle 3px at 20px 25px,rgba(255,255,255,.95) 70%,transparent 100%), radial-gradient(circle 2px at 65px 55px,rgba(255,255,255,.85) 70%,transparent 100%), radial-gradient(circle 1.5px at 40px 80px,rgba(255,255,255,.75) 70%,transparent 100%); background-size: 107px 113px,83px 97px,71px 89px; }
.bd-plate { background: radial-gradient(ellipse at 50% 40%,#f6ecd4 0%,#e9dbb8 100%); }
.bd-plate::before { content: ''; position: absolute; inset: 8px; border: 4px double #7a5a2c; }
.bd-plate::after { content: ''; position: absolute; inset: 18px; border: 1px solid #7a5a2c; }
.bd-image { background-size: cover; background-position: center; }
@media (prefers-reduced-motion:no-preference) {
  .bd-storm::after { content: ''; position: absolute; inset: 0; animation: ovflash 7s infinite; }
}
@keyframes ovflash {
  0%,92%,100% { background: rgba(220,230,255,0); }
  93% { background: rgba(220,230,255,.35); }
  94% { background: rgba(220,230,255,0); }
  95% { background: rgba(220,230,255,.25); }
  96% { background: rgba(220,230,255,0); }
}

/* Shared aircraft component */
.aircraft { box-sizing: border-box; min-width: 0; text-align: center; color: var(--aircraft-text-color); text-shadow: var(--aircraft-text-shadow); }
.aircraft-art { display: block; object-fit: contain; transition: transform .4s; }
.aircraft-title, .aircraft-subtitle { flex: none; margin: 0; font-family: inherit; text-align: center; }
.aircraft-title { font-size: 16px; font-weight: 600; line-height: 1.25; }
.aircraft-subtitle { font-size: 14px; font-weight: 300; line-height: 1.5; white-space: pre-line; }
.alert-art { background-color: rgba(210,35,35,.18); outline: 2px solid rgba(210,35,35,.8); outline-offset: 2px; border-radius: 8px; }

/* Plate layout */
.stage[data-view=plate] .aircraft { position: absolute; inset: 0; }
.plane { position: absolute; inset: 8% 8% 28% 8%; display: flex; align-items: center; justify-content: center; }
.stage[data-bd=plate] .plane { inset: 10% 12% 30% 12%; }
.stage[data-view=plate] .aircraft-art { max-width: 100%; max-height: 100%; }
.stage[data-view=plate] img.aircraft-art { filter: drop-shadow(0 8px 12px rgba(0,0,0,.35)); }
.stage[data-view=plate] .fallback { width: 70%; }
.stage[data-view=plate][data-bd=white] img.aircraft-art { filter: drop-shadow(0 6px 8px rgba(0,0,0,.18)); }
.info { position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 18px 12px; background: linear-gradient(transparent,rgba(0,0,0,.55)); }
.stage:is([data-bd=none],[data-bd=white],[data-bd=plate],[data-bd=clear],[data-bd=clouds],[data-bd=rainy],[data-bd=snowy]) .info { background: none; }
.stage[data-bd=plate] .info { padding-bottom: 28px; }
.info[hidden] { display: none; }

/* Cluster layout */
.stage[data-view=cluster] .aircraft { position: absolute; left: 0; top: 0; display: flex; flex-direction: column; transition: transform .6s ease,width .6s ease,height .6s ease; }
.stage[data-view=cluster] .aircraft-art { flex: 1; min-height: 0; align-self: center; }
.stage[data-view=cluster] .aircraft-subtitle { height: 46px; }
.stage[data-view=cluster] .content.cluster-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(150px,100%),1fr)); align-content: start; gap: 12px; padding: 8px; overflow-y: auto; overflow-x: hidden; overscroll-behavior-y: contain; }
.stage[data-view=cluster] .cluster-grid .aircraft { position: relative; left: auto; top: auto; width: auto !important; height: auto !important; transform: none !important; transition: none; }
.stage[data-view=cluster] .cluster-grid .aircraft-art { flex: none; width: 100% !important; height: 100px; max-height: 100px; }
.stage[data-view=cluster] .cluster-grid :is(.aircraft-title,.aircraft-subtitle) { height: auto; overflow-wrap: anywhere; }

/* Stacked layout */
.stack-list { display: flex; flex-direction: column; align-items: stretch; gap: 10px;  padding: 4px 0px 0px; height: auto; box-sizing: border-box; min-height: 100%; }
.stage[data-view=stacked] .aircraft { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 2px; border-bottom: none; }
.stage[data-view=stacked] .aircraft:last-child { border-bottom: none; }
.stage[data-view=stacked] .aircraft-art { flex: none; max-width: 90%; max-height: 320px; height: 100px; }
.stage[data-view=stacked] img.aircraft-art { filter: drop-shadow(0 2px 4px rgba(0,0,0,.22)); }
.stage[data-view=stacked] .aircraft-subtitle { white-space: nowrap; }

/* Shared cloud components */
.cloud-layer { box-sizing: border-box; color: var(--aircraft-text-color); text-shadow: var(--aircraft-text-shadow); }
.cloud-icons { position: relative; width: 100%; height: 52px; overflow: hidden; }
.cloud-icons > * { position: absolute; top: 0; width: 52px; height: 52px; min-width: 52px; max-width: 52px; margin: 0; box-sizing: border-box; transform: translateX(-50%); }
.cloud-icon img { display: block; width: 100%; height: 100%; object-fit: contain; }
.cloud-fallback { display: block; font-size: 38px; line-height: 34px; }
.cloud-label { margin-top: 4px; font-size: 12px; line-height: 1.4; text-align: center; }
.stage[data-view=stacked] .cloud-layer { flex: none; padding: 10px 4px; border-bottom: none; }
.cloud-layer-positioned { position: absolute; left: 0; right: 0; z-index: 1; pointer-events: none; }
.cloud-layer-positioned .cloud-icons { position: relative; height: 34px; min-height: 34px; overflow: visible; }
.cloud-layer-positioned .cloud-icon { position: absolute; top: 0; transform: translateX(-50%); }

/* METAR layout */
.metar-scene { position: relative; width: 100%; height: 100%; min-height: 360px; overflow: hidden; }
.stage[data-view=metar] .aircraft { position: absolute; display: flex; flex-direction: column; align-items: center; z-index: 2; }
.stage[data-view=metar] .aircraft-art { flex: none; width: 100%; height: 100px; min-width: 0; }
/* .stage[data-view=metar] :is(.aircraft-title,.aircraft-subtitle) { width: 100%; font-size: 12px; font-weight: 200; line-height: 1.25; overflow-wrap: anywhere; } */
.stage[data-view=metar] .content { display: flex; flex-direction: column; overflow: hidden; }
.stage[data-view=metar] .metar-scene { flex: 1 1 0; height: auto; min-height: 0; }

/* One horizontally swipeable aircraft band. */
.metar-band {  position: absolute;  left: 0;  right: 0;  display: flex;  align-items: flex-start;  overflow-x: auto;  overflow-y: hidden;  overscroll-behavior-x: contain;  scrollbar-width: none;  z-index: 2; }
.metar-band::-webkit-scrollbar {  display: none; }
.metar-band-track {  display: flex;  flex: 0 0 auto;  justify-content: center;  align-items: flex-start;  gap: 12px;  min-width: 100%;  padding: 0 6px;  box-sizing: border-box; }
.stage[data-view=metar] .metar-band .aircraft {  position: relative;  flex: 0 0 auto;  left: auto;  top: auto; }
.stage[data-view=metar] .metar-band .aircraft-title, .stage[data-view=metar] .metar-band .aircraft-subtitle {  overflow: hidden; }
.stage[data-view=metar] .metar-band .aircraft-title {  white-space: nowrap;  text-overflow: ellipsis; }


/* METAR Ground level effects */
/* Ground-to-cloud weather */
.ground-weather {  position: absolute;  left: 0;  right: 0;  z-index: 0;  pointer-events: none;  overflow: hidden; height: 100%;}
.ground-weather.rain { overflow: hidden; background: none; }
.ground-weather.rain::before { content: ''; position: absolute; inset: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%234f91bd' stroke-linecap='round'%3E%3Cpath d='M20 8l-4 12M74 42l-4 12M110 85l-4 12' stroke-width='1.5' opacity='.65'/%3E%3Cpath d='M48 76l-3 9M96 16l-3 9M24 105l-3 9' stroke-width='1' opacity='.35'/%3E%3C/g%3E%3C/svg%3E"); background-size: 120px 120px; background-repeat: repeat; animation: rainfall .8s linear infinite; }
.ground-weather.rain.light {  opacity: .35; }
.ground-weather.rain.heavy { opacity: .85; }
.ground-weather.snow { overflow: hidden; background: none; }
.ground-weather.snow::before { content: ''; position: absolute; inset: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='%23e6f2fa' stroke='%238ba8bd' stroke-width='.5'%3E%3Ccircle cx='18' cy='15' r='2.5' opacity='.9'/%3E%3Ccircle cx='78' cy='44' r='2' opacity='.8'/%3E%3Ccircle cx='106' cy='93' r='3' opacity='.9'/%3E%3Ccircle cx='45' cy='80' r='1.5' opacity='.6'/%3E%3Ccircle cx='98' cy='18' r='1' opacity='.5'/%3E%3Ccircle cx='23' cy='108' r='1.5' opacity='.7'/%3E%3C/g%3E%3C/svg%3E"); background-size: 120px 120px; background-repeat: repeat; animation: snowfall 6s linear infinite; }
.ground-weather.fog,
.ground-weather.mist {  background: linear-gradient( to top, rgba(210,220,225,.8), rgba(210,220,225,.4) 50%, transparent ); }
.ground-weather.haze {  background: linear-gradient( to top, rgba(210,190,150,.35), rgba(210,190,150,.12), transparent  ); }
.ground-weather.dust {  background: linear-gradient( to top, rgba(185,155,105,.45), rgba(185,155,105,.15), transparent  ); }
.ground-weather.storm {  background: linear-gradient( to top, rgba(50,55,70,.35), rgba(50,55,70,.15), transparent  ); }

/* Lightning overlay  -  positioned vertically by the rendering code. */
.ground-weather.metar-lightning {  position: absolute;  left: 0;  right: 0;  z-index: 10;  pointer-events: none;  opacity: 0;  background: linear-gradient(    135deg,    rgba(220, 230, 255, 0.65),    rgba(245, 248, 255, 0.25)  ); }
/* Both classes are applied to the lightning layer itself. */
.ground-weather.metar-lightning.has-thunder {  animation: metar-lightning-flash 5s linear infinite; }
/* One brief, soft flash per cycle. */
@keyframes metar-lightning-flash {  0%,  69%,  73%,  100% {    opacity: 0;  }  70% {    opacity: 0.9;  }  71% {    opacity: 0.2;  } }
/* Disable flashing when reduced motion is requested. */
@media (prefers-reduced-motion: reduce) {  .ground-weather.metar-lightning.has-thunder {    animation: none;    opacity: 0;  }}



@keyframes rainfall { from { background-position: 0 0; } to { background-position: 0 120px; } }
@keyframes snowfall { from { background-position: 0 0; } to { background-position: 120px 120px; } }
@media (prefers-reduced-motion: reduce) {  .ground-weather { animation: none !important;  } }


/* Weather attribution */
.metar-footer, .stack-metar-footer { flex: 0 0 auto; padding: 8px 12px; box-sizing: border-box; text-align: center; font-size: 12px; line-height: 1.4; color: var(--aircraft-text-color); text-shadow: var(--aircraft-text-shadow); }
.stack-metar-footer { margin-top: auto; }

/* Shared blending */
.stage[data-view][data-blend=multiply] img.aircraft-art { mix-blend-mode: multiply; filter: none; }

/* Empty and error states */
.empty { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; text-align: center; font-size: 1.1em; opacity: .85; pointer-events: none; color: var(--aircraft-text-color); text-shadow: var(--aircraft-text-shadow); }
.err { position: absolute; left: 8px; right: 8px; top: 8px; z-index: 4; font-size: .8em; padding: 4px 8px; border-radius: 6px; background: rgba(180,30,30,.88); color: #fff; white-space: pre-line; }
.empty[hidden], .err[hidden] { display: none !important; }

/* Bottom view navigation */
.view-controls { position: relative; flex: 0 0 64px; height: 64px; box-sizing: border-box; background: var(--paper-2,var(--ha-card-background,var(--card-background-color,#fff))); }
.slider { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 0; padding: 4px; max-width: calc(100% - 16px); box-sizing: border-box; z-index: 30; background: var(--paper-2,var(--secondary-background-color,#e8e8e8)); border-radius: 999px; box-shadow: var(--recess,inset 2px 2px 5px rgba(0,0,0,.16),inset -2px -2px 5px rgba(255,255,255,.12)); }
.slider button { position: relative; z-index: 1; flex: 1; min-width: 0; padding: 11px clamp(6px,2vw,24px); background: transparent; border: 0; border-radius: 999px; color: var(--ink-soft,var(--secondary-text-color)); font: 10px/1 var(--av-font-mono,monospace); letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; cursor: pointer; transition: color 200ms ease; }
.slider button:hover, .slider button[aria-current="true"] { color: var(--ink,var(--primary-text-color)); }
.slider button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.slider .seg-pill { position: absolute; top: 4px; bottom: 4px; left: 0; background: var(--pill,var(--ha-card-background,var(--card-background-color,#fff))); border-radius: 999px; box-shadow: var(--raised,2px 2px 5px rgba(0,0,0,.18),-1px -1px 3px rgba(255,255,255,.12)); transition: transform 320ms cubic-bezier(.7,.05,.2,1),width 320ms cubic-bezier(.7,.05,.2,1); pointer-events: none; z-index: 0; }
.slider button[hidden] {display: none !important; }

/* Clock and date */
.clock-overlay, .date-overlay { position: absolute; top: 10px; z-index: 2; padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,.8); color: #000; text-align: right; text-shadow: none; pointer-events: none; }
.date-overlay { left: 12px; right: auto; }
.clock-overlay { right: 12px; }
.clock-overlay[hidden], .date-overlay[hidden] { display: none !important; }
.clock-time, .clock-date { font-size: 24px; font-weight: 600; line-height: 1.1; font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion:reduce) {
  .slider .seg-pill, .slider button, .aircraft-art, .stage[data-view=cluster] .aircraft { transition: none; }
}
`;

class AeroVisitorsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._targets = [];
    this._items = new Map();
    this._renderedView = null;
    this._aircraftContainer = null;

    this._imgCache = new Map();
    this._routes = new Map();
    this._routePending = new Map();

    this._fails = 0;
    this._error = null;

    this._generation = 0;
    this._lifecycleCtl = null;
    this._activePoll = null;
    this._timer = null;
    this._renderFrame = null;
    this._clockTimer = null;
    this._resizeFrame = null;

    this._metarData = null;
    this._metarError = null;
    this._metarTimer = null;
    this._metarLastUpdated = null;
    this._activeMetar = null;

    this._cand = [];
    this._ckey = null;

    this._onPanelResize = () => {
      if (this._resizeFrame !== null) return;

      this._resizeFrame = requestAnimationFrame(() => {
        this._resizeFrame = null;
        if (!this.isConnected || !this._cfg) return;

        this._syncPanelHeight();

        if (this._cfg.view === 'cluster') {
          this._layout();
        } else if (this._cfg.view === 'metar') {
          this._renderMetarView();
        } else if (this._cfg.view === 'stacked') {
          this._renderStacked();
        }

        this._updateSlider();
      });
    };

    this._onVisibilityChange = () => {
      if (!document.hidden) {
        this._poll();
        this._updateClock();
      }
    };

    this._ro = new ResizeObserver(this._onPanelResize);
  }

  static getConfigElement() {
    return document.createElement('aero-visitors-card-editor');
  }

  static getStubConfig() {
    return {
      adsb_source: 'url',
      adsb_url: 'http://host:port/data/aircraft.json?lat={lat}&lon={lon}&filterMaxRange={radius_mi}',
      view: 'plate',
      backdrop: 'auto',
    };
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Card configuration is required');
    }

    const updatedConfig = { ...DEFAULTS, ...config };

    if (!['url', 'sensor'].includes(updatedConfig.adsb_source)) {
      throw new Error(`Invalid ADS-B source: ${updatedConfig.adsb_source}`);
    }

    if (updatedConfig.adsb_source === 'url' && !String(updatedConfig.adsb_url || '').trim()) {
      throw new Error(
        'ADS-B feed URL is required when source is URL. ' +
        'Example: http://adsb-feeder.local:8080/data/aircraft.json'
      );
    }

    if (updatedConfig.adsb_source === 'sensor' && !String(updatedConfig.adsb_sensor || '').trim()) {
      throw new Error(
        'An ADS-B sensor entity is required when source is Home Assistant sensor. ' +
        'Its attributes must contain an aircraft or ac array.'
      );
    }

    updatedConfig.view = VIEWS.includes(updatedConfig.view) ? updatedConfig.view : 'cluster';
    // Weather view is unavailable when METAR is disabled.
    if (!updatedConfig.metar_enabled && updatedConfig.view === 'metar') {
      updatedConfig.view = 'stacked';
    }
    updatedConfig.adsb_url = String(updatedConfig.adsb_url || '').trim();
    updatedConfig.adsb_sensor = String(updatedConfig.adsb_sensor || '').trim();
    updatedConfig.metar_airport = String(updatedConfig.metar_airport || '').trim().toUpperCase();

    const airportElevation = Number(updatedConfig.metar_airport_elevation_ft);

    if (!Number.isFinite(airportElevation)) {
      throw new Error('METAR: Airport elevation must be a number in feet');
    }

    updatedConfig.metar_airport_elevation_ft = airportElevation;

    if (updatedConfig.metar_enabled) {
      if (!/^[A-Z]{4}$/.test(updatedConfig.metar_airport)) {
        throw new Error('METAR: Airport ICAO code must be exactly 4 letters');
      }

    if (updatedConfig.show_clouds_stacked && !updatedConfig.metar_enabled) {
      throw new Error('METAR data must be enabled to show clouds.')
    }  

      const refresh = Number(updatedConfig.metar_refresh);

      if (!Number.isInteger(refresh) || refresh < 30 || refresh > 1440) {
        throw new Error('METAR: Refresh interval must be an integer between 30 and 1440 minutes');
      }

      updatedConfig.metar_refresh = refresh;
    }

    const airportChanged = this._cfg?.metar_airport !== updatedConfig.metar_airport;

    this._stop();
    this._cfg = updatedConfig;
    this._targets = [];
    this._fails = 0;
    this._error = null;

    if (airportChanged || !updatedConfig.metar_enabled) {
      this._metarData = null;
      this._metarError = null;
      this._metarLastUpdated = null;
    }

    this._buildShell();
    this._render();
    this._start();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateClock();
    this._start();

    if (this._stage && this._cfg) {
      this._applyBackdrop();
    }
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: 12, rows: 4, min_columns: 3, min_rows: 2 };
  }

  connectedCallback() {
    if (this._stage) {
      this._ro.observe(this._stage);
    }

    window.addEventListener('resize', this._onPanelResize);
    window.visualViewport?.addEventListener('resize', this._onPanelResize);
    window.visualViewport?.addEventListener('scroll', this._onPanelResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onPanelResize();
    this._start();
  }

  disconnectedCallback() {
    this._stop();
    this._ro.disconnect();

    window.removeEventListener('resize', this._onPanelResize);
    window.visualViewport?.removeEventListener('resize', this._onPanelResize);
    window.visualViewport?.removeEventListener('scroll', this._onPanelResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    if (this._resizeFrame !== null) {
      cancelAnimationFrame(this._resizeFrame);
      this._resizeFrame = null;
    }
  }

  _syncPanelHeight() {
    if (!this.isConnected) return;

    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    const cardTop = Math.max(viewportTop, this.getBoundingClientRect().top);
    const availableHeight = Math.floor(viewportBottom - cardTop - 20);

    if (availableHeight <= 0) return;

    const value = `${availableHeight}px`;

    if (this.style.getPropertyValue('--ov-panel-height') !== value) {
      this.style.setProperty('--ov-panel-height', value);
    }
  }

  // ---------- Lifecycle ----------

  _readConfig() {
    const c = this._cfg || {};
    const h = this._hass?.config;
    const lat = c.latitude ?? h?.latitude;
    const lon = c.longitude ?? h?.longitude;

    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }

  _imperialUnits() {
    if (this._cfg.units === 'metric') return false;
    if (this._cfg.units === 'imperial') return true;

    return this._hass?.config?.unit_system?.length === 'mi';
  }

  _scheduleMetar(delayMs = null) {
    clearTimeout(this._metarTimer);
    this._metarTimer = null;

    if (
      !this._cfg?.metar_enabled || !this.isConnected ||
      !this._lifecycleCtl || this._lifecycleCtl.signal.aborted ||
      this._activeMetar
    ) {
      return;
    }

    const intervalMs = this._cfg.metar_refresh * 60 * 1000;

    // Calculate the remaining time from the last successful fetch.
    if (delayMs === null) {
      delayMs = this._metarLastUpdated === null
        ? 0
        : Math.max(0, this._metarLastUpdated + intervalMs - Date.now());
    }

    const generation = this._generation;

    this._metarTimer = setTimeout(() => {
      if (generation !== this._generation) return;

      this._metarTimer = null;
      this._fetchMetar();
    }, delayMs);
  }

  _start() {
    this._startClock();

    if (this._timer !== null || !this._cfg || !this.isConnected || !this._readConfig()) {
      return;
    }

    if (!this._lifecycleCtl || this._lifecycleCtl.signal.aborted) {
      this._lifecycleCtl = new AbortController();
    }

    const configuredRefresh = Number(this._cfg.refresh_s);
    const refreshMs = (
      Number.isFinite(configuredRefresh)
        ? Math.max(1, configuredRefresh)
        : DEFAULTS.refresh_s
    ) * 1000;

    this._timer = setInterval(() => {
      if (!document.hidden) this._poll();
    }, refreshMs);

    this._poll();
    this._scheduleMetar();
  }

  _stop() {
    clearTimeout(this._clockTimer);
    clearInterval(this._timer);
    clearTimeout(this._metarTimer);

    this._clockTimer = null;
    this._timer = null;
    this._metarTimer = null;

    this._generation++;
    this._lifecycleCtl?.abort();
    this._lifecycleCtl = null;

    this._activePoll = null;
    this._activeMetar = null;
    this._routePending.clear();

    if (this._renderFrame !== null) {
      cancelAnimationFrame(this._renderFrame);
      this._renderFrame = null;
    }
  }

  // ---------- Requests ----------

  async _fetchJson(url, { signal, timeoutMs = 8000, cache = 'no-store' } = {}) {
    const ctl = new AbortController();
    let timedOut = false;
    const abort = () => ctl.abort();

    if (signal?.aborted) {
      ctl.abort();
    } else {
      signal?.addEventListener('abort', abort, { once: true });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      ctl.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, { cache, signal: ctl.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }

      return await response.json();
    } catch (error) {
      if (timedOut && !signal?.aborted) {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s: ${url}`);
      }

      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  _feedUrl() {
    const template = String(this._cfg.adsb_url || '');

    if (!/\{[^{}]+\}/.test(template)) {
      return new URL(template, window.location.href).href;
    }

    const home = this._readConfig();

    if (!home) {
      throw new Error('Cannot build ADS-B URL: latitude/longitude unavailable');
    }

    const radius = Number(this._cfg.radius);

    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error('Cannot build ADS-B URL: radius must be positive');
    }

    const radiusNm = this._imperialUnits() ? radius / 1.150779448 : radius / 1.852;

    const values = {
      lat: home.lat,
      lon: home.lon,
      radius_nm: radiusNm,
      radius_km: radiusNm * 1.852,
      radius_mi: radiusNm * 1.150779448,
    };

    const expanded = template.replace(/\{([^{}]+)\}/g, (match, name) => {
      if (!Object.prototype.hasOwnProperty.call(values, name)) {
        throw new Error(`Unknown ADS-B URL placeholder: ${match}`);
      }

      return encodeURIComponent(String(values[name]));
    });

    return new URL(expanded, window.location.href).href;
  }

  async _fetchMetar() {
    if (
      !this._cfg?.metar_enabled || !this.isConnected ||
      !this._lifecycleCtl || this._lifecycleCtl.signal.aborted ||
      this._activeMetar
    ) {
      return;
    }

    clearTimeout(this._metarTimer);
    this._metarTimer = null;

    const request = {};
    const generation = this._generation;
    const airport = this._cfg.metar_airport;
    const signal = this._lifecycleCtl.signal;
    let succeeded = false;

    this._activeMetar = request;

    const isCurrent = () =>
      generation === this._generation && !signal.aborted &&
      this.isConnected && this._cfg.metar_enabled &&
      this._cfg.metar_airport === airport;

    try {
      const data = await this._fetchJson(
        `https://datamask.org/api/v1/metar/${encodeURIComponent(airport)}`,
        { signal, timeoutMs: 25000 }
      );

      if (!isCurrent()) return;

      if (!data || typeof data.decoded !== 'object' || !data.decoded) {
        throw new Error('METAR response is missing decoded weather data');
      }

      if (data.error) {
        window.alert(data.message || 'Unable to retrieve METAR data.');
        return;
      }

      this._metarData = data;
      this._metarError = null;
      this._metarLastUpdated = Date.now();
      succeeded = true;
      this._queueRender();
    } catch (error) {
      if (!isCurrent()) return;

      // Keep the last successful weather data while waiting for a retry.
      this._metarError = error instanceof Error ? error.message : String(error);
      this._queueRender();
    } finally {
      if (this._activeMetar === request) {
        this._activeMetar = null;

        if (isCurrent()) {
          // Failed requests retry ten minutes after the attempt finishes.
          this._scheduleMetar(succeeded ? null : 10 * 60 * 1000);
        }
      }
    }
  }

  // ---------- Shell and view switching ----------

  _buildShell() {
    this.shadowRoot.innerHTML = `
      <style>${CSS}</style>
      <ha-card>
        <div class="stage">
          <div class="bd"></div>
          <div class="content"></div>
          <div class="empty" hidden></div>
          <div class="err" hidden></div>
        </div>

        <div class="view-controls">
          <nav class="slider" aria-label="Aircraft view">
            <i class="seg-pill" aria-hidden="true"></i>
            <button type="button" data-view="plate" aria-current="false">Plate</button>
            <button type="button" data-view="cluster" aria-current="false">Cluster</button>
            <button type="button" data-view="stacked" aria-current="false">Stacked</button>
            <button type="button" data-view="metar" aria-current="false">Weather</button>
          </nav>

          <div class="clock-overlay" hidden>
            <div class="clock-time"></div>
          </div>

          <div class="date-overlay" hidden>
            <div class="clock-date"></div>
          </div>
        </div>
      </ha-card>
    `;

    const $ = (selector) => this.shadowRoot.querySelector(selector);

    this._stage = $('.stage');
    this._bd = $('.bd');
    this._content = $('.content');
    this._empty = $('.empty');
    this._err = $('.err');
    this._slider = $('.slider');
    this._pill = $('.seg-pill');

    this._clockDisplay = $('.clock-overlay');
    this._clockTime = $('.clock-time');
    this._dateDisplay = $('.date-overlay');
    this._clockDate = $('.clock-date');

    this._slider.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-view]');
      if (button) this._setView(button.dataset.view);
    });

    this._items.clear();
    this._renderedView = null;
    this._aircraftContainer = null;

    this._stage.dataset.view = this._cfg.view;
    this._stage.dataset.blend = this._cfg.image_blend;

    this._ro.disconnect();

    if (this.isConnected) {
      this._ro.observe(this._stage);
    }

    this._updateClock();
    this._updateSlider();
    this._onPanelResize();
  }

  _setView(view) {
    if (!VIEWS.includes(view) || view === this._cfg.view) return;
    if (view === 'metar' && !this._cfg.metar_enabled) return;

    this._stop();
    this._cfg = { ...this._cfg, view };

    if (view === 'plate') {
      const selected = this._pickAircraft(this._targets);
      this._targets = selected ? [selected] : [];
    }

    this._render();
    this._start();
  }

  _updateSlider() {
    if (!this._slider || !this._pill || !this._cfg) return;

    let activeButton = null;

    for (const button of this._slider.querySelectorAll('button')) {
      const isMetar = button.dataset.view === 'metar';

      button.hidden = isMetar && !this._cfg.metar_enabled;

      const active =
        !button.hidden && button.dataset.view === this._cfg.view;

      button.setAttribute('aria-current', String(active));

      if (active) activeButton = button;
    }

    if (!activeButton) return;

    this._pill.style.width = `${activeButton.offsetWidth}px`;
    this._pill.style.transform = `translateX(${activeButton.offsetLeft}px)`;
  }

  _prepareView() {
    const view = this._cfg.view;

    if (this._renderedView === view && this._aircraftContainer) return;

    this._content.replaceChildren();
    this._content.classList.remove('cluster-grid');
    this._content.scrollTop = 0;

    this._items.clear();
    this._renderedView = view;
    this._stage.dataset.view = view;

    if (view === 'stacked') {
      this._aircraftContainer = document.createElement('div');
      this._aircraftContainer.className = 'stack-list';
      this._content.appendChild(this._aircraftContainer);
    } else if (view === 'metar') {
      this._aircraftContainer = document.createElement('div');
      this._aircraftContainer.className = 'metar-scene';

      const footer = document.createElement('footer');
      footer.className = 'metar-footer';
      footer.textContent = METAR_ATTRIBUTION;

      this._content.append(this._aircraftContainer, footer);
    } else {
      this._aircraftContainer = this._content;
    }
  }

  // ---------- ADS-B data ----------

  _normalizeADSB(data) {
    const source = Array.isArray(data) ? { aircraft: data } : data;
    const aircraft = source?.aircraft ?? source?.ac;

    if (!Array.isArray(aircraft)) {
      throw new Error('ADS-B response does not contain an aircraft or ac array');
    }

    let now = Number(source.now) || 0;
    if (now > 0 && now < 1e12) now *= 1000;

    return {
      now,
      messages: Number(source.messages) || 0,
      aircraft: aircraft
        .filter((a) => a && typeof a === 'object')
        .map((a) => ({
          ...a,
          distance: a.r_dst ?? a.dst ?? null,
          direction: a.r_dir ?? a.dir ?? null,
          desc: a.desc || a.description || '',
        })),
    };
  }

  async _poll() {
    if (
      this._activePoll || !this._cfg || !this.isConnected ||
      !this._lifecycleCtl || this._lifecycleCtl.signal.aborted
    ) {
      return;
    }

    const poll = {};
    const generation = this._generation;
    const c = this._cfg;
    const signal = this._lifecycleCtl.signal;

    this._activePoll = poll;

    const isCurrent = () =>
      generation === this._generation && !signal.aborted && this.isConnected;

    try {
      let json;

      if (c.adsb_source === 'sensor') {
        const source = this._hass?.states?.[c.adsb_sensor];

        if (!source) {
          throw new Error(`ADS-B sensor not found: ${c.adsb_sensor}`);
        }

        if (['unknown', 'unavailable'].includes(source.state)) {
          throw new Error(`ADS-B sensor is ${source.state}: ${c.adsb_sensor}`);
        }

        json = source.attributes;
      } else {
        const url = this._feedUrl();

        if (window.location.protocol === 'https:' && new URL(url).protocol === 'http:') {
          throw new Error(
            'Blocked: this page is HTTPS but adsb_url is HTTP. ' +
            'Proxy the feed over HTTPS or use a Home Assistant sensor.'
          );
        }

        json = await this._fetchJson(url, { signal, timeoutMs: 4000 });
      }

      if (!isCurrent()) return;

      const normalized = this._normalizeADSB(json);
      const list = this._processADSB(normalized.aircraft);

      const configuredMaximum = Number(c.max_aircraft);
      const maximum = Number.isFinite(configuredMaximum)
        ? Math.max(1, Math.floor(configuredMaximum))
        : DEFAULTS.max_aircraft;

      const targets = c.view === 'plate'
        ? [this._pickAircraft(list)].filter(Boolean)
        : list.slice(0, maximum);

      const previous = new Map(this._targets.map((a) => [a.hex, a]));

      for (const a of targets) {
        const old = previous.get(a.hex);

        a.img = old && old.t === a.t ? old.img ?? null : null;
        a.route = c.route_lookup && old && old.flight === a.flight
          ? old.route ?? null
          : null;
      }

      this._targets = targets;
      this._error = null;
      this._fails = 0;
      this._render();

      for (const a of targets) {
        this._enrichTarget(a, c, generation, signal);
      }
    } catch (error) {
      if (!isCurrent()) return;

      this._fails++;

      if (this._fails >= 3) {
        this._targets = [];
      }

      this._error = error instanceof Error ? error.message : String(error);
      this._render();
    } finally {
      if (this._activePoll === poll) {
        this._activePoll = null;
      }
    }
  }

  _processADSB(raw) {
    const c = this._cfg;
    const home = this._readConfig();

    if (!home) return [];

    const imp = this._imperialUnits();
    const radiusKm = Number(c.radius) * (imp ? 1.609344 : 1);
    const results = [];
    const seenHex = new Set();

    for (const a of raw) {
      if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
      if ((a.seen_pos ?? a.seen ?? 0) > 60) continue;

      const ground = a.alt_baro === 'ground';
      if (ground && !c.show_ground) continue;

      const alt = ground
        ? 0
        : Number.isFinite(a.alt_baro)
          ? a.alt_baro
          : Number.isFinite(a.alt_geom)
            ? a.alt_geom
            : undefined;

      const g = geoDistance(home.lat, home.lon, a.lat, a.lon);
      if (g.dist > radiusKm) continue;

      if (c.max_altitude_ft && Number.isFinite(alt) && alt > Number(c.max_altitude_ft)) {
        continue;
      }

      const hex = String(a.hex || '').trim().toUpperCase();
      if (!hex || seenHex.has(hex)) continue;

      seenHex.add(hex);

      results.push({
        hex,
        flight: String(a.flight || '').trim(),
        r: a.r ? String(a.r).trim().toUpperCase() : '',
        t: a.t ? String(a.t).trim().toUpperCase() : '',
        desc: String(a.desc || ''),
        cat: String(a.category || '').toUpperCase(),
        alt,
        gs: a.gs,
        track: a.track,
        vertRate: a.baro_rate ?? a.geom_rate,
        dist: Math.round(g.dist * (imp ? 0.621371 : 1)),
        distanceKm: g.dist,
        brg: g.brg,
        squawk: String(a.squawk ?? '').trim(),
        emergency: String(a.emergency ?? '').trim().toLowerCase(),
      });
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  _pickAircraft(list) {
    if (!list.length) return null;

    const compare = {
      nearest: (a, b) => a.distanceKm - b.distanceKm,
      lowest: (a, b) => (a.alt ?? Infinity) - (b.alt ?? Infinity),
      highest: (a, b) => (b.alt ?? -Infinity) - (a.alt ?? -Infinity),
      fastest: (a, b) => (b.gs || 0) - (a.gs || 0),
    }[this._cfg.plate_pick] || ((a, b) => a.distanceKm - b.distanceKm);

    return [...list].sort(compare)[0];
  }

  _enrichTarget(a, config, generation, signal) {
    const isCurrent = () =>
      generation === this._generation && !signal.aborted &&
      this.isConnected && this._targets.includes(a);

    this._resolveImage(a, config)
      .then((img) => {
        if (!isCurrent()) return;

        a.img = img;
        this._queueRender();
      })
      .catch(() => {
        // Keep the existing image or silhouette.
      });

    this._getRoute(a, config, signal)
      .then((route) => {
        if (!isCurrent()) return;

        a.route = route;
        this._queueRender();
      })
      .catch(() => {
        // Route lookup is optional.
      });
  }

  _queueRender() {
    if (this._renderFrame !== null) return;

    this._renderFrame = requestAnimationFrame(() => {
      this._renderFrame = null;

      if (this.isConnected) {
        this._render();
      }
    });
  }

  // ---------- Images ----------

  _probeImg(url) {
    const cached = this._imgCache.get(url);
    if (cached) return cached;

      const pending = new Promise((resolve) => {
        const image = new Image();
        let settled = false;
        let timer;

        const finish = (result) => {
          if (settled) return;

          settled = true;
          clearTimeout(timer);
          image.onload = null;
          image.onerror = null;

          if (!result) {
            image.removeAttribute('src');
          }

          resolve(result);
        };

        timer = setTimeout(() => finish(null), 5000);

        image.onload = () => finish({
          url,
          w: image.naturalWidth || 1,
          h: image.naturalHeight || 1,
        });

        image.onerror = (event) => {
          console.warn('[Aircraft image] Failed to load', {
            url,
            event,
          });

          finish(null);
        };
        image.src = url;
      });

      this._imgCache.set(url, pending);

      pending.then((result) => {
        if (!result && this._imgCache.get(url) === pending) {
          this._imgCache.delete(url);
        }
      });

      return pending;
    }

    async _resolveImage(a, config = this._cfg) {
    const base = String(config.image_path || '')
      .replace(/\/+$/, '');

    const imageUrl = (name) =>
      `${base}/${encodeURIComponent(name)}.${config.image_ext}`;

    const tryName = (name) =>
      this._probeImg(imageUrl(name));

    // Suppress repeated warnings during refreshes.
    this._missingAircraftImages ??= new Set();

    if (a.t) {
      const url = imageUrl(a.t);
      const hit = await tryName(a.t);

      if (hit) {
        this._missingAircraftImages.delete(url);
        return hit;
      }
      warnOnce(
        url,
        `[AeroVisitors] Image unavailable for aircraft type "${a.t}"`,
        {
          type: a.t,
          hex: a.hex,
          flight: a.flight,
          expectedUrl: url,
          fallback: config.image_fallback || 'SVG silhouette',
        }
      );
    } else {
      warnOnce(
        `no-type:${a.hex}`,
        '[AeroVisitors] No aircraft type supplied; using generic image',
        {
          hex: a.hex,
          flight: a.flight,
          registration: a.r,
        }
      );
    }

    if (!config.image_fallback) return null;

    const fallback = await tryName(config.image_fallback);

    if (!fallback) {
      const url = imageUrl(config.image_fallback);

      warnOnce(
        `fallback:${url}`,
        '[AeroVisitors] Fallback image unavailable; using SVG silhouette',
        { expectedUrl: url }
      );
    }

    return fallback;
  }

  // ---------- Routes ----------

  async _getRoute(a, config = this._cfg, signal = this._lifecycleCtl?.signal) {
    if (signal?.aborted || !config.route_lookup || !/^[A-Z]{3}\d/.test(a.flight)) {
      return null;
    }

    const base = String(config.route_url || '').replace(/\/+$/, '');
    const url = `${base}/${encodeURIComponent(a.flight)}`;
    const ttlMs = 30 * 60 * 1000;
    const cachedRoute = this._routes.get(url);

    if (cachedRoute && Date.now() - cachedRoute.t < ttlMs) {
      return cachedRoute.val;
    }

    const pending = this._routePending.get(url);
    if (pending) return pending;

    const request = (async () => {
      let value = null;

      try {
        const json = await this._fetchJson(url, { signal, timeoutMs: 20000 });
        const airports = json?._airports;

        const airportLabel = (airport) => {
          for (const field of ['location', 'iata', 'icao']) {
            const text = airport?.[field];

            if (typeof text === 'string' && text.trim()) {
              return text.trim();
            }
          }

          return '';
        };

        if (Array.isArray(airports) && airports.length >= 2) {
          const stops = airports.map(airportLabel);

          if (stops.every(Boolean)) {
            value = { stops };
          }
        }
      } catch (error) {
        if (!signal?.aborted) {
          console.warn(
            '[AeroVisitors] Route lookup failed:',
            a.flight,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      if (signal?.aborted) return null;

      this._routes.set(url, { t: Date.now(), val: value });
      return value;
    })();

    this._routePending.set(url, request);

    try {
      return await request;
    } finally {
      if (this._routePending.get(url) === request) {
        this._routePending.delete(url);
      }
    }
  }

  // ---------- Background and clock ----------

  _applyBackdrop() {
    const c = this._cfg;
    const backdrop = c.backdrop === 'auto' ? this._autoBackdrop() : c.backdrop;
    let imageUrl = c.backdrop_image;

    if (imageUrl?.startsWith('media-entity-image://')) {
      const entityId = imageUrl.slice('media-entity-image://'.length);
      imageUrl = this._hass?.states?.[entityId]?.attributes?.entity_picture;
    }

    this._stage.dataset.bd = backdrop;
    this._stage.dataset.blend = c.image_blend;
    this._bd.className = `bd bd-${backdrop}`;

    this._bd.style.backgroundImage =
      backdrop === 'image' && imageUrl ? `url(${JSON.stringify(imageUrl)})` : '';
  }

  _autoBackdrop() {
    const c = this._cfg;
    const states = this._hass?.states;
    const sun = states?.[c.sun_entity];
    const weather = c.weather_entity ? states?.[c.weather_entity]?.state : '';

    if (['lightning', 'lightning-rainy', 'pouring', 'hail'].includes(weather)) {
      return 'storm';
    }

    if (weather === 'rainy') return 'rainy';
    if (['snowy', 'snowy-rainy'].includes(weather)) return 'snowy';

    const sunAngle = sun?.attributes?.elevation;

    if (Number.isFinite(sunAngle)) {
      if (sunAngle < -6) return 'night';
      if (sunAngle < 6) return 'sunset';
    } else if (sun?.state === 'below_horizon') {
      return 'night';
    }

    if (['cloudy', 'fog'].includes(weather)) return 'clouds';
    return 'clear';
  }

  _updateClock() {
    if (!this._cfg || !this._clockDisplay || !this._dateDisplay) return;

    const showClock = Boolean(this._cfg.show_clock);
    const showDate = Boolean(this._cfg.show_date);

    this._clockDisplay.hidden = !showClock;
    this._dateDisplay.hidden = !showDate;

    if (!showClock && !showDate) return;

    const now = new Date();
    const timeZone = this._hass?.config?.time_zone;
    const zoneOptions = timeZone ? { timeZone } : {};

    if (showClock) {
      this._clockTime.textContent = new Intl.DateTimeFormat('en-US', {
        ...zoneOptions,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now);
    }

    if (showDate) {
      this._clockDate.textContent = new Intl.DateTimeFormat('en-US', {
        ...zoneOptions,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(now);
    }
  }

  _startClock() {
    if (
      !this.isConnected || !this._cfg || this._clockTimer !== null ||
      (!this._cfg.show_clock && !this._cfg.show_date)
    ) {
      return;
    }

    const tick = () => {
      this._clockTimer = null;

      if (
        !this.isConnected || !this._cfg ||
        (!this._cfg.show_clock && !this._cfg.show_date)
      ) {
        return;
      }

      this._updateClock();

      const delay = 60000 - (Date.now() % 60000) + 25;
      this._clockTimer = setTimeout(tick, delay);
    };

    tick();
  }

  // ---------- Aircraft formatting ----------

  _getWingSpan(a) {
    const configured = Number(this._cfg.wingspans?.[a.t]);

    if (Number.isFinite(configured) && configured > 0) {
      return configured;
    }

    return WINGSPAN_M[a.t] || CATEGORY_SPAN_M[a.cat] || 30;
  }

  _sizeCurve() {
    const value = Number(this._cfg.size_curve);
    return Number.isFinite(value) ? value : DEFAULTS.size_curve;
  }

  _operator(a) {
    if (!/^[A-Z]{3}\d/.test(a.flight)) return '';

    const prefix = a.flight.slice(0, 3);
    return this._cfg.operators?.[prefix] || OPERATORS[prefix] || '';
  }

  _flip(a) {
    if (!this._cfg.flip_to_heading || !Number.isFinite(a.track)) {
      return false;
    }

    const heading = ((a.track % 360) + 360) % 360;
    const right = heading < 180;

    return this._cfg.image_faces === 'left' ? right : !right;
  }

  _direction(deg) {
    if (!Number.isFinite(deg)) return '-';

    const normalized = ((deg % 360) + 360) % 360;
    return COMPASS[Math.round(normalized / 45) % 8];
  }

  _altText(a) {
    const alt = a.alt;

    if (!Number.isFinite(alt)) return '';
    if (alt <= 0) return 'on the ground';

    if (alt >= 18000) {
      return `FL${String(Math.round(alt / 100)).padStart(3, '0')}`;
    }

    const rounded = alt > 10000
      ? Math.round(alt / 1000) * 1000
      : Math.round(alt / 100) * 100;

    return `${rounded.toLocaleString('en-US')} ft`;
  }

  _trend(a) {
    if (!Number.isFinite(a.vertRate)) return '';

    const threshold = Number(this._cfg.climb_fpm);
    return a.vertRate > threshold ? 'climbing' : a.vertRate < -threshold ? 'descending' : '';
  }

  _flightLabel(a, { includeRoute = true } = {}) {
    if (!a.flight?.trim() || a.flight.trim() === a.r?.trim()) {
      return a.desc || a.t || 'Unknown aircraft';
    }

    const match = /^[A-Z]{3}0*(\d+[A-Z]?)$/.exec(a.flight);
    const base = match ? `Flight ${match[1]}` : a.flight;
    const operator = this._operator(a);
    const label = operator ? `${operator} ${base}` : base;

    if (!includeRoute) return label;

    const stops = a.route?.stops;

    if (!Array.isArray(stops) || stops.length < 2) {
      return label;
    }

    if (stops.length === 2) {
      return `${label} from ${stops[0]} to ${stops[1]}`;
    }

    return `${label} · ${stops.join(' → ')}`;
  }

  _subTitle(a, { includeNavigation = true } = {}) {
    const altitude = this._altText(a);
    const speed = Number.isFinite(a.gs) ? `${Math.round(a.gs / 10) * 10} kts` : '';

    const altitudeText = altitude
      ? altitude === 'on the ground' ? ` ${altitude}` : ` at ${altitude}`
      : '';

    const speedText = speed
      ? altitudeText ? ` and ${speed}` : ` at ${speed}`
      : '';

    const noFlightNumber = !a.flight?.trim() || a.flight.trim() === a.r?.trim();

    const line1 = [
      noFlightNumber ? a.r : a.desc || a.t,
      `${altitudeText}${speedText}`.trim(),
    ].filter(Boolean).join(' · ');

    const details = [this._alertText(a)];

    if (includeNavigation) {
      const unit = this._imperialUnits() ? 'mi' : 'km';

      details.push(
        `${a.dist} ${unit} ${this._direction(a.brg)}`,
        `Heading ${this._direction(a.track)}`,
        this._trend(a)
      );
    }

    const line2 = details.filter(Boolean).join(' · ');
    return [line1, line2].filter(Boolean).join('\n');
  }

  _alertText(a) {
    const squawkLabels = {
      '7500': 'Unlawful interference  -  7500',
      '7600': 'Radio failure  -  7600',
      '7700': 'General emergency  -  7700',
    };

    const statusLabels = {
      general: 'General emergency',
      noradio: 'Radio failure',
      unlawful: 'Unlawful interference',
      downed: 'Downed aircraft',
      lifeguard: 'Medical priority',
      minfuel: 'Minimum fuel',
    };

    const matchingStatus = {
      '7500': 'unlawful',
      '7600': 'noradio',
      '7700': 'general',
    };

    const squawkLabel = squawkLabels[a.squawk];
    const statusLabel = statusLabels[a.emergency];

    if (squawkLabel && statusLabel && matchingStatus[a.squawk] !== a.emergency) {
      return `${squawkLabel} · ${statusLabel}`;
    }

    return squawkLabel || statusLabel || '';
  }

  // ---------- Shared aircraft DOM ----------

  _createAircraftItem() {
    const el = document.createElement('div');
    el.className = 'aircraft';

    const titleEl = document.createElement('div');
    titleEl.className = 'aircraft-title';

    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'aircraft-subtitle';

    let artHost = el;
    let infoEl = null;

    if (this._cfg.view === 'plate') {
      artHost = document.createElement('div');
      artHost.className = 'plane';

      infoEl = document.createElement('div');
      infoEl.className = 'info';
      infoEl.append(titleEl, subtitleEl);

      el.append(artHost, infoEl);
    } else {
      el.append(titleEl, subtitleEl);
    }

    return {
      el,
      artHost,
      art: null,
      titleEl,
      subtitleEl,
      infoEl,
      imageKey: null,
      ac: null,
      span: 0,
      aspect: 0.4,
      placed: false,
    };
  }

  _createAircraftArt(a) {
    if (a.img?.url) {
      const img = document.createElement('img');
      img.className = 'aircraft-art';
      img.alt = '';
      img.src = a.img.url;
      return img;
    }

    const template = document.createElement('template');
    template.innerHTML = fallbackSvg();
    return template.content.firstElementChild;
  }

  _updateAircraftContent(item, a) {
    const imageKey = a.img?.url || '';

    if (item.imageKey !== imageKey || !item.art) {
      const newArt = this._createAircraftArt(a);

      if (item.art) {
        item.art.replaceWith(newArt);
      } else {
        item.artHost.prepend(newArt);
      }

      item.art = newArt;
      item.imageKey = imageKey;
    }

    item.ac = a;
    item.el.dataset.hex = a.hex;

    item.art.style.transform = this._flip(a) ? 'scaleX(-1)' : '';
    item.art.classList.toggle('alert-art', Boolean(this._alertText(a)));

    const isMetar = this._cfg.view === 'metar';
    item.titleEl.textContent = this._flightLabel(a, { includeRoute: !isMetar });
    item.subtitleEl.textContent = this._subTitle(a, { includeNavigation: !isMetar });

    if (this._cfg.view === 'stacked') {
      item.subtitleEl.textContent = item.subtitleEl.textContent.replace(/\s*\n\s*/g, ' · ');
    }

    if (item.infoEl) {
      item.infoEl.hidden = !this._cfg.show_info;
    }
  }

  _getAircraftItem(a) {
    let item = this._items.get(a.hex);

    if (!item) {
      item = this._createAircraftItem();
      this._items.set(a.hex, item);
      this._aircraftContainer.appendChild(item.el);
    }

    this._updateAircraftContent(item, a);
    return item;
  }

  _pruneAircraftItems(keep) {
    for (const [hex, item] of this._items) {
      if (!keep.has(hex)) {
        item.el.remove();
        this._items.delete(hex);
      }
    }
  }

  // ---------- Shared cloud data and rendering ----------

  _metarClouds() {
    if (!this._cfg.metar_enabled) return [];

    const clouds = this._metarData?.decoded?.clouds;
    if (!Array.isArray(clouds)) return [];

    return clouds.filter((cloud) =>
      cloud &&
      cloud.heightFt !== null &&
      cloud.heightFt !== undefined &&
      cloud.heightFt !== '' &&
      Number.isFinite(Number(cloud.heightFt))
    );
  }


_metarGroundWeather() {
  const data = this._metarData;

  const emptyResult = {
    codes: [],
    effects: [],
    intensity: 'moderate',
  };

  if (!this._cfg?.metar_enabled || !data) {
    return emptyResult;
  }

  if (data.error) {
    console.warn(
      '[AeroVisitors] METAR API error:',
      data.message || data.error
    );
    return emptyResult;
  }

  if (!data.decoded || typeof data.decoded !== 'object') {
    console.warn(
      '[AeroVisitors] METAR response has no decoded data:',
      data
    );
    return emptyResult;
  }

  if (!Array.isArray(data.decoded.weather)) {
    console.warn(
      '[AeroVisitors] METAR response has no decoded weather array:',
      data.decoded
    );
    return emptyResult;
  }

  const codes = data.decoded.weather
    .filter((code) => typeof code === 'string')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

  const effects = new Set();

  for (const code of codes) {
    if (/TS|SQ/.test(code)) effects.add('storm');
    if (/TS/.test(code)) effects.add('lightning');    
    if (/RA|DZ|PL|GR|GS|IC|UP/.test(code)) effects.add('rain');
    if (/SN|SG/.test(code)) effects.add('snow');
    if (/FG/.test(code)) effects.add('fog');
    if (/BR/.test(code)) effects.add('mist');
    if (/HZ|FU|VA/.test(code)) effects.add('haze');
    if (/DU|SA|SS|DS|PO/.test(code)) effects.add('dust');
  }

  const intensity = codes.some((code) => code.startsWith('+'))
    ? 'heavy'
    : codes.some((code) => code.startsWith('-'))
      ? 'light'
      : 'moderate';

  return {
    codes,
    effects: [...effects],
    intensity,
  };
}

  _cloudLayers() {
    const layers = [];
    const airportElevation = this._cfg.metar_airport_elevation_ft;
    const width = this._content?.clientWidth || 0;
    const cloudWidth = 52;

    for (const cloud of this._metarClouds()) {
      const quantity = String(cloud.quantity || '').trim().toUpperCase();
      const definition = CLOUD_DEFINITIONS[quantity];
      const heightAgl = Number(cloud.heightFt);

      if (!definition || !Number.isFinite(heightAgl) || heightAgl < 0) {
        continue;
      }

      const percent = Math.max(0, definition.percent);
      const coveredWidth = width * percent / 100;


      const count = width <= 0 || percent === 0
        ? 0
        : Math.max(1, Math.ceil(coveredWidth / cloudWidth));

      layers.push({
        altitude: heightAgl + airportElevation,
        heightAgl,
        quantity,
        count,
        percent,
        label: definition.label,
      });
    }

    return layers;
  }

  _createCloudIcon() {
    // Keep image and fallback inside the same sized wrapper.
    const wrapper = document.createElement('span');
    wrapper.className = 'cloud-icon';
    wrapper.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.alt = '';

    image.onerror = () => {
      image.onerror = null;

      const fallback = document.createElement('span');
      fallback.className = 'cloud-fallback';
      fallback.textContent = '☁';

      wrapper.replaceChildren(fallback);
    };

    wrapper.appendChild(image);
    image.src = CLOUD_IMAGE_URL;

    return wrapper;
  }

  _renderCloudLayer(layer, { positioned = false, y = 0 } = {}) {
    const element = document.createElement('div');
    element.className = 'cloud-layer';

    const description = `${layer.altitude.toLocaleString('en-US')} ft MSL · ${this._cfg.metar_airport}`;

    const icons = document.createElement('div');
    icons.className = 'cloud-icons';
    icons.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < layer.count; index++) {
      const icon = this._createCloudIcon();

      // Center each fixed-size cloud in an evenly spaced slot.
      icon.style.left = `${100 * (index + 0.5) / layer.count}%`;

      icons.appendChild(icon);
    }

    element.appendChild(icons);

    if (positioned) {
      element.classList.add('cloud-layer-positioned');
      element.style.top = `${y}px`;
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', description);
    } 
      /*CHANGD HERE */
      const label = document.createElement('div');
      label.className = 'cloud-label';
      label.textContent = description;
      element.appendChild(label);
        return element;
  }

  // ---------- Rendering ----------

  _render() {
    if (!this._stage || !this._cfg) return;

    const c = this._cfg;
    const empty = !this._targets.length;
    const errors = [this._error];

    const showingMetar =c.view === 'metar' || (c.view === 'stacked' && c.show_clouds_stacked);

    if (showingMetar && c.metar_enabled && this._metarError) {
      errors.push(`METAR: ${this._metarError}`);
    }

    const errorText = errors.filter(Boolean).join('\n');

    this._err.hidden = !errorText;
    this._err.textContent = errorText;
    this._empty.hidden = !empty;
    this._empty.textContent = c.empty_text;

    this.style.display = c.hide_when_empty && empty && !errorText ? 'none' : '';

    this._applyBackdrop();
    this._prepareView();

    switch (c.view) {
      case 'cluster':
        this._renderCluster();
        break;
      case 'stacked':
        this._renderStacked();
        break;
      case 'metar':
        this._renderMetarView();
        break;
      default:
        this._renderPlate();
    }

    this._updateSlider();
  }

  _renderPlate() {
    const a = this._pickAircraft(this._targets);
    const keep = new Set(a ? [a.hex] : []);

    this._pruneAircraftItems(keep);

    if (a) {
      this._getAircraftItem(a);
    }
  }

  _renderCluster() {
    const keep = new Set(this._targets.map((a) => a.hex));
    this._pruneAircraftItems(keep);

    for (const a of this._targets) {
      const item = this._getAircraftItem(a);

      item.span = Math.pow(this._getWingSpan(a), this._sizeCurve());
      item.aspect = a.img ? a.img.h / a.img.w : 0.4;
    }

    if (!this._items.size) {
      this._content.classList.remove('cluster-grid');
      return;
    }

    this._layout();
  }

  _renderStacked() {
    const container = this._aircraftContainer;
    if (!container) return;

    const keep = new Set(this._targets.map((a) => a.hex));
    this._pruneAircraftItems(keep);

    // Aircraft nodes are reused; cloud layers are rebuilt.
    for (const cloudRow of container.querySelectorAll('.cloud-layer')) {
      cloudRow.remove();
    }

    const configuredScale = Number(this._cfg.stack_scale);
    const scale = Number.isFinite(configuredScale) ? configuredScale : DEFAULTS.stack_scale;

    const entries = this._targets.map((aircraft) => ({
      kind: 'aircraft',
      altitude: Number.isFinite(aircraft.alt) ? aircraft.alt : -1,
      aircraft,
    }));

    const clouds = this._cfg.show_clouds_stacked ? this._cloudLayers() : [];

    // With no aircraft, keep cloud rows in the bottom half.
    // Clear the padding as soon as aircraft return.
    const cloudsOnly = this._targets.length === 0 && clouds.length > 0;

    container.style.paddingTop = cloudsOnly
      ? `${Math.floor(this._content.clientHeight * 0.5)}px`
      : '';

    for (const layer of clouds) {
      entries.push({
        kind: 'cloud',
        altitude: layer.altitude,
        layer,
      });
    }

    // Sort by reported altitude; clouds come first when altitudes match.
    entries.sort((a, b) => {
      const altitudeDifference = b.altitude - a.altitude;

      if (altitudeDifference !== 0) return altitudeDifference;
      if (a.kind !== b.kind) return a.kind === 'cloud' ? -1 : 1;

      if (a.kind === 'aircraft') {
        return a.aircraft.distanceKm - b.aircraft.distanceKm;
      }

      return 0;
    });

    for (const entry of entries) {
      if (entry.kind === 'cloud') {
        container.appendChild(this._renderCloudLayer(entry.layer));
        continue;
      }

      const aircraft = entry.aircraft;
      const item = this._getAircraftItem(aircraft);
      const relativeSize = Math.pow(this._getWingSpan(aircraft), this._sizeCurve());
      const widthPercent = Math.max(12, Math.min(90, relativeSize * scale));

      item.art.style.width = `${widthPercent}%`;
      item.art.style.minWidth = '42px';

      container.appendChild(item.el);
    }

    // Show attribution after the content and at the bottom of a short list. If needed
    let footer = container.querySelector('.stack-metar-footer');
    if (this._cfg.metar_enabled) {
      if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'stack-metar-footer';
        footer.textContent = METAR_ATTRIBUTION;
      }

      container.appendChild(footer);
    } else {
      footer?.remove();
    }
  }

    /*
    * METAR view rendering flow
    *
    * 1. Validate the scene and read its available width/height.
    * 2. Prune stale aircraft and remove the previous bands, clouds,
    *    and ground-weather elements. Reuse aircraft DOM nodes.
    * 3. Read cloud layers and ground weather. Cap the weather's
    *    upper boundary at 1,000 ft AGL or the lowest cloud,
    *    whichever is lower.
    * 4. Group aircraft by altitude rounded to the nearest 1,000 ft
    *    MSL. Build altitudeBands with aircraft groups and clouds,
    *    then sort highest first.
    * 5. Build a shared logarithmic altitude scale
    * 6. Calculate artwork sizing from the available height and
    *    altitudeBands count. Altitude determines vertical position;
    * 7. Place clouds and aircraft bands at their scaled altitudes.
    * 8. Build a shared  canvas
    * 9. Render ground weather 
    */
  _renderMetarView() {
      if (
        this._renderedView !== 'metar' ||
        !this._aircraftContainer ||
        !this._content
      ) {
        return;
      }
      // Altitude grouping and scale  -  feet.
      const ALTITUDE_BAND_FT = 1000;          // aircraft are grouped into fixed width bands for display
      const MINIMUM_CEILING_AGL_FT = 5000;    // minimum value for the top of the screen
      // Curve strength relative to the final display ceiling.
      // Smaller = more space for low altitudes. Larger = closer to a linear altitude scale.
      const LOG_CURVE_RANGE_FRACTION = 0.1;


      // Scene padding.
      const SCENE_PADDING_PX = 8;             //ensure space at top and bottom of the scene
      // Automatic artwork sizing.
      const MAX_ROW_HEIGHT_PX = 145;
      // Aircraft artwork and labels.
      const AIRCRAFT_SIZE_MULTIPLIER = 1;
      const MIN_AIRCRAFT_BAND_HEIGHT_PX = 120;
      const AIRCRAFT_ART_HEIGHT_PX = 100;
      const AIRCRAFT_FONT_SIZE_PX = 12;
      const AIRCRAFT_LINE_HEIGHT_PX = 15;
      const AIRCRAFT_SUBTITLE_LINES = 2;
      const AIRCRAFT_BASE_HEIGHT_PX = AIRCRAFT_ART_HEIGHT_PX +  AIRCRAFT_LINE_HEIGHT_PX * (1 + AIRCRAFT_SUBTITLE_LINES);
      // Aircraft horizontal layout.
      const MAX_CARD_WIDTH_PX = 220;
      const CARD_VIEWPORT_CLEARANCE_PX = 12;
      const AIRCRAFT_CARD_GAP_PX = 50;
      const CANVAS_EDGE_PADDING_PX = 6;
      const AIRCRAFT_SPACING_PX = MAX_CARD_WIDTH_PX + AIRCRAFT_CARD_GAP_PX;
      // Clouds and ground weather  -  existing behavior unchanged.
      const MIN_CLOUD_NATURAL_HEIGHT_PX = 52;
      const GROUND_WEATHER_MAX_HEIGHT_AGL_FT = 1000;

      const scene = this._aircraftContainer;
      scene.style.removeProperty('height');
      const width = scene.clientWidth;
      const sceneHeightPx = scene.clientHeight;

      if (width <= 0 || sceneHeightPx <= 0) return;

      // ---------- Settings to experiment with ----------
      const airportElevation = this._cfg.metar_airport_elevation_ft;
      const keep = new Set( this._targets.map((aircraft) => aircraft.hex)  );

      this._pruneAircraftItems(keep);

      // Aircraft nodes remain available through this._items.
      // Bands, clouds, and weather are rebuilt each render.
      for (const node of scene.querySelectorAll(
        '.metar-band, .cloud-layer, .ground-weather'
      )) {
        node.remove();
      }

      const clouds = this._cloudLayers();
      const groundWeather = this._metarGroundWeather();

      // ---------- Ground-weather upper boundary ----------

      const lowestCloudAltitude = Math.min(
        Infinity,
        ...clouds
          .map((layer) => layer.altitude)
          .filter(Number.isFinite)
      );

      // At most 1,000 ft AGL, capped by the lowest cloud.
      const weatherTopAltitude = Math.min(
        airportElevation + GROUND_WEATHER_MAX_HEIGHT_AGL_FT,
        lowestCloudAltitude
      );

      // Use the lowest broken/overcast layer for precipitation.
      // Unlike other surface effects, this can extend above 1,000 ft AGL.
      const precipitationCloudAltitude = Math.min(
        Infinity,
        ...clouds
          .filter((layer) =>
            layer.quantity === 'BKN' ||
            layer.quantity === 'OVC'
          )
          .map((layer) => layer.altitude)
          .filter(Number.isFinite)
      );

      const precipitationTopAltitude =
        Number.isFinite(precipitationCloudAltitude)
          ? precipitationCloudAltitude
          : weatherTopAltitude;

      // ---------- Build altitude bands ----------
      const buckets = new Map();
      // aircraft are grouped into 1000 foot bands for render. invalid altitudes are excluded
      for (const aircraft of this._targets) {
        if (!Number.isFinite(aircraft.alt)) continue;
        const bucket = Math.round(aircraft.alt / ALTITUDE_BAND_FT);
        if (!buckets.has(bucket)) {
          buckets.set(bucket, []);
        }
        buckets.get(bucket).push(aircraft);
      }

      const altitudeBands = [];
      // build the bands of aircraft
      for (const [bucket, aircraft] of buckets) {
        altitudeBands.push({
          kind: 'aircraft',
          bucket: String(bucket),
          altitude: bucket * ALTITUDE_BAND_FT,
          aircraft,
        });
      }

      for (const layer of clouds) {
        altitudeBands.push({
          kind: 'cloud',
          altitude: layer.altitude,
          layer,
        });
      }

      altitudeBands.sort((a, b) =>
        b.altitude - a.altitude ||
        (a.kind === b.kind ? 0 : a.kind === 'cloud' ? -1 : 1)
      );

      // ---------- logarithmic altitude scale ----------
      const usableHeight = Math.max(1, sceneHeightPx - SCENE_PADDING_PX * 2);
      const highestCloudAgl = Math.max( 0, ...clouds.map((layer) => layer.heightAgl)  );
      const highestAircraftAgl = Math.max( 0,
          ...this._targets
            .filter((aircraft) => Number.isFinite(aircraft.alt))
            .map((aircraft) =>
              Math.max(0, aircraft.alt - airportElevation)
            )
      );

      const hasAircraft = this._targets.some(
        (aircraft) => Number.isFinite(aircraft.alt)
      );

      // With the curve defined as a fraction of the ceiling,
      // this is the altitude fraction that maps halfway up.
      // For a curve fraction of 0.1:
      // halfwayAltitudeFraction ≈ 0.2317
      // Therefore, a cloud at 23.17% of the display ceiling appears halfway up the logarithmic scene.
      const halfwayAltitudeFraction = LOG_CURVE_RANGE_FRACTION * ( Math.sqrt(1 + 1 / LOG_CURVE_RANGE_FRACTION) - 1 );

      // Choose a cloud-only ceiling that puts the highest cloud
      // halfway up, before applying the minimum-ceiling constraint.
      const cloudOnlyCeilingAgl = highestCloudAgl / halfwayAltitudeFraction;

      // Determine the final ceiling independently of logAltitude().
      const scaleCeilingAgl = hasAircraft
        ? Math.max(
            MINIMUM_CEILING_AGL_FT,
            highestAircraftAgl * 1.1,
            highestCloudAgl * 1.1
          )
        : Math.max(
            MINIMUM_CEILING_AGL_FT,
            cloudOnlyCeilingAgl
          );

      // Derive the curve from the FINAL ceiling.
      const logCurveFt = scaleCeilingAgl * LOG_CURVE_RANGE_FRACTION;
      const logAltitude = (heightAgl) =>
          Math.log1p(Math.max(0, heightAgl) / logCurveFt);
      const logCeiling = logAltitude(scaleCeilingAgl);

      // Convert MSL altitude into a vertical scene position.
      const altitudeToY = (altitudeMsl) => {
        const heightAgl = Math.max( 0,  altitudeMsl - airportElevation );
        const fractionofScreenHeight = Math.min(1,logAltitude(heightAgl) / logCeiling );
        return sceneHeightPx - SCENE_PADDING_PX - fractionofScreenHeight * usableHeight;
      };

      const slotHeight = usableHeight / Math.max(1, altitudeBands.length);
      //slots to draw aircraft can scale down if needed, but get a max height 
      const rowHeight = Math.max( 1, Math.min(MAX_ROW_HEIGHT_PX, slotHeight ) );

      // ---------- Render all clouds and aircraft ----------

      const aircraftBands = [];
      for (const row of altitudeBands) {
        const y = altitudeToY(row.altitude);
        const availableHeight = Math.max(
          120,
          sceneHeightPx - SCENE_PADDING_PX - y
        );

        const displayHeight = Math.min( rowHeight, availableHeight );
        if (row.kind === 'cloud') {
          const cloudLayer = this._renderCloudLayer(row.layer, {
            positioned: true,
            y,
          });
          //scaling here keeps the cloud layer full width even if it was scaled down to fit many layers. 
          scene.appendChild(cloudLayer);  //scene is the overall container for this view content.
          const naturalHeight = Math.max( MIN_CLOUD_NATURAL_HEIGHT_PX, cloudLayer.offsetHeight );
          const scale = Math.min( 1, displayHeight / naturalHeight );
          cloudLayer.style.right = 'auto';
          cloudLayer.style.width = `${width / scale}px`;
          cloudLayer.style.transformOrigin = 'top left';
          cloudLayer.style.transform = `scale(${scale})`;

          continue;
        }

        // Cap the enlarged artwork to the space below this band.
        // Apply the size multiplier,
        const aircraftHeight = Math.max(
          MIN_AIRCRAFT_BAND_HEIGHT_PX,
          Math.min(
            Math.min(AIRCRAFT_BASE_HEIGHT_PX, displayHeight) *
              AIRCRAFT_SIZE_MULTIPLIER,
            availableHeight
          )
        );


        // Scale artwork and labels relative to the  base height.
        const aircraftScale = aircraftHeight / AIRCRAFT_BASE_HEIGHT_PX;

        const band = document.createElement('div');
        band.className = 'metar-band';
        band.dataset.bucket = row.bucket;
        band.dataset.altitude = String(row.altitude);
        band.style.top = `${y}px`;
        band.style.height = `${aircraftHeight}px`;

        const track = document.createElement('div');
        track.className = 'metar-band-track';

        // Temporary natural layout for measuring the cards.
        // Final positions are assigned after all rendering.
        track.style.position = 'relative';
        track.style.display = 'flex';
        track.style.boxSizing = 'border-box';
        track.style.width = 'max-content';
        track.style.minWidth = '0';
        track.style.height = `${aircraftHeight}px`;
        track.style.padding = '0';
        track.style.margin = '0';
        track.style.justifyContent = 'flex-start';

        band.appendChild(track);
        scene.appendChild(band);

        const cardWidth = Math.max(1,  Math.min(MAX_CARD_WIDTH_PX, width - CARD_VIEWPORT_CLEARANCE_PX));

        const sortedAircraft = [...row.aircraft].sort(
          (a, b) =>
            a.distanceKm - b.distanceKm ||
            a.hex.localeCompare(b.hex)
        );

        for (const aircraft of sortedAircraft) {
          const item = this._getAircraftItem(aircraft);

          // Clear individual positions from the previous render.
          item.el.style.position = 'relative';
          item.el.style.left = 'auto';
          item.el.style.top = 'auto';
          item.el.style.transform = '';
          item.el.style.width = `${cardWidth}px`;
          item.el.style.height = `${aircraftHeight}px`;
          item.el.style.flexShrink = '0';

          item.art.style.width =            `${AIRCRAFT_ART_HEIGHT_PX * aircraftScale}px`;
          item.art.style.height =           `${AIRCRAFT_ART_HEIGHT_PX * aircraftScale}px`;
          item.titleEl.style.fontSize =     `${AIRCRAFT_FONT_SIZE_PX  * aircraftScale}px`;
          item.titleEl.style.lineHeight =   `${AIRCRAFT_LINE_HEIGHT_PX  * aircraftScale}px`;
          item.titleEl.style.height =       `${AIRCRAFT_LINE_HEIGHT_PX  * aircraftScale}px`;
          item.subtitleEl.style.fontSize =  `${AIRCRAFT_FONT_SIZE_PX  * aircraftScale}px`;
          item.subtitleEl.style.lineHeight =`${AIRCRAFT_LINE_HEIGHT_PX  * aircraftScale}px`;
          item.subtitleEl.style.height =    `${ AIRCRAFT_LINE_HEIGHT_PX * AIRCRAFT_SUBTITLE_LINES * aircraftScale }px`;
          item.el.title = [
            item.titleEl.textContent,
            item.subtitleEl.textContent,
          ].filter(Boolean).join('\n');

          track.appendChild(item.el);
        }
        band.scrollLeft = 0;
        aircraftBands.push({
          band,
          track,
          cards: [],
        });
      }  //end of altitudeBands loop

      // ---------- Fixed center-out aircraft layout ----------
      let halfCanvasWidth = width / 2;

      aircraftBands.forEach((entry, bandIndex) => {
        const isEvenBand = bandIndex % 2 === 1;
        const middleOffset = isEvenBand
          ? AIRCRAFT_SPACING_PX / 2
          : 0;

        const firstDirection = isEvenBand ? -1 : 1;
        entry.cards = [...entry.track.children].map((el, aircraftIndex) => {
          const slot = aircraftIndex === 0
            ? 0
            : Math.ceil(aircraftIndex / 2) *
              (aircraftIndex % 2 === 1
                ? firstDirection
                : -firstDirection);

          const x = middleOffset + slot * AIRCRAFT_SPACING_PX;
          const cardWidth = el.offsetWidth;
          halfCanvasWidth = Math.max(
            halfCanvasWidth,
            Math.abs(x) + cardWidth / 2 + CANVAS_EDGE_PADDING_PX
          );

          return {
            el,
            x,
            width: cardWidth,
          };
        });
      });

      // ---------- Apply positions on a shared canvas ----------

      const canvasWidth = Math.ceil(halfCanvasWidth * 2);
      const canvasCenter = canvasWidth / 2;

      for (const { band, track, cards } of aircraftBands) {
        track.style.position = 'relative';
        track.style.display = 'block';
        track.style.boxSizing = 'border-box';
        track.style.width = `${canvasWidth}px`;
        track.style.minWidth = `${canvasWidth}px`;
        track.style.height = band.style.height;
        track.style.padding = '0';
        track.style.margin = '0';

        for (const card of cards) {
          card.el.style.position = 'absolute';
          card.el.style.left =
            `${canvasCenter + card.x - card.width / 2}px`;
          card.el.style.top = '0px';
          card.el.style.transform = '';
        }

        // Start centered; overflow remains horizontally swipeable.
        band.scrollLeft = Math.max(
          0,
          (canvasWidth - band.clientWidth) / 2
        );
      }


      // ---------- Ground weather ----------

      for (const effect of groundWeather.effects) {
        const weather = document.createElement('div');
        const isLightning = effect === 'lightning';
        const isPrecipitation =
          effect === 'rain' || effect === 'snow';

        weather.className = [
          'ground-weather',
          effect,
          groundWeather.intensity,
        ].join(' ');

        weather.classList.toggle('metar-lightning', isLightning);
        weather.classList.toggle('has-thunder', isLightning);

        weather.style.top = `${altitudeToY(
          isPrecipitation
            ? precipitationTopAltitude
            : weatherTopAltitude
        )}px`;
        weather.style.bottom = '0';

        if (isLightning) {
          weather.setAttribute('aria-hidden', 'true');
        } else {
          weather.setAttribute(
            'aria-label',
            `${effect}: ${groundWeather.codes.join(', ')}`
          );
        }

        scene.appendChild(weather);
      }
    }
 

  // ---------- Cluster packing ----------

  _layout() {
    if (
      !this._cfg || this._cfg.view !== 'cluster' ||
      this._renderedView !== 'cluster' || !this._items.size
    ) {
      return;
    }

    const width = this._content.clientWidth;
    const height = this._content.clientHeight;

    if (!width || !height) return;

    const items = [...this._items.values()].sort(
      (a, b) => b.span - a.span || a.ac.hex.localeCompare(b.ac.hex)
    );

    const captionHeight = 70;
    const padding = 6;
    let minWidth = 150;

    const gridSpacing = Math.max(6, Math.round(Math.min(width, height) / 40));
    const candidateKey = `${width}x${height}x${gridSpacing}`;

    if (this._ckey !== candidateKey) {
      const candidates = [];

      for (let dx = -width / 2; dx <= width / 2; dx += gridSpacing) {
        for (let dy = -height / 2; dy <= height / 2; dy += gridSpacing) {
          candidates.push([dx, dy]);
        }
      }

      candidates.sort(
        (a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2)
      );

      this._cand = candidates;
      this._ckey = candidateKey;
    }

    const place = (scale) => {
      const placed = [];

      for (const item of items) {
        const imageWidth = item.span * scale;
        const itemWidth = Math.max(imageWidth, minWidth);
        const itemHeight = imageWidth * item.aspect + captionHeight;

        if (itemWidth > width || itemHeight > height) return null;

        let hit = null;

        for (const [dx, dy] of this._cand) {
          const x = width / 2 + dx - itemWidth / 2;
          const y = height / 2 + dy - itemHeight / 2;

          if (x < 0 || y < 0 || x + itemWidth > width || y + itemHeight > height) {
            continue;
          }

          let fits = true;

          for (const previous of placed) {
            if (
              x < previous.x + previous.w + padding &&
              x + itemWidth + padding > previous.x &&
              y < previous.y + previous.h + padding &&
              y + itemHeight + padding > previous.y
            ) {
              fits = false;
              break;
            }
          }

          if (fits) {
            hit = { x, y, w: itemWidth, h: itemHeight, imageWidth, item };
            break;
          }
        }

        if (!hit) return null;
        placed.push(hit);
      }

      return placed;
    };

    let low = 0.05;
    let high = width / items[0].span;
    let best = null;

    for (const candidateMinWidth of [150, 120, 90, 60]) {
      minWidth = candidateMinWidth;
      best = place(low);
      if (best) break;
    }

    if (!best) {
      this._content.classList.add('cluster-grid');

      for (const item of items) {
        item.placed = false;
      }

      return;
    }

    this._content.classList.remove('cluster-grid');

    for (let iteration = 0; iteration < 10; iteration++) {
      const middle = (low + high) / 2;
      const result = place(middle);

      if (result) {
        low = middle;
        best = result;
      } else {
        high = middle;
      }
    }

    const configuredScale = Number(this._cfg.cluster_scale);
    const scale = Number.isFinite(configuredScale) ? configuredScale : DEFAULTS.cluster_scale;
    const finalPlacement = place(low * Math.min(1, Math.max(0.2, scale))) || best;

    for (const { x, y, w, h, imageWidth, item } of finalPlacement) {
      item.art.style.width = `${imageWidth}px`;

      if (!item.placed) {
        item.el.style.transition = 'none';
      }

      item.el.style.width = `${w}px`;
      item.el.style.height = `${h}px`;
      item.el.style.transform = `translate(${x}px,${y}px)`;

      if (!item.placed) {
        void item.el.offsetWidth;
        item.el.style.transition = '';
        item.placed = true;
      }
    }
  }
}

// ---------- Visual editor ----------

const OV_LABELS = {
  adsb_source: 'ADS-B data source',
  adsb_url: 'ADS-B URL (supports {lat}, {lon}, {radius_nm}, {radius_km}, {radius_mi})',
  adsb_sensor: 'ADS-B sensor (aircraft or ac array in its attributes)',
  latitude: 'Latitude (leave blank to use Home Assistant home)',
  longitude: 'Longitude (leave blank to use Home Assistant home)',
  units: 'Distance units',
  radius: 'Radius (mi/km, follows selected units)',
  refresh_s: 'Refresh interval (seconds)',

  view: 'Default View',
  plate_pick: 'Aircraft shown in Plate view',
  max_aircraft: 'Maximum aircraft (cluster, stacked, and METAR (weather) views)',
  max_altitude_ft: 'Maximum altitude (ft; 0 = no ceiling)',
  show_ground: 'Include aircraft on the ground',

  cluster_scale: 'Image scale for cluster view',
  stack_scale: 'Image scale for stacked view',
  size_curve: 'Relative size curve (1 = true scale, 0 = equal size). This keeps large aircraft from dwarfing smaller ones.',
  show_clock: 'Show clock',
  show_date: 'Show date',

  backdrop: 'Backdrop',
  backdrop_image: 'Backdrop image URL',
  sun_entity: 'Sun entity (for automatic backdrop)',
  weather_entity: 'Weather entity (optional, for automatic backdrop)',

  image_path: 'Aircraft image folder',
  image_ext: 'Aircraft image extension',
  image_fallback: 'Fallback image name (without extension; blank = silhouette)',
  image_faces: 'Artwork base direction',
  flip_to_heading: 'Flip artwork to match heading: west left, east right',
  image_blend: 'Image blend mode',

  show_info: 'Show aircraft information (plate)',
  route_lookup: 'Look up origin/destination cities',
  route_url: 'Route lookup API base URL',
  climb_fpm: 'Climb/descent threshold (ft/min)',
  operators: 'Operator name overrides (three-character callsign prefix: name)',
  wingspans: 'Wingspan overrides (ICAO aircraft type: meters). Used for scaling images. Wingspan lookups are stored for many aircraft. If no wingspan is available for a type, the ADSB category (large, small, helo), is used for an estimate. Set a wingspan by aircraft type. E.g C68A : 22 here.',

  metar_enabled: 'Pull airport weather data from Datamask.org',
  metar_airport: 'METAR airport ICAO code',
  metar_airport_elevation_ft: 'Airport elevation (feet above mean sea level)',  
  metar_refresh: 'METAR refresh (minutes; 30–1440)',
  show_clouds_stacked: 'Show weather (METAR) cloud layers in stacked view. Requires data from Datamask.org',

  empty_text: 'Text when no aircraft are overhead',
  hide_when_empty: 'Hide card when empty',
};

const sel = (name, options) => ({
  name,
  selector: {
    select: {
      mode: 'dropdown',
      options: options.map((value) => ({ value, label: value })),
    },
  },
});

const num = (name, min, max, step = 1) => ({
  name,
  selector: {
    number: { min, max, step, mode: 'box' },
  },
});

const OV_SCHEMA = [
  {
    name: 'adsb_source',
    selector: {
      select: {
        options: [
          { label: 'URL', value: 'url' },
          { label: 'Home Assistant sensor', value: 'sensor' },
        ],
        mode: 'dropdown',
      },
    },
  },

  { name: 'adsb_url', selector: { text: {} } },
  { name: 'adsb_sensor', selector: { entity: { domain: 'sensor' } } },

  num('latitude', -90, 90, 0.000001),
  num('longitude', -180, 180, 0.000001),
  sel('units', ['auto', 'metric', 'imperial']),
  num('radius', 1, 1000),
  num('refresh_s', 1, 3600),

  sel('view', VIEWS),
  sel('plate_pick', ['nearest', 'lowest', 'highest', 'fastest']),
  num('max_aircraft', 1, 40),
  num('max_altitude_ft', 0, 100000, 500),
  { name: 'show_ground', selector: { boolean: {} } },

  { name: 'cluster_scale', type: 'float' },
  { name: 'stack_scale', type: 'float' },
  { name: 'size_curve', type: 'float' },
  { name: 'show_clock', selector: { boolean: {} } },
  { name: 'show_date', selector: { boolean: {} } },

  sel('backdrop', [
    'white', 'auto', 'none', 'clear', 'clouds', 'rainy',
    'snowy', 'sunset', 'night', 'storm', 'plate', 'image',
  ]),

  { name: 'backdrop_image', selector: { text: {} } },
  { name: 'sun_entity', selector: { entity: { domain: 'sun' } } },
  { name: 'weather_entity', selector: { entity: { domain: 'weather' } } },

  { name: 'image_path', selector: { text: {} } },
  sel('image_ext', ['png', 'webp', 'jpg', 'svg']),
  { name: 'image_fallback', selector: { text: {} } },
  sel('image_faces', ['right', 'left']),
  { name: 'flip_to_heading', selector: { boolean: {} } },
  sel('image_blend', ['normal', 'multiply']),
  { name: 'wingspans', selector: { object: {} } },

  { name: 'show_info', selector: { boolean: {} } },
  { name: 'route_lookup', selector: { boolean: {} } },
  { name: 'route_url', selector: { text: {} } },
  num('climb_fpm', 0, 10000, 50),
  { name: 'operators', selector: { object: {} } },

  { name: 'metar_enabled', selector: { boolean: {} } },
  { name: 'metar_airport', selector: { text: {} } },
    num('metar_airport_elevation_ft'),
  num('metar_refresh', 30, 1440, 15),
  { name: 'show_clouds_stacked', selector: { boolean: {} } },

  { name: 'empty_text', selector: { text: {} } },
  { name: 'hide_when_empty', selector: { boolean: {} } },
];

const OV_EDITOR_SECTIONS = [
  { id: 'source',
    label: 'Source',
    description:
      'Choose an ADS-B feed URL or a Home Assistant sensor. ' +
      'Sensor attributes must contain an aircraft or ac array.',
    fields: [
      'adsb_source', 'adsb_url', 'adsb_sensor', 'latitude',
      'longitude', 'units', 'radius', 'refresh_s',
    ],
  },
  { id: 'aircraft',
    label: 'Aircraft',
    description:
      'Choose which aircraft appear. Plate shows one aircraft; ' +
      'cluster packs aircraft into the available space; stacked sorts ' +
      'by altitude; METAR positions aircraft alongside cloud layers.',
    fields: [
      'plate_pick', 'max_aircraft', 'max_altitude_ft', 'show_ground', 'wingspans',
    ],
  },
  { id: 'appearance',
    label: 'Appearance',
    description:
      'Configure aircraft sizing, background, clock, and date. ',
    fields: [
      'view', 'cluster_scale', 'stack_scale', 'size_curve', 'backdrop',
      'backdrop_image', 'sun_entity',  'show_clock', 'show_date',
    ],
  },
  { id: 'artwork',
    label: 'Artwork',
    description:
      'Aircraft images are named by ICAO type. Transparent backgrounds work best. ' +
      'Multiply mode can help images with white backgrounds blend into the scene.',
    fields: [
      'image_path', 'image_ext', 'image_fallback', 'image_faces',
      'flip_to_heading', 'image_blend',
    ],
  },
  { id: 'information',
    label: 'Information',
    description:
      'Aircraft labels, flight routes, operator overrides, and empty-card behavior.',
    fields: [
      'show_info', 'route_lookup', 'route_url', 'climb_fpm',
      'operators', 'empty_text', 'hide_when_empty',
    ],
  },
  { id: 'metar',
    label: 'Weather',
    description:
      'Cloud data is based on METAR reports pulled from Datamask.org. Cloud heights are reported ' +
      'above airport ground level, while aircraft altitude may use a different ' +
      'reference.',
    fields: [
      'weather_entity','metar_enabled', 'metar_airport', 'metar_airport_elevation_ft', 'metar_refresh', 'show_clouds_stacked',
    ],
  },
];

const EDITOR_CSS = `
:host { display: block; color: var(--primary-text-color); font-size: 14px; }
.editor { padding: 4px 0; }
.navigation { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 5px; margin-bottom: 5px; border-bottom: 1px solid var(--divider-color); }
.section-button { appearance: none; padding: 4px 9px; border: 1px solid var(--divider-color); border-radius: 14px; background: var(--secondary-background-color,transparent); color: var(--primary-text-color); font: inherit; font-size: 14px; cursor: pointer; }
.section-button:hover { border-color: var(--primary-color); }
.section-button[aria-pressed="true"] { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color,#fff); }
.section-button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 3px; }
.section-heading { margin: 0 0 6px; font-size: 14px; font-weight: 600; }
.section-description { margin: 0 0 20px; color: var(--secondary-text-color); font-size: 14px; line-height: 1.5; }
ha-form { display: block; }
`;

class AeroVisitorsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._activeSection = 'source';
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;

    if (this._form) {
      this._form.hass = hass;
    }
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>${EDITOR_CSS}</style>
      <div class="editor">
        <div class="navigation" role="group" aria-label="Configuration sections"></div>
        <section aria-labelledby="section-heading">
          <h3 class="section-heading" id="section-heading"></h3>
          <p class="section-description"></p>
          <ha-form></ha-form>
        </section>
      </div>
    `;

    this._navigation = this.shadowRoot.querySelector('.navigation');
    this._heading = this.shadowRoot.querySelector('.section-heading');
    this._description = this.shadowRoot.querySelector('.section-description');
    this._form = this.shadowRoot.querySelector('ha-form');
    this._buttons = new Map();

    for (const section of OV_EDITOR_SECTIONS) {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'section-button';
      button.textContent = section.label;

      button.addEventListener('click', () => {
        if (this._activeSection === section.id) return;

        this._activeSection = section.id;
        this._render();
      });

      this._navigation.appendChild(button);
      this._buttons.set(section.id, button);
    }

    this._form.computeLabel = (schema) =>
      OV_LABELS[schema.name] || schema.name.replace(/_/g, ' ');

    this._form.addEventListener('value-changed', (event) => {
      this._config = { ...this._config, ...event.detail.value };

      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: { ...this._config } },
        bubbles: true,
        composed: true,
      }));
    });
  }

  _render() {
    if (!this._form) {
      this._build();
    }

    const section = OV_EDITOR_SECTIONS.find(
      (item) => item.id === this._activeSection
    ) || OV_EDITOR_SECTIONS[0];

    this._activeSection = section.id;

    for (const [id, button] of this._buttons) {
      button.setAttribute('aria-pressed', String(id === section.id));
    }

    this._heading.textContent = section.label;
    this._description.textContent = section.description;

    const schemas = new Map(OV_SCHEMA.map((schema) => [schema.name, schema]));

    this._form.hass = this._hass;
    this._form.schema = section.fields.map((name) => schemas.get(name)).filter(Boolean);
    this._form.data = { ...DEFAULTS, ...this._config };
  }
}

// ---------- Registration ----------

if (!customElements.get('aero-visitors-card')) {
  customElements.define('aero-visitors-card', AeroVisitorsCard);
}

if (!customElements.get('aero-visitors-card-editor')) {
  customElements.define('aero-visitors-card-editor', AeroVisitorsCardEditor);
}

window.customCards = window.customCards || [];

if (!window.customCards.some((card) => card.type === 'aero-visitors-card')) {
  window.customCards.push({
    type: 'aero-visitors-card',
    name: 'AeroVisitors',
    description: 'Show aircraft overhead from a local ADS-B feed: plate, cluster, stacked, and METAR weather views',
    preview: false,
  });
}

console.info(
  `%c AEROVISITORS-CARD %c v${AEROVISITORS_CARD_VERSION} `,
  'background:#2f80d8;color:#fff',
  'background:#222;color:#fff'
);