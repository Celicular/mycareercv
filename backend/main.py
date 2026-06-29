from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth_router
from routers import resume_router
from routers import template_router
from routers import cover_letter_router
from routers import contact_router

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MyCareerCV API")

# CORS setup for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "https://mycareercv.com", "https://mycareercv.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(resume_router.router)
app.include_router(template_router.router)
app.include_router(cover_letter_router.router)
app.include_router(contact_router.router)

from fastapi.staticfiles import StaticFiles
import os

# Mount the uploads directory statically
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
def read_root():
    return {"status": "MyCareerCV API is running"}
