from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime

class SharedData(BaseModel):
    item: str
    classification: str
    is_confidential: bool
    location_path: str
    encryption_status: Optional[str] = "None"

class EventEntry(BaseModel):
    session_id: str
    used_by: str
    action: str
    duration_min: int
    files_altered: List[str] = []

class AccessRights(BaseModel):
    tools: List[str] = []
    files: List[str] = []
    data_nodes: List[str] = []
    apis: List[str] = []
    servers: List[str] = []

class AgentCreate(BaseModel):
    agent_id: str = Field(..., max_length=50)
    agent_name: str = Field(..., max_length=100)
    agent_source: str = Field(..., max_length=255)
    agent_description: Optional[str] = Field(None, max_length=500)
    owner: str = Field(..., max_length=100)
    authorized_by: str = Field(..., max_length=100)
    subscription_plan: str = Field(..., max_length=50)
    contributors: List[str] = []
    access_rights: AccessRights

    model_config = ConfigDict(from_attributes=True)

class ExternalCommInput(BaseModel):
    agent_id: str
    recipient: EmailStr
    data_shared: List[SharedData]

class ActivityInput(BaseModel):
    agent_id: str
    event: EventEntry