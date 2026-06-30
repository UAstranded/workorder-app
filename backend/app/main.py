from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, UPLOAD_DIR
from app.database import init_db
from app.routers import auth, work_orders, images
from app.routers.settings import router as settings_router
from app.routers.expenses import router as expenses_router
from app.routers.account import router as account_router
from app.routers.work_orders import public_router
from app.routers.calendar import router as calendar_router
from app.services.export_router import router as export_router

import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(title="Work Order Manager", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(work_orders.router)
app.include_router(images.router)
app.include_router(settings_router)
app.include_router(expenses_router)
app.include_router(account_router)
app.include_router(public_router)
app.include_router(calendar_router)
app.include_router(export_router)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
