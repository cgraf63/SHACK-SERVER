"""
Unit tests for SpiderParser.
"""

import pytest

from app.parsers.spider_parser import SpiderParser


def test_parser_can_be_created():
    """The parser can be instantiated."""
    parser = SpiderParser()
    assert parser is not None


def test_parse_not_implemented():
    """The skeleton parser should raise NotImplementedError."""
    parser = SpiderParser()

    with pytest.raises(NotImplementedError):
        parser.parse("DX de HB9ON: 14074.0 DL1ABC FT8 CQ TEST")


def test_parse_simple_dxspot():
    """Parse a simple DXSpider spot."""
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
