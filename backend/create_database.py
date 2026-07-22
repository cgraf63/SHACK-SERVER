from app.database import Base, engine

# Wichtig:
# Das Modell muss importiert werden, damit SQLAlchemy die Tabelle kennt.
from app.models.master_spot_model import MasterSpotModel


def main() -> None:
    Base.metadata.create_all(bind=engine)

    print()
    print("===================================")
    print(" SHACK-SERVER database initialized ")
    print("===================================")
    print()


if __name__ == "__main__":
    main()
