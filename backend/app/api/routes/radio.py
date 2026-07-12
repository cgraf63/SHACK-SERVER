from fastapi import APIRouter

router = APIRouter()

@router.get("/radio")

def get_radio():

    return {
        "connected": False,
        "radio": None
    }
