from config.db_nosql import db
from datetime import datetime, timezone
from typing import List, Dict, Any

activity_collection = db["activity_logs"]
comm_collection = db["external_communications"]

class NoSQLModel:
    @staticmethod
    async def log_activity_bucket(agent_id: str, event_data: dict):
        now = datetime.now(timezone.utc)
        bucket_hour = now.replace(minute=0, second=0, microsecond=0)

        return await activity_collection.update_one(
            {
                "agent_id": agent_id,
                "bucket_start": bucket_hour,
                "event_count": {"$lt": 1000}
            },
            {
                "$push": {"events": event_data},
                "$inc": {"event_count": 1},
                "$setOnInsert": {"bucket_end": bucket_hour.replace(minute=59, second=59)}
            },
            upsert=True
        )

    @staticmethod
    async def add_external_comm(comm_data: dict):
        is_risky = any(
            item["is_confidential"] and item.get("encryption_status") == "None" 
            for item in comm_data["data_shared"]
        )
        comm_data["compliance_flag"] = "Red" if is_risky else "Green"
        comm_data["timestamp"] = datetime.now(timezone.utc)
        
        return await comm_collection.insert_one(comm_data)
    
    @staticmethod
    async def get_all_activities(agent_id: str) -> List[Dict[str, Any]]:
        cursor = activity_collection.find({"agent_id": agent_id}).sort("bucket_start", -1)
        buckets = await cursor.to_list(length=None)
        
        all_events = []
        for bucket in buckets:
            for event in bucket.get("events", []):
                event["bucket_start"] = bucket["bucket_start"]
                all_events.append(event)
        return all_events

    @staticmethod
    async def get_all_communications(agent_id: str) -> List[Dict[str, Any]]:
        cursor = comm_collection.find({"agent_id": agent_id}).sort("timestamp", -1)
        comms = await cursor.to_list(length=None)
        
        for comm in comms:
            comm["_id"] = str(comm["_id"])
        return comms