from app.models.spot import Spot
from app.repositories.sqlite_repository import SQLiteRepository
from app.services.fusion_engine import FusionEngine


def main():

    repository = SQLiteRepository()

    fusion = FusionEngine(repository)

    spot = Spot(
        callsign="HB9ISO",
        frequency=14.074,
        mode="FT8",
        source="TEST",
        comment="Pipeline Test",
    )

    fusion.add(spot)

    print()
    print("Stored spots:")
    print("----------------")

    for master in repository.all():
        print(master)

    repository.close()


if __name__ == "__main__":
    main()
