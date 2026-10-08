"""Construye la versión corregida de 'Cómo está mi facultad'.

Uso: python build_facultad.py ORIGINAL.xlsx BASE_DE_DATOS.xlsx SALIDA.xlsx
"""
import re
import sys
import time
import datetime as dt
from copy import copy

import openpyxl
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.data_source import AxDataSource, StrRef
from openpyxl.chart.shapes import GraphicalProperties
from openpyxl.chart.text import RichText, Text
from openpyxl.chart.title import Title
from openpyxl.comments import Comment
from openpyxl.drawing.line import LineProperties
from openpyxl.drawing.text import (CharacterProperties, Font as DFont, Paragraph,
                                   ParagraphProperties, RegularTextRun)
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.formatting.formatting import ConditionalFormattingList
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.filters import AutoFilter
from openpyxl.worksheet.table import TableColumn, TableFormula

SRC, BASE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
T0 = time.time()


def log(msg):
    print(f"[{time.time() - T0:6.1f}s] {msg}", flush=True)


# ---------------------------------------------------------------- estilo (mismo del libro)
NAVY, BLUE, GRAY, INPUT, LIGHT = "16324F", "235B8E", "617182", "FFF2CC", "EAF0F6"
F_BODY = Font(name="Arial", size=10, color="FF" + NAVY)
F_BOLD = Font(name="Arial", size=10, color="FF" + NAVY, bold=True)
F_BIG = Font(name="Arial", size=12, color="FF" + NAVY, bold=True)
F_TITLE = Font(name="Arial", size=16, color="FF" + NAVY, bold=True)
F_HEAD = Font(name="Arial", size=10, color="FFFFFFFF", bold=True)
F_SUB = Font(name="Arial", size=10, color="FF" + BLUE, bold=True)
F_NOTE = Font(name="Arial", size=9, color="FF" + GRAY, italic=True)
F_LINK = Font(name="Arial", size=10, color="FF" + BLUE, underline="single")
F_AUX = Font(name="Arial", size=8, color="FFA6A6A6")
FILL_NAVY = PatternFill("solid", fgColor="FF" + NAVY)
FILL_INPUT = PatternFill("solid", fgColor="FF" + INPUT)
FILL_LIGHT = PatternFill("solid", fgColor="FF" + LIGHT)
FILL_AUXHEAD = PatternFill("solid", fgColor="FF8497B0")
THIN = Side(style="thin", color="FFD9E1EA")
INPUT_SIDE = Side(style="thin", color="FFBF9000")
B_ROW = Border(bottom=THIN)
B_INPUT = Border(left=INPUT_SIDE, right=INPUT_SIDE, top=INPUT_SIDE, bottom=INPUT_SIDE)
A_LEFT = Alignment(vertical="center")
A_HLEFT = Alignment(horizontal="left", vertical="center")
A_WRAP = Alignment(vertical="center", wrap_text=True)
A_CENTER = Alignment(horizontal="center", vertical="center")
A_TOPWRAP = Alignment(vertical="top", wrap_text=True)
GREEN_F, GREEN_B = Font(color="FF006100", bold=True), PatternFill("solid", bgColor="FFC6EFCE")
RED_F, RED_B = Font(color="FF9C0006", bold=True), PatternFill("solid", bgColor="FFFFC7CE")
AMBER_F, AMBER_B = Font(color="FF9C5700", bold=True), PatternFill("solid", bgColor="FFFFEB9C")

FACULTADES = ["INGENIERÍA", "BÁSICAS", "EMPRESARIALES Y ECONÓMICAS", "SALUD", "HUMANIDADES", "EDUCACIÓN"]
CORTE = dt.date(2026, 10, 7)

# Filas de la zona de búsqueda en Consulta (las usan las columnas auxiliares de TEstudiantes)
R_Q, R_FAC, R_PROG, R_MAT, R_CNT, R_N, R_MSG = 5, 6, 7, 8, 9, 10, 11


def style(cell, font=F_BODY, fill=None, align=A_LEFT, fmt=None, border=None):
    cell.font = font
    if fill is not None:
        cell.fill = fill
    if align is not None:
        cell.alignment = align
    if fmt is not None:
        cell.number_format = fmt
    if border is not None:
        cell.border = border
    return cell


def put(ws, ref, value, **kw):
    c = ws[ref]
    c.value = value
    return style(c, **kw)


def header_bar(ws, first, last, row, text, fill=FILL_NAVY, font=F_HEAD, height=22):
    for col in range(first, last + 1):
        c = ws.cell(row, col)
        c.fill = fill
        c.font = font
        c.alignment = A_LEFT
    ws.cell(row, first).value = text
    ws.row_dimensions[row].height = height


def clean(v):
    if isinstance(v, str):
        return re.sub(r"\s+", " ", v).strip()
    return v


def as_int(v):
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


# ---------------------------------------------------------------- 1. leer BASE_DE_DATOS
log("Leyendo BASE_DE_DATOS")
src = openpyxl.load_workbook(BASE, read_only=True, data_only=True)
rows = []
for fac in FACULTADES:
    first = True
    for r in src[fac].iter_rows(min_col=2, max_col=25, values_only=True):
        if first:
            first = False
            continue
        if all(v is None or (isinstance(v, str) and not v.strip()) for v in r):
            continue
        (periodo, programa, modalidad, codigo, sexo, nombres, apellidos, mod_ing, matric, cancel,
         cupo, plan, prom, tipo_doc, num_doc, nac, estrato, origen, dep_o, mun_o, colegio,
         tipo_col, dep_c, mun_c) = r
        if isinstance(nac, dt.datetime):
            nac = nac.date()
        elif isinstance(nac, (int, float)):
            nac = (dt.datetime(1899, 12, 30) + dt.timedelta(days=int(nac))).date()
        rows.append({
            "Facultad": fac,
            "Periodo original": clean(str(periodo)),
            "Programa": clean(programa),
            "Modalidad": clean(modalidad),
            "Codigo": clean(str(as_int(codigo))),
            "Sexo": clean(sexo),
            "Nombres": clean(nombres),
            "Apellidos": clean(apellidos),
            "Modalidad ingreso": clean(mod_ing),
            "Matriculado": clean(matric),
            "Cancelacion semestre": clean(cancel),
            "Cupo especial": clean(cupo),
            "Plan estudio": as_int(plan),
            "Promedio origen": as_int(prom),
            "Tipo documento": clean(tipo_doc),
            "Documento": clean(str(as_int(num_doc))),
            "Nacimiento": nac,
            "Estrato": as_int(estrato),
            "Origen": clean(origen),
            "Departamento origen": clean(dep_o),
            "Municipio origen": clean(mun_o),
            "Colegio": clean(colegio),
            "Tipo colegio": clean(tipo_col),
            "Departamento colegio": clean(dep_c),
            "Municipio colegio": clean(mun_c),
        })
