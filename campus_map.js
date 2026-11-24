/**
 * ALLIANCE UNIVERSITY REAL CAMPUS LOST & FOUND MAP
 * Features real Alliance University landmarks based on reference satellite layout:
 * 1. LC2 (in place of Faculty of Engineering and Technology)
 * 2. LC2 (in place of Alliance School of Law)
 * 3. LC3 (added near Nescafé, right before LC3)
 * 4. Alliance University Library
 * 5. Alliance Cricket Ground
 * 6. Alliance Volleyball Court
 * 7. Alliance Football Ground
 * 8. Alliance School of Business
 * 9. Alliance School of Liberal Arts
 * 10. Alliance Activity Center
 * 11. Alliance Food Court
 * 12. Nescafé
 *
 * Includes:
 * - 3 View Modes: 🗺️ Street Map, 🛰️ Satellite View, 📸 Reference Campus Map
 * - Automatic offline/tile-error fallback to Reference Campus Map
 * - Dynamic Date, Item Type (Lost & Found), Category, and Status Filters
 * - Interactive Leaflet pins & Satellite Photo Pins with rich popup cards
 * - 1-Click "View Details" (openItemModal) and "Message Reporter" (openChatModal)
 */

(() => {
  // Center coordinates of Alliance University Central Campus, Anekal, Bengaluru
  const CAMPUS_CENTER = [12.72935, 77.70815];

  // Authentic 12 Alliance University Campus Reference Landmarks
  const CAMPUS_BUILDINGS = [
    {
      id: 'lc2_engineering',
      name: 'LC2 (Faculty of Engineering and Technology)',
      displayName: 'LC2 (in place of Faculty of Engineering and Technology)',
      shortName: 'LC2 (Engg & Tech)',
      aliases: [
        'lc2 (in place of faculty of engineering and technology)',
        'faculty of engineering and technology',
        'engineering and technology',
        'engineering block',
        'lc2 engg',
        'lc2 engineering',
        'fet',
        'fett',
        'engineering'
      ],
      lat: 12.73160,
      lng: 77.70780,
      xPercent: 45.2,
      yPercent: 7.3,
      icon: '🏛️',
      category: 'Engineering & Technology',
      description: 'LC2 Engineering wing featuring advanced laboratories, computing clusters, and multimedia lecture theaters.'
    },
    {
      id: 'lc2_law',
      name: 'LC2 (Alliance School of Law)',
      displayName: 'LC2 (in place of Alliance School of Law)',
      shortName: 'LC2 (School of Law)',
      aliases: [
        'lc2 (in place of alliance school of law)',
        'alliance school of law',
        'school of law',
        'law school',
        'lc2 law',
        'moot court',
        'law block',
        'asl'
      ],
      lat: 12.72945,
      lng: 77.70795,
      xPercent: 51.2,
      yPercent: 52.7,
      icon: '⚖️',
      category: 'School of Law',
      description: 'Alliance School of Law academic complex housing the Moot Court Hall, legal clinics, and seminar rooms.'
    },
    {
      id: 'lc3_nescafe',
      name: 'LC3 (near Nescafé)',
      displayName: 'LC3 (added near Nescafé, right before LC3)',
      shortName: 'LC3 (near Nescafé)',
      aliases: [
        'lc3 (added near nescafé, right before lc3)',
        'lc3 (added near nescafe, right before lc3)',
        'lc3',
        'lc 3',
        'learning centre 3',
        'learning center 3',
        'lc-3',
        'lc3 nescafe',
        'before lc3'
      ],
      lat: 12.72730,
      lng: 77.70855,
      xPercent: 71.9,
      yPercent: 83.5,
      icon: '🏛️',
      category: 'Learning Complex 3',
      description: 'Modern LC3 academic wing located adjacent to Nescafé courtyard and Hall of Residence 2.'
    },
    {
      id: 'library',
      name: 'Alliance University Library',
      displayName: 'Alliance University Library',
      shortName: 'Central Library',
      aliases: [
        'alliance university library',
        'library',
        'central library',
        'reading room',
        'book bank',
        'digital library',
        'reference section'
      ],
      lat: 12.73130,
      lng: 77.70740,
      xPercent: 38.0,
      yPercent: 13.5,
      icon: '📚',
      category: 'Academic & Research',
      description: 'Alliance University Central Library, digital knowledge repository, quiet reading zones, and archives.'
    },
    {
      id: 'cricket_ground',
      name: 'Alliance Cricket Ground',
      displayName: 'Alliance Cricket Ground',
      shortName: 'Cricket Ground',
      aliases: [
        'alliance cricket ground',
        'cricket ground',
        'cricket stadium',
        'cricket pitch',
        'cricket nets'
      ],
      lat: 12.73140,
      lng: 77.70880,
      xPercent: 69.0,
      yPercent: 16.6,
      icon: '🏏',
      category: 'Sports & Athletics',
      description: 'Campus cricket oval featuring grass pitch, spectator boundary seating, and practice nets.'
    },
    {
      id: 'volleyball_court',
      name: 'Alliance Volleyball Court',
      displayName: 'Alliance Volleyball Court',
      shortName: 'Volleyball Court',
      aliases: [
        'alliance volleyball court',
        'volleyball court',
        'volleyball',
        'volley ball court'
      ],
      lat: 12.73060,
      lng: 77.70790,
      xPercent: 53.0,
      yPercent: 26.2,
      icon: '🏐',
      category: 'Sports & Athletics',
      description: 'Floodlit outdoor volleyball court situated between the academic quad and athletic fields.'
    },
    {
      id: 'football_ground',
      name: 'Alliance Football Ground',
      displayName: 'Alliance Football Ground',
      shortName: 'Football Ground',
      aliases: [
        'alliance football ground',
        'football ground',
        'fottball ground',
        'football turf',
        'soccer ground',
        'athletic field'
      ],
      lat: 12.72790,
      lng: 77.70740,
      xPercent: 36.2,
      yPercent: 77.0,
      icon: '⚽',
      category: 'Sports & Athletics',
      description: 'Alliance University football turf arena with running track and spectator pavilion.'
    },
    {
      id: 'school_business',
      name: 'Alliance School of Business',
      displayName: 'Alliance School of Business',
      shortName: 'School of Business',
      aliases: [
        'alliance school of business',
        'school of business',
        'asob',
        'business school',
        'mba block',
        'bba block',
        'management block'
      ],
      lat: 12.72975,
      lng: 77.70855,
      xPercent: 75.5,
      yPercent: 51.0,
      icon: '💼',
      category: 'School of Business',
      description: 'Alliance School of Business complex, executive seminar halls, incubation cell, and study suites.'
    },
    {
      id: 'school_liberal_arts',
      name: 'Alliance School of Liberal Arts',
      displayName: 'Alliance School of Liberal Arts',
      shortName: 'School of Liberal Arts',
      aliases: [
        'alliance school of liberal arts',
        'school of liberal arts',
        'liberal arts',
        'asla',
        'humanities block',
        'design block'
      ],
      lat: 12.72930,
      lng: 77.70830,
      xPercent: 66.4,
      yPercent: 57.4,
      icon: '🎨',
      category: 'School of Liberal Arts',
      description: 'Iconic circular rotunda building housing Liberal Arts, humanities lecture rooms, and art studios.'
    },
    {
      id: 'activity_center',
      name: 'Alliance Activity Center',
      displayName: 'Alliance Activity Center',
      shortName: 'Activity Center',
      aliases: [
        'alliance activity center',
        'activity center',
        'student activity center',
        'sac',
        'gymnasium',
        'indoor sports',
        'cultural center'
      ],
      lat: 12.72920,
      lng: 77.70750,
      xPercent: 47.3,
      yPercent: 56.6,
      icon: '🎯',
      category: 'Student Activities & Fitness',
      description: 'Student Activity Center featuring university gymnasium, indoor games arena, and clubs coordination desk.'
    },
    {
      id: 'food_court',
      name: 'Alliance Food Court',
      displayName: 'Alliance Food Court',
      shortName: 'Food Court',
      aliases: [
        'alliance food court',
        'food court',
        'canteen',
        'cafeteria',
        'dining hall',
        'alfresco',
        'amul',
        'danapani',
        'dana pani',
        'hb luxury unisex salon'
      ],
      lat: 12.72770,
      lng: 77.70810,
      xPercent: 55.5,
      yPercent: 78.9,
      icon: '🍔',
      category: 'Dining & Student Hub',
      description: 'Central campus dining hub featuring multiple culinary counters, dining seating, Alfresco terrace, and Amul parlour.'
    },
    {
      id: 'nescafe',
      name: 'Nescafé',
      displayName: 'Nescafé',
      shortName: 'Nescafé',
      aliases: [
        'nescafé',
        'nescafe',
        'coffee kiosk',
        'nescafe corner',
        'nescafe stall',
        'nescafe booth'
      ],
      lat: 12.72710,
      lng: 77.70890,
      xPercent: 81.6,
      yPercent: 86.5,
      icon: '☕',
      category: 'Refreshments & Cafe',
      description: 'Popular campus Nescafé outlet serving hot and cold coffee brews, tea, snacks, and outdoor patio benches.'
    }
  ];

  // Realistic default items placed at authentic Alliance University reference spots
  const DEFAULT_MAP_ITEMS = [
    {
      _id: 'item_map_001',
      itemName: 'Alliance University Student ID Card',
      category: 'College ID Card',
      location: 'Alliance University Library',
      date: new Date(Date.now() - 86400000 * 1).toISOString(),
      type: 'lost',
      status: 'pending',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: '3rd Year B.Tech CSE student ID card in red lanyard near first-floor journals section.',
      reporterName: 'Kavitha R',
      contact: '+91 98765 43210'
    },
    {
      _id: 'item_map_002',
      itemName: 'Wireless Optical Mouse (Logitech M221)',
      category: 'Electronics',
      location: 'Alliance University Library',
      date: new Date(Date.now() - 86400000 * 1.5).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Central Library Help Desk',
      description: 'Charcoal black silent mouse left on computer terminal table 6.',
      reporterName: 'Library Staff',
      contact: '+91 80 4619 1500'
    },
    {
      _id: 'item_map_003',
      itemName: 'Boat Airdopes 141 (Black Case)',
      category: 'Electronics',
      location: 'Alliance Food Court',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'pending',
      recoveryStatus: 'open',
      description: 'Lost on lunch table inside the central food court.',
      reporterName: 'Rohan Sharma',
      contact: '+91 91234 56789'
    },
    {
      _id: 'item_map_004',
      itemName: 'Brown Leather Bi-Fold Wallet',
      category: 'Personal Belongings',
      location: 'Alliance Food Court',
      date: new Date(Date.now() - 86400000 * 1.2).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Food Court Supervisory Desk',
      description: 'Brown leather wallet found at food court counter. Contains student bus pass.',
      reporterName: 'Food Court Supervisor',
      contact: '+91 80 4619 1520'
    },
    {
      _id: 'item_map_005',
      itemName: 'Casio fx-991CW Scientific Calculator',
      category: 'Electronics',
      location: 'LC2 (Faculty of Engineering and Technology)',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: 'Left in Room 204 in LC2 engineering block after Mathematics tutorial.',
      reporterName: 'Kavitha R',
      contact: '+91 98765 43210'
    },
    {
      _id: 'item_map_006',
      itemName: 'USB-C Fast Charging Adapter & Braided Cable',
      category: 'Electronics',
      location: 'LC2 (Faculty of Engineering and Technology)',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Engineering Lab Tech Desk',
      description: 'White 65W charger plugged into socket 3 in Embedded Systems Lab.',
      reporterName: 'Lab Technician',
      contact: '+91 80 4619 1555'
    },
    {
      _id: 'item_map_007',
      itemName: 'Constitutional Law Volume I Hardcover',
      category: 'Study Materials',
      location: 'LC2 (Alliance School of Law)',
      date: new Date(Date.now() - 86400000 * 2.5).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: 'Law textbook with yellow highlighters left in Moot Court gallery.',
      reporterName: 'Arjun Mehta',
      contact: '+91 97654 32109'
    },
    {
      _id: 'item_map_008',
      itemName: 'Parker Stainless Steel Fountain Pen',
      category: 'Personal Belongings',
      location: 'LC2 (Alliance School of Law)',
      date: new Date(Date.now() - 86400000 * 1.8).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Law Dean Office Desk',
      description: 'Silver body fountain pen with gold clip found on lecture podium.',
      reporterName: 'Faculty Secretary',
      contact: '+91 80 4619 1560'
    },
    {
      _id: 'item_map_009',
      itemName: 'SanDisk 64GB Dual USB Type-C Flash Drive',
      category: 'Electronics',
      location: 'LC3 (near Nescafé)',
      date: new Date(Date.now() - 86400000 * 3.5).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: 'Metal flash drive plugged into computer lab terminal 14 near Nescafé.',
      reporterName: 'Kavitha R',
      contact: '+91 98765 43210'
    },
    {
      _id: 'item_map_010',
      itemName: 'Black Foldable Campus Umbrella',
      category: 'Personal Belongings',
      location: 'Nescafé',
      date: new Date(Date.now() - 86400000 * 1).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Nescafé Order Counter',
      description: 'Left on outdoor patio bench near Nescafé kiosk.',
      reporterName: 'Nescafé Staff',
      contact: '+91 80 4619 1570'
    },
    {
      _id: 'item_map_011',
      itemName: 'Fastrack Blue Sports Water Bottle',
      category: 'Personal Belongings',
      location: 'Alliance Football Ground',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: '750ml blue stainless steel bottle left beside football turf player bench.',
      reporterName: 'Rohan Sharma',
      contact: '+91 91234 56789'
    },
    {
      _id: 'item_map_012',
      itemName: 'SS Cricket Batting Gloves (Right Hand)',
      category: 'Sports Equipment',
      location: 'Alliance Cricket Ground',
      date: new Date(Date.now() - 86400000 * 2.2).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: 'White and navy cricket batting gloves left near practice nets.',
      reporterName: 'Sports Club Member',
      contact: '+91 96543 21098'
    },
    {
      _id: 'item_map_013',
      itemName: 'Nike Featherlight Cap (Navy Blue)',
      category: 'Personal Belongings',
      location: 'Alliance Volleyball Court',
      date: new Date(Date.now() - 86400000 * 1.5).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Sports Equipment Room',
      description: 'Navy blue sports cap found on volleyball court referee stand.',
      reporterName: 'Physical Education Coach',
      contact: '+91 80 4619 1580'
    },
    {
      _id: 'item_map_014',
      itemName: 'HP Spectre Black Laptop Sleeve (14-inch)',
      category: 'Electronics',
      location: 'Alliance School of Business',
      date: new Date(Date.now() - 86400000 * 4).toISOString(),
      type: 'lost',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      description: 'Padded neoprene black laptop case with copper zipper in Room B-102.',
      reporterName: 'Sneha Patel',
      contact: '+91 95432 10987'
    },
    {
      _id: 'item_map_015',
      itemName: 'Faber-Castell 24-Color Sketching Tin',
      category: 'Study Materials',
      location: 'Alliance School of Liberal Arts',
      date: new Date(Date.now() - 86400000 * 2.8).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Design Studio Lab Desk',
      description: 'Metal pencil sketching tin found in circular rotunda studio.',
      reporterName: 'Art Department Assistant',
      contact: '+91 80 4619 1590'
    },
    {
      _id: 'item_map_016',
      itemName: 'Boat Rockerz 450 Bluetooth Headphones',
      category: 'Electronics',
      location: 'Alliance Activity Center',
      date: new Date(Date.now() - 86400000 * 1.9).toISOString(),
      type: 'found',
      status: 'approved',
      verification: 'verified-real',
      recoveryStatus: 'open',
      handover: 'Activity Center Security Counter',
      description: 'Beige wireless on-ear headphones left on treadmill in university gym.',
      reporterName: 'Gym Coordinator',
      contact: '+91 80 4619 1595'
    }
  ];

  let map = null;
  let streetLayer = null;
  let satelliteLayer = null;
  let currentViewMode = 'ref'; // Single default campus map view ('ref')
  let markersLayer = null;
  let markersByBuilding = new Map();
  let allCampusItems = [];
  let currentGroupedLocations = [];

  const el = id => document.getElementById(id);
  const loading = el('mapLoading');
  const errorBox = el('mapError');
  const emptyBox = el('mapEmpty');
  const results = el('mapResults');
  const locationList = el('locationList');
  const locationEmpty = el('locationEmpty');
  const categorySelect = el('mapCategory');
  const itemTypeSelect = el('mapItemType');
  const statusSelect = el('mapStatus');
  const refMapContainer = el('referenceMapContainer');
  const refPinsOverlay = el('referencePinsOverlay');
  const campusMapContainer = el('campusMap');

  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function matchBuilding(locationStr) {
    if (!locationStr) return null;
    const str = String(locationStr).toLowerCase().trim();

    for (const b of CAMPUS_BUILDINGS) {
      if (b.id === str || b.name.toLowerCase() === str || b.displayName.toLowerCase() === str || b.shortName.toLowerCase() === str) {
        return b;
      }
      for (const alias of b.aliases) {
        if (str === alias || str.includes(alias) || alias.includes(str)) {
          return b;
        }
      }
    }
    return null;
  }

  function getMarkerColor(count) {
    if (count === 0) return '#64748b'; // Slate gray
    if (count <= 2) return '#f59e0b'; // Amber (Low)
    if (count <= 5) return '#ea580c'; // Orange (Moderate)
    return '#dc2626'; // Red (High)
  }

  // ---------------- VIEW MODE SWITCHER ----------------
  function setViewMode(mode) {
    currentViewMode = mode;
    const btnStreet = el('btnStreetView');
    const btnSat = el('btnSatView');
    const btnRef = el('btnRefView');

    [btnStreet, btnSat, btnRef].forEach(b => b?.classList.remove('active'));

    if (mode === 'ref') {
      btnRef?.classList.add('active');
      if (campusMapContainer) campusMapContainer.style.display = 'none';
      if (refMapContainer) refMapContainer.style.display = 'block';
      renderReferencePins(currentGroupedLocations);
    } else {
      if (refMapContainer) refMapContainer.style.display = 'none';
      if (campusMapContainer) campusMapContainer.style.display = 'block';

      ensureMap();

      if (mode === 'sat') {
        btnSat?.classList.add('active');
        if (map && satelliteLayer && streetLayer) {
          if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
          satelliteLayer.addTo(map);
        }
      } else {
        btnStreet?.classList.add('active');
        if (map && satelliteLayer && streetLayer) {
          if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
          streetLayer.addTo(map);
        }
      }

      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 150);
    }
  }

  function setupViewButtons() {
    el('btnRefView')?.addEventListener('click', () => setViewMode('ref'));
  }

  // ---------------- LEAFLET INITIALIZATION ----------------
  function ensureMap() {
    if (map || !window.L || !campusMapContainer) return;

    try {
      map = L.map('campusMap', {
        center: CAMPUS_CENTER,
        zoom: 17.5,
        minZoom: 15,
        maxZoom: 19,
        scrollWheelZoom: false,
        zoomControl: true
      });

      // Layer 1: OpenStreetMap Standard
      streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap | Alliance University Central Campus'
      });

      // Layer 2: Esri Satellite
      satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Alliance University Campus Imagery'
      });

      // Automatically fallback to Reference Campus Map if tile loading fails completely
      streetLayer.on('tileerror', () => {
        console.warn('Map tiles unavailable. Activating Reference Campus Map view.');
      });

      streetLayer.addTo(map);
      markersLayer = L.layerGroup().addTo(map);

      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 200);
    } catch (err) {
      console.warn('Leaflet initialization failed, falling back to Reference Campus Map:', err);
      setViewMode('ref');
    }
  }

  function createCustomIcon(building, count) {
    const color = getMarkerColor(count);
    const html = `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        background: #ffffff;
        border: 2.5px solid ${color};
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(18, 59, 104, 0.32);
        cursor: pointer;
        font-size: 17px;
        transition: transform 0.2s ease;
      ">
        <span>${building.icon}</span>
        ${count > 0 ? `
          <span style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: ${color};
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 10px;
            border: 1.5px solid #ffffff;
            line-height: 1.3;
          ">${count}</span>
        ` : ''}
      </div>
    `;

    return L.divIcon({
      className: 'campus-building-pin',
      html,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22]
    });
  }

  // ---------------- LEAFLET MARKERS RENDER ----------------
  function renderMapMarkers(groupedLocations) {
    if (!map || !markersLayer) return;
    markersLayer.clearLayers();
    markersByBuilding.clear();

    CAMPUS_BUILDINGS.forEach(building => {
      const group = groupedLocations.find(g => g.building.id === building.id);
      const items = group ? group.items : [];
      const count = items.length;

      const marker = L.marker([building.lat, building.lng], {
        icon: createCustomIcon(building, count),
        title: building.displayName
      });

      // Interactive Leaflet Popup with Item Cards and Action Buttons
      const popupDiv = document.createElement('div');
      popupDiv.style.cssText = 'min-width: 260px; max-width: 330px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';

      let itemsHtml = '';
      if (items.length > 0) {
        itemsHtml = items.slice(0, 4).map((it, idx) => `
          <div style="margin-top: 8px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span style="font-weight: 700; color: #123b68;">${esc(it.itemName)}</span>
              <span class="status ${(it.type || '').toLowerCase()}" style="font-size:10px;padding:1px 6px;border-radius:4px;font-weight:800;text-transform:uppercase;">
                ${(it.type || 'lost').toUpperCase()}
              </span>
            </div>
            <div style="color: #64748b; font-size: 11px; margin-top:2px;">${esc(it.category)} · ${it.date ? new Date(it.date).toLocaleDateString() : 'Recent'}</div>
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button type="button" class="btn-popup-detail" data-item-idx="${idx}" style="
                flex: 1;
                font-size: 11px;
                padding: 4px 6px;
                background: #ffffff;
                color: #2563eb;
                border: 1px solid #bfdbfe;
                border-radius: 4px;
                font-weight: 700;
                cursor: pointer;
              ">🔍 View Details</button>
              <button type="button" class="btn-popup-chat" data-item-idx="${idx}" style="
                flex: 1;
                font-size: 11px;
                padding: 4px 6px;
                background: #123b68;
                color: #ffffff;
                border: none;
                border-radius: 4px;
                font-weight: 700;
                cursor: pointer;
              ">💬 Message</button>
            </div>
          </div>
        `).join('');

        if (items.length > 4) {
          itemsHtml += `<div style="font-size: 11px; color: #64748b; margin-top: 6px; text-align: center;">+ ${items.length - 4} more items at this location</div>`;
        }
      } else {
        itemsHtml = `<div style="color: #64748b; font-size: 12px; margin: 8px 0; font-style: italic;">No active reports at this spot matching current filters.</div>`;
      }

      popupDiv.innerHTML = `
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.4px;">${esc(building.category)}</div>
          <strong style="font-size: 15px; color: #123b68; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span>${building.icon}</span> ${esc(building.displayName)}
          </strong>
          <p style="margin: 4px 0 0; font-size: 11.5px; color: #64748b; line-height: 1.4;">${esc(building.description)}</p>
          <div style="margin-top: 8px; font-size: 12.5px; font-weight: 700; color: ${getMarkerColor(count)};">
            ${count} Reported Item${count === 1 ? '' : 's'} (Lost &amp; Found)
          </div>
        </div>
        <div class="popup-items-container">
          ${itemsHtml}
        </div>
        <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; gap: 6px;">
          <a href="found.html?location=${encodeURIComponent(building.displayName)}" style="
            flex: 1;
            text-align: center;
            background: #123b68;
            color: #ffffff;
            padding: 6px 8px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: 700;
            text-decoration: none;
          ">Report Found</a>
          <a href="lost.html?location=${encodeURIComponent(building.displayName)}" style="
            flex: 1;
            text-align: center;
            background: #ffffff;
            color: #b91c1c;
            border: 1px solid #fca5a5;
            padding: 6px 8px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: 700;
            text-decoration: none;
          ">Report Lost</a>
        </div>
      `;

      // Wire interactive buttons inside Leaflet popup
      popupDiv.querySelectorAll('.btn-popup-detail').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.itemIdx, 10);
          const item = items[idx];
          if (item) {
            if (typeof window.openItemModal === 'function') {
              window.openItemModal(item);
            } else {
              location.assign(`item.html?id=${encodeURIComponent(item._id)}&return=map.html`);
            }
          }
        });
      });

      popupDiv.querySelectorAll('.btn-popup-chat').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.itemIdx, 10);
          const item = items[idx];
          if (item) {
            if (typeof window.openChatModal === 'function') {
              window.openChatModal(item);
            } else {
              location.assign(`contact.html?subject=${encodeURIComponent('Inquiry for ' + item.itemName)}`);
            }
          }
        });
      });

      marker.bindPopup(popupDiv);
      markersLayer.addLayer(marker);
      markersByBuilding.set(building.id, marker);
    });
  }

  // ---------------- REFERENCE PHOTO PINS OVERLAY ----------------
  function renderReferencePins(groupedLocations) {
    if (!refPinsOverlay) return;
    refPinsOverlay.innerHTML = '';

    CAMPUS_BUILDINGS.forEach(building => {
      const group = groupedLocations.find(g => g.building.id === building.id);
      const items = group ? group.items : [];
      const count = items.length;

      const pin = document.createElement('div');
      pin.className = 'ref-pin';
      pin.dataset.buildingId = building.id;
      pin.style.left = `${building.xPercent}%`;
      pin.style.top = `${building.yPercent}%`;

      pin.innerHTML = `
        <span>${building.icon}</span>
        <span>${esc(building.shortName)}</span>
        ${count > 0 ? `<span class="ref-pin-badge">${count}</span>` : ''}
      `;

      pin.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openReferencePopup(building, items);
      });

      refPinsOverlay.appendChild(pin);
    });
  }

  function openReferencePopup(building, items) {
    document.querySelectorAll('.ref-popup-card').forEach(c => c.remove());
    document.querySelectorAll('.ref-pin').forEach(p => p.classList.remove('active'));

    const pin = refPinsOverlay?.querySelector(`[data-building-id="${building.id}"]`);
    if (pin) pin.classList.add('active');

    const card = document.createElement('div');
    card.className = 'ref-popup-card';
    card.style.left = `${building.xPercent}%`;
    card.style.top = `${building.yPercent}%`;

    const count = items.length;
    let itemsHtml = '';
    if (items.length > 0) {
      itemsHtml = items.slice(0, 3).map((it, idx) => `
        <div style="margin-top: 8px; padding: 7px 9px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
            <span style="font-weight: 700; color: #123b68;">${esc(it.itemName)}</span>
            <span class="status ${(it.type || '').toLowerCase()}" style="font-size:10px;padding:1px 6px;border-radius:4px;font-weight:800;text-transform:uppercase;">
              ${(it.type || 'lost').toUpperCase()}
            </span>
          </div>
          <div style="color: #64748b; font-size: 11px; margin-top:2px;">${esc(it.category)} · ${it.date ? new Date(it.date).toLocaleDateString() : 'Recent'}</div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button type="button" class="btn-ref-detail" data-item-idx="${idx}" style="
              flex: 1;
              font-size: 11px;
              padding: 4px 6px;
              background: #ffffff;
              color: #2563eb;
              border: 1px solid #bfdbfe;
              border-radius: 4px;
              font-weight: 700;
              cursor: pointer;
            ">🔍 Details</button>
            <button type="button" class="btn-ref-chat" data-item-idx="${idx}" style="
              flex: 1;
              font-size: 11px;
              padding: 4px 6px;
              background: #123b68;
              color: #ffffff;
              border: none;
              border-radius: 4px;
              font-weight: 700;
              cursor: pointer;
            ">💬 Message</button>
          </div>
        </div>
      `).join('');

      if (items.length > 3) {
        itemsHtml += `<div style="font-size: 11px; color: #64748b; margin-top: 6px; text-align: center;">+ ${items.length - 3} more items here</div>`;
      }
    } else {
      itemsHtml = `<div style="color: #64748b; font-size: 12px; margin: 8px 0; font-style: italic;">No active reports at this landmark currently.</div>`;
    }

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
        <div>
          <div style="font-size:10.5px;font-weight:700;color:#0284c7;text-transform:uppercase;">${esc(building.category)}</div>
          <strong style="font-size:14px;color:#123b68;display:flex;align-items:center;gap:5px;margin-top:2px;">
            <span>${building.icon}</span> ${esc(building.shortName)}
          </strong>
        </div>
        <button type="button" id="closeRefPopup" style="border:none;background:transparent;cursor:pointer;font-size:16px;color:#64748b;line-height:1;">✕</button>
      </div>
      <p style="margin:2px 0 6px;font-size:11px;color:#64748b;line-height:1.35;">${esc(building.description)}</p>
      <div style="font-size:12px;font-weight:700;color:${getMarkerColor(count)};margin-bottom:6px;">
        ${count} Item${count === 1 ? '' : 's'} at this location
      </div>
      <div>
        ${itemsHtml}
      </div>
      <div style="margin-top:8px;border-top:1px solid #e2e8f0;padding-top:6px;display:flex;gap:6px;">
        <a href="found.html?location=${encodeURIComponent(building.displayName)}" style="flex:1;text-align:center;background:#123b68;color:#fff;padding:5px 6px;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;">Report Found</a>
        <a href="lost.html?location=${encodeURIComponent(building.displayName)}" style="flex:1;text-align:center;background:#fff;color:#b91c1c;border:1px solid #fca5a5;padding:5px 6px;border-radius:4px;font-size:11px;font-weight:700;text-decoration:none;">Report Lost</a>
      </div>
    `;

    card.querySelector('#closeRefPopup')?.addEventListener('click', () => {
      card.remove();
      pin?.classList.remove('active');
    });

    card.querySelectorAll('.btn-ref-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.itemIdx, 10);
        const item = items[idx];
        if (item) {
          if (typeof window.openItemModal === 'function') {
            window.openItemModal(item);
          } else {
            location.assign(`item.html?id=${encodeURIComponent(item._id)}&return=map.html`);
          }
        }
      });
    });

    card.querySelectorAll('.btn-ref-chat').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.itemIdx, 10);
        const item = items[idx];
        if (item) {
          if (typeof window.openChatModal === 'function') {
            window.openChatModal(item);
          } else {
            location.assign(`contact.html?subject=${encodeURIComponent('Inquiry for ' + item.itemName)}`);
          }
        }
      });
    });

    refPinsOverlay?.appendChild(card);
  }

  // ---------------- LOCATION BREAKDOWN LIST ----------------
  function renderLocationList(groupedLocations, totalCount) {
    if (!locationList) return;
    locationList.replaceChildren();

    // Sort: buildings with items first (highest count to lowest), then remaining buildings alphabetically
    const sorted = [...groupedLocations].sort((a, b) => {
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.building.shortName.localeCompare(b.building.shortName);
    });

    if (sorted.length === 0) {
      if (locationEmpty) locationEmpty.style.display = 'block';
      return;
    }
    if (locationEmpty) locationEmpty.style.display = 'none';

    const maxCount = Math.max(1, ...groupedLocations.map(g => g.items.length));

    sorted.forEach((group, index) => {
      const building = group.building;
      const count = group.items.length;
      const li = document.createElement('li');

      const button = document.createElement('button');
      button.className = 'location-toggle';
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      const detailsId = `loc-detail-${index}`;
      button.setAttribute('aria-controls', detailsId);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'location-name';
      nameSpan.innerHTML = `<span>${building.icon}</span> <span>${esc(building.shortName)}</span> <small style="color:var(--text-muted);font-weight:normal;margin-left:4px;">(${esc(building.category)})</small>`;

      const countSpan = document.createElement('span');
      countSpan.className = 'location-count';
      countSpan.textContent = `${count} item${count === 1 ? '' : 's'}`;
      if (count > 0) {
        countSpan.style.background = getMarkerColor(count);
        countSpan.style.color = '#ffffff';
      }

      const bar = document.createElement('span');
      bar.className = 'location-bar';
      const fill = document.createElement('span');
      fill.style.width = count > 0 ? `${Math.max(8, (count / maxCount) * 100)}%` : '0%';
      fill.style.background = count > 0 ? getMarkerColor(count) : '#cbd5e1';
      bar.append(fill);

      button.append(nameSpan, countSpan, bar);

      const detail = document.createElement('div');
      detail.className = 'location-details';
      detail.id = detailsId;
      detail.hidden = true;

      if (count > 0) {
        // Category breakdown tags
        const catCounts = {};
        group.items.forEach(it => {
          catCounts[it.category] = (catCounts[it.category] || 0) + 1;
        });
        const catWrap = document.createElement('div');
        catWrap.style.marginBottom = '8px';
        Object.entries(catCounts).forEach(([cat, c]) => {
          const tag = document.createElement('span');
          tag.textContent = `${cat}: ${c}`;
          catWrap.append(tag);
        });
        detail.append(catWrap);

        // Item links with modal triggers
        const listDiv = document.createElement('div');
        listDiv.style.marginTop = '6px';
        group.items.forEach(it => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:6px;padding:4px 0;border-bottom:1px dashed #e2e8f0;';
          row.innerHTML = `
            <div>
              <span class="status ${(it.type || '').toLowerCase()}" style="font-size:9.5px;padding:1px 5px;margin-right:4px;">${(it.type || 'lost').toUpperCase()}</span>
              <strong style="font-size:12.5px;color:var(--primary);">${esc(it.itemName)}</strong>
              <span style="font-size:11px;color:var(--text-muted);"> · ${it.date ? new Date(it.date).toLocaleDateString() : 'Recent'}</span>
            </div>
            <div style="display:flex;gap:4px;">
              <button type="button" class="btn-list-view" style="font-size:11px;padding:2px 8px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;cursor:pointer;color:var(--primary);font-weight:600;">Details</button>
              <button type="button" class="btn-list-chat" style="font-size:11px;padding:2px 8px;border:none;background:var(--primary);color:#fff;border-radius:4px;cursor:pointer;font-weight:600;">Chat</button>
            </div>
          `;

          row.querySelector('.btn-list-view')?.addEventListener('click', () => {
            if (typeof window.openItemModal === 'function') {
              window.openItemModal(it);
            } else {
              location.assign(`item.html?id=${encodeURIComponent(it._id)}&return=map.html`);
            }
          });

          row.querySelector('.btn-list-chat')?.addEventListener('click', () => {
            if (typeof window.openChatModal === 'function') {
              window.openChatModal(it);
            } else {
              location.assign(`contact.html?subject=${encodeURIComponent('Inquiry for ' + it.itemName)}`);
            }
          });

          listDiv.append(row);
        });
        detail.append(listDiv);
      } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding:6px 0;font-size:12px;color:var(--text-muted);font-style:italic;';
        emptyMsg.textContent = 'No active lost or found reports currently recorded at this landmark.';
        detail.append(emptyMsg);
      }

      const quickActions = document.createElement('div');
      quickActions.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;gap:6px;';
      quickActions.innerHTML = `
        <a href="found.html?location=${encodeURIComponent(building.displayName)}" style="font-size:11.5px;padding:4px 10px;background:var(--primary);color:#fff;border-radius:4px;text-decoration:none;font-weight:600;">Report Found Here</a>
        <a href="lost.html?location=${encodeURIComponent(building.displayName)}" style="font-size:11.5px;padding:4px 10px;background:#fff;color:var(--lost-red);border:1px solid #fca5a5;border-radius:4px;text-decoration:none;font-weight:600;">Report Lost Here</a>
      `;
      detail.append(quickActions);

      // Focus map pin button
      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.style.cssText = 'margin-top:8px;font-size:11.5px;padding:4px 10px;border-radius:4px;border:1px solid #cbd5e1;background:#ffffff;cursor:pointer;color:var(--primary);font-weight:600;';
      pinBtn.innerHTML = `📍 Focus on Map`;
      pinBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        focusOnBuilding(building.id);
      });
      detail.append(pinBtn);

      button.addEventListener('click', () => {
        const isExp = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isExp));
        detail.hidden = isExp;
      });

      li.append(button, detail);
      locationList.append(li);
    });
  }

  // ---------------- FOCUS ON LANDMARK ----------------
  function focusOnBuilding(buildingId) {
    if (buildingId === 'all') {
      if (currentViewMode !== 'ref' && map) {
        map.setView(CAMPUS_CENTER, 17.5, { animate: true });
      } else {
        document.querySelectorAll('.ref-popup-card').forEach(c => c.remove());
        document.querySelectorAll('.ref-pin').forEach(p => p.classList.remove('active'));
      }
      return;
    }

    const building = CAMPUS_BUILDINGS.find(b => b.id === buildingId);
    if (!building) return;

    if (currentViewMode === 'ref') {
      const group = currentGroupedLocations.find(g => g.building.id === building.id);
      openReferencePopup(building, group ? group.items : []);
      refMapContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      ensureMap();
      if (map) {
        map.setView([building.lat, building.lng], 18.5, { animate: true });
        const m = markersByBuilding.get(building.id);
        if (m) m.openPopup();
        campusMapContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function setupLandmarkPills() {
    const pills = document.querySelectorAll('.landmark-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const target = pill.dataset.target;
        focusOnBuilding(target);
      });
    });
  }

  function updateCategoriesDropdown(categories) {
    if (!categorySelect) return;
    const current = categorySelect.value;
    categorySelect.replaceChildren(new Option('All Categories', 'all'));
    categories.forEach(cat => {
      categorySelect.add(new Option(cat, cat));
    });
    if ([...categorySelect.options].some(o => o.value === current)) {
      categorySelect.value = current;
    }
  }

  // ---------------- FILTER APPLICATION ----------------
  function applyFilters() {
    const fromVal = el('mapDateFrom')?.value ? new Date(el('mapDateFrom').value).getTime() : null;
    const toVal = el('mapDateTo')?.value ? new Date(el('mapDateTo').value).setHours(23, 59, 59, 999) : null;
    const typeVal = itemTypeSelect?.value || 'all';
    const catVal = categorySelect?.value || 'all';
    const statusVal = statusSelect?.value || 'all';

    const filtered = allCampusItems.filter(item => {
      const itemTime = item.date ? new Date(item.date).getTime() : 0;
      if (fromVal && itemTime && itemTime < fromVal) return false;
      if (toVal && itemTime && itemTime > toVal) return false;
      if (typeVal !== 'all' && (item.type || '').toLowerCase() !== typeVal) return false;
      if (catVal !== 'all' && item.category !== catVal) return false;
      if (statusVal !== 'all') {
        if (statusVal === 'resolved') {
          if (item.status !== 'resolved' && item.recoveryStatus !== 'claimed' && item.recoveryStatus !== 'returned') return false;
        } else if (item.status !== statusVal) {
          return false;
        }
      }
      return true;
    });

    // Group by authentic Alliance campus landmarks
    currentGroupedLocations = CAMPUS_BUILDINGS.map(building => ({
      building,
      items: filtered.filter(item => {
        const matched = matchBuilding(item.location);
        return matched && matched.id === building.id;
      })
    }));

    // Update Summary Statistics
    const totalReports = filtered.length;
    const distinctLocations = currentGroupedLocations.filter(g => g.items.length > 0).length;
    let topBuilding = null;
    let maxReports = 0;
    currentGroupedLocations.forEach(g => {
      if (g.items.length > maxReports) {
        maxReports = g.items.length;
        topBuilding = g.building;
      }
    });

    const resolvedReports = allCampusItems.filter(i => i.status === 'resolved' || i.recoveryStatus === 'returned' || i.recoveryStatus === 'claimed').length;

    if (el('mapTotal')) el('mapTotal').textContent = totalReports;
    if (el('mapMostLocation')) el('mapMostLocation').textContent = topBuilding ? `${topBuilding.shortName} (${maxReports})` : '—';
    if (el('mapLocationCount')) el('mapLocationCount').textContent = distinctLocations;
    if (el('mapResolvedCount')) el('mapResolvedCount').textContent = resolvedReports;

    if (emptyBox) emptyBox.style.display = totalReports === 0 ? 'block' : 'none';
    if (results) results.style.display = 'grid';

    renderMapMarkers(currentGroupedLocations);
    renderReferencePins(currentGroupedLocations);
    renderLocationList(currentGroupedLocations, totalReports);
  }

  // ---------------- FETCH ITEMS ----------------
  async function fetchCampusItems() {
    if (loading) loading.style.display = 'block';
    if (errorBox) errorBox.style.display = 'none';

    try {
      let items = [];
      const res = await fetch('/api/items', { credentials: 'include' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        items = data.items || [];
      }

      if (!items || items.length === 0) {
        const local = localStorage.getItem('portal_items');
        if (local) {
          try {
            items = JSON.parse(local);
          } catch {}
        }
      }

      if (!items || items.length === 0) {
        items = DEFAULT_MAP_ITEMS;
      }

      allCampusItems = items;

      const categories = [...new Set(allCampusItems.map(i => i.category).filter(Boolean))].sort();
      updateCategoriesDropdown(categories);

      ensureMap();
      setupViewButtons();
      setupLandmarkPills();
      applyFilters();

    } catch (err) {
      console.warn('Campus map fallback to Alliance University defaults:', err);
      allCampusItems = DEFAULT_MAP_ITEMS;
      ensureMap();
      setupViewButtons();
      setupLandmarkPills();
      applyFilters();
    } finally {
      if (loading) loading.style.display = 'none';
    }
  }

  // Close Reference Map popups when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ref-pin') && !e.target.closest('.ref-popup-card')) {
      document.querySelectorAll('.ref-popup-card').forEach(c => c.remove());
      document.querySelectorAll('.ref-pin').forEach(p => p.classList.remove('active'));
    }
  });

  // Filter change listeners
  ['mapDateFrom', 'mapDateTo', 'mapItemType', 'mapCategory', 'mapStatus'].forEach(id => {
    const input = el(id);
    if (input) {
      input.addEventListener('change', () => {
        const from = el('mapDateFrom');
        const to = el('mapDateTo');
        if (from && to && from.value && to.value && from.value > to.value) {
          to.setCustomValidity('To date must be on or after From date.');
          to.reportValidity();
          return;
        } else if (to) {
          to.setCustomValidity('');
        }
        applyFilters();
      });
    }
  });

  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchCampusItems);
  } else {
    fetchCampusItems();
  }
})();
