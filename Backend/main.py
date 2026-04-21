from fastapi import FastAPI, HTTPException, Depends, Query
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime

from config.db_nosql import check_db_connection
from config.db_sql import get_sql_db, engine, Base  
from config.settings import settings


from schema.schemas import AgentCreate
from models.agent_model_sql import AgentModel

from typing import List, Optional
from sqlalchemy import select

@asynccontextmanager
async def lifespan(app: FastAPI):
  
    print("Initializing PostgreSQL tables...")
    try:
        async with engine.begin() as conn:
            
            await conn.run_sync(Base.metadata.create_all)
        print("✅ PostgreSQL tables synchronized.")
    except Exception as e:
        print(f"❌ Failed to sync PostgreSQL tables: {e}")

   
    # is_connected = await check_db_connection()
    # if is_connected:
    #     print("✅ Successfully connected to MongoDB Atlas (Async)")
    # else:
    #     print("❌ Failed to connect to MongoDB")

    yield
    


# app = FastAPI(lifespan=lifespan)
app = FastAPI()




@app.get("/")
async def root():
    return {"message": "Agent Management System API is Live"}\

@app.post("/add_agent")
async def add_agent(
    agent: AgentCreate, 
    db: AsyncSession = Depends(get_sql_db)
):
    try:
        existing_agent = await AgentModel.get_agent_by_id(db, agent.agent_id)
        if existing_agent:
            # We raise a 400 Bad Request or 409 Conflict
            raise HTTPException(
                status_code=400, 
                detail=f"Agent with ID '{agent.agent_id}' already exists."
            )
        agent_data = agent.model_dump()
        print("agent_data reached")

        # 3. Save to SQL Database
        # Ensure AgentModel.create_agent is updated for SQLAlchemy logic
        new_agent = await AgentModel.create_agent(db, agent_data)

        return {
            "status": "success",
            "message": f"Agent {agent.agent_name} created successfully in SQL",
            "data": {
                "id": new_agent.id, # Assuming your SQL model has an autoincrement ID
                "agent_id": new_agent.agent_id
            }
        }

    except HTTPException as he:
        # Re-raise FastAPIs HTTP exceptions so they return correctly
        raise he
    except Exception as e:
        # Log the actual error for debugging
        print(f"Internal Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")




@app.get("/agents", response_model=List[AgentCreate])
async def get_agents(
    # --- Standard String/ID Filters ---
    agent_id: Optional[str] = None,
    agent_name: Optional[str] = None,
    agent_source: Optional[str] = None,
    owner: Optional[str] = None,
    authorized_by: Optional[str] = None,
    subscription_plan: Optional[str] = None,
    status: Optional[str] = None, # Pulled from integration_details or column

    # --- JSONB List Filters (Contributors) ---
    contributor: Optional[str] = None,

    # --- Nested JSONB Filters (Access Rights) ---
    tool: Optional[str] = None,
    file: Optional[str] = None,
    data_node: Optional[str] = None,
    api: Optional[str] = None,
    server: Optional[str] = None,

    # --- Pagination ---
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_sql_db)
):
    query = select(AgentModel)

    if agent_id:
        query = query.where(AgentModel.agent_id == agent_id)
    if agent_name:
        query = query.where(AgentModel.agent_name.ilike(f"%{agent_name}%"))
    if agent_source:
        query = query.where(AgentModel.agent_source.ilike(f"%{agent_source}%"))
    if owner:
        query = query.where(AgentModel.owner.ilike(f"%{owner}%"))
    if authorized_by:
        query = query.where(AgentModel.authorized_by == authorized_by)
    if subscription_plan:
        query = query.where(AgentModel.subscription_plan == subscription_plan)
    if status:
        # Filtering status inside the integration_details JSON
        query = query.where(AgentModel.integration_details['status'].astext == status)

    # 2. Contributors Filter (Top-level JSON List)
    if contributor:
        # Check if the list contains the string
        query = query.where(AgentModel.contributors.contains([contributor]))

    # 3. Access Rights Filters (Nested JSON List)
    # These fulfill your requirement to "list all agents that have access to a certain file/tool"
    if file:
        query = query.where(AgentModel.access_rights['files'].contains([file]))
    
    if tool:
        query = query.where(AgentModel.access_rights['tools'].contains([tool]))
    
    if data_node:
        query = query.where(AgentModel.access_rights['data_nodes'].contains([data_node]))
    
    if api:
        query = query.where(AgentModel.access_rights['apis'].contains([api]))
    
    if server:
        query = query.where(AgentModel.access_rights['servers'].contains([server]))


    # 3. Add pagination (important for performance)
    query = query.offset(offset).limit(limit)

    # 4. Execute the query
    result = await db.execute(query)
    agents = result.scalars().all()

    if not agents:
        return []

    return agents




@app.patch("/update_agent/{agent_id}")
async def update_agent(
    agent_id: str, 
    update_data: dict, 
    db: AsyncSession = Depends(get_sql_db)
):
    query = select(AgentModel).where(AgentModel.agent_id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data.pop("agent_id", None)
    update_data.pop("agent_name", None)

    try:
        for key, value in update_data.items():
            if hasattr(agent, key):
                current_val = getattr(agent, key)
                
                
                if isinstance(current_val, dict) and isinstance(value, dict):
                    
                    current_val.update(value)
                    setattr(agent, key, current_val)
                    
                    flag_modified(agent, key)
                else:
                    
                    setattr(agent, key, value)
        
        
        ts = dict(agent.timestamps) if agent.timestamps else {}
        ts["last_updated"] = datetime.now().isoformat()
        agent.timestamps = ts
        flag_modified(agent, "timestamps")

        await db.commit()
        await db.refresh(agent)
        return {"status": "success", "agent": agent}
    
    except IntegrityError as e:
        await db.rollback()
        
        print(f"Integrity Conflict: {e}")
        raise HTTPException(
            status_code=409, 
            detail="Update conflict: This change violates database unique constraints (likely a duplicate agent_id)."
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete_agent/{agent_id}")
async def delete_agent(
    agent_id: str, 
    db: AsyncSession = Depends(get_sql_db)
):
    query = select(AgentModel).where(AgentModel.agent_id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    try:
       
        await db.delete(agent)
        await db.commit()
        
        return {
            "status": "success", 
            "message": f"Agent {agent_id} has been permanently deleted."
        }
    except Exception as e:
        await db.rollback()
        print(f"Delete Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")