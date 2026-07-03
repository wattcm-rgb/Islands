/* Hebrides Holiday dashboard: data loading, panel switching, Food & Sights lists.
   Content is organised island → town → category → subcategory throughout. */
(function () {
  "use strict";

  var ISLANDS = [
    { id: "skye", name: "Isle of Skye", sub: "An t-Eilean Sgitheanach — the Misty Isle" },
    { id: "lewis", name: "Isle of Lewis", sub: "Eilean Leòdhais — standing stones and wild north coasts" },
    { id: "harris", name: "Isle of Harris", sub: "Na Hearadh — world-class beaches and the home of tweed" }
  ];

  var App = {
    data: {},
    filters: {
      food: { island: "all", category: "all", q: "" },
      sights: { island: "all", category: "all", q: "" }
    }
  };

  // ---------- Data loading --------------------------------------------------
  function loadJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + path);
      return r.json();
    });
  }

  Promise.all([loadJSON("data/food.json"), loadJSON("data/sights.json"), loadJSON("data/ferries.json")])
    .then(function (res) {
      App.data.food = res[0];
      App.data.sights = res[1];
      App.data.ferries = res[2];
      boot();
    })
    .catch(function (err) {
      document.querySelector(".main").insertAdjacentHTML(
        "afterbegin",
        '<p class="page-note">Could not load the guide data (' + err.message +
          "). If you opened index.html directly from disk, serve it over HTTP instead.</p>"
      );
    });

  function boot() {
    // Rank sights per island by their order in the dataset (top 20 each).
    var counters = {};
    App.data.sights.places.forEach(function (p) {
      counters[p.island] = (counters[p.island] || 0) + 1;
      p.rank = counters[p.island];
    });

    document.getElementById("food-note").textContent = App.data.food.note;
    document.getElementById("sights-note").textContent = App.data.sights.note;

    buildCategoryFilters("food", App.data.food.categories);
    buildCategoryFilters("sights", App.data.sights.categories);
    wireListControls("food");
    wireListControls("sights");
    renderList("food");
    renderList("sights");
    HebFerry.init(App.data.ferries);
    populateMap();
    wireTabs();
  }

  // ---------- Panel switching ------------------------------------------------
  function showPanel(target) {
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("active", p.id === target);
    });
    document.querySelectorAll(".tab-button, .mobile-nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-target") === target);
    });
    if (target === "map-panel") HebMap.invalidate();
    window.scrollTo(0, 0);
  }

  function wireTabs() {
    document.querySelectorAll(".tab-button, .mobile-nav-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        showPanel(b.getAttribute("data-target"));
      });
    });
    // Support deep links like #food-panel
    var initial = location.hash.replace("#", "");
    if (["map-panel", "food-panel", "sights-panel", "ferry-panel"].indexOf(initial) !== -1) {
      showPanel(initial);
    } else {
      HebMap.invalidate();
    }
  }

  // ---------- Filters -----------------------------------------------------------
  function buildCategoryFilters(kind, categories) {
    var host = document.getElementById(kind + "CategoryFilters");
    Object.keys(categories).forEach(function (c) {
      var btn = document.createElement("button");
      btn.className = "filter-button";
      btn.type = "button";
      btn.setAttribute("data-category", c);
      btn.textContent = categories[c].label;
      host.appendChild(btn);
    });
  }

  function wireListControls(kind) {
    var islandHost = document.getElementById(kind + "IslandFilters");
    islandHost.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-button");
      if (!btn) return;
      App.filters[kind].island = btn.getAttribute("data-island");
      islandHost.querySelectorAll(".filter-button").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      renderList(kind);
    });

    var catHost = document.getElementById(kind + "CategoryFilters");
    catHost.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-button");
      if (!btn) return;
      App.filters[kind].category = btn.getAttribute("data-category");
      catHost.querySelectorAll(".filter-button").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      renderList(kind);
    });

    var toggle = document.getElementById(kind + "CategoryToggle");
    toggle.addEventListener("click", function () {
      var open = catHost.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    var search = document.getElementById(kind + "Search");
    search.addEventListener("input", function () {
      App.filters[kind].q = search.value.trim().toLowerCase();
      renderList(kind);
    });
  }

  function passes(kind, place) {
    var f = App.filters[kind];
    if (f.island !== "all" && place.island !== f.island) return false;
    if (f.category !== "all") {
      var cats = kind === "food" ? place.categories : [place.category];
      if (cats.indexOf(f.category) === -1) return false;
    }
    if (f.q) {
      var hay = [place.name, place.town, place.subcategory, place.description]
        .concat(kind === "food" ? place.categories : [place.category])
        .join(" ").toLowerCase();
      if (hay.indexOf(f.q) === -1) return false;
    }
    return true;
  }

  // ---------- List rendering --------------------------------------------------------
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function groupByTown(places) {
    var towns = [], byTown = {};
    places.forEach(function (p) {
      if (!byTown[p.town]) { byTown[p.town] = []; towns.push(p.town); }
      byTown[p.town].push(p);
    });
    // Keep subcategories together within a town.
    towns.forEach(function (t) {
      byTown[t].sort(function (a, b) {
        var sa = a.subcategory || "", sb = b.subcategory || "";
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
    });
    return { towns: towns, byTown: byTown };
  }

  var ISLAND_NAMES = { skye: "Isle of Skye", lewis: "Isle of Lewis", harris: "Isle of Harris" };

  // Universal Google Maps link — opens the Maps app on phones, the website on desktop.
  function gmapsUrl(p) {
    var query = p.name + ", " + p.town + ", " + ISLAND_NAMES[p.island] + ", Scotland";
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  }

  function catPills(kind, cats) {
    var defs = App.data[kind].categories;
    return cats.map(function (c) {
      return '<span class="cat-' + c + '">' + (defs[c] ? defs[c].label : c) + "</span>";
    }).join("");
  }

  function foodCard(p) {
    return (
      '<article class="idea-card" id="card-' + p.id + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
      "<div><h3>" + esc(p.name) + "</h3>" +
      '<div class="idea-meta"><span>' + esc(p.subcategory) + "</span>" + catPills("food", p.categories) +
      "<span>" + esc(p.town) + "</span></div></div>" +
      "</div>" +
      '<div class="restaurant-fields">' +
      '<div class="restaurant-field">Feeds 3 for: ' + esc(p.priceFor3) + "</div>" +
      '<div class="restaurant-field">Hours: ' + esc(p.hours) + "</div>" +
      '<div class="restaurant-field">Booking: ' + esc(p.booking) + "</div>" +
      "</div>" +
      '<p class="restaurant-desc">' + esc(p.description) + "</p>" +
      '<div class="idea-actions"><button type="button" data-focus="' + p.id + '">See on Map</button>' +
      '<a href="' + esc(gmapsUrl(p)) + '" target="_blank" rel="noreferrer">Google Maps</a>' +
      (p.website ? '<a href="' + esc(p.website) + '" target="_blank" rel="noreferrer">Website</a>' : "") +
      "</div></article>"
    );
  }

  function sightCard(p) {
    return (
      '<article class="idea-card" id="card-' + p.id + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
      '<div><h3><span class="rank-badge">#' + p.rank + "</span>" + esc(p.name) + "</h3>" +
      '<div class="idea-meta">' + catPills("sights", [p.category]) +
      "<span>" + esc(p.subcategory) + "</span><span>" + esc(p.town) + "</span></div></div>" +
      "</div>" +
      '<div class="restaurant-fields">' +
      '<div class="restaurant-field">Time needed: ' + esc(p.time) + "</div>" +
      '<div class="restaurant-field">Cost: ' + esc(p.cost) + "</div>" +
      "</div>" +
      '<p class="restaurant-desc">' + esc(p.description) + "</p>" +
      '<div class="idea-actions"><button type="button" data-focus="' + p.id + '">See on Map</button>' +
      '<a href="' + esc(gmapsUrl(p)) + '" target="_blank" rel="noreferrer">Google Maps</a></div>' +
      "</article>"
    );
  }

  function renderList(kind) {
    var host = document.getElementById(kind + "List");
    var places = App.data[kind].places;
    var cardFn = kind === "food" ? foodCard : sightCard;
    function countLabel(n) {
      if (kind === "food") return n === 1 ? "place" : "places";
      return n === 1 ? "thing to do" : "things to do";
    }

    var html = ISLANDS.map(function (island) {
      var here = places.filter(function (p) { return p.island === island.id && passes(kind, p); });
      if (!here.length) return "";
      var g = groupByTown(here);
      var townsHtml = g.towns.map(function (t) {
        return (
          '<details class="idea-group" open><summary><span>⚓ ' + esc(t) + "</span><span>" +
          g.byTown[t].length + (g.byTown[t].length === 1 ? " spot" : " spots") + "</span></summary>" +
          '<div class="list-grid">' + g.byTown[t].map(cardFn).join("") + "</div></details>"
        );
      }).join("");
      return (
        '<details class="idea-group" open><summary><span>' + island.name + "</span><span>" +
        here.length + " " + countLabel(here.length) + "</span></summary>" +
        '<p class="island-lede">' + island.sub + "</p>" + townsHtml + "</details>"
      );
    }).join("");

    host.innerHTML = html || '<p class="empty-note">Nothing matches those filters — try turning some off.</p>';
  }

  // "See on Map" buttons (event delegation over both lists)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-focus]");
    if (!btn) return;
    showPanel("map-panel");
    setTimeout(function () { HebMap.focus(btn.getAttribute("data-focus")); }, 80);
  });

  // ---------- Map population -----------------------------------------------------------
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function buildPopup(p, kind, facts) {
    var lines = ['<div class="custom-popup"><h4>' + esc(p.name) + "</h4>"];
    lines.push('<div class="popup-badge">' + catPills(kind, kind === "food" ? p.categories : [p.category]) +
      "<span>" + esc(p.town) + " · " + cap(p.island) + "</span></div>");
    facts.forEach(function (f) {
      lines.push("<div><strong>" + f[0] + ":</strong> " + esc(f[1]) + "</div>");
    });
    lines.push('<div style="margin:10px 0;">' + esc(p.description) + "</div>");
    lines.push('<div><a href="' + esc(gmapsUrl(p)) + '" target="_blank" rel="noreferrer">Google Maps</a></div>');
    if (p.website) lines.push('<div><a href="' + esc(p.website) + '" target="_blank" rel="noreferrer">Website</a></div>');
    lines.push("</div>");
    return lines.join("");
  }

  function populateMap() {
    HebMap.init();

    App.data.food.places.forEach(function (p) {
      HebMap.addMarker({
        id: p.id, kind: "food", island: p.island, lat: p.lat, lng: p.lng, name: p.name,
        glyph: App.data.food.categories[p.categories[0]].icon,
        popup: buildPopup(p, "food", [["Feeds 3 for", p.priceFor3], ["Booking", p.booking]])
      });
    });

    App.data.sights.places.forEach(function (p) {
      var glyph = App.data.sights.categories[p.category].icon;
      if (/castle/i.test(p.subcategory)) glyph = "castle";
      HebMap.addMarker({
        id: p.id, kind: "sight", island: p.island, lat: p.lat, lng: p.lng, name: p.name,
        glyph: glyph,
        popup: buildPopup(p, "sights", [["Rank", "#" + p.rank + " on " + cap(p.island)], ["Time", p.time], ["Cost", p.cost]])
      });
    });

    App.data.ferries.routes.forEach(function (r) {
      HebMap.addRouteLine(r.ports.a, r.ports.b);
      ["a", "b"].forEach(function (k) {
        var port = r.ports[k];
        var h = Math.floor(r.durationMins / 60), m = r.durationMins % 60;
        HebMap.addMarker({
          id: "port-" + r.id + "-" + k, kind: "ferry", island: null,
          lat: port.lat, lng: port.lng, name: port.name, glyph: "ferry",
          popup:
            '<div class="custom-popup"><h4>⛴ ' + esc(port.name) + "</h4>" +
            '<div class="popup-badge"><span>Ferry port</span><span>' + esc(r.vessel) + "</span></div>" +
            "<div><strong>Route:</strong> " + esc(r.name) + "</div>" +
            "<div><strong>Crossing:</strong> about " + (h ? h + "h " : "") + (m ? m + "m" : "") + "</div>" +
            '<div style="margin:10px 0;">' + esc(r.kind) + ".</div>" +
            '<div><a href="#ferry-panel" onclick="document.getElementById(\'ferryTab\').click();return false;">Timetable &amp; fares</a></div></div>'
        });
      });
    });
  }
})();