fin = {}
for prog, potencial, matric in src["MATRICULA FINANCIERA 2026-2 "].iter_rows(min_row=3, min_col=2, max_col=4,
                                                                         values_only=True):
    if prog and str(prog).strip().upper() != "TOTALES" and isinstance(matric, (int, float)):
        fin[clean(prog)] = int(matric)
src.close()
log(f"Filas leídas: {len(rows)}")
assert rows, "BASE_DE_DATOS sin filas"
claves = [f"{d['Periodo original']}|{d['Codigo']}" for d in rows]
assert len(set(claves)) == len(claves), "claves duplicadas en la fuente"
programas = {}
for d in rows:
    programas.setdefault(d["Programa"], d["Facultad"])
SIN_TILDE = str.maketrans("ÁÉÍÓÚÜÑ", "AEIOUUN")
miles = lambda n: f"{n:,}".replace(",", ".")
N_FILAS = len(rows)
N_DOCS = len({d["Documento"] for d in rows})
N_CEROS = sum(1 for d in rows if d["Promedio origen"] == 0)
base_si = {}
for d in rows:
    if d["Matriculado"] == "SI":
        base_si[d["Programa"]] = base_si.get(d["Programa"], 0) + 1
DIFS = [(p_, fin[p_], base_si.get(p_, 0)) for p_ in fin if fin[p_] != base_si.get(p_, 0)]
programas_ordenados = sorted(programas, key=lambda p: p.translate(SIN_TILDE))

# ---------------------------------------------------------------- 2. abrir el libro original
log("Abriendo el libro original")
wb = openpyxl.load_workbook(SRC)
log("Libro abierto")
EJEMPLO_BUSQUEDA = str(wb["Consulta"]["C5"].value or "")
RUTA_TRABAJO = next((str(wb["Guia"][f"C{r_}"].value) for r_ in range(1, 40)
                     if wb["Guia"][f"B{r_}"].value == "Fuente"), "")

# ---------------------------------------------------------------- 3. Base_estudiantes
ws = wb["Base_estudiantes"]
tbl = ws.tables["TEstudiantes"]
COLS = [c.name for c in tbl.tableColumns]
assert COLS[0] == "Clave" and COLS[28] == "Municipio colegio" and len(COLS) == 29, COLS
NEW_COLS = ["Busqueda_aux", "Coincidencia_aux"]

NORM = ('SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(UPPER({x}),'
        '"Á","A"),"É","E"),"Í","I"),"Ó","O"),"Ú","U"),"Ü","U"),"Ñ","N")')
F_CLAVE = 'E{r}&"|"&H{r}'
F_PREP = ('IF(COUNTIFS(TPeriodos[Periodo original],E{r})<>1,"REVISAR PERIODO",'
          'INDEX(TPeriodos[Periodo reporte],MATCH(E{r},TPeriodos[Periodo original],0)))')
F_PROM = 'IF(Q{r}="","",IF(AND(ISNUMBER(Q{r}),Q{r}>0,Configuracion!$C$7>0),Q{r}/Configuracion!$C$7,""))'
F_BUSQ = NORM.format(x='H{r}&" "&T{r}&" "&J{r}&" "&K{r}&" | "&K{r}&" "&J{r}')
F_COINC = (f'IF(AND(OR(Consulta!$C${R_Q}="",ISNUMBER(SEARCH(Consulta!$L$2,AD{{r}}))),'
           f'OR(Consulta!$C${R_FAC}="Todas",D{{r}}=Consulta!$C${R_FAC}),'
           f'OR(Consulta!$C${R_PROG}="Todos",F{{r}}=Consulta!$C${R_PROG}),'
           f'OR(Consulta!$C${R_MAT}="Todos",M{{r}}=Consulta!$C${R_MAT})),'
           'ROW()-ROW(TEstudiantes[[#Headers],[Clave]]),"")')

tmpl = wb.create_sheet("_tmp")


def mk(ref, fmt="General", font=F_BODY):
    c = tmpl[ref]
    style(c, font=font, align=A_LEFT, fmt=fmt)
    return c._style


S_TXT, S_TEXTFMT, S_DATE, S_NUM2 = mk("A1"), mk("A2", "@"), mk("A3", "dd/mm/yyyy"), mk("A4", "0.00")
S_AUX = mk("A6", "General", F_AUX)
col_style = {}
for i, name in enumerate(COLS + NEW_COLS, start=1):
    if name in ("Codigo", "Documento"):
        col_style[i] = S_TEXTFMT
    elif name in ("Fecha corte", "Nacimiento"):
        col_style[i] = S_DATE
    elif name == "Promedio 0-5":
        col_style[i] = S_NUM2
    elif name in NEW_COLS:
        col_style[i] = S_AUX
    else:
        col_style[i] = S_TXT

log("Escribiendo Base_estudiantes")
last_row = len(rows) + 1
old_max = ws.max_row
for idx, d in enumerate(rows):
    r = idx + 2
    values = []
    for name in COLS:
        if name == "Clave":
            values.append("=" + F_CLAVE.format(r=r))
        elif name == "Periodo reporte":
            values.append("=" + F_PREP.format(r=r))
        elif name == "Fecha corte":
            values.append(CORTE)
        elif name == "Promedio 0-5":
            values.append("=" + F_PROM.format(r=r))
        else:
            values.append(d[name])
    values.append("=" + F_BUSQ.format(r=r))
    values.append("=" + F_COINC.format(r=r))
    for ci, v in enumerate(values, start=1):
        c = ws.cell(row=r, column=ci)
        c.value = v
        c._style = copy(col_style[ci])
for r in range(last_row + 1, old_max + 1):
    for ci in range(1, len(COLS) + len(NEW_COLS) + 1):
        ws.cell(r, ci).value = None
for r in list(ws.row_dimensions.keys()):
    if r >= 2:
        del ws.row_dimensions[r]
for ci, name in enumerate(NEW_COLS, start=len(COLS) + 1):
    c = ws.cell(1, ci)
    c.value = name
    c._style = copy(ws["A1"]._style)
    c.fill = FILL_AUXHEAD
ws.cell(1, len(COLS) + 1).comment = Comment(
    "Columna auxiliar del buscador (hoja Consulta): une código, documento, nombres y apellidos sin "
    "tildes. Se calcula sola; no la edites.", "Cómo está mi facultad")
ws.cell(1, len(COLS) + 2).comment = Comment(
    "Columna auxiliar del buscador: muestra la posición de la fila cuando coincide con lo escrito en "
    "Consulta. Se calcula sola; no la edites.", "Cómo está mi facultad")
