from fastapi import APIRouter, HTTPException

from app.repositories.sqlite_repository import SQLiteRepository

router = APIRouter(
    prefix="/spots",
    tags=["Spots"],
)

repository = SQLiteRepository()


@router.get("/")
def get_spots():
    return repository.all()


@router.get("/{key}")
def get_spot(key: str):
    spot = repository.get(key)

    if spot is None:
        raise HTTPException(
            status_code=404,
            detail="Spot not found",
        )

    return spot
