from fastapi import APIRouter, HTTPException

from app.repositories.sqlite_repository import SQLiteRepository

router = APIRouter()

repository = SQLiteRepository()


@router.get("/health")
def health():
    """
    Health endpoint.
    """
    return {
        "status": "ok",
        "version": "0.4.0",
    }


@router.get("/spots")
def get_spots():
    """
    Return all MasterSpots.
    """
    return repository.all()


@router.get("/spots/{key}")
def get_spot(key: str):
    """
    Return one MasterSpot.
    """
    spot = repository.get(key)

    if spot is None:
        raise HTTPException(
            status_code=404,
            detail="Spot not found",
        )

    return spot
