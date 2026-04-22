from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime
from fastapi.responses import RedirectResponse

from config.db_nosql import check_db_connection
from config.db_sql import get_sql_db, engine, Base  
from config.settings import settings


from schema.schemas import AgentCreate, ActivityInput, ExternalCommInput
from models.agent_model_sql import AgentModel
from models.agent_activity_model import NoSQLModel

from typing import List, Optional
from sqlalchemy import select
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing PostgreSQL tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ PostgreSQL tables synchronized.")
    except Exception as e:
        print(f"❌ Failed to sync PostgreSQL tables: {e}")

    is_connected = await check_db_connection()
    if is_connected:
        print("✅ Successfully connected to MongoDB Atlas (Async)")
    else:
        print("❌ Failed to connect to MongoDB")

    yield


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    return RedirectResponse(url="/docs")

@app.post("/add_agent")
async def add_agent(
    agent: AgentCreate, 
    db: AsyncSession = Depends(get_sql_db)
):
    try:
        existing_agent = await AgentModel.get_agent_by_id(db, agent.agent_id)
        if existing_agent:
            raise HTTPException(
                status_code=400, 
                detail=f"Agent with ID '{agent.agent_id}' already exists."
            )
        agent_data = agent.model_dump()
        print("agent_data reached")

        new_agent = await AgentModel.create_agent(db, agent_data)

        return {
            "status": "success",
            "message": f"Agent {agent.agent_name} created successfully in SQL",
            "data": {
                "id": new_agent.id,
                "agent_id": new_agent.agent_id
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Internal Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")




@app.get("/agents", response_model=List[AgentCreate])
async def get_agents(
    agent_id: Optional[str] = None,
    agent_name: Optional[str] = None,
    agent_source: Optional[str] = None,
    owner: Optional[str] = None,
    authorized_by: Optional[str] = None,
    subscription_plan: Optional[str] = None,
    status: Optional[str] = None,
    contributor: Optional[str] = None,
    tool: Optional[str] = None,
    file: Optional[str] = None,
    data_node: Optional[str] = None,
    api: Optional[str] = None,
    server: Optional[str] = None,
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
        query = query.where(AgentModel.integration_details['status'].astext == status)

    if contributor:
        query = query.where(AgentModel.contributors.contains([contributor]))

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

    query = query.offset(offset).limit(limit)

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

  

@app.post("/add_agent_activity")
async def add_agent_activity(
    activity_data: ActivityInput, 
    db: AsyncSession = Depends(get_sql_db)
):
    exists = await AgentModel.check_exists(db, activity_data.agent_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Agent identity not found in SQL")
    try:
        event_dict = activity_data.event.model_dump()
        result = await NoSQLModel.log_activity_bucket(
            activity_data.agent_id, 
            event_dict
        )
        
        return {
            "status": "success",
            "message": "Activity captured in hourly bucket",
            "agent_id": activity_data.agent_id
        }
    except Exception as e:
        print(f"Logging Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to log activity")

@app.post("/add_external_comm")
async def add_external_comm(comm_data: ExternalCommInput, db: AsyncSession = Depends(get_sql_db)):
    exists = await AgentModel.check_exists(db,  comm_data.agent_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Agent identity not found in SQL")
    
    try:
        comm_dict = comm_data.model_dump()
        result = await NoSQLModel.add_external_comm(comm_dict)
        
        return {
            "status": "success",
            "id": str(result.inserted_id),
            "compliance_check": "Complete"
        }
    except Exception as e:
        print(f"Comm Audit Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to log communication")
    

    

@app.get("/get_agent_activity/{agent_id}")
async def get_agent_activity(agent_id: str):
    try:
        activities = await NoSQLModel.get_all_activities(agent_id)
        communications = await NoSQLModel.get_all_communications(agent_id)

        if not activities and not communications:
            raise HTTPException(status_code=404, detail="No activity found for this Agent ID")

        return {
            "agent_id": agent_id,
            "total_activities": len(activities),
            "total_external_comms": len(communications),
            "data": {
                "activity_logs": activities,
                "external_communications": communications
            }
        }
    
    except HTTPException as he:
        raise he
        
    except Exception as e:
        print(f"Error fetching activity: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=settings.PORT, reload=True)

