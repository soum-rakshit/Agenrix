import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    MONGO_URI: str = os.getenv("MONGODB_URI")
    POSTGRES_URI: str = os.getenv("POSTGRES_URI")
    PORT: int = int(os.getenv("PORT"))
    _origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    ALLOWED_ORIGINS: list = _origins.split(",")
    

settings = Settings()