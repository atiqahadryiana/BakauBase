import os
from typing import Annotated, Literal

import asyncpg
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="BakauBase API", version="0.1.0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://bakaubase:change-me@localhost:5432/bakaubase")
JWT_SECRET = os.getenv("JWT_SECRET", "")


class Principal(BaseModel):
    subject: str
    role: Literal["public_viewer", "volunteer", "researcher", "administrator"]


async def principal(authorization: Annotated[str | None, Header()] = None) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        return Principal(subject="anonymous", role="public_viewer")
    if not JWT_SECRET:
        raise HTTPException(503, "JWT_SECRET is not configured")
    try:
        payload = jwt.decode(authorization.removeprefix("Bearer "), JWT_SECRET, algorithms=["HS256"])
        return Principal(subject=payload["sub"], role=payload["role"])
    except (jwt.PyJWTError, KeyError, ValueError) as error:
        raise HTTPException(401, "Invalid access token") from error


def require(*roles: str):
    async def dependency(user: Annotated[Principal, Depends(principal)]) -> Principal:
        if user.role not in roles:
            raise HTTPException(403, "Role does not permit this action")
        return user
    return dependency


class PlantingInput(BaseModel):
    region_id: str | None = None
    species_id: str
    planted_at: str
    seedlings_planted: int = Field(gt=0)
    area_hectares: float | None = Field(default=None, ge=0)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    photo_url: str | None = None


class ReportInput(BaseModel):
    region_id: str | None = None
    category: Literal["illegal_logging", "erosion", "pollution", "new_planting", "storm_damage"]
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    photo_url: str | None = None
    notes: str | None = None


async def connection():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/v1/plots")
async def list_plots(conn: Annotated[asyncpg.Connection, Depends(connection)]):
    rows = await conn.fetch("""
      SELECT id, region_id, species_id, planted_at, seedlings_planted, area_hectares,
             ST_Y(location) AS latitude, ST_X(location) AS longitude, status
      FROM plantings ORDER BY created_at DESC LIMIT 500
    """)
    return [dict(row) for row in rows]


@app.post("/v1/plots", status_code=201)
async def create_plot(data: PlantingInput, user: Annotated[Principal, Depends(require("volunteer", "researcher", "administrator"))], conn: Annotated[asyncpg.Connection, Depends(connection)]):
    row = await conn.fetchrow("""
      INSERT INTO plantings(region_id, species_id, created_by, planted_at, seedlings_planted, area_hectares, location, photo_url)
      VALUES($1::uuid, $2::uuid, $3::uuid, $4::date, $5, $6, ST_SetSRID(ST_MakePoint($7,$8),4326), $9)
      RETURNING id
    """, data.region_id, data.species_id, user.subject, data.planted_at, data.seedlings_planted, data.area_hectares, data.longitude, data.latitude, data.photo_url)
    return {"id": str(row["id"]), "status": "pending"}


@app.post("/v1/reports", status_code=201)
async def create_report(data: ReportInput, user: Annotated[Principal, Depends(require("volunteer", "researcher", "administrator"))], conn: Annotated[asyncpg.Connection, Depends(connection)]):
    row = await conn.fetchrow("""
      INSERT INTO reports(region_id, submitted_by, category, severity, location, photo_url, notes)
      VALUES($1::uuid, $2::uuid, $3, $4::alert_severity, ST_SetSRID(ST_MakePoint($5,$6),4326), $7, $8)
      RETURNING id
    """, data.region_id, user.subject, data.category, data.severity, data.longitude, data.latitude, data.photo_url, data.notes)
    return {"id": str(row["id"]), "status": "pending"}


@app.get("/v1/exports/plots.geojson")
async def export_plots(user: Annotated[Principal, Depends(require("researcher", "administrator"))], conn: Annotated[asyncpg.Connection, Depends(connection)]):
    features = await conn.fetch("""
      SELECT jsonb_build_object('type','Feature','geometry',ST_AsGeoJSON(location)::jsonb,
        'properties',jsonb_build_object('id',id,'seedlings',seedlings_planted,'status',status)) AS feature
      FROM plantings
    """)
    return {"type": "FeatureCollection", "features": [row["feature"] for row in features]}
