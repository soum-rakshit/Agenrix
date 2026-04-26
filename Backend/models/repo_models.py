from config.db_nosql import db
from typing import List, Dict, Any, Optional

repo_collection = db["repo_intelligence"]

class RepoModel:
    @staticmethod
    async def create_scan_result(data: dict):
        # We only store NoSQL data here.
        nosql_data = {
            "repo_id": data.get("repo_id"),
            "agent_signals": data.get("agent_signals", []),
            "evidence_files": data.get("evidence_files", []),
            "frameworks_detected": data.get("frameworks_detected", []),
            "reasoning": data.get("reasoning", "")
        }
        
        return await repo_collection.update_one(
            {"repo_id": data["repo_id"]},
            {"$set": nosql_data},
            upsert=True
        )

    @staticmethod
    async def search_repo_records(
        search: Optional[str] = None,
        repo_id: Optional[str] = None,
        agent_signals: Optional[str] = None,
        evidence_files: Optional[str] = None,
        frameworks_detected: Optional[str] = None,
        reasoning: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = {}
        
        if repo_id:
            query["repo_id"] = repo_id
            
        if agent_signals:
            query["agent_signals"] = {"$regex": agent_signals, "$options": "i"}
            
        if evidence_files:
            query["evidence_files"] = {"$regex": evidence_files, "$options": "i"}
            
        if frameworks_detected:
            query["frameworks_detected"] = {"$regex": frameworks_detected, "$options": "i"}
            
        if reasoning:
            query["reasoning"] = {"$regex": reasoning, "$options": "i"}
            
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"agent_signals": search_regex},
                {"evidence_files": search_regex},
                {"frameworks_detected": search_regex},
                {"reasoning": search_regex}
            ]

        cursor = repo_collection.find(query)
        results = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)
            
        return results