ws.column_dimensions["AD"].width = 48
ws.column_dimensions["AE"].width = 16
ws.column_dimensions.group("AD", "AE", hidden=True, outline_level=1)

ref = f"A1:{get_column_letter(len(COLS) + len(NEW_COLS))}{last_row}"
tbl.ref = ref
tbl.autoFilter = AutoFilter(ref=ref)
fmls = {"Clave": F_CLAVE, "Periodo reporte": F_PREP, "Promedio 0-5": F_PROM}
for col in tbl.tableColumns:
    if col.name in fmls:
        col.calculatedColumnFormula = TableFormula(attr_text=fmls[col.name].format(r=2))
next_id = max(c.id for c in tbl.tableColumns) + 1
tbl.tableColumns.append(TableColumn(id=next_id, name=NEW_COLS[0],
                                    calculatedColumnFormula=TableFormula(attr_text=F_BUSQ.format(r=2))))
tbl.tableColumns.append(TableColumn(id=next_id + 1, name=NEW_COLS[1],
                                    calculatedColumnFormula=TableFormula(attr_text=F_COINC.format(r=2))))
ws.conditional_formatting = ConditionalFormattingList()
ws.conditional_formatting.add(f"Q2:Q{last_row}", CellIsRule(operator="equal", formula=["0"],
                                                             fill=PatternFill("solid", bgColor="FF" + INPUT)))
ws.conditional_formatting.add(f"R2:R{last_row}", CellIsRule(operator="greaterThan", formula=["5"],
                              font=Font(color="FF9C0006"), fill=PatternFill("solid", bgColor="FFFCE4D6")))
ws.sheet_view.selection[-1].activeCell = "C2"
ws.sheet_view.selection[-1].sqref = "C2"
log("Base_estudiantes lista")

# ---------------------------------------------------------------- 4. quitar Detalle1 (detalle de dinámica)
if "Detalle1" in wb.sheetnames:
    wb.remove(wb["Detalle1"])

# ---------------------------------------------------------------- 5. Configuracion: listas
cfg = wb["Configuracion"]
put(cfg, "J5", "Períodos de reporte", font=F_HEAD, fill=FILL_NAVY, align=A_WRAP)
put(cfg, "J6", "2026-II", fill=FILL_INPUT)
put(cfg, "J7", None, fill=FILL_INPUT)
put(cfg, "J8", None, fill=FILL_INPUT)
put(cfg, "J9", "Lista del filtro del Panel. Agrega aquí cada nuevo período de reporte.",
    font=F_NOTE, align=A_TOPWRAP)
cfg.merge_cells("J9:J12")
put(cfg, "L5", "Programas (lista de filtros)", font=F_HEAD, fill=FILL_NAVY, align=A_WRAP)
put(cfg, "M5", "Facultad", font=F_HEAD, fill=FILL_NAVY, align=A_WRAP)
put(cfg, "L6", "Todos")
for i, p in enumerate(programas_ordenados, start=7):
    put(cfg, f"L{i}", p)
    put(cfg, f"M{i}", programas[p])
LAST_PROG_ROW = 6 + len(programas_ordenados)
put(cfg, f"L{LAST_PROG_ROW + 1}", "Si se crea un programa, agrégalo al final de esta lista.", font=F_NOTE)
for col, w in (("I", 3), ("J", 22), ("K", 3), ("L", 60), ("M", 30)):
    cfg.column_dimensions[col].width = w

# ---------------------------------------------------------------- 6. Consulta (rediseño)
log("Construyendo Consulta")
pos_sheet = wb.sheetnames.index("Consulta")
wb.remove(wb["Consulta"])
cq = wb.create_sheet("Consulta", pos_sheet)
cq.sheet_properties.tabColor = BLUE
cq.sheet_view.showGridLines = False
cq.sheet_view.zoomScale = 90
for k, v in {"A": 2.5, "B": 29, "C": 40, "D": 3, "E": 5.5, "F": 12.5, "G": 8.5, "H": 33, "I": 36,
             "J": 10.5, "K": 9.5, "L": 14}.items():
    cq.column_dimensions[k].width = v
cq.column_dimensions["L"].hidden = True
cq.row_dimensions[1].height = 6

put(cq, "B2", "Consulta de estudiantes", font=F_TITLE)
cq.row_dimensions[2].height = 28
put(cq, "B3", "Paso 1: escribe en la celda amarilla qué buscas   ·   Paso 2: revisa la lista de "
              "coincidencias   ·   Paso 3: escribe su N° para ver la ficha completa", font=F_NOTE)
put(cq, "I2", '=HYPERLINK("#Panel!B2","Ir al Panel")', font=F_LINK,
    align=Alignment(horizontal="right", vertical="center"))
put(cq, "J2", '=HYPERLINK("#Guia!B2","Ver la guía")', font=F_LINK,
    align=Alignment(horizontal="left", vertical="center", indent=1))

header_bar(cq, 2, 3, 4, "PASO 1  ·  ¿A quién buscas?")
for r, t in {R_Q: "Código, documento o nombre", R_FAC: "Facultad", R_PROG: "Programa",
             R_MAT: "Matriculado", R_CNT: "Coincidencias encontradas", R_N: "Ver ficha N°"}.items():
    put(cq, f"B{r}", t, font=F_BOLD)
    cq.row_dimensions[r].height = 20
for r, v in {R_Q: EJEMPLO_BUSQUEDA, R_FAC: "Todas", R_PROG: "Todos", R_MAT: "Todos", R_N: 1}.items():
    put(cq, f"C{r}", v, fill=FILL_INPUT, border=B_INPUT, fmt="@" if r == R_Q else None, align=A_HLEFT)
CNT, NSEL = f"$C${R_CNT}", f"$C${R_N}"
put(cq, f"C{R_CNT}", "=COUNT(TEstudiantes[Coincidencia_aux])", font=F_BIG, fmt="#,##0", align=A_HLEFT)
put(cq, f"B{R_MSG}",
    f'=IF({CNT}=0,"Sin coincidencias: revisa la escritura, busca solo un apellido o quita filtros.",'
    f'IF(OR(NOT(ISNUMBER({NSEL})),{NSEL}<1,{NSEL}>{CNT}),"El N° debe estar entre 1 y "&{CNT}&".",'
    f'"Viendo la ficha "&{NSEL}&" de "&{CNT}&"."&IF({CNT}>100," La lista muestra las primeras 100: '
    f'escribe más letras o usa los filtros.","")))', font=F_NOTE, align=A_WRAP)
cq.merge_cells(f"B{R_MSG}:C{R_MSG}")
cq.row_dimensions[R_MSG].height = 26

