"""Создаёт финансовую модель Excel и сводку для веб-приложения."""
import json
from itertools import accumulate
from math import ceil
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

DIRECTORY = Path(__file__).resolve().parent
MONEY = '# ##0" ₸"'
PERCENT = "0.0%"
DECIMAL = "0.0"
DISCOUNT_RATE_PCT = 16
CASHFLOW_MONTHS = 24
UPLIFT_RATES = (1, 2, 3, 4, 5)
REACTIVATION_RATES = (30, 50, 70)
REPS = 25
OUTLETS_PER_REP = 100
SALES_PER_OUTLET_MONTH = 200_000
SCENARIOS = (
    ("pessimistic", "Пессимистичный"),
    ("base", "Базовый"),
    ("optimistic", "Оптимистичный"),
)
# Общие параметры хранятся в одной ячейке. Для сценарных задано три значения.
ASSUMPTIONS = (
    ("Выручка канала торговых представителей", "₸/год",
     (REPS * OUTLETS_PER_REP * SALES_PER_OUTLET_MONTH * 12,), "Снизу вверх по листу «Обоснование выручки»"),
    ("Валовая маржа", "%", (25,), "Применяется ко всему приросту выручки"),
    ("Прирост продаж от контроля визитов и плана", "%", (1.5, 3, 5), "От текущей выручки канала"),
    ("Морозильные лари компании", "шт.", (1_000,), "Установленный парк"),
    ("Доля ларей без продаж", "%", (15,), "От общего парка"),
    ("Доля ларей без продаж, возвращённых в продажи", "%", (30, 50, 70), "Перестановка или возобновление поставок"),
    ("Продажи на один активный ларь", "₸/мес.", (120_000,), "Средняя выручка активного ларя"),
    ("Списания и возвраты", "%", (2,), "Исходная доля от выручки"),
    ("Снижение списаний и возвратов", "п.п.", (0.2, 0.4, 0.6),
     "Списанная продукция оценивается по себестоимости = выручка × (1 − валовая маржа)"),
    ("Поддержка после внедрения", "₸/мес.", (700_000,), "Постоянные расходы после запуска"),
    ("Резерв на непредвиденные расходы", "%", (10,), "От прямых затрат внедрения"),
    ("Лимит бюджета", "₸", (30_000_000,), "Ограничение кейса"),
    ("Срок внедрения", "мес.", (6,), "Ограничение кейса"),
)
BUDGET_ITEMS = (
    ("Аналитика и проектирование (бизнес-аналитик, архитектор)", "CAPEX", (1_200_000, 600_000, 0, 0, 0, 0)),
    ("Разработка веб-панели и движка отклонений (2 разработчика)", "CAPEX", (0, 2_400_000, 2_400_000, 2_400_000, 1_200_000, 0)),
    ("Мобильное приложение ТП (GPS-отметки визитов, фото ларя)", "CAPEX", (0, 1_500_000, 1_500_000, 1_000_000, 0, 0)),
    ("Интеграция с 1С (продажи, план, отгрузки)", "CAPEX", (0, 0, 1_500_000, 1_500_000, 0, 0)),
    ("QR/NFC-метки на морозильные лари (1 000 шт.)", "CAPEX", (0, 0, 0, 600_000, 0, 0)),
    ("Облачная инфраструктура (хостинг в РК)", "OPEX", (150_000, 150_000, 250_000, 250_000, 250_000, 250_000)),
    ("Уведомления (Telegram-бот, SMS, e-mail), карты", "OPEX", (0, 0, 100_000, 100_000, 200_000, 200_000)),
    ("Пилот в 1 регионе и сопровождение", "OPEX", (0, 0, 0, 0, 1_500_000, 0)),
    ("Обучение ТП и супервайзеров, тиражирование", "OPEX", (0, 0, 0, 0, 500_000, 1_500_000)),
    ("Тестирование и поддержка (QA/DevOps)", "OPEX", (0, 300_000, 300_000, 300_000, 300_000, 300_000)),
)
RESERVE_LABEL = "Резерв на непредвиденные расходы"
METRICS = (
    ("revenueUplift", "Годовой прирост выручки", MONEY),
    ("grossProfitEffect", "Дополнительная валовая прибыль", MONEY),
    ("lossReduction", "Снижение потерь за год (по себестоимости)", MONEY),
    ("annualOpex", "Годовой OPEX поддержки", MONEY),
    ("netAnnualEffect", "Чистый годовой эффект", MONEY),
    ("roiYear1", "ROI 1-го года", PERCENT),
    ("paybackMonths", "Окупаемость (мес.)", DECIMAL),
)


