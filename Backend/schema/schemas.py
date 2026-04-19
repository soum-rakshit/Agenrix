from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime

# --- Shared Utility Schemas ---
# Used primarily for the NoSQL Activity Log
class ResourceAffected(BaseModel):
    resource_name: str
    location_path: str
    operation: str  # READ, WRITE, DELETE
    is_confidential: bool = False

class SharedData(BaseModel):
    item_name: str
    location_path: str
    is_confidential: bool = True

# --- 1. Agent Schema (Modified for SQL) ---
class AccessRights(BaseModel):
    tools: List[str] = []
    files: List[str] = []
    data_nodes: List[str] = []
    apis: List[str] = []
    servers: List[str] = []

class AgentCreate(BaseModel):
    agent_id: str = Field(..., max_length=50) # Matching SQL String(50)
    agent_name: str = Field(..., max_length=100)
    agent_source: str = Field(..., max_length=255)
    agent_description: Optional[str] = Field(None, max_length=500)
    owner: str = Field(..., max_length=100)
    authorized_by: str = Field(..., max_length=100)
    subscription_plan: str = Field(..., max_length=50)
    contributors: List[str] = []
    access_rights: AccessRights

    # This allows Pydantic to work with SQLAlchemy models (ORM mode)
    model_config = ConfigDict(from_attributes=True)

# --- 2. External Communication Schema (NoSQL) ---
class ExternalCommCreate(BaseModel):
    agent_id: str
    recipient: EmailStr
    approver_id: str
    shared_data: List[SharedData]
    timestamp: datetime = Field(default_factory=datetime.now)

# --- 3. Activity Log Schema (NoSQL - High Volume) ---
class LogEntry(BaseModel):
    session_id: str
    used_by: str
    session_authorizer_id: str
    action_type: str
    task_details: str
    duration_minutes: int
    resources_affected: List[ResourceAffected]
    timestamp: datetime = Field(default_factory=datetime.now)