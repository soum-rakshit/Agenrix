from config.db_nosql import db
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

activity_collection = db["activity_logs"]
comm_collection = db["external_communications"]

class NoSQLModel:
    @staticmethod
    def _parse_iso_dt(dt_str: str) -> datetime:
        """Helper to ensure consistent UTC datetime objects."""
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))

    @staticmethod
    async def log_activity_bucket(agent_id: str, event_data: dict):
        now = datetime.now(timezone.utc)
        bucket_hour = now.replace(minute=0, second=0, microsecond=0)
        if "timestamp" not in event_data:
            event_data["timestamp"] = now

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
            item.get("is_confidential") and item.get("encryption_status") == "None" 
            for item in comm_data.get("data_shared", [])
        )
        comm_data["compliance_flag"] = "Red" if is_risky else "Green"
        comm_data["timestamp"] = datetime.now(timezone.utc)
        
        return await comm_collection.insert_one(comm_data)

    @staticmethod
    async def search_agent_records(
        agent_id: Optional[str] = None,
        start_dt: Optional[datetime] = None,
        end_dt: Optional[datetime] = None,
        file_name: Optional[str] = None,
        classification: Optional[str] = None,
        is_confidential: Optional[bool] = None,
        encryption_status: Optional[str] = None
    ) -> Dict[str, List[Any]]:
        comm_query = {}
        if agent_id: comm_query["agent_id"] = agent_id
        if start_dt or end_dt:
            comm_query["timestamp"] = {k: v for k, v in [("$gte", start_dt), ("$lte", end_dt)] if v}
        data_filter = {}
        if classification: data_filter["classification"] = classification
        if is_confidential is not None: data_filter["is_confidential"] = is_confidential
        if encryption_status: data_filter["encryption_status"] = encryption_status
        if data_filter:
            comm_query["data_shared"] = {"$elemMatch": data_filter}

        comms = await comm_collection.find(comm_query).to_list(None)
        act_pipeline = []
        match_bucket = {}
        if agent_id: match_bucket["agent_id"] = agent_id
        if start_dt: match_bucket["bucket_end"] = {"$gte": start_dt}
        if end_dt: match_bucket["bucket_start"] = {"$lte": end_dt}
        if file_name: match_bucket["events.files_altered"] = file_name
        
        act_pipeline.append({"$match": match_bucket})
        act_pipeline.append({"$unwind": "$events"})
        event_match = {}
        if start_dt: event_match["events.timestamp"] = {"$gte": start_dt}
        if end_dt: event_match["events.timestamp"] = {"$lte": end_dt}
        if file_name: event_match["events.files_altered"] = file_name
        act_pipeline.append({"$match": event_match})
        act_pipeline.append({
            "$project": {
                "_id": 0,
                "agent_id": 1,
                "event": "$events"
            }
        })

        activities = await activity_collection.aggregate(act_pipeline).to_list(None)

        return {
            "communications": [{**c, "_id": str(c["_id"])} for c in comms],
            "activities": activities
        }