# auxiliares en la columna L (oculta)
put(cq, "L1", "Auxiliares (no editar)", font=F_AUX)
put(cq, "L2", "=SUBSTITUTE(TRIM(" + NORM.format(x=f"C{R_Q}") + '),\" \",\"*\")', font=F_AUX)
put(cq, "L3", f'=IF(OR({CNT}=0,NOT(ISNUMBER({NSEL}))),"",IF(OR({NSEL}<1,{NSEL}>{CNT}),"",'
              f'SMALL(TEstudiantes[Coincidencia_aux],{NSEL})))', font=F_AUX)
POS = "$L$3"

# --- Paso 3: ficha
R_FICHA = 13
header_bar(cq, 2, 3, R_FICHA, "PASO 3  ·  Ficha del estudiante")


def fld(col, blank="Sin dato"):
    return (f'=IF({POS}="","",IF(INDEX(TEstudiantes[{col}],{POS})&""="","{blank}",'
            f'INDEX(TEstudiantes[{col}],{POS})))')


def lugar(mun, dep):
    m, d = f"INDEX(TEstudiantes[{mun}],{POS})", f"INDEX(TEstudiantes[{dep}],{POS})"
    return f'=IF({POS}="","",IF({m}={d},{m},{m}&", "&{d}))'


def join2(a, b, sep):
    return f'=IF({POS}="","",INDEX(TEstudiantes[{a}],{POS})&"{sep}"&INDEX(TEstudiantes[{b}],{POS}))'


ficha = [
    ("Nombre completo", join2("Nombres", "Apellidos", " "), F_BIG, None),
    ("Código", fld("Codigo"), F_BOLD, "@"),
    ("Período", f'=IF({POS}="","",INDEX(TEstudiantes[Periodo original],{POS})&"   ·   reporte "&'
                f'INDEX(TEstudiantes[Periodo reporte],{POS}))', F_BODY, None),
    ("SUB", "Datos académicos"),
    ("Facultad", fld("Facultad"), F_BODY, None),
    ("Programa", fld("Programa"), F_BODY, None),
    ("Plan de estudio", fld("Plan estudio"), F_BODY, "0"),
    ("Modalidad", fld("Modalidad"), F_BODY, None),
    ("Modalidad de ingreso", fld("Modalidad ingreso"), F_BODY, None),
    ("Matriculado", fld("Matriculado"), F_BOLD, None),
    ("Cancelación de semestre", fld("Cancelacion semestre"), F_BODY, None),
    ("Cupo especial", fld("Cupo especial"), F_BODY, None),
    ("Promedio acumulado (0 a 5)", f'=IF({POS}="","",IF(ISNUMBER(INDEX(TEstudiantes[Promedio 0-5],{POS})),'
                                   f'INDEX(TEstudiantes[Promedio 0-5],{POS}),"Sin promedio (0 en la fuente)"))',
     F_BOLD, "0.00"),
    ("Rango descriptivo", "RANGO", F_BODY, None),
    ("Promedio original (fuente)", fld("Promedio origen"), F_BODY, "0"),
    ("SUB", "Datos personales"),
    ("Documento", join2("Tipo documento", "Documento", " "), F_BODY, None),
    ("Sexo", fld("Sexo"), F_BODY, None),
    ("Fecha de nacimiento", fld("Nacimiento"), F_BODY, "dd/mm/yyyy"),
    ("Edad al corte", f'=IF({POS}="","",IFERROR(DATEDIF(INDEX(TEstudiantes[Nacimiento],{POS}),'
                      f'INDEX(TEstudiantes[Fecha corte],{POS}),"y")&" años",""))', F_BODY, None),
    ("Estrato", fld("Estrato"), F_BODY, "0"),
    ("SUB", "Procedencia"),
    ("Origen", fld("Origen"), F_BODY, None),
    ("Lugar de origen", lugar("Municipio origen", "Departamento origen"), F_BODY, None),
    ("Colegio", fld("Colegio"), F_BODY, None),
    ("Tipo de colegio", fld("Tipo colegio"), F_BODY, None),
    ("Lugar del colegio", lugar("Municipio colegio", "Departamento colegio"), F_BODY, None),
    ("SUB", "Beneficios registrados en el período"),
]
ROW_OF = {}
r = R_FICHA + 1
for item in ficha:
    if item[0] == "SUB":
        header_bar(cq, 2, 3, r, item[1], fill=FILL_LIGHT, font=F_SUB, height=18)
        r += 1
        continue
    label, formula, font, fmt = item
    ROW_OF[label] = r
    if formula == "RANGO":
        p = f'C{ROW_OF["Promedio acumulado (0 a 5)"]}'
        formula = (f'=IF(ISNUMBER({p}),IF({p}<3,"0 < promedio < 3",IF({p}<3.5,"3 ≤ promedio < 3,5",'
                   f'IF({p}<4,"3,5 ≤ promedio < 4","4 ≤ promedio ≤ 5"))),"")')
    put(cq, f"B{r}", label, font=F_BOLD if label == "Nombre completo" else F_BODY, border=B_ROW)
    wrap = label in ("Programa", "Colegio", "Cupo especial", "Modalidad de ingreso", "Nombre completo")
    put(cq, f"C{r}", formula, font=font, fmt=fmt, border=B_ROW,
        align=Alignment(horizontal="left", vertical="center", wrap_text=wrap))
    cq.row_dimensions[r].height = 24 if label == "Nombre completo" else (
        26 if label in ("Programa", "Colegio") else 18)
    r += 1
CODE = f'$C${ROW_OF["Código"]}'
first_b = r
for t in ["Ayudantía", "Monitoría", "Almuerzo", "Refrigerio", "Almuerzo y refrigerio", "Otro beneficio"]:
    put(cq, f"B{r}", t, border=B_ROW)
    put(cq, f"C{r}", f'=IF({POS}="","",IF(COUNTA(TBeneficios[Codigo])=0,"Sin carga",'
                     f'COUNTIFS(TBeneficios[Codigo],{CODE},TBeneficios[Periodo original],'
                     f'INDEX(TEstudiantes[Periodo original],{POS}),TBeneficios[Tipo beneficio],B{r})))',
        border=B_ROW, align=A_HLEFT)
    r += 1
put(cq, f"B{r}", "Total de asignaciones", font=F_BOLD, border=B_ROW)
put(cq, f"C{r}", f'=IF({POS}="","",IF(COUNTA(TBeneficios[Codigo])=0,"Sin carga",SUM(C{first_b}:C{r - 1})))',
    font=F_BOLD, border=B_ROW, align=A_HLEFT)
r += 1
put(cq, f"B{r}", "Sin registros no confirma ausencia de beneficios: la hoja Beneficios aún está en carga.",
    font=F_NOTE, align=A_WRAP)
