from config.db_nosql import db
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

telemetry_collection = db["telemetry_logs"]

class NoSQLModel:
    @staticmethod
    def _parse_iso_dt(dt_str: str) -> datetime:
        """Helper to ensure consistent UTC datetime objects."""
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))

    @staticmethod
    async def add_telemetry_record(telemetry_data: dict):
        # Calculate risk/compliance based on data_shared
        is_risky = any(
            item.get("is_confidential") and item.get("encryption_status") == "None" 
            for item in telemetry_data.get("data_shared", [])
        )
        telemetry_data["compliance_flag"] = "Red" if is_risky else "Green"
        
        if "timestamp" not in telemetry_data:
            telemetry_data["timestamp"] = datetime.now(timezone.utc)
            
        return await telemetry_collection.insert_one(telemetry_data)

    @staticmethod
    async def search_agent_records(
        search: Optional[str] = None,
        agent_id: Optional[str] = None,
        session_id: Optional[str] = None,
        used_by: Optional[str] = None,
        action: Optional[str] = None,
        duration_min: Optional[int] = None,
        files_altered: Optional[str] = None,
        recipient: Optional[str] = None,
        item: Optional[str] = None,
        classification: Optional[str] = None,
        is_confidential: Optional[bool] = None,
        location_path: Optional[str] = None,
        encryption_status: Optional[str] = None
    ) -> List[Any]:
        query = {}
        
        if agent_id: query["agent_id"] = agent_id
        if session_id: query["event.session_id"] = session_id
        if used_by: query["event.used_by"] = {"$regex": used_by, "$options": "i"}
        if action: query["event.action"] = {"$regex": action, "$options": "i"}
        if duration_min is not None: query["event.duration_min"] = {"$gte": int(duration_min)}
        if files_altered: query["event.files_altered"] = {"$regex": files_altered, "$options": "i"}
        if recipient: query["recipient"] = {"$regex": recipient, "$options": "i"}
        
        # Build array match for data_shared
        data_filter = {}
        if item: data_filter["item"] = {"$regex": item, "$options": "i"}
        if classification: data_filter["classification"] = {"$regex": classification, "$options": "i"}
        if is_confidential is not None: data_filter["is_confidential"] = is_confidential
        if location_path: data_filter["location_path"] = {"$regex": location_path, "$options": "i"}
        if encryption_status: data_filter["encryption_status"] = {"$regex": encryption_status, "$options": "i"}
        
        if data_filter:
            query["data_shared"] = {"$elemMatch": data_filter}
        
        if search:
            # Fuzzy match across generic payload areas
            search_regex = {"$regex": search, "$options": "i"}
            or_conditions = [
                {"event.action": search_regex},
                {"event.used_by": search_regex},
                {"recipient": search_regex}
            ]
            
            if "data_shared" not in query:
                query["data_shared"] = {"$elemMatch": {}}
            query["data_shared"]["$elemMatch"]["$or"] = [
                {"item": search_regex},
                {"classification": search_regex},
                {"location_path": search_regex}
            ]
            query["$or"] = or_conditions
            
        records = await telemetry_collection.find(query).to_list(None)
        
        # Clean ObjectIds
        for r in records:
            if "_id" in r:
                r["_id"] = str(r["_id"])
                
        return records