from pydantic import BaseModel, Field, EmailStr, ConfigDict
from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone

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
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AccessRights(BaseModel):
    tools: List[str] = []
    files: List[str] = []
    data_nodes: List[str] = []
    apis: List[str] = []
    servers: List[str] = []

class AgentCreate(BaseModel):
    agent_id: str = Field(..., max_length=50)
    agent_name: str = Field(..., max_length=100)
    source_repo_id: str = Field(..., max_length=255)
    agent_description: Optional[str] = Field(None, max_length=500)
    owner: str = Field(..., max_length=100)
    authorized_by: str = Field(..., max_length=100)
    subscription_plan: str = Field(..., max_length=50)
    contributors: Optional[List[str]] = []
    access_rights: AccessRights

    model_config = ConfigDict(from_attributes=True)



class WorkerRawLog(BaseModel):
    agent_id: str
    agent_name: Optional[str] = None
    agent_description: Optional[str] = None
    owner: Optional[str] = "System-Auto"
    authorized_by: Optional[str] = "Worker-Scan"
    subscription_plan: Optional[str] = "Free"
    contributors: Optional[List[str]] = []
    access_rights: Optional[dict] = {"read": True, "write": False, "delete": False}
    integration_details: Optional[dict] = {"apis": [], "files": [], "tools": [], "servers": [], "data_nodes": []}
    
    event: Optional[EventEntry] = None
    recipient: Optional[str] = None
    data_shared: Optional[List[SharedData]] = []
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClassificationEnum(str, Enum):
    AGENT = "AGENT"
    POSSIBLE_AGENT = "POSSIBLE_AGENT"
    NOT_AGENT = "NOT_AGENT"

class ConfidenceEnum(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class RepoScanResult(BaseModel):
    repo_id: str
    repo_name: str
    repo_link: str
    classification: Optional[ClassificationEnum] = None
    confidence: Optional[ConfidenceEnum] = None
    agent_signals: Optional[List[str]] = []
    evidence_files: Optional[List[str]] = []
    frameworks_detected: Optional[List[str]] = []
    reasoning: Optional[str] = None

class UnifiedIngestionPayload(BaseModel):
    repo: RepoScanResult
    agent: Optional[WorkerRawLog] = None