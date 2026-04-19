from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional, List, Dict, Any
from config.db_sql import Base
from sqlalchemy.dialects.postgresql import JSONB

class AgentModel(Base):
    __tablename__ = "agents"

    # SQL Schema Definition
    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(String(50), unique=True, index=True, nullable=False)
    agent_name = Column(String(100))
    agent_source = Column(String(255))
    agent_description = Column(String(500))
    owner = Column(String(100))
    authorized_by = Column(String(100))
    subscription_plan = Column(String(50))
    
    # JSONB Fields for lists and nested objects
    contributors = Column(JSONB) # List[str]
    access_rights = Column(JSONB) # Dict
    integration_details = Column(JSONB)
    timestamps = Column(JSONB)


    @staticmethod
    async def create_agent(db: AsyncSession, agent_data: Dict[str, Any]) -> str:
        """
        Inserts a new agent into PostgreSQL based on the provided schema data.
        """
        now = datetime.now().isoformat()
        
        # Initialize the model with the provided schema data
        new_agent = AgentModel(
            agent_id=agent_data.get("agent_id"),
            agent_name=agent_data.get("agent_name"),
            agent_source=agent_data.get("agent_source"),
            agent_description=agent_data.get("agent_description"),
            owner=agent_data.get("owner"),
            authorized_by=agent_data.get("authorized_by"),
            subscription_plan=agent_data.get("subscription_plan"),
            contributors=agent_data.get("contributors", []),
            
            # Mapping the nested access_rights
            access_rights=agent_data.get("access_rights", {
                "tools": [], "files": [], "data_nodes": [], "apis": [], "servers": []
            }),
            
            # Default internal fields
            integration_details={
                "integrated_since": now,
                "status": "active"
            },
            timestamps={
                "first_created": now,
                "last_updated": now
            }
        )

        try:
            db.add(new_agent)
            await db.commit()
            await db.refresh(new_agent)
            return new_agent # Returning the business ID for convenience
        except Exception as e:
            await db.rollback()
            raise e

    @staticmethod
    async def get_agent_by_id(db: AsyncSession, agent_id: str) -> Optional["AgentModel"]:
        """
        Finds a single agent by their unique business ID (agent_id).
        """
        query = select(AgentModel).where(AgentModel.agent_id == agent_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_agent(db: AsyncSession, agent_id: str, update_data: Dict[str, Any]) -> int:
        """
        Updates agent details in SQL.
        """
        query = select(AgentModel).where(AgentModel.agent_id == agent_id)
        result = await db.execute(query)
        agent = result.scalar_one_or_none()
        
        if agent:
            # Manually update fields
            for key, value in update_data.items():
                if hasattr(agent, key):
                    setattr(agent, key, value)
            
            # Update last_updated inside the JSONB timestamps
            ts = dict(agent.timestamps)
            ts["last_updated"] = datetime.now().isoformat()
            agent.timestamps = ts
            
            await db.commit()
            return 1
        return 0

    # @staticmethod
    # async def delete_agent(db: AsyncSession, agent_id: str) -> int:
    #     """
    #     Removes an agent by agent_id.
    #     """
    #     query = select(AgentModel).where(AgentModel.agent_id == agent_id)
    #     result = await db.execute(query)
    #     agent = result.scalar_one_or_none()
        
    #     if agent:
    #         await db.delete(agent)
    #         await db.commit()
    #         return 1
    #     return 0

    # @staticmethod
    # async def list_agents(db: AsyncSession, limit: int = 100) -> List["AgentModel"]:
    #     """
    #     Returns a list of agents from Postgres.
    #     """
    #     query = select(AgentModel).limit(limit)
    #     result = await db.execute(query)
    #     return result.scalars().all()