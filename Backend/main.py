from fastapi import APIRouter, FastAPI, HTTPException, Depends, Query, BackgroundTasks
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

from fastapi.encoders import jsonable_encoder
from schema.schemas import AgentCreate, WorkerRawLog, AccessRights, RepoScanResult, ClassificationEnum, UnifiedIngestionPayload
from models.agent_model_sql import AgentModel
from models.agent_activity_model import NoSQLModel
from models.repo_models import RepoModel
from models.repo_model_sql import RepoModelSQL
from pydantic import ValidationError
from typing import List, Optional
from sqlalchemy import select, or_
import uvicorn
import asyncio

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

@app.get("/agents")
async def list_agents(
    search: Optional[str] = None,
    agent_id: Optional[str] = None,
    agent_name: Optional[str] = None,
    source_repo_id: Optional[str] = None,
    owner: Optional[str] = None,
    authorized_by: Optional[str] = None,
    subscription_plan: Optional[str] = None,
    status: Optional[str] = None,
    classification: Optional[str] = None,
    confidence: Optional[str] = None,
    contributor: Optional[str] = None,
    file: Optional[str] = None,
    tool: Optional[str] = None,
    data_node: Optional[str] = None,
    api: Optional[str] = None,
    server: Optional[str] = None,
    # NoSQL Agent Filters
    session_id: Optional[str] = None,
    used_by: Optional[str] = None,
    action: Optional[str] = None,
    duration_min: Optional[int] = None,
    files_altered: Optional[str] = None,
    recipient: Optional[str] = None,
    item: Optional[str] = None,
    comm_classification: Optional[str] = None,
    is_confidential: Optional[bool] = None,
    location_path: Optional[str] = None,
    encryption_status: Optional[str] = None,
    # Repo Cross-Filters
    repo_name: Optional[str] = None,
    repo_link: Optional[str] = None,
    repo_classification: Optional[str] = None,
    repo_confidence: Optional[str] = None,
    repo_status: Optional[str] = None,
    repo_agent_signals: Optional[str] = None,
    repo_evidence_files: Optional[str] = None,
    repo_frameworks_detected: Optional[str] = None,
    repo_reasoning: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_sql_db)
):
    query = select(AgentModel)
    
    # --- CROSS-DATABASE REPO FILTERING ---
    repo_sql_filter_active = any([
        repo_name, repo_link, repo_classification, repo_confidence, repo_status
    ])
    repo_nosql_filter_active = any([
        repo_agent_signals, repo_evidence_files, repo_frameworks_detected, repo_reasoning
    ])
    
    if repo_sql_filter_active or repo_nosql_filter_active:
        matching_repo_ids = set()
        
        # 1. Query Repo SQL if SQL parameters are given
        if repo_sql_filter_active:
            repo_query = select(RepoModelSQL.repo_id)
            if repo_name: repo_query = repo_query.where(RepoModelSQL.repo_name.ilike(f"%{repo_name}%"))
            if repo_link: repo_query = repo_query.where(RepoModelSQL.repo_link.ilike(f"%{repo_link}%"))
            if repo_classification: repo_query = repo_query.where(RepoModelSQL.classification == repo_classification)
            if repo_confidence: repo_query = repo_query.where(RepoModelSQL.confidence == repo_confidence)
            
            repo_result = await db.execute(repo_query)
            sql_repo_ids = set(repo_result.scalars().all())
            
        # 2. Query Repo NoSQL if NoSQL parameters are given
        if repo_nosql_filter_active:
            nosql_repo_records = await RepoModel.search_repo_records(
                agent_signals=repo_agent_signals,
                evidence_files=repo_evidence_files,
                frameworks_detected=repo_frameworks_detected,
                reasoning=repo_reasoning
            )
            nosql_repo_ids = set([r["repo_id"] for r in nosql_repo_records if "repo_id" in r])
            
        # 3. Intersect Repo Sets
        if repo_sql_filter_active and repo_nosql_filter_active:
            matching_repo_ids = sql_repo_ids.intersection(nosql_repo_ids)
        elif repo_sql_filter_active:
            matching_repo_ids = sql_repo_ids
        else:
            matching_repo_ids = nosql_repo_ids
            
        if not matching_repo_ids:
            return []
            
        query = query.where(AgentModel.source_repo_id.in_(list(matching_repo_ids)))
    # ---------------------------------------

    # Existing Agent Filters
    if search and str(search).strip():
        search_str = f"%{str(search).strip()}%"
        query = query.where(
            or_(
                AgentModel.agent_id.ilike(search_str),
                AgentModel.agent_name.ilike(search_str),
                AgentModel.integration_details['reasoning'].astext.ilike(search_str)
            )
        )

    # Pre-filter with NoSQL if NoSQL params are provided
    nosql_filter_active = any([
        session_id, used_by, action, duration_min is not None, files_altered, 
        recipient, item, comm_classification, is_confidential is not None, 
        location_path, encryption_status
    ])

    if nosql_filter_active:
        nosql_records = await NoSQLModel.search_agent_records(
            search=search,
            session_id=session_id,
            used_by=used_by,
            action=action,
            duration_min=duration_min,
            files_altered=files_altered,
            recipient=recipient,
            item=item,
            classification=comm_classification,
            is_confidential=is_confidential,
            location_path=location_path,
            encryption_status=encryption_status
        )
        matching_agent_ids = list(set([r["agent_id"] for r in nosql_records if "agent_id" in r]))
        if not matching_agent_ids:
            return [] # Early exit if NoSQL filters found no agents
        query = query.where(AgentModel.agent_id.in_(matching_agent_ids))

    if search and str(search).strip() and not nosql_filter_active:
        search_str = f"%{str(search).strip()}%"
        query = query.where(
            or_(
                AgentModel.agent_id.ilike(search_str),
                AgentModel.agent_name.ilike(search_str),
                AgentModel.integration_details['reasoning'].astext.ilike(search_str)
            )
        )

    if agent_id and str(agent_id).strip():
        query = query.where(AgentModel.agent_id == str(agent_id).strip())
    if agent_name and str(agent_name).strip():
        query = query.where(AgentModel.agent_name.ilike(f"%{str(agent_name).strip()}%"))
    if source_repo_id and str(source_repo_id).strip():
        query = query.where(AgentModel.source_repo_id.ilike(f"%{str(source_repo_id).strip()}%"))
    if owner and str(owner).strip():
        query = query.where(AgentModel.owner.ilike(f"%{str(owner).strip()}%"))
    if authorized_by and str(authorized_by).strip():
        query = query.where(AgentModel.authorized_by == str(authorized_by).strip())
    if subscription_plan and str(subscription_plan).strip():
        query = query.where(AgentModel.subscription_plan == str(subscription_plan).strip())
    if classification and str(classification).strip():
        query = query.where(AgentModel.classification == str(classification).strip())
    if confidence and str(confidence).strip():
        query = query.where(AgentModel.confidence == str(confidence).strip())

    if contributor and str(contributor).strip():
        query = query.where(AgentModel.contributors.contains([str(contributor).strip()]))

    if file and str(file).strip():
        query = query.where(AgentModel.access_rights['files'].contains([str(file).strip()]))
    
    if tool and str(tool).strip():
        query = query.where(AgentModel.access_rights['tools'].contains([str(tool).strip()]))
    
    if data_node and str(data_node).strip():
        query = query.where(AgentModel.access_rights['data_nodes'].contains([str(data_node).strip()]))
    
    if api and str(api).strip():
        query = query.where(AgentModel.access_rights['apis'].contains([str(api).strip()]))
    
    if server and str(server).strip():
        query = query.where(AgentModel.access_rights['servers'].contains([str(server).strip()]))

    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    agents = result.scalars().all()

    if not agents:
        return []

    async def fetch_nosql(agent):
        try:
            records = await NoSQLModel.search_agent_records(
                search=search,
                agent_id=agent.agent_id,
                session_id=session_id,
                used_by=used_by,
                action=action,
                duration_min=duration_min,
                files_altered=files_altered,
                recipient=recipient,
                item=item,
                classification=comm_classification,
                is_confidential=is_confidential,
                location_path=location_path,
                encryption_status=encryption_status
            )
            return {"telemetry_logs": records}
        except Exception as e:
            return {"telemetry_logs": []}

    nosql_results = await asyncio.gather(*(fetch_nosql(agent) for agent in agents))

    # --- FETCH REPO DATA TO ENRICH AGENT PAYLOAD ---
    async def fetch_repo_data(agent):
        try:
            if not agent.source_repo_id:
                return None, None
                
            # SQL Repo
            r_query = select(RepoModelSQL).where(RepoModelSQL.repo_id == agent.source_repo_id)
            r_result = await db.execute(r_query)
            r_sql = r_result.scalar_one_or_none()
            
            # NoSQL Repo
            r_nosql = await RepoModel.search_repo_records(repo_id=agent.source_repo_id)
            
            return (jsonable_encoder(r_sql) if r_sql else None, r_nosql[0] if r_nosql else None)
        except Exception:
            return None, None
            
    repo_results = await asyncio.gather(*(fetch_repo_data(agent) for agent in agents))

    response = []
    for agent, nosql, (r_sql, r_nosql) in zip(agents, nosql_results, repo_results):
        agent_dict = jsonable_encoder(agent)
        response.append({
            "sql_data": agent_dict,
            "nosql_data": nosql,
            "repo_sql_data": r_sql,
            "repo_nosql_data": r_nosql
        })

    return response

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
            if value in ["", None]:
                continue
                
            if hasattr(agent, key):
                current_val = getattr(agent, key)
                
                if isinstance(current_val, dict) and isinstance(value, dict):
                    filtered_value = {k: v for k, v in value.items() if v not in ["", None]}
                    current_val.update(filtered_value)
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
           

