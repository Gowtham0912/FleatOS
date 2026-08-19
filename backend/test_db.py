import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import PairingRequest, User, Vehicle

async def main():
    async with AsyncSessionLocal() as db:
        print("--- Pairing Requests ---")
        reqs = await db.execute(select(PairingRequest))
        for r in reqs.scalars().all():
            print(f"ID={r.id} UserID={r.user_id} DeviceID={r.device_id} Status={r.status} VehicleID={r.vehicle_id}")
            
        print("\n--- Vehicles ---")
        veh = await db.execute(select(Vehicle))
        for v in veh.scalars().all():
            print(f"ID={v.id} UserID={v.user_id} DeviceID={v.device_id} Name={v.name}")

if __name__ == "__main__":
    asyncio.run(main())
