from app.models.device import Device


class DeviceManager:

    def __init__(self):
        self.devices = {}

    def add(self, device: Device):
        self.devices[device.id] = device

    def remove(self, device_id: str):
        self.devices.pop(device_id, None)

    def get(self, device_id: str):
        return self.devices.get(device_id)

    def all(self):
        return list(self.devices.values())


device_manager = DeviceManager()
