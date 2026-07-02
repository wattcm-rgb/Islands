/* Leaflet map with Scottish-themed circular markers (Japan-dashboard style). */
(function () {
  "use strict";

  // White glyphs drawn in a 24x24 box, shown inside a coloured circle marker.
  var GLYPHS = {
    thistle:
      '<path d="M12 13v7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M8 15q4 3 8 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="12" cy="9" rx="4.2" ry="4.8" fill="#fff"/>' +
      '<path d="M7 4l2.4 2.8M12 2v3.4M17 4l-2.4 2.8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    castle:
      '<path d="M5 21V9h2V6h2v3h2V6h2v3h2V6h2v3h2v12h-5v-5a2 2 0 0 0-4 0v5z" fill="#fff"/>',
    stones:
      '<rect x="4" y="7" width="3.6" height="14" rx="1" fill="#fff" transform="rotate(-4 6 14)"/>' +
      '<rect x="10.2" y="4" width="3.8" height="17" rx="1" fill="#fff"/>' +
      '<rect x="16.6" y="7" width="3.6" height="14" rx="1" fill="#fff" transform="rotate(4 18 14)"/>',
    shell:
      '<path d="M12 4C7 4 4 8 4 12l8 8 8-8c0-4-3-8-8-8z" fill="#fff"/>' +
      '<path d="M12 4v16M6.5 6.5L12 20M17.5 6.5L12 20" stroke="ACCENT" stroke-width="1.1" fill="none"/>',
    mountain:
      '<path d="M2 20L9 7l4 7 3-4 6 10z" fill="#fff"/>' +
      '<path d="M9 7l1.6 3L9 12l-1.6-2z" fill="ACCENT" opacity=".55"/>',
    eagle:
      '<path d="M2 9c4 0 6 2 8 4 1 1 2 1.5 2 1.5S13 13 14 12c2-2 4-4 8-4-3 3-4 7-9 8l-1 3-1-3C6 15 5 12 2 9z" fill="#fff"/>',
    blackhouse:
      '<path d="M4 12q8-9 16 0v2H4z" fill="#fff"/>' +
      '<path d="M5 14h14v6H5z" fill="#fff"/>' +
      '<rect x="10.5" y="15.5" width="3" height="4.5" fill="ACCENT"/>',
    still:
      '<path d="M8 20c-2-1-3.4-3.2-3.4-5.6C4.6 11 7 9 9.5 8.6V6h-2V4h6v2h-2v2.6c2.5.4 4.9 2.4 4.9 5.8 0 1-.2 1.8-.6 2.6l3.2 1v2z" fill="#fff"/>',
    penny:
      '<circle cx="12" cy="12" r="9" fill="#fff"/>' +
      '<text x="12" y="16.5" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="13" fill="ACCENT">£</text>',
    tankard:
      '<path d="M6 5h10v15H6z" fill="#fff"/>' +
      '<path d="M16 8h2.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H16v-2h2v-4h-2z" fill="#fff"/>' +
      '<path d="M7.5 5c0-1.4 1-2.2 3.5-2.2S14.5 3.6 14.5 5z" fill="#fff" opacity=".8"/>',
    wheat:
      '<path d="M12 3v18" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M12 6c-3 0-4-2-4-2s1-2 4-2zm0 4c-3 0-4-2-4-2s1-2 4-2zm0 4c-3 0-4-2-4-2s1-2 4-2zm0-8c3 0 4-2 4-2s-1-2-4-2zm0 4c3 0 4-2 4-2s-1-2-4-2zm0 4c3 0 4-2 4-2s-1-2-4-2z" transform="translate(0 6)" fill="#fff"/>' +
      '<path d="M5 19L19 5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
    coo:
      '<path d="M3 8c2-2 4-2 5-1h8c1-1 3-1 5 1-2 .4-3 1-3.4 2H6.4C6 9 5 8.4 3 8z" fill="#fff"/>' +
      '<path d="M7 9h10c1.5 2 1.5 6-1 8.5-1 1-2.5 1.5-4 1.5s-3-.5-4-1.5C6.5 15 5.5 11 7 9z" fill="#fff"/>' +
      '<circle cx="10" cy="13" r="1.1" fill="ACCENT"/><circle cx="14" cy="13" r="1.1" fill="ACCENT"/>' +
      '<path d="M10 17.5c1.3.8 2.7.8 4 0" stroke="ACCENT" stroke-width="1" fill="none" stroke-linecap="round"/>',
    paw:
      '<ellipse cx="7" cy="9" rx="2.1" ry="2.7" fill="#fff"/><ellipse cx="12" cy="7.4" rx="2.1" ry="2.7" fill="#fff"/>' +
      '<ellipse cx="17" cy="9" rx="2.1" ry="2.7" fill="#fff"/>' +
      '<path d="M12 12c3 0 5.5 2 5.5 4.5S15 21 12 21s-5.5-2-5.5-4.5S9 12 12 12z" fill="#fff"/>',
    ferry:
      '<path d="M4 14l1.2-5H9V6h6v3h3.8L20 14l-8 2z" fill="#fff"/>' +
      '<path d="M11 3h2v3h-2z" fill="#fff"/>' +
      '<path d="M3 17c1.5 1.6 3 1.6 4.5 0s3-1.6 4.5 0 3 1.6 4.5 0 3-1.6 4.5 0" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round"/>'
  };

  var KIND_STYLE = {
    food: { klass: "food-marker", accent: "#7a5fbe" },
    sight: { klass: "sight-marker", accent: "#3f7fc1" },
    ferry: { klass: "ferry-marker", accent: "#1d2a55" }
  };

  function createIcon(glyphName, kind) {
    var style = KIND_STYLE[kind];
    var glyph = (GLYPHS[glyphName] || GLYPHS.thistle).split("ACCENT").join(style.accent);
    return L.divIcon({
      className: "custom-marker " + style.klass,
      html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + glyph + "</svg>",
      iconSize: [52, 52],
      iconAnchor: [26, 52],
      popupAnchor: [0, -32]
    });
  }

  var map = null;
  var markers = []; // { marker, kind, island, id }
  var routeLines = [];
  var markersById = {};
  var state = { food: true, sight: true, ferry: true, skye: true, lewis: true, harris: true };
  var HOME_BOUNDS = [[56.9, -7.35], [58.55, -5.0]];
  var fitted = false;

  function initMap() {
    map = L.map("map", { scrollWheelZoom: true });
    map.fitBounds(HOME_BOUNDS);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    wireControls();
    return map;
  }

  function wireControls() {
    var boxes = {
      "layer-food": "food", "layer-sights": "sight", "layer-ferries": "ferry",
      "layer-skye": "skye", "layer-lewis": "lewis", "layer-harris": "harris"
    };
    Object.keys(boxes).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", function () { state[boxes[id]] = el.checked; refresh(); });
    });
    var notice = document.querySelector(".map-notice");
    var toggle = document.getElementById("noticeToggle");
    if (notice && toggle) {
      toggle.addEventListener("click", function () {
        var collapsed = notice.classList.toggle("collapsed");
        toggle.textContent = collapsed ? "Expand" : "Minimise";
        toggle.setAttribute("aria-expanded", String(!collapsed));
        notice.setAttribute("aria-expanded", String(!collapsed));
      });
    }
  }

  function refresh() {
    markers.forEach(function (m) {
      var show = state[m.kind] && (m.island ? state[m.island] : true);
      if (show && !map.hasLayer(m.marker)) m.marker.addTo(map);
      if (!show && map.hasLayer(m.marker)) map.removeLayer(m.marker);
    });
    routeLines.forEach(function (l) {
      if (state.ferry && !map.hasLayer(l)) l.addTo(map);
      if (!state.ferry && map.hasLayer(l)) map.removeLayer(l);
    });
  }

  function bindHoverPopup(marker) {
    marker.on("mouseover", function () { marker.openPopup(); });
  }

  function addMarker(opts) {
    var marker = L.marker([opts.lat, opts.lng], {
      icon: createIcon(opts.glyph, opts.kind),
      title: opts.name
    });
    marker.bindPopup(opts.popup, { maxWidth: 300 });
    bindHoverPopup(marker);
    marker.addTo(map);
    markers.push({ marker: marker, kind: opts.kind, island: opts.island || null, id: opts.id });
    if (opts.id) markersById[opts.id] = marker;
  }

  function addRouteLine(a, b) {
    var line = L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
      color: "#1d2a55",
      weight: 2.5,
      dashArray: "7 7",
      opacity: 0.75
    }).addTo(map);
    routeLines.push(line);
  }

  function focus(id) {
    var m = markersById[id];
    if (!m || !map) return;
    map.invalidateSize();
    map.flyTo(m.getLatLng(), 12, { duration: 1.2 });
    setTimeout(function () { m.openPopup(); }, 1250);
  }

  window.HebMap = {
    init: initMap,
    addMarker: addMarker,
    addRouteLine: addRouteLine,
    focus: focus,
    invalidate: function () {
      if (!map) return;
      map.invalidateSize();
      // The map may boot inside a hidden panel (zero size); refit once visible.
      if (!fitted && map.getSize().x > 0) {
        map.fitBounds(HOME_BOUNDS);
        fitted = true;
      }
    }
  };
})();