def make_sheet(book, name, headers, widths):
    sheet = book.create_sheet(name)
    sheet.append(headers)
    sheet.freeze_panes = "B2"
    for column, width in enumerate(widths, start=1):
        sheet.column_dimensions[get_column_letter(column)].width = width
    for cell in sheet[1]:
        cell.fill = PatternFill("solid", fgColor="173D50")
        cell.font = Font(bold=True, color="FFFFFF")
    return sheet


def add_revenue_basis_sheet(book):
    sheet = make_sheet(
        book, "Обоснование выручки", ["Показатель", "Значение", "Единица", "Комментарий"],
        [57, 24, 14, 65],
    )
    for label, value, unit, comment in (
        ("Число торговых представителей", REPS, "чел.",
         "Допущение команды для среднего молочного завода РК. Уточняется по данным заказчика."),
        ("Торговых точек на одного ТП", OUTLETS_PER_REP, "точек",
         "Допущение о маршруте из 20–25 точек в день. Один визит в неделю на точку при пятидневке."),
        ("Активных торговых точек", "=B2*B3", "точек", None),
        ("Средние продажи на точку в месяц, ₸", SALES_PER_OUTLET_MONTH, "₸/мес.",
         "Допущение о средней закупке молочной продукции, от киоска до супермаркета."),
        ("Выручка канала ТП в месяц", "=B4*B5", "₸/мес.", None),
        ("Выручка канала ТП в год", "=B6*12", "₸/год", None),
        ("Выручка на одного ТП в месяц (проверка)", "=B6/B2", "₸/мес.", None),
        ("Доля точек с ларём компании (проверка)", "='Допущения'!B5/B4", "%", None),
    ):
        sheet.append([label, value, unit, comment])
        row = sheet.max_row
        if unit.startswith("₸"):
            sheet[f"B{row}"].number_format = MONEY
        if comment:
            sheet[f"B{row}"].font = Font(color="175DAD")
            sheet[f"D{row}"].alignment = Alignment(wrap_text=True, vertical="center")
            sheet.row_dimensions[row].height = 32
    sheet["B9"].number_format = PERCENT
    sheet.merge_cells("A11:D11")
    sheet["A11"] = (
        "Все значения — допущения команды для среднего молочного завода РК. "
        "На пилоте их заменят фактическими данными заказчика из 1С."
    )
    sheet["A11"].alignment = Alignment(wrap_text=True)
    sheet.row_dimensions[11].height = 32


