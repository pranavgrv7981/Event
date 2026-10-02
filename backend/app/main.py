"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.api.routes import router
from app.database import initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Event Operations Command Center API",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Event Operations Command Center API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