@app.post("/repo_scans")
async def add_repo_scan(payload: UnifiedIngestionPayload, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_sql_db)):
    try:
        scan_data = payload.repo
        
        # 1. Update SQL Repo Data
        query = select(RepoModelSQL).where(RepoModelSQL.repo_id == scan_data.repo_id)
        result = await db.execute(query)
        repo_sql = result.scalar_one_or_none()
        
        repo_exists = repo_sql is not None

        if not repo_exists:
            repo_sql = RepoModelSQL(
                repo_id=scan_data.repo_id,
                repo_name=scan_data.repo_name,
                repo_link=scan_data.repo_link,
                classification=scan_data.classification,
                confidence=scan_data.confidence,
            )
            db.add(repo_sql)
        else:
            repo_sql.repo_name = scan_data.repo_name
            repo_sql.classification = scan_data.classification
            repo_sql.confidence = scan_data.confidence
        await db.commit()

        # 2. Update NoSQL Repo Data
        await RepoModel.create_scan_result(scan_data.model_dump())
        
        auto_registered = False
        agent_action = "none"

        if scan_data.classification in [ClassificationEnum.AGENT, ClassificationEnum.POSSIBLE_AGENT]:
            if not payload.agent or not payload.agent.agent_id:
                raise HTTPException(status_code=400, detail="agent_id inside agent payload is mandatory if classification is AGENT or POSSIBLE_AGENT")
                
            target_agent_id = payload.agent.agent_id

            query = select(AgentModel).where(AgentModel.agent_id == target_agent_id)
            result = await db.execute(query)
            agent = result.scalar_one_or_none()
            
            if not agent:
                try:
                    new_agent = AgentModel(
                        agent_id=target_agent_id,
                        agent_name=payload.agent.agent_name or scan_data.repo_name,
                        source_repo_id=scan_data.repo_id,
                        owner=payload.agent.owner or "System-Auto",
                        authorized_by=payload.agent.authorized_by or "Worker-Scan",
                        subscription_plan=payload.agent.subscription_plan or "Free",
                        classification=scan_data.classification,
                        confidence=scan_data.confidence,
                        contributors=payload.agent.contributors or [],
                        access_rights=payload.agent.access_rights or {
                            "files": [], "tools": [], "data_nodes": [], 
                            "apis": [], "servers": []
                        },
                        integration_details=payload.agent.integration_details or {},
                        timestamps={"created_at": datetime.now().isoformat()}
                    )
                    db.add(new_agent)
                    await db.commit()
                    auto_registered = True
                    agent_action = "registered"
                except Exception as db_e:
                    await db.rollback()
                    print(f"Auto-registration failed: {db_e}")
            else:
                # Explicitly link existing agent to this repo
                try:
                    agent.source_repo_id = scan_data.repo_id
                    db.add(agent)
                    await db.commit()
                    agent_action = "updated"
                except Exception as update_e:
                    await db.rollback()
                    print(f"Agent link update failed: {update_e}")

        if payload.agent:
            background_tasks.add_task(NoSQLModel.add_telemetry_record, payload.agent.model_dump())
            
        repo_action = "updated" if repo_exists else "created"
        feedback_msg = f"Repo {repo_action} and Agent {agent_action} successfully without duplicating IDs."
        return {"status": "success", "message": feedback_msg, "auto_registered": auto_registered}
    except Exception as e:
        await db.rollback()
        print(f"Error saving repo scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to save repo scan")