cq.merge_cells(f"B{r}:C{r}")
cq.row_dimensions[r].height = 26
r += 2
put(cq, f"B{r}", "Riesgo académico", border=B_ROW)
put(cq, f"C{r}", '="Regla "&LOWER(Configuracion!C8)&" (ver Configuracion)"', border=B_ROW)
r += 1
put(cq, f"B{r}", "Datos con corte al", border=B_ROW)
put(cq, f"C{r}", "=Configuracion!C6", fmt="dd/mm/yyyy", border=B_ROW, align=A_HLEFT)
r += 2
put(cq, f"B{r}", "Celdas amarillas = para escribir o elegir. Lo demás se calcula solo.", font=F_NOTE)
LAST_FICHA_ROW = r

# --- Paso 2: lista de coincidencias
header_bar(cq, 5, 11, 4, "PASO 2  ·  Coincidencias (se resalta la ficha que estás viendo)")
for i, h in enumerate(["N°", "Código", "Período", "Nombre completo", "Programa", "Matrícula", "Promedio"]):
    style(cq.cell(R_Q, 5 + i), font=F_SUB, fill=FILL_LIGHT, align=A_CENTER if i in (0, 2, 5, 6) else A_LEFT)
    cq.cell(R_Q, 5 + i).value = h
put(cq, f"L{R_Q}", "posición", font=F_AUX)
FIRST, NRES = R_Q + 1, 100
for k in range(1, NRES + 1):
    r = FIRST + k - 1
    put(cq, f"E{r}", f'=IF({k}<={CNT},{k},"")', align=A_CENTER)
    put(cq, f"L{r}", f'=IF(E{r}="","",SMALL(TEstudiantes[Coincidencia_aux],E{r}))', font=F_AUX)
    put(cq, f"F{r}", f'=IF($L{r}="","",INDEX(TEstudiantes[Codigo],$L{r}))', fmt="@")
    put(cq, f"G{r}", f'=IF($L{r}="","",INDEX(TEstudiantes[Periodo original],$L{r}))', align=A_CENTER)
    put(cq, f"H{r}", f'=IF($L{r}="","",INDEX(TEstudiantes[Nombres],$L{r})&" "&'
                     f'INDEX(TEstudiantes[Apellidos],$L{r}))')
    put(cq, f"I{r}", f'=IF($L{r}="","",INDEX(TEstudiantes[Programa],$L{r}))')
    put(cq, f"J{r}", f'=IF($L{r}="","",INDEX(TEstudiantes[Matriculado],$L{r}))', align=A_CENTER)
    put(cq, f"K{r}", f'=IF($L{r}="","",IF(ISNUMBER(INDEX(TEstudiantes[Promedio 0-5],$L{r})),'
                     f'INDEX(TEstudiantes[Promedio 0-5],$L{r}),"—"))', fmt="0.00", align=A_CENTER)
LASTRES = FIRST + NRES - 1
put(cq, f"E{LASTRES + 1}", f'=IF({CNT}>{NRES},"Hay "&{CNT}&" coincidencias; se muestran las primeras {NRES}. '
                           f'Escribe más letras o usa los filtros para acotar.","")', font=F_NOTE)

# validaciones de datos (sin "=" inicial, como las guarda Excel)
dvs = [
    (DataValidation(type="list", formula1="Configuracion!$F$6:$F$12", allow_blank=False, showErrorMessage=True,
                    errorTitle="Facultad", error="Elige una facultad de la lista."), f"C{R_FAC}"),
    (DataValidation(type="list", formula1=f"Configuracion!$L$6:$L${LAST_PROG_ROW}", allow_blank=False,
                    showErrorMessage=True, errorTitle="Programa", error="Elige un programa de la lista."),
     f"C{R_PROG}"),
    (DataValidation(type="list", formula1='"Todos,SI,NO"', allow_blank=False, showErrorMessage=True,
                    errorTitle="Matriculado", error="Elige Todos, SI o NO."), f"C{R_MAT}"),
    (DataValidation(type="whole", operator="greaterThanOrEqual", formula1="1", allow_blank=False,
                    showErrorMessage=True, errorTitle="Ver ficha N°",
                    error="Escribe un número entero de la columna N° de la lista.", showInputMessage=True,
                    promptTitle="Ver ficha N°", prompt="Escribe el N° de la lista de coincidencias."),
     f"C{R_N}"),
    (DataValidation(allow_blank=True, showInputMessage=True, promptTitle="Buscar",
                    prompt="Código, documento o parte del nombre. No importan tildes ni mayúsculas. "
                           "Ejemplo: maria perez"), f"C{R_Q}"),
]
for dv, ref_ in dvs:
    cq.add_data_validation(dv)
    dv.add(ref_)

# formatos condicionales
cq.conditional_formatting.add(f"E{FIRST}:K{LASTRES}", FormulaRule(
    formula=[f'AND($E{FIRST}<>"",$E{FIRST}={NSEL})'], fill=PatternFill("solid", bgColor="FF" + INPUT),
    font=Font(bold=True), border=B_ROW, stopIfTrue=True))
cq.conditional_formatting.add(f"E{FIRST}:K{LASTRES}", FormulaRule(
    formula=[f'AND($E{FIRST}<>"",MOD($E{FIRST},2)=0)'], fill=PatternFill("solid", bgColor="FFF4F7FA"),
    border=B_ROW))
cq.conditional_formatting.add(f"E{FIRST}:K{LASTRES}", FormulaRule(formula=[f'$E{FIRST}<>""'], border=B_ROW))
for rng in (f"J{FIRST}:J{LASTRES}", f'C{ROW_OF["Matriculado"]}'):
    cq.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"SI"'], font=GREEN_F, fill=GREEN_B))
    cq.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"NO"'], font=RED_F, fill=RED_B))
cq.conditional_formatting.add(f'C{ROW_OF["Cancelación de semestre"]}',
                              CellIsRule(operator="equal", formula=['"SI"'], font=AMBER_F, fill=AMBER_B))
cq.conditional_formatting.add(f"B{R_MSG}", FormulaRule(
    formula=[f'OR({CNT}=0,NOT(ISNUMBER({NSEL})),{NSEL}<1,{NSEL}>{CNT})'], font=Font(color="FF9C0006", bold=True)))
cq.freeze_panes = f"A{R_Q + 1}"
cq.sheet_view.selection[0].activeCell = f"C{R_Q}"
cq.sheet_view.selection[0].sqref = f"C{R_Q}"
cq.page_setup.orientation = "landscape"
cq.page_setup.fitToWidth = 1
cq.page_setup.fitToHeight = 0
cq.sheet_properties.pageSetUpPr.fitToPage = True
cq.print_area = f"B2:K{max(LAST_FICHA_ROW, 60)}"
log(f"Consulta: ficha hasta fila {LAST_FICHA_ROW}; filas {ROW_OF}")

