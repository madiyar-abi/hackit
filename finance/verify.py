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
        for sheet in (
            "Бюджет", "Эффект", "Сценарии", "Денежный поток", "Чувствительность",
            "Обоснование выручки", "Безубыточность",
        ):
            assert any(cell.data_type == "f" for row in workbook[sheet].rows for cell in row), sheet
        assert workbook["Допущения"]["B2"].data_type == "f"
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

    cash = summary["cashflow"]
    cash_sheet = "Денежный поток"
    compare(cash_sheet, "H2", cash["discountRatePct"], 0)
    monthly_discount = (1 + cash["discountRatePct"] / 100) ** (1 / 12) - 1
    compare(cash_sheet, "H3", monthly_discount, 1e-9)
    compare(cash_sheet, "H4", cash["npv"])
    payback_month = cash["paybackMonth"]
    assert cell(cash_sheet, "H5") == (payback_month if payback_month is not None else "За горизонтом")
    assert cash["months"] == list(range(1, 25))
    for month, net, cumulative in zip(cash["months"], cash["net"], cash["cumulative"], strict=True):
        compare(cash_sheet, f"A{month + 1}", month, 0)
        compare(cash_sheet, f"B{month + 1}", net)
        compare(cash_sheet, f"C{month + 1}", cumulative)
        compare(cash_sheet, f"D{month + 1}", net / (1 + monthly_discount) ** month)

    base_inputs = {item["name"]: item["values"][1] for item in summary["assumptions"]}
    revenue = base_inputs["Выручка канала торговых представителей"]
    margin = base_inputs["Валовая маржа"] / 100
    idle_freezers = (
        base_inputs["Морозильные лари компании"] * base_inputs["Доля ларей без продаж"] / 100
    )
    annual_freezer_sales = base_inputs["Продажи на один активный ларь"] * 12
    base = summary["scenarios"][1]
    for column, reduction_pp in zip(
        "BCD", summary["assumptions"][8]["values"], strict=True,
    ):
        compare("Эффект", f"{column}6", revenue * reduction_pp / 100 * (1 - margin))
    sensitivity = "Чувствительность"
    for col, reactivation in zip("BCD", (30, 50, 70), strict=True):
        compare(sensitivity, f"{col}1", reactivation, 0)
        compare(sensitivity, f"{col}8", reactivation, 0)
        for uplift in range(1, 6):
            row = uplift + 1
            compare(sensitivity, f"A{row}", uplift, 0)
            compare(sensitivity, f"A{row + 7}", uplift, 0)
            uplift_revenue = revenue * uplift / 100 + idle_freezers * reactivation / 100 * annual_freezer_sales
            net = uplift_revenue * margin + base["lossReduction"] - base["annualOpex"]
            compare(sensitivity, f"{col}{row}", net)
            compare(sensitivity, f"{col}{row + 7}", 12 * budget["total"] / net, 1e-9)

    revenue_basis = summary["revenueBasis"]
    for row, key in enumerate((
        "reps", "outletsPerRep", "outlets", "salesPerOutletMonth", "monthlyRevenue",
        "annualRevenue", "revenuePerRepMonth", "freezerOutletShare",
    ), start=2):
        tolerance = 1e-9 if row == 9 else 1 if row >= 5 else 0
        compare("Обоснование выручки", f"B{row}", revenue_basis[key], tolerance)
    compare("Допущения", "B2", revenue_basis["annualRevenue"])
    breakeven = summary["breakeven"]
    for row, key, tolerance in (
        (4, "requiredNetAnnualEffect12m", 1),
        (8, "minUpliftPct12m", 1e-9),
        (9, "minUpliftPctNoOtherEffects", 1e-9),
        (10, "netAnnualEffectNoFreezers", 1),
        (11, "paybackMonthsNoFreezers", 1e-9),
        (12, "paybackMonthFromStartNoFreezers", 0),
    ):
        expected = breakeven[key]
        if expected is None:
            assert cell("Безубыточность", f"B{row}") == "Не окупается"
        else:
            compare("Безубыточность", f"B{row}", expected, tolerance)
    print("Формулы Excel совпадают со сводкой. Бюджет и срок в пределах ограничений.")


if __name__ == "__main__":
    if importlib.util.find_spec("formulas") is None:
        interpreter = DIRECTORY / ".venv" / "bin" / "python"
        if interpreter.exists() and Path(sys.prefix) != DIRECTORY / ".venv":
            os.execv(interpreter, [str(interpreter), str(Path(__file__).resolve())])
        raise SystemExit("Установите formulas по инструкции в finance/README.md.")
    verify()
