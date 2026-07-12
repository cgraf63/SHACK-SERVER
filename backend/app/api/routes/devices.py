from fastapi import APIRouter
from app.services.device_manager import device_manager
from app.models.device import Device

router = APIRouter()


@router.get("/devices")
def get_devices():
    return device_manager.all()


@router.post("/devices")
def add_device(device: Device):
    device_manager.add(device)
    return {"result": "ok"}