def add_breakeven_sheet(book):
    sheet = make_sheet(
        book, "Безубыточность", ["Показатель (базовый сценарий)", "Значение", "Комментарий"],
        [75, 24, 57],
    )
    for label, formula, number_format, comment in (
        ("Инвестиции", "='Бюджет'!H13", MONEY, "Полный бюджет внедрения"),
        ("Месяцев эффекта до конца 12-го месяца от старта", "=12-'Допущения'!B14", "0",
         "Первые шесть месяцев занимает внедрение"),
        ("Требуемый чистый годовой эффект для окупаемости за 12 мес.", "=B2/B3*12", MONEY,
         "Экстраполяция необходимого месячного эффекта на год"),
        ("Валовая прибыль от ларей (базовый)", "='Эффект'!C3*'Допущения'!B3/100", MONEY,
         "Выручка от возвращённых в продажи ларей × маржа"),
        ("Снижение потерь (базовый)", "='Эффект'!C6", MONEY, "Экономия по себестоимости"),
        ("OPEX поддержки за год", "='Эффект'!C7", MONEY, "Расходы после запуска"),
        ("Мин. прирост продаж для окупаемости за 12 мес., %",
         "=(B4+B7-B5-B6)/('Допущения'!B2*'Допущения'!B3/100)*100", "0.00",
         "Эффект ларей и снижение списаний по базовому сценарию"),
        ("Мин. прирост продаж без эффекта ларей и списаний, %",
         "=(B4+B7)/('Допущения'!B2*'Допущения'!B3/100)*100", "0.00",
         "Окупаемость за счёт контроля визитов и плана"),
        ("Чистый годовой эффект без ларей (базовый)",
         "='Эффект'!C2*'Допущения'!B3/100+B6-B7", MONEY, "Экономия на списаниях сохраняется"),
        ("Окупаемость без эффекта ларей, мес. после запуска",
         '=IF(B10>0,B2/(B10/12),"Не окупается")', "0.00", "С начала получения эффекта"),
        ("Месяц окупаемости от старта без ларей",
         '=IF(B10>0,\'Допущения\'!B14+ROUNDUP(B11,0),"Не окупается")', "0",
         "Порядковый месяц проекта с учётом внедрения"),
    ):
        sheet.append([label, formula, comment])
        sheet[f"B{sheet.max_row}"].number_format = number_format


def add_cashflow_sheet(book):
    sheet = make_sheet(
        book, "Денежный поток",
        ["Месяц", "Чистый поток", "Накопленный поток", "Дисконтированный поток", "Месяц окупаемости"],
        [12, 23, 25, 31, 24],
    )
    sheet["G2"] = "Годовая ставка, %"
    sheet["H2"] = "='Допущения'!B15"
    sheet["G3"] = "Месячная ставка"
    sheet["H3"] = "=(1+H2/100)^(1/12)-1"
    sheet["H3"].number_format = "0.00%"
    sheet["G4"] = "NPV за 24 месяца"
    sheet["H4"] = f"=SUM(D2:D{CASHFLOW_MONTHS + 1})"
    sheet["H4"].number_format = MONEY
    sheet["G5"] = "Месяц окупаемости"
    sheet["H5"] = f'=IF(E{CASHFLOW_MONTHS + 1}=0,"За горизонтом",E{CASHFLOW_MONTHS + 1})'
    sheet.column_dimensions["G"].width = 27
    sheet.column_dimensions["H"].width = 23
    for month in range(1, CASHFLOW_MONTHS + 1):
        row = month + 1
        net = (
            f"=-'Бюджет'!{get_column_letter(month + 1)}13"
            if month <= 6 else "='Сценарии'!$C$6/12"
        )
        previous_payback = f"E{row - 1}" if month > 1 else "0"
        sheet[f"A{row}"] = month
        sheet[f"B{row}"] = net
        sheet[f"C{row}"] = f"=SUM(B$2:B{row})"
        sheet[f"D{row}"] = f"=B{row}/(1+$H$3)^A{row}"
        sheet[f"E{row}"] = f"=IF({previous_payback}>0,{previous_payback},IF(C{row}>=0,A{row},0))"
        sheet[f"E{row}"].number_format = '0;0;""'
        for col in "BCD":
            sheet[f"{col}{row}"].number_format = MONEY


def add_sensitivity_sheet(book):
    sheet = make_sheet(
        book, "Чувствительность",
        ["Прирост продаж, % / Возврат ларей, %", *REACTIVATION_RATES],
        [48, 22, 22, 22],
    )
    sheet["F2"] = "Чистый годовой эффект, ₸ (строки 2–6)"
    sheet["F9"] = "Окупаемость с начала эффекта, мес. (строки 9–13)"
    sheet.column_dimensions["F"].width = 57
    sheet["A8"] = "=A1"
    for col in "BCD":
        sheet[f"{col}8"] = f"={col}1"
    for cell in sheet[8]:
        if cell.column <= 4:
            cell.fill = PatternFill("solid", fgColor="173D50")
            cell.font = Font(bold=True, color="FFFFFF")

    common = "'Допущения'!$B$"
    for row, uplift in enumerate(UPLIFT_RATES, start=2):
        sheet[f"A{row}"] = uplift
        sheet[f"A{row + 7}"] = f"=A{row}"
        for col in "BCD":
            sheet[f"{col}{row}"] = (
                f"=({common}2*$A{row}/100+{common}5*{common}6/100*"
                f"{col}$1/100*{common}8*12)*{common}3/100+'Эффект'!$C$6-'Эффект'!$C$7"
            )
            sheet[f"{col}{row}"].number_format = MONEY
            sheet[f"{col}{row + 7}"] = (
                f'=IF({col}{row}>0,\'Бюджет\'!$H$13/({col}{row}/12),"Не окупается")'
            )
            sheet[f"{col}{row + 7}"].number_format = DECIMAL


