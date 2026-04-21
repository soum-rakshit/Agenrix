from config.db_nosql import db # Assuming your Motor/MongoDB handle is here
from datetime import datetime, timezone
from typing import List, Dict, Any

activity_collection = db["activity_logs"]
comm_collection = db["external_communications"]

class NoSQLModel:
    @staticmethod
    async def log_activity_bucket(agent_id: str, event_data: dict):
        """Groups logs by hour (Bucket Pattern) for high-velocity telemetry."""
        now = datetime.now(timezone.utc)
        bucket_hour = now.replace(minute=0, second=0, microsecond=0)

        # Atomic update: Push event and increment count in one operation
        return await activity_collection.update_one(
            {
                "agent_id": agent_id,
                "bucket_start": bucket_hour,
                "event_count": {"$lt": 1000} # Limits bucket size for performance
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
        """Processes external data sharing with built-in compliance checking."""
        # Security Logic: Set compliance flag to 'Red' if confidential data is unencrypted
        is_risky = any(
            item["is_confidential"] and item.get("encryption_status") == "None" 
            for item in comm_data["data_shared"]
        )
        comm_data["compliance_flag"] = "Red" if is_risky else "Green"
        comm_data["timestamp"] = datetime.now(timezone.utc)
        
        return await comm_collection.insert_one(comm_data)
    
    @staticmethod
    async def get_all_activities(agent_id: str) -> List[Dict[str, Any]]:
        """Fetches and flattens all hourly activity buckets for an agent."""
        cursor = activity_collection.find({"agent_id": agent_id}).sort("bucket_start", -1)
        buckets = await cursor.to_list(length=None)
        
        # Flattening the nested 'events' from all buckets into one list
        all_events = []
        for bucket in buckets:
            for event in bucket.get("events", []):
                # Add bucket context to each event if needed
                event["bucket_start"] = bucket["bucket_start"]
                all_events.append(event)
        return all_events

    @staticmethod
    async def get_all_communications(agent_id: str) -> List[Dict[str, Any]]:
        """Fetches all external communication audit logs for an agent."""
        cursor = comm_collection.find({"agent_id": agent_id}).sort("timestamp", -1)
        comms = await cursor.to_list(length=None)
        
        # Convert MongoDB ObjectId to string for JSON compatibility
        for comm in comms:
            comm["_id"] = str(comm["_id"])
        return comms