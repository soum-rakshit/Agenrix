from config.db_nosql import agents_collection
from datetime import datetime
from typing import Optional, Dict, Any, List

class AgentModel:
   
    @staticmethod
    async def create_agent(agent_id: str) -> str:
        """
        Inserts a new agent into the database with default metadata.
        """
        now = datetime.now()
        
        new_agent_doc = {
            "agent_id": agent_id,
            "agent_name": f"Agent_{agent_id}",
            "status": "active",
            "integration_details": {
                "integrated_since": now,
                "status": "active"
            },
            "timestamps": {
                "first_created": now,
                "last_updated": now
            },
            "access_rights": {
                "tools": [],
                "files": [],
                "data_nodes": [],
                "apis": [],
                "servers": []
            }
        }

        result = await agents_collection.insert_one(new_agent_doc)
        print(new_agent_doc)
        return str(result.inserted_id)

    @staticmethod
    async def get_agent_by_id(agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Finds a single agent by their unique business ID (agent_id).
        """
        return await agents_collection.find_one({"agent_id": agent_id})


    @staticmethod
    async def delete_agent(agent_id: str) -> int:
        """
        Removes an agent by agent_id.
        """
        result = await agents_collection.delete_one({"agent_id": agent_id})
        return result.deleted_count

    @staticmethod
    async def list_agents(filters: Dict[str, Any] = {}, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Returns a list of agents. Use .to_list() for async iteration.
        """
        cursor = agents_collection.find(filters).limit(limit)
        return await cursor.to_list(length=limit)