def write_workbook():
    book = Workbook()
    book.remove(book.active)
    names = [name for _, name in SCENARIOS]
    inputs = make_sheet(
        book, "Допущения", ["Показатель", "Общее значение", *names, "Единица", "Комментарий"],
        [57, 19, 22, 19, 22, 12, 55],
    )
    for name, unit, values, comment in ASSUMPTIONS:
        columns = [values[0], None, None, None] if len(values) == 1 else [None, *values]
        inputs.append([name, *columns, unit, comment])
        for cell in inputs[inputs.max_row][1:5]:
            cell.font = Font(color="175DAD")
            if unit.startswith("₸"):
                cell.number_format = MONEY
    inputs.append([
        "Ставка дисконтирования, % годовых", DISCOUNT_RATE_PCT, None, None, None, "%",
        "Эффективная годовая ставка для NPV",
    ])
    inputs["B15"].font = Font(color="175DAD")
    inputs["B2"] = "='Обоснование выручки'!B7"
    inputs["B2"].font = Font()
    inputs["G10"].alignment = Alignment(wrap_text=True, vertical="center")
    inputs.row_dimensions[10].height = 32
    add_revenue_basis_sheet(book)
    budget = make_sheet(
        book, "Бюджет", ["Статья", *(f"Месяц {month}" for month in range(1, 7)), "Итого", "Тип"],
        [72, 16, 16, 16, 16, 16, 16, 18, 12],
    )
    for row, (name, category, monthly) in enumerate(BUDGET_ITEMS, start=2):
        budget.append([name, *monthly, f"=SUM(B{row}:G{row})", category])
    month_columns = "BCDEFG"
    reserve = [f"=ROUND(SUM({col}2:{col}11)*'Допущения'!$B$12/100,0)" for col in month_columns]
    budget.append([RESERVE_LABEL, *reserve, "=SUM(B12:G12)", "OPEX"])
    budget.append(["Итого", *(f"=SUM({col}2:{col}12)" for col in "BCDEFGH")])
    budget.append(["CAPEX внедрения", *(f'=SUMIF($I$2:$I$12,"CAPEX",{col}2:{col}12)' for col in "BCDEFGH")])
    budget.append(["OPEX внедрения", *(f'=SUMIF($I$2:$I$12,"OPEX",{col}2:{col}12)' for col in "BCDEFGH")])
    budget.append(["Лимит бюджета", None, None, None, None, None, None, "='Допущения'!B13"])
    budget.append(["Проверка бюджета", '=IF(H13<=H16,"OK","Превышен лимит")'])
    budget.append(["Срок внедрения (мес.)", "=COUNT(B13:G13)"])
    budget.append(["Проверка срока", '=IF(B18=\'Допущения\'!B14,"OK","Проверьте срок")'])
    for row in budget.iter_rows(min_row=2, max_row=16, min_col=2, max_col=8):
        for cell in row:
            cell.number_format = MONEY
            if cell.data_type == "n" and cell.value is not None:
                cell.font = Font(color="175DAD")

    effect = make_sheet(book, "Эффект", ["Показатель", *names], [52, 25, 25, 25])
    effect.append(["Прирост от контроля визитов и плана"])
    effect.append(["Выручка от возвращённых в продажи ларей"])
    effect.append(["Годовой прирост выручки"])
    effect.append(["Дополнительная валовая прибыль"])
    effect.append(["Снижение потерь за год (по себестоимости)"])
    effect.append(["Годовой OPEX поддержки"])
    effect.append(["Чистый годовой эффект"])
    for col, input_col in zip("BCD", "CDE"):
        common = "'Допущения'!B"
        scenario = f"'Допущения'!{input_col}"
        formulas = (
            f"={common}2*{scenario}4/100",
            f"={common}5*{common}6/100*{scenario}7/100*{common}8*12",
            f"=SUM({col}2:{col}3)",
            f"={col}4*{common}3/100",
            f"={common}2*{scenario}10/100*(1-{common}3/100)",
            f"={common}11*12",
            f"=SUM({col}5:{col}6)-{col}7",
        )
        for row, formula in enumerate(formulas, start=2):
            effect[f"{col}{row}"] = formula
            effect[f"{col}{row}"].number_format = MONEY

    scenarios = make_sheet(book, "Сценарии", ["Показатель", *names], [52, 25, 25, 25])
    for row, (_, label, number_format) in enumerate(METRICS, start=2):
        scenarios.cell(row, 1, label)
        for col in "BCD":
            if row < 7:
                formula = f"='Эффект'!{col}{row + 2}"
            elif row == 7:
                formula = f"=({col}6-'Бюджет'!H13)/'Бюджет'!H13"
            else:
                formula = f'=IF({col}6>0,\'Бюджет\'!H13/({col}6/12),"Не окупается")'
            scenarios[f"{col}{row}"] = formula
            scenarios[f"{col}{row}"].number_format = number_format

    overview = make_sheet(book, "Сводка", ["Показатель", "Значение"], [49, 24])
    for label, formula, number_format in (
        ("Инвестиции во внедрение", "='Бюджет'!H13", MONEY),
        ("CAPEX внедрения", "='Бюджет'!H14", MONEY),
        ("OPEX внедрения", "='Бюджет'!H15", MONEY),
        ("Остаток до лимита", "='Бюджет'!H16-B2", MONEY),
        ("Срок внедрения (мес.)", "='Бюджет'!B18", "0"),
        ("Проверка бюджета", "='Бюджет'!B17", "General"),
        ("Проверка срока", "='Бюджет'!B19", "General"),
        ("Чистый годовой эффект (базовый)", "='Сценарии'!C6", MONEY),
        ("ROI 1-го года (базовый)", "='Сценарии'!C7", PERCENT),
        ("Окупаемость (базовый, мес.)", "='Сценарии'!C8", DECIMAL),
    ):
        overview.append([label, formula])
        overview[f"B{overview.max_row}"].number_format = number_format
    for sheet, rows in ((budget, (13, 14, 15)), (effect, (8,)), (scenarios, (6, 7, 8))):
        for row in rows:
            for cell in sheet[row]:
                cell.fill = PatternFill("solid", fgColor="DFEFEB")
                cell.font = Font(bold=True)
                cell.alignment = Alignment(vertical="center")
    add_cashflow_sheet(book)
    add_sensitivity_sheet(book)
    add_breakeven_sheet(book)
    book.active = overview
    book.save(DIRECTORY / "financial-model.xlsx")


