from config.db_nosql import activity_logs_collection
from datetime import datetime

class ActivityLogModel:
    @staticmethod
    async def append_log(agent_id: str, log_entry: dict):
        """
        Uses the 'Bucket Pattern' to group logs by hour.
        This prevents massive document overhead for high-frequency writes.
        """
        now = datetime.now()
        # Round down to the current hour to create a unique bucket ID
        bucket_time = now.replace(minute=0, second=0, microsecond=0)

        return await activity_logs_collection.update_one(
            {
                "agent_id": agent_id,
                "bucket_start_time": bucket_time,
                "event_count": {"$lt": 1000}  # Limits bucket size for performance
            },
            {
                "$push": {"logs": log_entry},
                "$inc": {"event_count": 1},
                "$setOnInsert": {"bucket_start_time": bucket_time}
            },
            upsert=True
        )