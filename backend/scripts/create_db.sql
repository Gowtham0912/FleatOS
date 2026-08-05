-- ============================================================
--  Fleet Tracking — PostgreSQL Initial Setup Script
--  Run this once as a PostgreSQL superuser (e.g. postgres)
-- ============================================================

-- 1. Create the application user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fleet_user'
    ) THEN
        CREATE ROLE fleet_user
            WITH LOGIN
            PASSWORD 'fleet_pass'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
        RAISE NOTICE 'Role fleet_user created.';
    ELSE
        RAISE NOTICE 'Role fleet_user already exists — skipped.';
    END IF;
END
$$;

-- 2. Create the database owned by the application user
SELECT 'CREATE DATABASE fleet_db OWNER fleet_user ENCODING ''UTF8'' LC_COLLATE ''en_US.UTF-8'' LC_CTYPE ''en_US.UTF-8'' TEMPLATE template0'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'fleet_db'
)\gexec

-- 3. Grant all privileges on the database to fleet_user
GRANT ALL PRIVILEGES ON DATABASE fleet_db TO fleet_user;

\echo '✅  Setup complete: fleet_user and fleet_db are ready.'
