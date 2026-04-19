import os
from motor.motor_asyncio import AsyncIOMotorClient

from config.settings import settings

mongo_uri = settings.MONGO_URI
# Create Async Client with Connection Pooling for high traffic
client = AsyncIOMotorClient(
    mongo_uri,
    maxPoolSize=100, 
    minPoolSize=10
)

# Reference the specific Database
db = client.agentAI_db

# Collections to be imported by your models
agents_collection = db["agents"]
external_comm_collection = db["external_communications"]
activity_logs_collection = db["activity_logs"]

# Connection check function
async def check_db_connection():
    try:
        await client.admin.command('ping')
        return True
    except Exception as e:
        print(f"DB Connection Error: {e}")
        return False