# ---------------------------------------------------------------- 7. Panel
log("Ajustando Panel")
pn = wb["Panel"]
put(pn, "B3", '=HYPERLINK("#Consulta!C5","Buscar un estudiante")', font=F_LINK)
put(pn, "C3", '=HYPERLINK("#Guia!B2","Ver la guía de uso")', font=F_LINK)
for r, v in zip(range(51, 56), ["SANTA MARTA", "RESTO DEL MAGDALENA", "RESTO REGION CARIBE",
                                "RESTO DEL PAIS", "EXTRANJERO"]):
    pn[f"B{r}"].value = v
for ref_ in ("C21", "D21", "E21", "C51", "C52", "C53", "C54", "C55", "I51", "I52", "I53", "I54"):
    pn[ref_].number_format = "#,##0"
pn.column_dimensions["H"].width = 18
pn.page_setup.orientation = "landscape"
pn.page_setup.fitToWidth = 1
pn.page_setup.fitToHeight = 0
pn.sheet_properties.pageSetUpPr.fitToPage = True
pn.data_validations.dataValidation = []
for dv, ref_ in (
        (DataValidation(type="list", formula1="OFFSET(Configuracion!$J$6,0,0,MAX(1,COUNTA(Configuracion!$J$6:$J$20)),1)", allow_blank=False,
                        showErrorMessage=True, errorTitle="Período de reporte",
                        error="Elige un período de la lista (se edita en Configuracion, columna J)."), "C5"),
        (DataValidation(type="list", formula1="Configuracion!$F$6:$F$12", allow_blank=False,
                        showErrorMessage=True, errorTitle="Facultad", error="Elige una facultad de la lista."),
         "C6"),
        (DataValidation(type="list", formula1='"Todos,2026II,20263C"', allow_blank=False,
                        showErrorMessage=False), "C7")):
    pn.add_data_validation(dv)
    dv.add(ref_)


def rich(sz=900, color=NAVY, bold=False):
    cp = CharacterProperties(sz=sz, b=bold, solidFill=color, latin=DFont(typeface="Arial"))
    return RichText(p=[Paragraph(pPr=ParagraphProperties(defRPr=cp), endParaRPr=cp, r=[])])


def title(text):
    cp = CharacterProperties(sz=1100, b=True, solidFill=NAVY, latin=DFont(typeface="Arial"))
    para = Paragraph(pPr=ParagraphProperties(defRPr=cp), r=[RegularTextRun(rPr=cp, t=text)])
    return Title(tx=Text(rich=RichText(p=[para])), overlay=False)


def data_labels(color=NAVY, pos=None):
    dl = DataLabelList()
    dl.showVal = True
    for a in ("showSerName", "showCatName", "showLegendKey", "showPercent"):
        setattr(dl, a, False)
    if pos:
        dl.position = pos
    dl.txPr = rich(800, color, True)
    return dl


def text_categories(ch, ref):
    """Categorías de texto como strRef (openpyxl las escribe como numRef)."""
    for s_ in ch.series:
        s_.cat = AxDataSource(strRef=StrRef(f=ref))


def style_axes(ch, horizontal):
    ch.x_axis.delete = False
    ch.y_axis.delete = False
    ch.x_axis.txPr = rich(800)
    ch.y_axis.txPr = rich(800)
    ch.y_axis.numFmt = "#,##0"
    ch.y_axis.majorGridlines.spPr = GraphicalProperties(ln=LineProperties(solidFill="E3E8EE"))
    ch.x_axis.majorTickMark = "none"
    ch.y_axis.majorTickMark = "none"
    if horizontal:
        ch.x_axis.scaling.orientation = "maxMin"


pn._charts = []
c1 = BarChart()
c1.type, c1.grouping, c1.overlap, c1.gapWidth = "bar", "stacked", 100, 60
c1.add_data(Reference(pn, min_col=4, max_col=5, min_row=14, max_row=20), titles_from_data=True)
c1.set_categories(Reference(pn, min_col=2, min_row=15, max_row=20))
text_categories(c1, "'Panel'!$B$15:$B$20")
c1.title = title("Códigos por facultad: matriculados y sin matrícula")
c1.series[0].graphicalProperties.solidFill = BLUE
c1.series[1].graphicalProperties.solidFill = "F2A541"
c1.series[0].dLbls = data_labels("FFFFFF", "ctr")
c1.series[1].dLbls = data_labels(NAVY, "ctr")
style_axes(c1, True)
c1.legend.position = "b"
c1.legend.txPr = rich(800)
c1.width, c1.height = 21.5, 9.6
pn.add_chart(c1, "H10")

c2 = BarChart()
c2.type, c2.gapWidth = "bar", 60
c2.add_data(Reference(pn, min_col=3, min_row=50, max_row=55), titles_from_data=True)
c2.set_categories(Reference(pn, min_col=2, min_row=51, max_row=55))
text_categories(c2, "'Panel'!$B$51:$B$55")
c2.title = title("Procedencia de los estudiantes")
c2.series[0].graphicalProperties.solidFill = BLUE
c2.series[0].dLbls = data_labels(NAVY, "outEnd")
style_axes(c2, True)
c2.legend = None
c2.width, c2.height = 21.5, 8.2
pn.add_chart(c2, "B32")

c3 = BarChart()
c3.type, c3.gapWidth = "col", 60
c3.add_data(Reference(pn, min_col=9, min_row=50, max_row=54), titles_from_data=True)
c3.set_categories(Reference(pn, min_col=8, min_row=51, max_row=54))
text_categories(c3, "'Panel'!$H$51:$H$54")
c3.title = title("Distribución del promedio positivo (rangos descriptivos)")
c3.series[0].graphicalProperties.solidFill = BLUE
c3.series[0].dLbls = data_labels(NAVY, "outEnd")
style_axes(c3, False)
c3.legend = None
c3.width, c3.height = 21.5, 8.2
pn.add_chart(c3, "H32")
pn.sheet_view.selection[0].activeCell = "C6"
pn.sheet_view.selection[0].sqref = "C6"

# ---------------------------------------------------------------- 8. Beneficios
log("Ajustando Beneficios")
bn = wb["Beneficios"]
tb = bn.tables["TBeneficios"]
F_BPREP = ('IF(C{r}="","",IF(COUNTIFS(TPeriodos[Periodo original],D{r})<>1,"REVISAR PERIODO",'
           'INDEX(TPeriodos[Periodo reporte],MATCH(D{r},TPeriodos[Periodo original],0))))')
F_BEST = ('IF(C{r}="","",IFERROR(INDEX(TEstudiantes[Nombres],MATCH(D{r}&"|"&C{r},TEstudiantes[Clave],0))'
          '&" "&INDEX(TEstudiantes[Apellidos],MATCH(D{r}&"|"&C{r},TEstudiantes[Clave],0)),'
          '"No está en la base"))')