def write_summary():
    assumptions = [
        {"name": name, "unit": unit, "values": list(values if len(values) == 3 else values * 3)}
        for name, unit, values, _ in ASSUMPTIONS
    ]
    limit = assumptions[11]["values"][0]
    months = assumptions[12]["values"][0]
    reserve_rate = assumptions[10]["values"][0]
    direct_monthly = [sum(month) for month in zip(*(item[2] for item in BUDGET_ITEMS))]
    reserve = [round(amount * reserve_rate / 100) for amount in direct_monthly]
    items = [
        {"name": name, "type": category, "byMonth": list(monthly), "total": sum(monthly)}
        for name, category, monthly in (*BUDGET_ITEMS, (RESERVE_LABEL, "OPEX", reserve))
    ]
    by_month = [sum(month) for month in zip(*(item["byMonth"] for item in items))]
    investment = sum(by_month)
    budget = {
        "limit": limit,
        "months": months,
        "total": investment,
        "capex": sum(item["total"] for item in items if item["type"] == "CAPEX"),
        "opex": sum(item["total"] for item in items if item["type"] == "OPEX"),
        "byMonth": by_month,
        "items": items,
    }
    scenarios = []
    for index, (key, name) in enumerate(SCENARIOS):
        (
            revenue, margin, sales_growth, freezers, idle_share, reactivated_share,
            freezer_sales, _baseline_losses, reduction_pp, support, *_budget_inputs,
        ) = [item["values"][index] for item in assumptions]
        uplift = revenue * sales_growth / 100 + freezers * idle_share / 100 * reactivated_share / 100 * freezer_sales * 12
        gross_profit = uplift * margin / 100
        loss_reduction = revenue * reduction_pp / 100 * (1 - margin / 100)
        opex = support * 12
        net = gross_profit + loss_reduction - opex
        scenarios.append({
            "key": key,
            "name": name,
            "revenueUplift": round(uplift),
            "grossProfitEffect": round(gross_profit),
            "lossReduction": round(loss_reduction),
            "annualOpex": round(opex),
            "netAnnualEffect": round(net),
            "roiYear1": (net - investment) / investment,
            "paybackMonths": investment / (net / 12) if net > 0 else None,
        })
    base = scenarios[1]
    outlets = REPS * OUTLETS_PER_REP
    monthly_revenue = outlets * SALES_PER_OUTLET_MONTH
    revenue_basis = {
        "reps": REPS,
        "outletsPerRep": OUTLETS_PER_REP,
        "outlets": outlets,
        "salesPerOutletMonth": SALES_PER_OUTLET_MONTH,
        "monthlyRevenue": monthly_revenue,
        "annualRevenue": monthly_revenue * 12,
        "revenuePerRepMonth": round(monthly_revenue / REPS),
        "freezerOutletShare": assumptions[3]["values"][1] / outlets,
    }

    gross_profit_basis = revenue_basis["annualRevenue"] * assumptions[1]["values"][1] / 100
    gross_profit_visits = gross_profit_basis * assumptions[2]["values"][1] / 100
    gross_profit_freezers = base["grossProfitEffect"] - gross_profit_visits
    required_effect = investment / (12 - months) * 12
    required_gross_profit = required_effect + base["annualOpex"]
    net_no_freezers = gross_profit_visits + base["lossReduction"] - base["annualOpex"]
    payback_no_freezers = investment / (net_no_freezers / 12) if net_no_freezers > 0 else None
    breakeven = {
        "requiredNetAnnualEffect12m": round(required_effect),
        "minUpliftPct12m": (required_gross_profit - gross_profit_freezers - base["lossReduction"]) / gross_profit_basis * 100,
        "minUpliftPctNoOtherEffects": required_gross_profit / gross_profit_basis * 100,
        "netAnnualEffectNoFreezers": round(net_no_freezers),
        "paybackMonthsNoFreezers": payback_no_freezers,
        "paybackMonthFromStartNoFreezers": months + ceil(payback_no_freezers) if payback_no_freezers is not None else None,
    }

    months = list(range(1, CASHFLOW_MONTHS + 1))
    monthly_benefit = base["netAnnualEffect"] / 12
    net = [-amount for amount in by_month] + [monthly_benefit] * (CASHFLOW_MONTHS - len(by_month))
    cumulative = list(accumulate(net))
    monthly_discount = (1 + DISCOUNT_RATE_PCT / 100) ** (1 / 12) - 1
    cashflow = {
        "discountRatePct": DISCOUNT_RATE_PCT,
        "months": months,
        "net": net,
        "cumulative": cumulative,
        "paybackMonth": next((month for month, amount in zip(months, cumulative) if amount >= 0), None),
        "npv": round(sum(amount / (1 + monthly_discount) ** month for month, amount in zip(months, net))),
    }
    summary = {
        "currency": "₸", "budget": budget, "scenarios": scenarios, "assumptions": assumptions,
        "cashflow": cashflow, "revenueBasis": revenue_basis, "breakeven": breakeven,
    }
    (DIRECTORY / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )


if __name__ == "__main__":
    write_workbook()
    write_summary()
