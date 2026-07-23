import asyncio

from app.core.application import ShackServer


async def main():

    server = ShackServer()

    try:
        await server.start()
        await server.run()

    finally:
        await server.stop()


if __name__ == "__main__":
    asyncio.run(main())
