"""
Unit tests for SpiderParser.
"""

import pytest

from app.parsers.spider_parser import SpiderParser


def test_parser_can_be_created():
    parser = SpiderParser()
    assert parser is not None


def test_parse_simple_dxspot():
    parser = SpiderParser()

    spot = parser.parse(
        "DX de HB9ON: 14074.0 DL1ABC FT8 CQ TEST"
    )

    assert spot.source == "HB9ON"
    assert spot.spotter == "HB9ON"
    assert spot.frequency == 14074.0
    assert spot.callsign == "DL1ABC"
    assert spot.mode == "FT8"
    assert spot.comment == "CQ TEST"


def test_invalid_line():
    parser = SpiderParser()

    with pytest.raises(ValueError):
        parser.parse("Hello World")
