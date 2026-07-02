/* App shell: data loading, hash routing, Food & Sights rendering.
   Content is organised island → town → category → subcategory throughout. */
(function () {
  "use strict";

  var ISLANDS = [
    { id: "skye", name: "Isle of Skye", sub: "An t-Eilean Sgitheanach — the Misty Isle" },
    { id: "lewis", name: "Isle of Lewis", sub: "Eilean Leòdhais — standing stones and wild north coasts" },
    { id: "harris", name: "Isle of Harris", sub: "Na Hearadh — world-class beaches and the home of tweed" }
  ];

  var App = { data: {}, filters: { food: { island: "all", cats: [] }, sights: { island: "all", cats: [] } } };

  // ---------- Data loading ----------------------------------------------
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
      document.querySelector("main").insertAdjacentHTML(
        "afterbegin",
        '<p style="max-width:70ch;margin:40px auto;padding:0 20px">Could not load the guide data (' +
          err.message + "). If you opened index.html directly from disk, serve it over HTTP instead.</p>"
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

    buildFilters("food", App.data.food.categories);
    buildFilters("sights", App.data.sights.categories);
    renderFood();
    renderSights();
    HebFerry.init(App.data.ferries);
    populateMap();

    window.addEventListener("hashchange", route);
    route();
  }

  // ---------- Router ------------------------------------------------------
  function route() {
    var view = (location.hash.replace("#/", "") || "map").split("?")[0];
    if (["map", "food", "sights", "ferry"].indexOf(view) === -1) view = "map";
    document.querySelectorAll(".view").forEach(function (el) {
      el.hidden = el.id !== "view-" + view;
    });
    document.querySelectorAll("#tabs a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-view") === view);
    });
    if (view === "map") HebMap.invalidate();
    window.scrollTo(0, 0);
  }

  // ---------- Filters ------------------------------------------------------
  function buildFilters(kind, categories) {
    var host = document.getElementById(kind + "-filters");
    var islandRow = '<div class="filter-row"><span class="filter-label">Island</span>' +
      '<button class="chip island on" data-island="all">All islands</button>' +
      ISLANDS.map(function (i) {
        return '<button class="chip island" data-island="' + i.id + '">' + i.name.replace("Isle of ", "") + "</button>";
      }).join("") + "</div>";
    var catRow = '<div class="filter-row"><span class="filter-label">Category</span>' +
      Object.keys(categories).map(function (c) {
        return '<button class="chip" data-cat="' + c + '">' + categories[c].label + "</button>";
      }).join("") + "</div>";
    host.innerHTML = islandRow + catRow;

    host.addEventListener("click", function (e) {
      var btn = e.target.closest("button.chip");
      if (!btn) return;
      var f = App.filters[kind];
      if (btn.hasAttribute("data-island")) {
        f.island = btn.getAttribute("data-island");
        host.querySelectorAll("[data-island]").forEach(function (b) {
          b.classList.toggle("on", b === btn);
        });
      } else {
        var cat = btn.getAttribute("data-cat");
        var i = f.cats.indexOf(cat);
        if (i === -1) f.cats.push(cat); else f.cats.splice(i, 1);
        btn.classList.toggle("on", i === -1);
      }
      kind === "food" ? renderFood() : renderSights();
    });
  }

  function passes(kind, place) {
    var f = App.filters[kind];
    if (f.island !== "all" && place.island !== f.island) return false;
    if (f.cats.length) {
      var cats = kind === "food" ? place.categories : [place.category];
      var hit = f.cats.some(function (c) { return cats.indexOf(c) !== -1; });
      if (!hit) return false;
    }
    return true;
  }

  // ---------- Shared rendering helpers ------------------------------------
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function groupByTown(places) {
    var towns = [], byTown = {};
    places.forEach(function (p) {
      if (!byTown[p.town]) { byTown[p.town] = []; towns.push(p.town); }
      byTown[p.town].push(p);
    });
    // Within a town, keep subcategories together.
    towns.forEach(function (t) {
      byTown[t].sort(function (a, b) {
        var sa = a.subcategory || "", sb = b.subcategory || "";
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
    });
    return { towns: towns, byTown: byTown };
  }

  function islandBlocks(kind, places, cardFn) {
    return ISLANDS.map(function (island) {
      var here = places.filter(function (p) { return p.island === island.id && passes(kind, p); });
      if (!here.length) return "";
      var g = groupByTown(here);
      var townsHtml = g.towns.map(function (t) {
        return '<div class="town-block"><h4>' + esc(t) + '</h4><div class="cards">' +
          g.byTown[t].map(cardFn).join("") + "</div></div>";
      }).join("");
      return '<section class="island-block"><h3>' + island.name + '</h3>' +
        '<p class="island-sub">' + island.sub + "</p>" + townsHtml + "</section>";
    }).join("") || '<p class="lede">Nothing matches those filters — try turning some off.</p>';
  }

  function catTags(kind, cats) {
    var defs = App.data[kind].categories;
    return '<div class="chips">' + cats.map(function (c) {
      return '<span class="tag cat-' + c + '">' + (defs[c] ? defs[c].label : c) + "</span>";
    }).join("") + "</div>";
  }

  function mapButton(id) {
    return '<button class="btn-map" data-focus="' + id + '">Show on map ➤</button>';
  }

  // ---------- Food ----------------------------------------------------------
  function foodCard(p) {
    return (
      '<article class="card food" id="card-' + p.id + '">' +
      '<div class="card-top"><h5>' + esc(p.name) + '</h5><span class="subcat">' + esc(p.subcategory) + "</span></div>" +
      catTags("food", p.categories) +
      '<p class="desc">' + esc(p.description) + "</p>" +
      '<ul class="facts">' +
      "<li><b>Feeds 3 for:</b> " + esc(p.priceFor3) + "</li>" +
      "<li><b>Hours:</b> " + esc(p.hours) + "</li>" +
      "<li><b>Booking:</b> " + esc(p.booking) + "</li>" +
      "</ul>" +
      '<div class="card-actions">' +
      (p.website ? '<a href="' + esc(p.website) + '" target="_blank" rel="noopener">Website ↗</a>' : "") +
      mapButton(p.id) +
      "</div></article>"
    );
  }

  function renderFood() {
    document.getElementById("food-list").innerHTML = islandBlocks("food", App.data.food.places, foodCard);
  }

  // ---------- Sights ----------------------------------------------------------
  function sightCard(p) {
    return (
      '<article class="card sight" id="card-' + p.id + '">' +
      '<div class="card-top"><h5><span class="rank">#' + p.rank + "</span>" + esc(p.name) + "</h5>" +
      '<span class="subcat">' + esc(p.subcategory) + "</span></div>" +
      catTags("sights", [p.category]) +
      '<p class="desc">' + esc(p.description) + "</p>" +
      '<ul class="facts">' +
      "<li><b>Time needed:</b> " + esc(p.time) + "</li>" +
      "<li><b>Cost:</b> " + esc(p.cost) + "</li>" +
      "</ul>" +
      '<div class="card-actions">' + mapButton(p.id) + "</div></article>"
    );
  }

  function renderSights() {
    document.getElementById("sights-list").innerHTML = islandBlocks("sights", App.data.sights.places, sightCard);
  }

  // "Show on map" buttons (event delegation over both lists)
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-focus]");
    if (!btn) return;
    location.hash = "#/map";
    setTimeout(function () { HebMap.focus(btn.getAttribute("data-focus")); }, 60);
  });

  // ---------- Map population ---------------------------------------------------
  function popupHtml(p, kind, extra) {
    return (
      '<div class="popup"><h4>' + esc(p.name) + '</h4>' +
      '<p class="where">' + esc(p.town) + " · " + p.island.charAt(0).toUpperCase() + p.island.slice(1) + "</p>" +
      catTags(kind, kind === "food" ? p.categories : [p.category]) +
      "<p>" + esc(extra) + "</p>" +
      '<a class="details" href="#/' + (kind === "food" ? "food" : "sights") + '" onclick="setTimeout(function(){var c=document.getElementById(\'card-' + p.id + '\');if(c){c.scrollIntoView({block:\'center\'});c.classList.add(\'flash\');setTimeout(function(){c.classList.remove(\'flash\')},1800);}},80)">Details ➤</a></div>'
    );
  }

  function populateMap() {
    HebMap.init();

    App.data.food.places.forEach(function (p) {
      var glyph = App.data.food.categories[p.categories[0]].icon;
      HebMap.addMarker({
        id: p.id, kind: "food", island: p.island, lat: p.lat, lng: p.lng, name: p.name,
        glyph: glyph,
        popup: popupHtml(p, "food", "Feeds 3 for " + p.priceFor3)
      });
    });

    App.data.sights.places.forEach(function (p) {
      var glyph = App.data.sights.categories[p.category].icon;
      // Castles get their own turret icon.
      if (/castle/i.test(p.subcategory)) glyph = "castle";
      HebMap.addMarker({
        id: p.id, kind: "sight", island: p.island, lat: p.lat, lng: p.lng, name: p.name,
        glyph: glyph,
        popup: popupHtml(p, "sights", "#" + p.rank + " on " + cap(p.island) + " · " + p.cost)
      });
    });

    App.data.ferries.routes.forEach(function (r) {
      HebMap.addRouteLine(r.ports.a, r.ports.b);
      ["a", "b"].forEach(function (k) {
        var port = r.ports[k];
        HebMap.addMarker({
          id: "port-" + r.id + "-" + k, kind: "ferry", island: null,
          lat: port.lat, lng: port.lng, name: port.name, glyph: "ferry",
          popup:
            '<div class="popup"><h4>⛴ ' + esc(port.name) + '</h4>' +
            '<p class="where">' + esc(r.name) + "</p>" +
            "<p>" + esc(r.vessel) + " · about " + Math.floor(r.durationMins / 60) + "h " +
            (r.durationMins % 60) + 'm crossing</p><a class="details" href="#/ferry">Timetable ➤</a></div>'
        });
      });
    });
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
})();
