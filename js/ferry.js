/* Ferry timetable resolution + fare estimates for 2 adults, 1 child, 1 dog, 1 car. */
(function () {
  "use strict";

  var DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  var data = null;

  function gbp(n) {
    return "£" + n.toFixed(2);
  }

  function parseDate(str) {
    var p = str.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function seasonFor(route, date) {
    for (var i = 0; i < route.seasons.length; i++) {
      var s = route.seasons[i];
      if (date >= parseDate(s.from) && date <= parseDate(s.to)) return s;
    }
    return null;
  }

  function sailingsFor(route, date) {
    var season = seasonFor(route, date);
    if (!season) return { season: null, sailings: null };
    var list = season.sailings[DAY_KEYS[date.getDay()]] || [];
    return { season: season, sailings: list };
  }

  function fareRows(route) {
    var f = route.fares;
    var p = data.party;
    var approx = f.carApprox ? "~" : "";
    var total = p.adults * f.adult + p.children * f.child + p.cars * f.car + p.dogs * f.dog;
    return (
      "<table>" +
      "<tr><td>" + p.adults + " × adult</td><td>" + gbp(p.adults * f.adult) + "</td></tr>" +
      "<tr><td>" + p.children + " × child (5–15)</td><td>" + gbp(p.children * f.child) + "</td></tr>" +
      "<tr><td>" + p.cars + " × car (under 5m)</td><td>" + approx + gbp(f.car) + "</td></tr>" +
      "<tr><td>" + p.dogs + " × dog</td><td>Free 🐾</td></tr>" +
      '<tr class="total"><td>Total, one way</td><td>~' + gbp(total) + "</td></tr>" +
      "</table>"
    );
  }

  function durationLabel(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    if (!h) return m + "m";
    return h + "h" + (m ? " " + m + "m" : "");
  }

  function sailingRow(route, s) {
    var from = route.ports[s.from];
    var to = route.ports[s.from === "a" ? "b" : "a"];
    return (
      "<tr>" +
      "<td>" + from.name + '</td><td class="time">' + s.dep + "</td>" +
      "<td>" + to.name + '</td><td class="time">' + s.arr + "</td>" +
      '<td class="ship">' + route.vessel + "</td>" +
      '<td class="ship">' + durationLabel(route.durationMins) + "</td>" +
      "</tr>"
    );
  }

  function routeCard(route, date) {
    var res = sailingsFor(route, date);
    var body;
    if (!res.season) {
      body = '<p class="no-sailings">No timetable loaded for this date — the guide covers 27 Mar 2026 to 25 Mar 2027.</p>';
    } else if (!res.sailings.length) {
      body = '<p class="no-sailings">No sailings on this day (' + res.season.name + "). Try another date.</p>";
    } else {
      body =
        '<table class="sail-table"><thead><tr>' +
        "<th>Depart</th><th></th><th>Arrive</th><th></th><th>Ship</th><th>Journey</th>" +
        "</tr></thead><tbody>" +
        res.sailings.map(function (s) { return sailingRow(route, s); }).join("") +
        "</tbody></table>";
    }
    return (
      '<article class="route-card">' +
      '<div class="route-head"><h3>⛴ ' + route.name + '</h3><span class="kind">' + route.kind +
      " · " + route.operator + "</span></div>" +
      '<div class="route-body"><div>' + body + "</div>" +
      '<div class="fare-box"><h4>Cost for your crew, each way</h4>' + fareRows(route) + "</div></div>" +
      (route.notes ? '<p class="route-note">☞ ' + route.notes + "</p>" : "") +
      "</article>"
    );
  }

  function render(dateStr) {
    var date = parseDate(dateStr);
    var routesEl = document.getElementById("ferry-routes");
    routesEl.innerHTML = data.routes.map(function (r) { return routeCard(r, date); }).join("");

    var season = seasonFor(data.routes[0], date);
    var seasonEl = document.getElementById("ferry-season");
    var dayName = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    seasonEl.textContent = dayName + (season ? " — " + season.name : "");
  }

  function init(ferryData) {
    data = ferryData;

    document.getElementById("ferry-land-notes").innerHTML = data.landNotes
      .map(function (n) { return '<p class="land-note">🛈 ' + n + "</p>"; })
      .join("");
    document.getElementById("ferry-disclaimer").textContent = data.disclaimer;

    var input = document.getElementById("ferry-date");
    var today = new Date();
    var iso = today.getFullYear() + "-" +
      String(today.getMonth() + 1).padStart(2, "0") + "-" +
      String(today.getDate()).padStart(2, "0");
    input.value = iso;
    input.min = "2026-03-27";
    input.max = "2027-03-25";
    input.addEventListener("change", function () { if (input.value) render(input.value); });
    render(iso);
  }

  window.HebFerry = { init: init };
})();
