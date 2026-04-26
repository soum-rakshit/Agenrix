from sqlalchemy import Column, Integer, String
from config.db_sql import Base

class RepoModelSQL(Base):
    __tablename__ = "repos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_id = Column(String(255), unique=True, index=True, nullable=False)
    repo_name = Column(String(255), nullable=False)
    repo_link = Column(String(500), unique=True, nullable=False)
    classification = Column(String(100))
    confidence = Column(String(50))
    
