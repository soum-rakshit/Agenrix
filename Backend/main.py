from fastapi import FastAPI, HTTPException, Depends, Query
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession

# Database Imports
from config.db_nosql import check_db_connection
from config.db_sql import get_sql_db, engine, Base  # Your SQLAlchemy helper
from config.settings import settings

# Schema and Model Imports
from schema.schemas import AgentCreate
from models.agent_model_sql import AgentModel

from typing import List, Optional
from sqlalchemy import select

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- 1. SQL Startup: Create Tables ---
    print("Initializing PostgreSQL tables...")
    try:
        async with engine.begin() as conn:
            # This checks the DB and creates 'agents' if it doesn't exist
            await conn.run_sync(Base.metadata.create_all)
        print("✅ PostgreSQL tables synchronized.")
    except Exception as e:
        print(f"❌ Failed to sync PostgreSQL tables: {e}")

    # # --- 2. NoSQL Startup: Check MongoDB ---
    # is_connected = await check_db_connection()
    # if is_connected:
    #     print("✅ Successfully connected to MongoDB Atlas (Async)")
    # else:
    #     print("❌ Failed to connect to MongoDB")

    yield
    
    # --- Shutdown Logic ---
    # print("Shutting down connections...")
    # Optional: Close the engine to clean up connection pools
    # await engine.dispose()

# app = FastAPI(lifespan=lifespan)
app = FastAPI()

# Import your routes here later


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



#get route to get all the agents
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