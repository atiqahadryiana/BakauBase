# BakauBase standalone prototype

BakauBase is a mobile-friendly competition prototype for recording mangrove planting, checking survival, reporting threats, exploring environmental signals, estimating carbon, and sharing public progress.

**Plant it. Track it. Prove it.**

This build has no login, API key, remote database, or security layer. Sample data loads automatically; edits and compressed photos remain in the current browser. The PWA shell works offline after its first load.

## Run locally

Install Node.js 18 or newer, then run:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. No Firebase configuration is needed.

## Demo workflows

- Open a plot and add a survival check. GPS must be within 30 m of its pin. The clearly labelled demo control simulates this position for presentations and stores the check-in as simulated.
- If a previous image exists, its adjustable ghost overlay helps frame the next photo from the same spot.
- Use **Report threat** to record cutting, waste, pollution, erosion, or dying trees with a photo and map location.
- Open **Dashboard** to see recent reports, the SDG/policy alignment view, and choose **Print / save PDF** for an impact report.
- Export plot data from the dashboard as CSV or GeoJSON.
- Open **Intelligence** for clearly labelled prototype NDVI/rainfall trends, change comparison, alerts, salinity screening, and a searchable directory containing all 71 records in the official 2018 MyBIS *Mangrove Flora of Malaysia* publication.
- Observation cards retain the submitter, GPS distance, verification state, and verifier where available.

`seed-data.json` contains 3 Malaysian sites, 10 plots, 14 observations, 3 threat reports, 4 carbon-factor fixtures, and dashboard statistics. The app expands the species collection with all 71 flora records from `src/data/malaysiaMangroves.js`. Open Profile > Settings > Reset demo data to discard local changes and restore these fixtures.

Browser storage belongs to one browser profile. Clearing site data also resets the prototype.

## Carbon placeholders

Every sample species has a `_note` beginning with `TODO` and `PLACEHOLDER`. These values are not scientific data.

```text
carbon_stored_tC = surviving_trees × placeholder_factor_for_age
CO2e_tonnes      = carbon_stored_tC × 3.67
```

The UI displays a placeholder ±30% range and states: “Estimates for awareness and planning, not certified carbon credits.” Replace the factors in `seed-data.json` with cited published values before real analysis.

## Production build

```powershell
npm run build
npm run preview
```

The static PWA is generated in `dist/`.

## Production API scaffold

The runnable frontend remains browser-local. A production-oriented FastAPI and PostGIS starting point is included in `backend/`.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
psql -d bakaubase -f schema.sql
uvicorn app.main:app --reload
```

Replace every `TODO` secret and connect a real S3-compatible store before deployment. See `docs/ARCHITECTURE.md` for roles and data flow, and `docs/EARTH_ENGINE_SETUP.md` for the remote-sensing integration checklist.

## Optional Firebase Hosting

Firebase Hosting can serve the static build without Authentication, Firestore, or Storage:

```powershell
npm install -g firebase-tools
firebase login
firebase use bakaubase
npm run build
firebase deploy --only hosting
```

The included Firestore and Storage rule files are unrestricted demo examples and are not used by the standalone app. Do not deploy them for real data.

## Structure

```text
public/icons/             PWA assets
src/demo/                 Browser-local database and photo adapters
src/components/           Header, map, legend, popup, sync badge
src/contexts/             Prototype identity and language state
src/i18n/                 English and Bahasa Malaysia translations
src/pages/                Map, forms, details, dashboard, settings
src/utils/                GPS, image compression, carbon, statistics
seed-data.json            Bundled demonstration fixtures
vite.config.js            Vite, PWA and local-adapter aliases
```