@app.get("/repo_scans")
async def list_repo_scans(
    search: Optional[str] = None,
    repo_id: Optional[str] = None,
    repo_name: Optional[str] = None,
    repo_link: Optional[str] = None,
    classification: Optional[str] = None,
    confidence: Optional[str] = None,
    agent_signals: Optional[str] = None,
    evidence_files: Optional[str] = None,
    frameworks_detected: Optional[str] = None,
    reasoning: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_sql_db)
):
    try:
        query = select(RepoModelSQL)
        
        # Pre-filter with NoSQL if any NoSQL params present
        nosql_filter_active = any([
            agent_signals, evidence_files, frameworks_detected, reasoning
        ])
        
        if nosql_filter_active:
            nosql_records = await RepoModel.search_repo_records(
                search=search,
                agent_signals=agent_signals,
                evidence_files=evidence_files,
                frameworks_detected=frameworks_detected,
                reasoning=reasoning
            )
            matching_repo_ids = list(set([r["repo_id"] for r in nosql_records if "repo_id" in r]))
            if not matching_repo_ids:
                return []
            query = query.where(RepoModelSQL.repo_id.in_(matching_repo_ids))
            
        if search and str(search).strip() and not nosql_filter_active:
            search_str = f"%{str(search).strip()}%"
            query = query.where(
                or_(
                    RepoModelSQL.repo_id.ilike(search_str),
                    RepoModelSQL.repo_name.ilike(search_str),
                    RepoModelSQL.repo_link.ilike(search_str)
                )
            )

        if repo_id and str(repo_id).strip():
            query = query.where(RepoModelSQL.repo_id == str(repo_id).strip())
        if repo_name and str(repo_name).strip():
            query = query.where(RepoModelSQL.repo_name.ilike(f"%{str(repo_name).strip()}%"))
        if repo_link and str(repo_link).strip():
            query = query.where(RepoModelSQL.repo_link.ilike(f"%{str(repo_link).strip()}%"))
        if classification and str(classification).strip():
            query = query.where(RepoModelSQL.classification == str(classification).strip())
        if confidence and str(confidence).strip():
            query = query.where(RepoModelSQL.confidence == str(confidence).strip())
            
        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        repos = result.scalars().all()
        
        if not repos:
            return []
            
        async def fetch_nosql(repo):
            try:
                records = await RepoModel.search_repo_records(repo_id=repo.repo_id)
                return records[0] if records else {}
            except Exception:
                return {}
                
        nosql_results = await asyncio.gather(*(fetch_nosql(repo) for repo in repos))
        
        response = []
        for repo, nosql in zip(repos, nosql_results):
            repo_dict = jsonable_encoder(repo)
            response.append({
                "sql_data": repo_dict,
                "nosql_data": nosql
            })
            
        return response
    except Exception as e:
        print(f"Error retrieving repo scans: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve repo scans")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=settings.PORT, reload=True)

