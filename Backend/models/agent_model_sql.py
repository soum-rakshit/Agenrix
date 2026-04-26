from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional, List, Dict, Any
from config.db_sql import Base
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import select

class AgentModel(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(String(50), unique=True, index=True, nullable=False)
    agent_name = Column(String(100))
    source_repo_id = Column(String(255))
    agent_description = Column(String(500))
    owner = Column(String(100))
    authorized_by = Column(String(100))
    subscription_plan = Column(String(50))
    status = Column(String(50), default="Active")
    classification = Column(String(50), nullable=True)
    confidence = Column(String(50), nullable=True)
    
    contributors = Column(JSONB)
    access_rights = Column(JSONB)
    integration_details = Column(JSONB)
    timestamps = Column(JSONB)


    @staticmethod
    async def create_agent(db: AsyncSession, agent_data: Dict[str, Any]) -> str:
        now = datetime.now().isoformat()
        
        new_agent = AgentModel(
            agent_id=agent_data.get("agent_id"),
            agent_name=agent_data.get("agent_name"),
            source_repo_id=agent_data.get("source_repo_id"),
            agent_description=agent_data.get("agent_description"),
            owner=agent_data.get("owner"),
            authorized_by=agent_data.get("authorized_by"),
            subscription_plan=agent_data.get("subscription_plan"),
            contributors=agent_data.get("contributors", []),
            
            access_rights=agent_data.get("access_rights", {
                "tools": [], "files": [], "data_nodes": [], "apis": [], "servers": []
            }),
            
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
            return new_agent
        except Exception as e:
            await db.rollback()
            raise e

    @staticmethod
    async def get_agent_by_id(db: AsyncSession, agent_id: str) -> Optional["AgentModel"]:
        query = select(AgentModel).where(AgentModel.agent_id == agent_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_agent(db: AsyncSession, agent_id: str, update_data: Dict[str, Any]) -> int:
        query = select(AgentModel).where(AgentModel.agent_id == agent_id)
        result = await db.execute(query)
        agent = result.scalar_one_or_none()
        
        if agent:
            for key, value in update_data.items():
                if hasattr(agent, key):
                    setattr(agent, key, value)
            
            ts = dict(agent.timestamps)
            ts["last_updated"] = datetime.now().isoformat()
            agent.timestamps = ts
            
            await db.commit()
            return 1
        return 0
    
    @staticmethod
    async def check_exists(db, agent_id: str):
        query = select(AgentModel).where(AgentModel.agent_id == agent_id)
        result = await db.execute(query)
        return result.scalars().first() is not None