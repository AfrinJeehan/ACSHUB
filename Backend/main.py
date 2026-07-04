import os
import secrets
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from mangum import Mangum  # Required to bridge FastAPI and AWS Lambda

# ==========================================
# 1. DATABASE CONFIGURATION
# ==========================================
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+pg8000://postgres:You6m%40tter@localhost:5432/acshub_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class BuyerDB(Base):
    __tablename__ = "buyers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String)
    company_name = Column(String)
    business_type = Column(String)
    address = Column(String)
    onboarding_goal = Column(String)
    password = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending | approved | rejected
    created_at = Column(DateTime, default=func.now())


class AdminDB(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())


class AdminSessionDB(Base):
    __tablename__ = "admin_sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_default_admin():
    db = SessionLocal()
    try:
        existing = db.query(AdminDB).filter(AdminDB.username == "admin").first()
        if not existing:
            db.add(AdminDB(username="admin", password_hash=pwd_context.hash("admin123")))
            db.commit()
    finally:
        db.close()


seed_default_admin()

# ==========================================
# 2. FASTAPI CONFIGURATION & ROUTING
# ==========================================
app = FastAPI(title="ACSHUB Local Platform")

# Update CORS to allow requests from your frontend development server (usually port 5173 for Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_admin(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in as admin.")
    
    token = authorization.split(" ", 1)[1]
    session_record = db.query(AdminSessionDB).filter(AdminSessionDB.token == token).first()
    if not session_record:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    
    return session_record.username


# ---------- Pydantic Schemas ----------
class BuyerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    company_name: str
    business_type: str
    address: str
    onboarding_goal: str
    password: str


class BuyerUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    company_name: str | None = None
    business_type: str | None = None
    address: str | None = None
    onboarding_goal: str | None = None
    status: str | None = None  # "pending" | "approved" | "rejected"


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminRegister(BaseModel):
    username: str
    password: str


# ==========================================
# 3. BUYER CRUD APIs (Isolated with /api)
# ==========================================

@app.post("/api/buyer", status_code=201)
def create_buyer(buyer: BuyerCreate, db: Session = Depends(get_db)):
    existing = db.query(BuyerDB).filter(BuyerDB.email == buyer.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A company with this email is already registered.")

    db_buyer = BuyerDB(**buyer.dict())
    db.add(db_buyer)
    db.commit()
    db.refresh(db_buyer)
    return db_buyer


@app.get("/api/buyer")
def get_all_buyers(db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    return db.query(BuyerDB).order_by(BuyerDB.id.desc()).all()


@app.put("/api/buyer/{buyer_id}")
def update_buyer(
    buyer_id: int,
    updates: BuyerUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    buyer = db.query(BuyerDB).filter(BuyerDB.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")

    data = updates.dict(exclude_unset=True)
    if "status" in data and data["status"] not in ("pending", "approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be pending, approved, or rejected.")

    for field, value in data.items():
        setattr(buyer, field, value)

    db.commit()
    db.refresh(buyer)
    return buyer


@app.delete("/api/buyer/{buyer_id}")
def delete_buyer(buyer_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    buyer = db.query(BuyerDB).filter(BuyerDB.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found.")
    db.delete(buyer)
    db.commit()
    return {"message": "Successfully deleted buyer record from PostgreSQL."}


# ==========================================
# 4. ADMIN AUTH APIs (Isolated with /api)
# ==========================================

@app.post("/api/admin/login")
def admin_login(credentials: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(AdminDB).filter(AdminDB.username == credentials.username).first()
    if not admin or not pwd_context.verify(credentials.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = secrets.token_hex(16)
    
    new_session = AdminSessionDB(token=token, username=admin.username)
    db.add(new_session)
    db.commit()
    
    return {"token": token, "username": admin.username}


@app.post("/api/admin/logout")
def admin_logout(db: Session = Depends(get_db), authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        db.query(AdminSessionDB).filter(AdminSessionDB.token == token).delete()
        db.commit()
    return {"message": "Logged out."}


@app.post("/api/admin/register", status_code=201)
def admin_register(new_admin: AdminRegister, db: Session = Depends(get_db)):
    existing = db.query(AdminDB).filter(AdminDB.username == new_admin.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="That admin username is already taken.")
    db_admin = AdminDB(username=new_admin.username, password_hash=pwd_context.hash(new_admin.password))
    db.add(db_admin)
    db.commit()
    return {"message": f"Admin '{new_admin.username}' created."}


# ==========================================
# 5. FRONTEND INTEGRATION & MANGUM HANDLER
# ==========================================

# Serve Vite build production static files if the 'dist' directory exists
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        # Explicitly ignore API calls from frontend file tracking
        if catchall.startswith("api"):
            raise HTTPException(status_code=404, detail="API Endpoint Not Found")

        file_path = os.path.join("dist", catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("dist/index.html")

# The wrapper object that intercepts AWS Lambda invocations 
handler = Mangum(app)


if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        if catchall.startswith("api"):
            raise HTTPException(status_code=404, detail="API Endpoint Not Found")
        
        file_path = os.path.join("dist", catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("dist/index.html")