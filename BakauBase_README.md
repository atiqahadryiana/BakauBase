# BakauBase

**Plant it. Track it. Prove it.**

BakauBase is a community mangrove monitoring prototype for Malaysia. It combines planting and survival records, environmental signals, estimated blue carbon, threat reports, and public exports.

## Users

- Public Viewer: explores maps, species, and public progress.
- Community Volunteer: records plantings, follow-ups, and threats.
- Field Researcher: reviews analytics and exports data.
- Administrator: verifies records and manages thresholds, users, and reference data.

## Prototype modules

1. Coastal evidence map with plot status, simulated NDVI/NDWI overlays, topography, tidal channels, filters, and opacity control.
2. Environmental intelligence with a six-month trend, early warnings, satellite comparison, and salinity screening.
3. Searchable species field guide containing all 71 records in the official 2018 MyBIS *Mangrove Flora of Malaysia* publication, with true-mangrove and associate filters.
4. Planting, survival-check, same-spot photo, geofenced check-in, and incident-reporting workflows.
5. Public impact dashboard with PDF, CSV, and GeoJSON export.

Remote-sensing layers and alerts are clearly labelled demonstration fixtures. Carbon factors are placeholders and must be replaced with cited research before analysis. The interface does not claim certified credits, live satellite processing, or policy compliance.

## Run

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

See [README.md](README.md) for full local, backend, and deployment setup. Production architecture notes are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), with Earth Engine guidance in [docs/EARTH_ENGINE_SETUP.md](docs/EARTH_ENGINE_SETUP.md).
