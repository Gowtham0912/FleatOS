-- ============================================================
--  Fleet Tracking — Manual Schema (reference only)
--
--  NOTE: Tables are created automatically by SQLAlchemy on
--  server startup (init_db). Use Alembic for production migrations.
--  This file is here for reference / inspection only.
-- ============================================================

-- vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id          BIGSERIAL   PRIMARY KEY,
    device_id   VARCHAR(64) NOT NULL UNIQUE,
    name        VARCHAR(128) NOT NULL DEFAULT 'Unknown Vehicle'
);

CREATE INDEX IF NOT EXISTS idx_vehicles_device_id ON vehicles (device_id);

-- locations table
CREATE TABLE IF NOT EXISTS locations (
    id          BIGSERIAL   PRIMARY KEY,
    vehicle_id  BIGINT      NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_vehicle_id   ON locations (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_locations_timestamp     ON locations (timestamp DESC);
-- Composite index for fast "latest location per vehicle" queries
CREATE INDEX IF NOT EXISTS idx_locations_vehicle_ts    ON locations (vehicle_id, timestamp DESC);