bn["L8"].value = "=" + F_BPREP.format(r=8)
for col in tb.tableColumns:
    if col.name == "Periodo reporte":
        col.calculatedColumnFormula = TableFormula(attr_text=F_BPREP.format(r=8))
bn["N7"].value = "Estudiante (verificación)"
bn["N7"]._style = copy(bn["M7"]._style)
bn["N8"].value = "=" + F_BEST.format(r=8)
bn["N8"]._style = copy(bn["M8"]._style)
tb.tableColumns.append(TableColumn(id=max(x.id for x in tb.tableColumns) + 1, name="Estudiante (verificación)",
                                   calculatedColumnFormula=TableFormula(attr_text=F_BEST.format(r=8))))
tb.ref = "B7:N8"
tb.autoFilter = AutoFilter(ref="B7:N8")
bn.column_dimensions["N"].width = 36
bn["C8"].number_format = "@"
dvp = DataValidation(type="list", formula1="Configuracion!$B$14:$B$43", allow_blank=True,
                     showErrorMessage=True, errorTitle="Período original",
                     error="Usa un período original de la tabla TPeriodos (Configuracion).")
bn.add_data_validation(dvp)
dvp.add("D8:D2000")

# ---------------------------------------------------------------- 9. Matricula_original: conciliación
log("Conciliación de matrícula")
mo = wb["Matricula_original"]
mo["H6"].value = None
put(mo, "G1", "Período de reporte comparado", font=F_BOLD, align=Alignment(horizontal="right", vertical="center"))
put(mo, "H1", "2026-II", fill=FILL_INPUT, border=B_INPUT, align=A_CENTER)
for col, text in (("G", "MATRICULADOS EN LA BASE"), ("H", "DIFERENCIA (FUENTE − BASE)"),
                  ("I", "CÓDIGOS EN LA BASE")):
    mo[f"{col}2"].value = text
    mo[f"{col}2"]._style = copy(mo["D2"]._style)
FMT_DIFF = '#,##0;-#,##0;"–"'
for r in range(3, 41):
    put(mo, f"G{r}", f'=COUNTIFS(TEstudiantes[Programa],$B{r},TEstudiantes[Matriculado],"SI",'
                     f'TEstudiantes[Periodo reporte],$H$1)', fmt="#,##0")
    put(mo, f"H{r}", f"=D{r}-G{r}", fmt=FMT_DIFF, align=A_CENTER)
    put(mo, f"I{r}", f'=COUNTIFS(TEstudiantes[Programa],$B{r},TEstudiantes[Periodo reporte],$H$1)', fmt="#,##0")
for col in "GHI":
    put(mo, f"{col}41", f"=SUM({col}3:{col}40)", font=F_BOLD, fmt=FMT_DIFF if col == "H" else "#,##0",
        align=A_CENTER if col == "H" else A_LEFT)
mo.conditional_formatting.add("H3:H41", CellIsRule(operator="notEqual", formula=["0"], font=RED_F, fill=RED_B))
for col in "GHI":
    mo.column_dimensions[col].width = 17
mo["B44"].value = ("Referencia conservada del archivo fuente (columnas B a F). Las columnas G a I se calculan "
                   "con Base_estudiantes para conciliar.")
mo["B45"].value = ("Revisión 08/10/2026: " + ("; ".join(
    f"{p_} ({f_} matriculados en la fuente; {b_} en el detalle por estudiante)" for p_, f_, b_ in DIFS)
    if DIFS else "sin diferencias entre la fuente y el detalle") + ".")
mo["B46"].value = "El porcentaje original está expresado en puntos porcentuales (por ejemplo: 5,49)."
for r in (44, 45, 46):
    mo[f"B{r}"].font = F_NOTE
mo.freeze_panes = "A3"
mo.sheet_view.topLeftCell = "A1"
for sel in mo.sheet_view.selection:
    sel.activeCell = "B3"
    sel.sqref = "B3"

# ---------------------------------------------------------------- 10. Dinamicas
dn = wb["Dinamicas"]
dn.sheet_view.topLeftCell = "A1"
dn.sheet_view.selection[0].activeCell = "B2"
dn.sheet_view.selection[0].sqref = "B2"
dn["B5"].value = ("Filtros propios por período. Doble clic en una cifra crea una hoja «Detalle» con los "
                  "estudiantes: bórrala cuando termines.")

# ---------------------------------------------------------------- 11. Guía
log("Reescribiendo Guía")
gd = wb["Guia"]
for row in gd.iter_rows(min_row=1, max_row=max(gd.max_row, 60)):
    for c in row:
        c.value = None
        c.style = "Normal"
for r in list(gd.row_dimensions.keys()):
    del gd.row_dimensions[r]
gd.column_dimensions["B"].width = 30
gd.column_dimensions["C"].width = 110
put(gd, "B2", "Guía: cómo usar y actualizar el archivo", font=F_TITLE)
gd.row_dimensions[2].height = 28
put(gd, "B3", '=HYPERLINK("#Consulta!C5","Ir a Consulta")', font=F_LINK)
put(gd, "C3", '=HYPERLINK("#Panel!B2","Ir al Panel")', font=F_LINK)
CHARS_PER_LINE = 118


