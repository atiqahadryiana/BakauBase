# Google Earth Engine integration

The browser prototype uses clearly labelled simulated NDVI, NDWI, rainfall, and comparison layers. Do not present those values as satellite analysis.

## Production setup

1. Create or choose a Google Cloud project and enable the Earth Engine API.
2. Register the project for Earth Engine access at the Earth Engine registration page.
3. Create a service account for the backend. Grant only the Earth Engine permissions required by the processing job.
4. Store the service-account credential in the deployment secret manager. Never put it in the React bundle or commit it to this repository.
5. Set `EARTH_ENGINE_PROJECT` in the backend environment.
6. Add the official Earth Engine Python package to the backend environment and initialize it server-side:

```python
import ee

ee.Initialize(project=os.environ["EARTH_ENGINE_PROJECT"])
```

7. Build a scheduled job that:
   - filters Sentinel-2 SR Harmonized imagery by region, date, and cloud cover;
   - applies a cloud mask;
   - calculates NDVI as `(B8 - B4) / (B8 + B4)`;
   - calculates NDWI using the exact band definition chosen by the research team;
   - stores dated summary metrics in `environmental_observations`;
   - creates alerts only after thresholds and validation windows have been reviewed by a remote-sensing specialist.
8. Use Landsat 8 for the longer comparison series and CHIRPS daily rainfall for regional rainfall context.

## Required scientific decisions

- TODO: document cloud masking and compositing method.
- TODO: choose and cite the NDWI formulation.
- TODO: define plot buffers and minimum valid-pixel coverage.
- TODO: validate alert thresholds against field observations.
- TODO: define coastline extraction and uncertainty reporting.

The frontend should request rendered map tiles and summary time-series from the backend. Earth Engine credentials must remain server-side.
