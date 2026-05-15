"""Quick script to unlock all user accounts and reset login attempts."""
import asyncio, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
os.chdir(str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings
from app.models.user import User

async def unlock():
    client = AsyncIOMotorClient(settings.MONGO_URI, tlsAllowInvalidCertificates=True)
    db_name = settings.MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "creditsaathi"
    await init_beanie(database=client[db_name], document_models=[User])

    users = await User.find_all().to_list()
    for u in users:
        u.login_attempts = 0
        u.lock_until = None
        await u.save()
        print(f"Unlocked: {u.email}")

    client.close()
    print("Done! All accounts unlocked.")

if __name__ == "__main__":
    asyncio.run(unlock())
