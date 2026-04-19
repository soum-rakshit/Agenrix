import os
from motor.motor_asyncio import AsyncIOMotorClient

from config.settings import settings

mongo_uri = settings.MONGO_URI
client = AsyncIOMotorClient(
    mongo_uri,
    maxPoolSize=100, 
    minPoolSize=10
)

db = client.agentAI_db

agents_collection = db["agents"]
external_comm_collection = db["external_communications"]
activity_logs_collection = db["activity_logs"]

async def check_db_connection():
    try:
        await client.admin.command('ping')
        return True
    except Exception as e:
        print(f"DB Connection Error: {e}")
        return False