def g_item(r, label, text):
    put(gd, f"B{r}", label, font=F_SUB, align=A_TOPWRAP)
    put(gd, f"C{r}", text, align=A_TOPWRAP)
    lines = max(1, -(-len(text) // CHARS_PER_LINE), -(-len(label) // 30))
    gd.row_dimensions[r].height = 14 * lines + 4


sections = [
    ("Consultar", [
        ("Buscar un estudiante", "En Consulta escribe en la celda amarilla un código, un número de documento o "
         "parte del nombre (no importan tildes ni mayúsculas; puedes escribir nombre y apellido, por ejemplo "
         "«maria perez»). La lista de la derecha muestra hasta 100 coincidencias; escribe su N° en «Ver ficha N°» "
         "y la ficha muestra los datos académicos, personales, de procedencia y de beneficios."),
        ("Sacar listados", "Deja vacía la búsqueda y usa los filtros de Consulta (facultad, programa, matriculado). "
         "Ejemplo: Programa = MEDICINA y Matriculado = NO lista a quienes no tienen matrícula."),
        ("Ver indicadores", "En Panel elige período de reporte, facultad y período original. Las cifras y los "
         "gráficos se recalculan solos."),
        ("Tablas dinámicas", "En Dinamicas usa Datos > Actualizar todo después de cambiar la base. Doble clic en "
         "una cifra crea una hoja «Detalle» con los estudiantes; bórrala cuando termines."),
        ("Filtrar la base", "En Base_estudiantes usa los botones de filtro de los encabezados. Las columnas "
         "Busqueda_aux y Coincidencia_aux están agrupadas (botón + arriba): alimentan el buscador y no se editan."),
    ]),
    ("Actualizar la base", [
        ("1. Nuevo corte del mismo período", "Busca la fila por código y período original en Base_estudiantes, "
         "actualiza sus datos y la Fecha corte. No agregues otra fila con la misma Clave."),
        ("2. Cargar una hoja de facultad", "Desde BASE_DE_DATOS copia las columnas B a N (PERIODO … PROMEDIO "
         "ACUMULADO) y pégalas como valores en la columna E de la primera fila libre de Base_estudiantes; copia "
         "O a Y (TIPO DE DOCUMENTO … MUNICIPIO COLEGIO) y pégalas en la columna S. Escribe la fecha de corte en C "
         "y la facultad en D. Clave, Periodo reporte, Promedio 0-5 y las columnas auxiliares se calculan solas."),
        ("3. Abrir un nuevo período", "Agrega la equivalencia en la tabla TPeriodos de Configuracion y el nuevo "
         "período de reporte en la lista «Períodos de reporte» (columna J). Luego carga las filas nuevas: el "
         "archivo conserva la historia por período."),
        ("4. Registrar beneficios", "En Beneficios usa una fila por asignación, con ID único, código, período "
         "original, tipo, fechas, estado, dependencia y fuente. La columna «Estudiante (verificación)» muestra el "
         "nombre para confirmar el código y Validacion avisa si falta algo. Almuerzos diarios de un mismo apoyo "
         "no son asignaciones distintas."),
        ("5. Antes de cerrar", "Datos > Actualizar todo (tablas dinámicas). En Matricula_original revisa que la "
         "columna Diferencia esté en cero o explicada."),
    ]),
    ("Correcciones del 08/10/2026", [
        ("Error #¿NOMBRE? en Periodo reporte", "Las fórmulas citaban la tabla TPeriodos sin columna y Excel no las "
         "reconocía; por eso el Panel y sus gráficos mostraban cero. Se reescribieron con INDICE y COINCIDIR."),
        ("Fechas de nacimiento", "La carga anterior las corrió 4 a 5 horas por zona horaria. Se restauraron las "
         "fechas exactas de BASE_DE_DATOS."),
        ("Espacios sobrantes", "Se quitaron espacios al inicio, al final y dobles en nombres, apellidos, colegios "
         "y municipios (por ejemplo «GARCIA  LOPEZ»)."),
        ("Listas y hojas", "El filtro Período de reporte del Panel había perdido su lista; ahora lee la columna J "
         "de Configuracion. Se eliminó la hoja Detalle1, creada por un doble clic en una dinámica."),
        ("Consulta rediseñada", "Busca por código, documento o nombre, muestra la lista de coincidencias y una "
         "ficha por secciones con colores para matrícula y cancelación."),
        ("Verificación de la carga", f"Se comparó fila por fila con BASE_DE_DATOS: están los {miles(N_FILAS)} registros de "
         "las seis facultades, sin claves duplicadas y con todos los campos iguales a la fuente."),
    ]),
    ("Supuestos y reglas", [
        ("Regla de riesgo", "Pendiente del acuerdo académico aplicable. No se ha clasificado a ningún estudiante "
         "en permanencia condicional ni riesgo. Los rangos de notas son solo descriptivos."),
        ("Escala del promedio", "Se conserva el valor original y se divide por 100 (supuesto en Configuracion). "
         f"Los {miles(N_CEROS)} valores en cero se excluyen de la media de promedios positivos hasta validar su "
         "significado."),
        ("Calendarios académicos", "2026II y 20263C pertenecen al reporte 2026-II. Se conserva el período "
         "original para los programas cuatrimestrales."),
        ("Unidad de los indicadores", f"Se cuentan códigos académicos por período, no personas: {miles(N_FILAS)} "
         f"códigos y {miles(N_DOCS)} documentos diferentes (hay personas con dos códigos)."),
        ("Cobertura", "Todos los registros son de modalidad PRESENCIAL. Un registro no matriculado no se "
         "interpreta automáticamente como deserción."),
        ("Cruce de beneficios", "Se vinculan por código y período original. Las cifras de Consulta cuentan "
         "registros de todos los estados, no personas únicas."),
        ("Fuente", "Base cargada desde BASE_DE_DATOS.xlsx (hojas de las seis facultades y MATRICULA FINANCIERA "
         "2026-2)." + (f" Archivo de trabajo: {RUTA_TRABAJO}" if RUTA_TRABAJO else "")),
        ("Corte inicial", "7 de octubre de 2026, informado por el usuario."),
    ]),
]
r = 5
for sec, items in sections:
    header_bar(gd, 2, 3, r, sec)
    r += 1
    for label, text in items:
        g_item(r, label, text)
        r += 1
    r += 1
header_bar(gd, 2, 3, r, "Control de integridad (se recalcula)")
r += 1
r0 = r
checks = [
    ("Filas en la base", "=ROWS(TEstudiantes[Clave])", "#,##0"),
    ("Matriculados en la base (SI)", '=COUNTIFS(TEstudiantes[Matriculado],"SI")', "#,##0"),
    ("Matriculados según matrícula financiera", "=Matricula_original!D41", "#,##0"),
    ("Diferencia de matrícula", f"=C{r0 + 2}-C{r0 + 1}", "#,##0"),
    ("Filas con período por revisar", '=COUNTIFS(TEstudiantes[Periodo reporte],"REVISAR PERIODO")', "#,##0"),
    ("Claves duplicadas (verificado al cargar)", 0, "0"),
    ("Documentos diferentes (al cargar)", N_DOCS, "#,##0"),
]
for label, val, fmt in checks:
    put(gd, f"B{r}", label, border=B_ROW)
    put(gd, f"C{r}", val, fmt=fmt, align=A_HLEFT, border=B_ROW)
    gd.row_dimensions[r].height = 18
    r += 1
r += 1
put(gd, f"B{r}", "Importante al anexar", font=F_SUB, align=A_TOPWRAP)
put(gd, f"C{r}", "No pegues totales ni subtotales en la base. Revisa duplicados de Clave antes de actualizar "
                 "las tablas dinámicas.", align=A_TOPWRAP)
gd.row_dimensions[r].height = 18
gd.sheet_view.showGridLines = False

# ---------------------------------------------------------------- 12. libro
wb.remove(tmpl)
wb.active = wb.sheetnames.index("Panel")
for wsx in wb.worksheets:
    wsx.sheet_view.tabSelected = wsx.title == "Panel"
wb.calculation.fullCalcOnLoad = True
wb.calculation.forceFullCalc = True
log("Guardando")
wb.save(OUT)
log(f"Listo: {OUT}")
