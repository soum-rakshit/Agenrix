from config.db_nosql import external_comm_collection

class ExternalCommModel:
    @staticmethod
    async def record_share(data: dict):
        """Records external data sharing and audit metadata."""
        return await external_comm_collection.insert_one(data)

    @staticmethod
    async def get_history_by_agent(agent_id: str):
        cursor = external_comm_collection.find({"agent_id": agent_id})
        return await cursor.to_list(length=100)