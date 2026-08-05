"""
bootstrap_db.py — Creates the fleet_user and fleet_db using asyncpg directly.
No psql needed. Run once before starting the server.

Usage:
    python scripts/bootstrap_db.py
    python scripts/bootstrap_db.py --pg-password YOUR_POSTGRES_PASSWORD
"""

import asyncio
import argparse
import asyncpg


async def bootstrap(pg_password: str):
    print("\n[*] Fleet Tracking - Database Bootstrap\n")

    # ── Connect as postgres superuser ─────────────────────────────────────────
    print("[>] Connecting to PostgreSQL as superuser 'postgres'...")
    try:
        conn = await asyncpg.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=pg_password,
            database="postgres",  # connect to default DB first
        )
    except Exception as e:
        print(f"\n[ERROR] Cannot connect: {e}")
        print("\n   Make sure PostgreSQL is running and the password is correct.")
        print("   You can start it with:  net start postgresql-x64-16")
        return

    print("[OK] Connected.\n")

    try:
        # ── Create fleet_user if not exists ───────────────────────────────────
        existing_role = await conn.fetchval(
            "SELECT 1 FROM pg_roles WHERE rolname = 'fleet_user'"
        )
        if not existing_role:
            await conn.execute(
                "CREATE ROLE fleet_user WITH LOGIN PASSWORD 'fleet_pass' "
                "NOSUPERUSER NOCREATEDB NOCREATEROLE"
            )
            print("[OK] Created role: fleet_user  (password: fleet_pass)")
        else:
            print("[--] Role fleet_user already exists - skipped.")

        # ── Create fleet_db if not exists ─────────────────────────────────────
        existing_db = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'fleet_db'"
        )
        if not existing_db:
            # CREATE DATABASE cannot run inside a transaction block
            await conn.execute(
                "CREATE DATABASE fleet_db OWNER fleet_user ENCODING 'UTF8'"
            )
            print("[OK] Created database: fleet_db")
        else:
            print("[--] Database fleet_db already exists - skipped.")

        # ── Grant privileges ──────────────────────────────────────────────────
        await conn.execute("GRANT ALL PRIVILEGES ON DATABASE fleet_db TO fleet_user")
        print("[OK] Granted all privileges on fleet_db to fleet_user.")

    finally:
        await conn.close()

    # ── Verify by connecting as fleet_user ────────────────────────────────────
    print("\n[>] Verifying connection as fleet_user...")
    try:
        test_conn = await asyncpg.connect(
            host="localhost",
            port=5432,
            user="fleet_user",
            password="fleet_pass",
            database="fleet_db",
        )
        await test_conn.close()
        print("[OK] fleet_user can connect to fleet_db.\n")
    except Exception as e:
        print(f"[WARN] Verification failed: {e}\n")

    print("=" * 52)
    print("  Database bootstrap complete!")
    print("  Next step: run 'alembic upgrade head'")
    print("=" * 52)
    print()


def main():
    parser = argparse.ArgumentParser(description="Bootstrap the fleet_db PostgreSQL database.")
    parser.add_argument(
        "--pg-password",
        default="postgres",
        help="Password for the 'postgres' superuser (default: postgres)",
    )
    args = parser.parse_args()
    asyncio.run(bootstrap(args.pg_password))


if __name__ == "__main__":
    main()
