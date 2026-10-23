import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from fetch_menus import parse_menu

def test_wilbur_dinner():
    items = parse_menu((pathlib.Path(__file__).parent / "wilbur_dinner.html").read_text())
    assert len(items) == 20
    assert items[0]["name"] == "Grilled Jamaican Jerk Chicken"
    assert items[0]["allergens"] == "SOY" and not items[0]["v"]
    assert any(i["vgn"] and i["v"] for i in items)
