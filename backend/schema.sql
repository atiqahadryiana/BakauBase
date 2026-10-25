CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('public_viewer', 'volunteer', 'researcher', 'administrator');
CREATE TYPE record_status AS ENUM ('pending', 'verified', 'resolved');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'public_viewer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  boundary geometry(MultiPolygon, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name text UNIQUE NOT NULL,
  common_name text NOT NULL,
  description text,
  leaf_details text,
  flower_details text,
  fruit_details text,
  salinity_min_ppt numeric,
  salinity_max_ppt numeric,
  carbon_assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plantings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id),
  species_id uuid REFERENCES species(id),
  created_by uuid REFERENCES users(id),
  planted_at date NOT NULL,
  seedlings_planted integer NOT NULL CHECK (seedlings_planted > 0),
  area_hectares numeric CHECK (area_hectares >= 0),
  location geometry(Point, 4326) NOT NULL,
  boundary geometry(Polygon, 4326),
  photo_url text,
  status record_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plantings_location_gix ON plantings USING gist(location);
CREATE INDEX plantings_boundary_gix ON plantings USING gist(boundary);

CREATE TABLE follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_id uuid NOT NULL REFERENCES plantings(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES users(id),
  observed_at timestamptz NOT NULL,
  alive_count integer NOT NULL CHECK (alive_count >= 0),
  dead_count integer NOT NULL CHECK (dead_count >= 0),
  location geometry(Point, 4326) NOT NULL,
  photo_url text,
  notes text,
  status record_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id),
  submitted_by uuid REFERENCES users(id),
  category text NOT NULL CHECK (category IN ('illegal_logging','erosion','pollution','new_planting','storm_damage')),
  severity alert_severity NOT NULL DEFAULT 'medium',
  status record_status NOT NULL DEFAULT 'pending',
  location geometry(Point, 4326) NOT NULL,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX reports_location_gix ON reports USING gist(location);

CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id),
  planting_id uuid REFERENCES plantings(id),
  alert_type text NOT NULL CHECK (alert_type IN ('coastline_loss','ndvi_drop','land_conversion','storm_impact')),
  severity alert_severity NOT NULL,
  source text NOT NULL,
  observed_at timestamptz NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_by uuid REFERENCES users(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE environmental_observations (
  id bigserial PRIMARY KEY,
  region_id uuid NOT NULL REFERENCES regions(id),
  observed_at date NOT NULL,
  ndvi numeric,
  ndwi numeric,
  rainfall_mm numeric,
  source text NOT NULL,
  raster_asset_uri text,
  UNIQUE(region_id, observed_at, source)
);
