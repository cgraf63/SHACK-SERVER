import asyncio

from app.recorders.line_recorder import LineRecorder


async def main():

    recorder = LineRecorder(
        "data/captures/test.log"
    )

    await recorder.record(
        "HB9ON",
        "DX de HB9ON: VK9AA 14025 CW UP2"
    )

    await recorder.record(
        "HB9ON",
        "DX de HB9ON: JA1ABC 21025 CW"
    )

    print("Recorder test completed.")


asyncio.run(main())
