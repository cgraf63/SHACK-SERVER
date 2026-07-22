"""
Unit tests for SpiderParser.
"""

from pathlib import Path
DATA_DIR = Path(__file__).parent.parent / "data" / "spider"

import pytest

from app.parsers.spider_parser import SpiderParser



def test_parser_can_be_created():
    parser = SpiderParser()
    assert parser is not None


def test_parse_all_dxspots():
    parser = SpiderParser()

    with open(DATA_DIR / "dxspots.txt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue

            spot = parser.parse(line)

            assert spot.callsign != ""
            assert spot.frequency > 0
            assert spot.source != ""


def test_parse_invalid_lines():
    parser = SpiderParser()

    with open(DATA_DIR / "malformed.txt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue

            with pytest.raises(ValueError):
                parser.parse(line)
