# BakauBase production architecture

The current app remains a browser-local competition prototype so it is immediately runnable. The `backend/` directory supplies the production PostGIS schema and a FastAPI starting point for the requested architecture.

## Roles

| Role | Read public data | Submit plantings/reports | Analytics/export | Verify/manage |
| --- | --- | --- | --- | --- |
| Public Viewer | Yes | No | No | No |
| Community Volunteer | Yes | Yes | Own field records | No |
| Field Researcher | Yes | Yes | Yes | Research review |
| Administrator | Yes | Yes | Yes | Yes |

The API derives the role from a signed JWT. UI visibility is only a convenience; every write and restricted export must be checked by backend middleware.

## Data flow

1. The PWA creates a client UUID and saves the form plus compressed image in IndexedDB.
2. When connected, it uploads the image with a short-lived S3-compatible presigned URL.
3. It sends metadata to the API using the same client UUID as an idempotency key.
4. PostGIS stores points and polygons in EPSG:4326 and creates spatial indexes.
5. A scheduled Earth Engine worker writes environmental observations and candidate alerts.
6. Researchers verify thresholds; administrators resolve alerts and field reports.

## Prototype boundaries

- Map layer polygons, satellite comparison, rainfall values, and alerts in the current UI are demonstration fixtures.
- Carbon factors remain placeholders until replaced with cited allometric and soil-carbon methods.
- Hectares restored is a labelled demo estimate until plot polygons are captured.
- Email delivery, S3 uploads, shapefile packaging, and Earth Engine jobs are integration work, not simulated backend services.
