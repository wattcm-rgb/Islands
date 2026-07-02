# Skye · Lewis · Harris — A Hebridean Travel Guide

A single-page travel guide to the Isle of Skye, Lewis and Harris, in the style of the
[Japan guide](https://wattcm-rgb.github.io/Japan/), with a Scottish blues-and-purples theme.

## What's inside

- **Map** — interactive Leaflet map of all three islands with custom Scottish-themed
  markers (thistles, castles, standing stones, Highland coos, ferries…) and
  toggles per island and per type.
- **Food** — researched restaurants, cafés and pubs organised
  *island → town → category → subcategory*, filterable by **Cheap Eats, Pubs,
  Gluten Free, Kid Friendly, Dog Friendly** (overlaps allowed), with rough prices
  for a party of 3.
- **Sights** — the top 20 things to do on each island (60 total), grouped the same way.
- **Ferry** — pick a date to see indicative CalMac sailings for
  Uig ↔ Tarbert, Ullapool ↔ Stornoway and Mallaig ↔ Armadale: departure/arrival
  times, ship, journey time, and approximate cost for 2 adults + 1 child + a dog
  + a car (dogs travel free).

No build step — plain HTML/CSS/JS with Leaflet vendored in `assets/vendor/leaflet/`.

## Running locally

Serve the folder over HTTP (the data loads with `fetch`, so `file://` won't work):

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying to GitHub Pages

The included workflow (`.github/workflows/deploy-pages.yml`) deploys the site on
every push to `main`. One-time setup: **Settings → Pages → Source: GitHub Actions**.
All asset paths are relative, so it works at `https://<user>.github.io/<repo>/`.

## Data notes

Timetables and fares were compiled from CalMac's published summer 2026 / winter
2026–27 timetables and fare sheets; some values (notably car fares) are
approximations and everything is clearly disclaimed in the UI. Restaurant and
sight details come from venue websites and recent visitor reviews — island
opening hours are famously seasonal, so check before travelling.
