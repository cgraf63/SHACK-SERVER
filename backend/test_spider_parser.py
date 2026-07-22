"""
Unit tests for SpiderParser.
"""

import pytest

from app.parsers.spider_parser import SpiderParser


def test_parser_can_be_created():
    parser = SpiderParser()
    assert parser is not None


def test_parse_not_implemented():
    parser = SpiderParser()

    with pytest.raises(NotImplementedError):
        parser.parse("DX de HB9ON: 14074.0 DL1ABC FT8 CQ TEST")
