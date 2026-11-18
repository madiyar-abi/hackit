"""Сверяет рассчитанные формулы Excel с данными для веб-приложения."""
import importlib.util
import json
import os
from pathlib import Path
import sys
from math import isclose

from openpyxl import load_workbook

DIRECTORY = Path(__file__).resolve().parent
WORKBOOK = DIRECTORY / "financial-model.xlsx"


def verify():
    import formulas

    summary = json.loads((DIRECTORY / "summary.json").read_text(encoding="utf-8"))
    with WORKBOOK.open("rb") as source:
        workbook = load_workbook(source, read_only=True)
        for sheet in ("Бюджет", "Эффект", "Сценарии"):
            assert any(cell.data_type == "f" for row in workbook[sheet].rows for cell in row), sheet
        workbook.close()

    model = formulas.ExcelModel().loads(str(WORKBOOK)).finish()
    calculated = model.calculate()

    def cell(sheet, address):
        key = f"'[{WORKBOOK.name}]{sheet.upper()}'!{address}"
        return calculated[key].value.item()

    def compare(sheet, address, expected, tolerance=1):
        actual = cell(sheet, address)
        assert isclose(actual, expected, rel_tol=0, abs_tol=tolerance), (
            f"{sheet}!{address}: {actual} ≠ {expected}"
        )

    budget = summary["budget"]
    for address, key in (("H13", "total"), ("H14", "capex"), ("H15", "opex"), ("H16", "limit")):
        compare("Бюджет", address, budget[key])
    for column, amount in zip("BCDEFG", budget["byMonth"], strict=True):
        compare("Бюджет", f"{column}13", amount)
    assert cell("Бюджет", "H13") <= 30_000_000
    assert cell("Бюджет", "B18") == budget["months"] == 6
    assert cell("Бюджет", "B17") == cell("Бюджет", "B19") == "OK"

    metrics = (
        "revenueUplift", "grossProfitEffect", "lossReduction", "annualOpex",
        "netAnnualEffect", "roiYear1", "paybackMonths",
    )
    for column, scenario in zip("BCD", summary["scenarios"], strict=True):
        for row, key in enumerate(metrics, start=2):
            tolerance = 1 if row <= 6 else 1e-9
            compare("Сценарии", f"{column}{row}", scenario[key], tolerance)
        compare("Эффект", f"{column}8", scenario["netAnnualEffect"])
    print("Формулы Excel совпадают со сводкой. Бюджет и срок в пределах ограничений.")


if __name__ == "__main__":
    if importlib.util.find_spec("formulas") is None:
        interpreter = DIRECTORY / ".venv" / "bin" / "python"
        if interpreter.exists() and Path(sys.prefix) != DIRECTORY / ".venv":
            os.execv(interpreter, [str(interpreter), str(Path(__file__).resolve())])
        raise SystemExit("Установите formulas по инструкции в finance/README.md.")
    verify()
