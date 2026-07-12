"""
SHACK-SERVER
Core Logger
"""

import logging


def get_logger() -> logging.Logger:
    logger = logging.getLogger("shack-server")

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s"
    )

    console = logging.StreamHandler()
    console.setFormatter(formatter)

    logger.addHandler(console)

    return logger
