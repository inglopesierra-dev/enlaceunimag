"""Genera el kit de Microsoft 365 a partir de modelo.json.

Uso:
  # Plantillas de Excel (datos ficticios) y referencia de listas
  python generar_kit.py plantillas SALIDA
  # Scripts de PnP PowerShell para TI (crear el sitio y cargar datos)
  python generar_kit.py scripts SALIDA
  # Archivos de carga con datos REALES desde BASE_DE_DATOS.xlsx (privados: nunca al repositorio)
  python generar_kit.py carga BASE_DE_DATOS.xlsx SALIDA

Requiere Python 3.10+ y openpyxl.
"""
import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

AQUI = Path(__file__).resolve().parent
M = json.loads((AQUI / "modelo.json").read_text(encoding="utf-8"))
UNIDADES = {u["codigo"]: u for u in M["unidades"]}
RESERVADAS = [u for u in M["unidades"] if u["nivel"] == "reservado"]
FACULTADES = ["INGENIERÍA", "BÁSICAS", "EMPRESARIALES Y ECONÓMICAS", "SALUD", "HUMANIDADES", "EDUCACIÓN"]
DIVISOR_PROMEDIO = 100          # Igual que «Cómo está mi facultad» (Configuracion!C7)
FECHA_CORTE = dt.date(2026, 10, 7)
SIN_TILDE = str.maketrans("ÁÉÍÓÚÜÑáéíóúüñ", "AEIOUUNaeiouun")

NAVY, ACCENT = "16324F", "0A6C76"
F_HEAD = Font(name="Arial", size=10, bold=True, color="FFFFFFFF")
F_BODY = Font(name="Arial", size=10, color="FF" + NAVY)
F_TITLE = Font(name="Arial", size=14, bold=True, color="FF" + NAVY)
F_NOTE = Font(name="Arial", size=10, color="FF617182")
FILL_HEAD = PatternFill("solid", fgColor="FF" + ACCENT)


def norm_busqueda(texto):
    """Mayúsculas, sin tildes, espacios simples. Debe coincidir con fxNorm de la app."""
    return re.sub(r"\s+", " ", str(texto or "")).strip().upper().translate(SIN_TILDE)


def lista_seguimiento(u):
    return {
        "titulo": u["lista"],
        "url": u["url"],
        "nivel": "reservado",
        "descripcion": f"Seguimiento reservado de {u['nombre']}.",
        "editan": [u["codigo"]],
        "leen": [],
        "columnas": M["lista_seguimiento"]["columnas"],
        "seguimiento": True,
        "unidad": u["codigo"],
    }


def todas_las_listas():
    return M["listas"] + [lista_seguimiento(u) for u in RESERVADAS]


def servicios_catalogo():
    filas, orden = [], 0
    for bloque in M["catalogo"]:
        u = UNIDADES[bloque["unidad"]]
        for s in bloque["items"]:
            orden += 1
            filas.append({"Unidad": u["codigo"], "Area": u["area"], "Grupo": bloque["grupo"], "Servicio": s,
                          "Nivel": u["nivel"], "Activo": "Sí", "Orden": orden})
    return filas


# ------------------------------------------------------------------ Excel
def escribir_tabla(ws, columnas, filas, nombre_tabla, fila_inicio=1, opciones=None):
    for c, col in enumerate(columnas, start=1):
        cell = ws.cell(row=fila_inicio, column=c, value=col["nombre"])
        cell.font, cell.fill = F_HEAD, FILL_HEAD
        cell.alignment = Alignment(vertical="center")
        ancho = max(12, min(45, len(col["nombre"]) + 4, max((len(str(f.get(col["nombre"], ""))) for f in filas), default=0) + 3))
        ws.column_dimensions[get_column_letter(c)].width = ancho
    for r, fila in enumerate(filas, start=fila_inicio + 1):
        for c, col in enumerate(columnas, start=1):
            v = fila.get(col["nombre"], "")
            cell = ws.cell(row=r, column=c)
            if col["tipo"] == "Fecha" and v:
                cell.value = v if isinstance(v, dt.date) else dt.date.fromisoformat(str(v))
                cell.number_format = "yyyy-mm-dd"
            elif col["tipo"] == "Numero" and v not in ("", None):
                cell.value = v
                cell.number_format = "0.00" if col.get("decimales", 0) else "0"
            else:
                cell.value = None if v in ("", None) else str(v)
                cell.number_format = "@"
            cell.font = F_BODY
    ultima = fila_inicio + max(1, len(filas))
    ref = f"A{fila_inicio}:{get_column_letter(len(columnas))}{ultima}"
    tabla = Table(displayName=nombre_tabla, ref=ref)
    tabla.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
    ws.add_table(tabla)
    ws.freeze_panes = ws.cell(row=fila_inicio + 1, column=1)
    if opciones:
        for c, col in enumerate(columnas, start=1):
            valores = None
            if col.get("opciones"):
                valores = M["opciones"][col["opciones"]]
            elif col.get("catalogo"):
                valores = [s for b in M["catalogo"] if b["unidad"] == col["catalogo"] for s in b["items"]]
            if valores:
                hoja = opciones["hoja"]
                k = opciones["siguiente"]
                hoja.cell(row=1, column=k, value=col["nombre"]).font = Font(bold=True)
                for i, val in enumerate(valores, start=2):
                    hoja.cell(row=i, column=k, value=val)
                letra = get_column_letter(k)
                dv = DataValidation(type="list", formula1=f"=Opciones!${letra}$2:${letra}${len(valores) + 1}", allow_blank=True)
                dv.add(f"{get_column_letter(c)}{fila_inicio + 1}:{get_column_letter(c)}{fila_inicio + 5000}")
                ws.add_data_validation(dv)
                opciones["siguiente"] += 1


def ejemplos_ficticios(lista):
    """Una o dos filas ficticias para que Listas reconozca columnas y tipos. Se borran después de importar."""
    base = {c["nombre"]: c.get("ejemplo", "") for c in lista["columnas"]}
    if lista["titulo"] == "Catálogo de servicios":
        return [{"Unidad": f["Unidad"], "Área": f["Area"], "Grupo": f["Grupo"], "Servicio": f["Servicio"],
                 "Nivel": f["Nivel"], "Activo": f["Activo"], "Orden": f["Orden"]} for f in servicios_catalogo()]
    if lista.get("seguimiento"):
        u = UNIDADES[lista["unidad"]]
        serv = next(b["items"][0] for b in M["catalogo"] if b["unidad"] == u["codigo"])
        base["Servicio"] = serv
    return [base]


def instrucciones(ws, lista):
    ws["B2"] = f"Plantilla de la lista «{lista['titulo']}»"
    ws["B2"].font = F_TITLE
    pasos = [
        "1. En el sitio «Acompañamiento Estudiantil» elige Nuevo > Lista > Desde Excel y sube este archivo.",
        "2. Elige la tabla de la hoja «Datos». Revisa que cada columna quede como dice la hoja «Columnas» (Texto, Fecha, Número).",
        f"3. Nombra la lista exactamente: {lista['titulo']}",
        ("4. Estas filas son el catálogo real de servicios: no las borres. Al terminar, borra este archivo de «Activos del sitio»."
         if lista["titulo"] == "Catálogo de servicios" else
         "4. Cuando termine, borra la fila de ejemplo (es ficticia) y borra este archivo de «Activos del sitio»."),
        "5. En Configuración de la lista confirma que existe una columna llamada «Código». Si el asistente puso el código en «Título», cámbiale el nombre a «Código».",
        "6. Aplica los permisos que indica la guía (docs/05-guia-microsoft365.md).",
    ]
    for i, p in enumerate(pasos, start=4):
        ws.cell(row=i, column=2, value=p).font = F_BODY
    ws.cell(row=11, column=2, value=lista["descripcion"]).font = F_NOTE
    ws.column_dimensions["B"].width = 120


def hoja_columnas(ws, lista):
    enc = ["Columna", "Tipo", "Obligatoria", "Indexada", "Nombre interno (TI)", "Descripción"]
    for c, t in enumerate(enc, start=1):
        cell = ws.cell(row=1, column=c, value=t)
        cell.font, cell.fill = F_HEAD, FILL_HEAD
    tipos = {"Texto": "Una línea de texto", "TextoLargo": "Varias líneas de texto (texto sin formato)",
             "Fecha": "Fecha (solo fecha)", "Numero": "Número"}
    for r, col in enumerate(lista["columnas"], start=2):
        vals = [col["nombre"], tipos[col["tipo"]], "Sí" if col.get("requerido") else "No",
                "Sí" if col.get("indexado") else "No", col["interno"], col.get("descripcion", "")]
        for c, v in enumerate(vals, start=1):
            ws.cell(row=r, column=c, value=v).font = F_BODY
    for c, w in zip("ABCDEF", (28, 40, 12, 10, 24, 80)):
        ws.column_dimensions[c].width = w


def plantillas(salida):
    salida = Path(salida)
    salida.mkdir(parents=True, exist_ok=True)
    generadas = []
    listas = M["listas"] + [lista_seguimiento(RESERVADAS[0])]
    for lista in listas:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Datos"
        op = wb.create_sheet("Opciones")
        nombre = lista["titulo"] if not lista.get("seguimiento") else "Seguimiento (plantilla)"
        escribir_tabla(ws, lista["columnas"], ejemplos_ficticios(lista), "Tabla" + re.sub(r"\W", "", nombre.translate(SIN_TILDE)),
                       opciones={"hoja": op, "siguiente": 1})
        if op.max_row == 1 and op.max_column == 1 and op["A1"].value is None:
            wb.remove(op)
        instrucciones(wb.create_sheet("Instrucciones", 0), {**lista, "titulo": nombre if lista.get("seguimiento") else lista["titulo"]})
        hoja_columnas(wb.create_sheet("Columnas"), lista)
        wb.active = 1
        archivo = salida / f"{nombre}.xlsx"
        wb.save(archivo)
        generadas.append(archivo.name)
    print("Plantillas:", ", ".join(generadas))


# ------------------------------------------------------------------ Referencia en Markdown
def referencia(destino):
    tipos = {"Texto": "Texto", "TextoLargo": "Texto largo", "Fecha": "Fecha", "Numero": "Número"}
    out = ["# Listas de SharePoint", "",
           "Generado desde `microsoft365/modelo.json` con `python generar_kit.py referencia`. No editar a mano.", ""]
    out += ["## Resumen", "", "| Lista | Nivel | Editan | Leen todo | Permisos por elemento |", "|---|---|---|---|---|"]
    for l in todas_las_listas():
        editan = ", ".join(UNIDADES[c]["grupo"] if c in UNIDADES else "AE Administradores" for c in l["editan"])
        if l.get("seguimiento"):
            extra = [UNIDADES[u["codigo"]]["grupo"] for u in RESERVADAS if l["unidad"] in u.get("tambien_consulta", [])]
            leen = ", ".join(["AE Administradores", editan] + extra)
            item = "Sí: el resto del personal solo crea remisiones y ve las suyas"
        else:
            leen = "AE Personal" if "PER" in l["leen"] else "AE Administradores"
            item = "No"
        out.append(f"| {l['titulo']} | {l['nivel']} | {editan} | {leen} | {item} |")
    out += ["", "Los dos administradores (propietarios del sitio) ven y editan todo. Nadie tiene permiso de eliminar, salvo los propietarios.", ""]
    vistas = M["listas"] + [{"titulo": "Seguimiento … (una por unidad reservada)", "descripcion": M["lista_seguimiento"]["descripcion"],
                             "columnas": M["lista_seguimiento"]["columnas"]}]
    for l in vistas:
        out += [f"## {l['titulo']}", "", l["descripcion"], "", "| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |", "|---|---|---|---|---|---|"]
        for c in l["columnas"]:
            vals = ""
            if c.get("opciones"):
                vals = " · ".join(M["opciones"][c["opciones"]])
            elif c.get("catalogo"):
                vals = f"Catálogo de {UNIDADES[c['catalogo']]['nombre']}"
            if c.get("descripcion"):
                vals = (vals + " — " if vals else "") + c["descripcion"]
            out.append(f"| {c['nombre']} | {tipos[c['tipo']]} | {'Sí' if c.get('requerido') else ''} | {'Sí' if c.get('indexado') else ''} | `{c['interno']}` | {vals} |")
        out.append("")
    out += ["## Listas de seguimiento por unidad", "", "| Unidad | Código | Lista | Grupo | Servicios del catálogo |", "|---|---|---|---|---|"]
    for u in RESERVADAS:
        serv = " · ".join(s for b in M["catalogo"] if b["unidad"] == u["codigo"] for s in b["items"])
        out.append(f"| {u['nombre']} | {u['codigo']} | {u['lista']} | {u['grupo']} | {serv} |")
    out += ["", "## Unidades que editan listas visibles", "", "| Unidad | Código | Lista | Grupo |", "|---|---|---|---|"]
    for u in M["unidades"]:
        if u["nivel"] == "visible":
            out.append(f"| {u['nombre']} | {u['codigo']} | {u['lista']} | {u['grupo']} |")
    out += ["", "## Niveles de permiso personalizados", "", "| Nivel | Se crea a partir de | Quita | Agrega | Uso |", "|---|---|---|---|---|"]
    for n in M["niveles_de_permiso"]:
        out.append(f"| {n['nombre']} | {n['base']} | {', '.join(n['quitar']) or '—'} | {', '.join(n['agregar']) or '—'} | {n['uso']} |")
    Path(destino).write_text("\n".join(out) + "\n", encoding="utf-8")
    print("Referencia:", destino)


# ------------------------------------------------------------------ PnP PowerShell
def ps_str(s):
    return "'" + str(s).replace("'", "''") + "'"


def xml_attr(s):
    return (str(s).replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;"))


def campo_xml(col):
    req = "TRUE" if col.get("requerido") else "FALSE"
    idx = ' Indexed="TRUE"' if col.get("indexado") else ""
    uni = ' EnforceUniqueValues="TRUE"' if col.get("unico") else ""
    base = f'DisplayName="{xml_attr(col["nombre"])}" Name="{col["interno"]}" StaticName="{col["interno"]}" Required="{req}"{idx}{uni}'
    if col["tipo"] == "Texto":
        return f'<Field Type="Text" {base} MaxLength="255" />'
    if col["tipo"] == "TextoLargo":
        return f'<Field Type="Note" {base} NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
    if col["tipo"] == "Fecha":
        return f'<Field Type="DateTime" {base} Format="DateOnly" />'
    if col["tipo"] == "Numero":
        return f'<Field Type="Number" {base} Decimals="{col.get("decimales", 0)}" />'
    raise ValueError(col["tipo"])


def scripts(salida):
    salida = Path(salida)
    salida.mkdir(parents=True, exist_ok=True)
    L = []
    w = L.append
    w("<#")
    w(".SYNOPSIS")
    w("  Crea en un sitio de SharePoint las listas, grupos y permisos del sistema de acompañamiento estudiantil.")
    w(".DESCRIPTION")
    w("  Generado desde microsoft365/modelo.json con generar_kit.py. No editar a mano: cambiar el modelo y regenerar.")
    w("  Requisitos: PowerShell 7.4+, módulo PnP.PowerShell 3.x y un registro de aplicación de Entra ID para PnP")
    w("  (Register-PnPEntraIDAppForInteractiveLogin). Quien lo ejecute debe ser propietario del sitio.")
    w("  Es idempotente: si una lista, columna, grupo o nivel de permiso ya existe, lo deja como está y sigue.")
    w(".EXAMPLE")
    w("  ./provisionar-sitio.ps1 -SiteUrl https://unimagdalena.sharepoint.com/sites/AcompanamientoEstudiantil -ClientId <id> -Administradores persona1@unimagdalena.edu.co,persona2@unimagdalena.edu.co")
    w("#>")
    w("[CmdletBinding()]")
    w("param(")
    w("    [Parameter(Mandatory)] [string] $SiteUrl,")
    w("    [Parameter(Mandatory)] [string] $ClientId,")
    w("    [Parameter(Mandatory)] [string[]] $Administradores")
    w(")")
    w("$ErrorActionPreference = 'Stop'")
    w("Import-Module PnP.PowerShell")
    w("Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId")
    w("")
    w("function Paso($texto) { Write-Host \"`n== $texto\" -ForegroundColor Cyan }")
    w("")
    w("# Nombres de los niveles de permiso integrados en el idioma del sitio (Leer, Colaborar, Control total).")
    w("$roles = Get-PnPRoleDefinition")
    w("$rolLeer = ($roles | Where-Object { $_.RoleTypeKind -eq 'Reader' }).Name")
    w("$rolColaborar = $roles | Where-Object { $_.RoleTypeKind -eq 'Contributor' }")
    w("$rolControlTotal = ($roles | Where-Object { $_.RoleTypeKind -eq 'Administrator' }).Name")
    w("$grupoPropietarios = Get-PnPGroup -AssociatedOwnerGroup")
    w("")
    w("Paso 'Niveles de permiso personalizados'")
    w("function NivelPermiso($nombre, $clonar, [string[]]$incluir, [string[]]$excluir, $descripcion) {")
    w("    if (Get-PnPRoleDefinition | Where-Object { $_.Name -eq $nombre }) { Write-Host \"  ya existe: $nombre\"; return }")
    w("    $p = @{ RoleName = $nombre; Description = $descripcion }")
    w("    if ($clonar) { $p.Clone = $clonar }")
    w("    if ($incluir) { $p.Include = $incluir }")
    w("    if ($excluir) { $p.Exclude = $excluir }")
    w("    Add-PnPRoleDefinition @p | Out-Null")
    w("    Write-Host \"  creado: $nombre\"")
    w("}")
    w("NivelPermiso 'AE Colaborar sin eliminar' $rolColaborar @() @('DeleteListItems','DeleteVersions') 'Colaborar sin eliminar elementos ni versiones'")
    w("NivelPermiso 'AE Gestionar unidad' $rolColaborar @('CancelCheckout') @('DeleteListItems','DeleteVersions') 'Unidad dueña de una lista de seguimiento: ve y edita todo, no elimina'")
    w("NivelPermiso 'AE Consultar unidad' ($roles | Where-Object { $_.RoleTypeKind -eq 'Reader' }) @('CancelCheckout') @() 'Lee todos los elementos de una lista de seguimiento de otra unidad'")
    w("NivelPermiso 'AE Remitir' $null @('ViewListItems','AddListItems','ViewFormPages','OpenItems','Open','ViewPages','UseRemoteAPIs','BrowseUserInfo') @() 'Crea remisiones y ve solo las que creó'")
    w("")
    w("Paso 'Grupos de SharePoint'")
    w("function Grupo($nombre, $descripcion) {")
    w("    try { Get-PnPGroup -Identity $nombre | Out-Null; Write-Host \"  ya existe: $nombre\" }")
    w("    catch { New-PnPGroup -Title $nombre -Description $descripcion -Owner $grupoPropietarios.Title | Out-Null; Write-Host \"  creado: $nombre\" }")
    w("}")
    grupos = [("AE Personal", M["grupos_base"][1]["descripcion"])] + [(u["grupo"], f"Unidad: {u['nombre']}") for u in M["unidades"]]
    for g, d in grupos:
        w(f"Grupo {ps_str(g)} {ps_str(d)}")
    w("Set-PnPWebPermission -Group 'AE Personal' -AddRole $rolLeer")
    w("foreach ($correo in $Administradores) { Add-PnPGroupMember -LoginName $correo -Group $grupoPropietarios.Title }")
    w("")
    w("Paso 'Listas y columnas'")
    w("function Lista($titulo, $url, $descripcion) {")
    w("    $l = $null; try { $l = Get-PnPList -Identity $titulo -ErrorAction Stop } catch { }")
    w("    if (-not $l) { $l = New-PnPList -Title $titulo -Url \"Lists/$url\" -Template GenericList -EnableVersioning; Write-Host \"  creada: $titulo\" }")
    w("    else { Write-Host \"  ya existe: $titulo\" }")
    w("    Set-PnPList -Identity $titulo -Description $descripcion -EnableVersioning $true -MajorVersions 500 -EnableAttachments $false | Out-Null")
    w("    # El Título no se usa: la app trabaja con «Código».")
    w("    Set-PnPField -List $titulo -Identity 'Title' -Values @{ Required = $false } | Out-Null")
    w("    return $titulo")
    w("}")
    w("function Columna($lista, $interno, $xml) {")
    w("    $existe = $null; try { $existe = Get-PnPField -List $lista -Identity $interno -ErrorAction Stop } catch { }")
    w("    if ($existe) { return }")
    w("    Add-PnPFieldFromXml -List $lista -FieldXml $xml | Out-Null")
    w("}")
    w("function VistaPorDefecto($lista, [string[]]$campos) {")
    w("    $v = Get-PnPView -List $lista | Where-Object { $_.DefaultView }")
    w("    Set-PnPView -List $lista -Identity $v.Id -Fields $campos | Out-Null")
    w("}")
    for l in todas_las_listas():
        w("")
        w(f"$l = Lista {ps_str(l['titulo'])} {ps_str(l['url'])} {ps_str(l['descripcion'])}")
        for c in l["columnas"]:
            w(f"Columna $l {ps_str(c['interno'])} {ps_str(campo_xml(c))}")
        vista = [c["interno"] for c in l["columnas"] if c["tipo"] != "TextoLargo"][:12]
        w("VistaPorDefecto $l @(" + ", ".join(ps_str(x) for x in vista) + ")")
    w("")
    w("Paso 'Permisos por lista'")
    w("function Romper($lista) { Set-PnPList -Identity $lista -BreakRoleInheritance -CopyRoleAssignments | Out-Null }")
    w("# Quita todos los permisos de un grupo sobre una lista (si no tenía, no pasa nada).")
    w("function QuitarGrupo($lista, $grupo) {")
    w("    $l = Get-PnPList -Identity $lista")
    w("    $g = Get-PnPGroup -Identity $grupo")
    w("    try { $l.RoleAssignments.GetByPrincipal($g).DeleteObject(); Invoke-PnPQuery } catch { }")
    w("}")
    w("# En listas reservadas no deben quedar el personal general ni los grupos Miembros y Visitantes del sitio.")
    w("function QuitarPersonal($lista) {")
    w("    QuitarGrupo $lista 'AE Personal'")
    w("    QuitarGrupo $lista (Get-PnPGroup -AssociatedMemberGroup).Title")
    w("    QuitarGrupo $lista (Get-PnPGroup -AssociatedVisitorGroup).Title")
    w("}")
    for l in M["listas"]:
        unidades_edit = [c for c in l["editan"] if c in UNIDADES]
        if not l["leen"]:
            w(f"Romper {ps_str(l['titulo'])}; QuitarPersonal {ps_str(l['titulo'])}")
        if unidades_edit:
            if l["leen"]:
                w(f"Romper {ps_str(l['titulo'])}")
            for c in unidades_edit:
                w(f"Set-PnPListPermission -Identity {ps_str(l['titulo'])} -Group {ps_str(UNIDADES[c]['grupo'])} -AddRole 'AE Colaborar sin eliminar'")
    for u in RESERVADAS:
        t = ps_str(u["lista"])
        w(f"Romper {t}; QuitarPersonal {t}")
        w(f"Set-PnPListPermission -Identity {t} -Group {ps_str(u['grupo'])} -AddRole 'AE Gestionar unidad'")
        w(f"Set-PnPListPermission -Identity {t} -Group 'AE Personal' -AddRole 'AE Remitir'")
        w(f"Set-PnPList -Identity {t} -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null")
        w(f"Set-PnPField -List {t} -Identity 'Author' -Values @{{ Indexed = $true }} | Out-Null")
    for u in RESERVADAS:
        for otra in u.get("tambien_consulta", []):
            w(f"Set-PnPListPermission -Identity {ps_str(UNIDADES[otra]['lista'])} -Group {ps_str(u['grupo'])} -AddRole 'AE Consultar unidad'")
    w("")
    w("Paso 'Catálogo de servicios y accesos de administración'")
    w("if (-not (Get-PnPListItem -List 'Catálogo de servicios' -PageSize 1 | Select-Object -First 1)) {")
    w("    $b = New-PnPBatch")
    for f in servicios_catalogo():
        vals = "; ".join(f"{k} = {ps_str(v)}" for k, v in f.items() if k != "Orden")
        w(f"    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{{ {vals}; Orden = '{f['Orden']}' }}")
    w("    Invoke-PnPBatch -Batch $b")
    w("}")
    w("foreach ($correo in $Administradores) {")
    w("    $c = $correo.ToLower()")
    w("    $consulta = \"<View><Query><Where><And><Eq><FieldRef Name='Correo'/><Value Type='Text'>$c</Value></Eq><Eq><FieldRef Name='Unidad'/><Value Type='Text'>ADM</Value></Eq></And></Where></Query></View>\"")
    w("    if (-not (Get-PnPListItem -List 'Accesos' -Query $consulta)) {")
    w("        Add-PnPListItem -List 'Accesos' -Values @{ Correo = $c; Unidad = 'ADM'; Rol = 'Coordinación'; Activo = 'Sí' } | Out-Null")
    w("    }")
    w("}")
    w("")
    w("Paso 'Listo'")
    w("Write-Host 'Revisa la guía: agrega a cada persona a «AE Personal» y al grupo de su unidad, y registra la misma pertenencia en la lista Accesos.'")
    w("Write-Host 'Si quien ejecutó el script no es uno de los dos administradores, quítate de Propietarios del sitio al terminar.'")
    (salida / "provisionar-sitio.ps1").write_text("﻿" + "\n".join(L) + "\n", encoding="utf-8")

    C = []
    w = C.append
    w("<#")
    w(".SYNOPSIS")
    w("  Carga o actualiza una lista desde un CSV (UTF-8) cuyos encabezados son los nombres internos de las columnas.")
    w(".DESCRIPTION")
    w("  Actualiza por clave: si el Código ya existe en la lista, actualiza la fila; si no, la crea. No borra nada.")
    w("  Las fechas (aaaa-mm-dd) y los números (punto decimal) del CSV se convierten al formato regional del sitio,")
    w("  porque las cargas por lotes de SharePoint los validan con esa configuración.")
    w("  Generado por generar_kit.py. Úsalo con los archivos de «generar_kit.py carga», que no se guardan en el repositorio.")
    w(".EXAMPLE")
    w("  ./cargar-lista.ps1 -SiteUrl https://unimagdalena.sharepoint.com/sites/AcompanamientoEstudiantil -ClientId <id> -Lista Estudiantes -Csv ./Estudiantes_carga.csv")
    w("#>")
    w("[CmdletBinding()]")
    w("param(")
    w("    [Parameter(Mandatory)] [string] $SiteUrl,")
    w("    [Parameter(Mandatory)] [string] $ClientId,")
    w("    [Parameter(Mandatory)] [string] $Lista,")
    w("    [Parameter(Mandatory)] [string] $Csv,")
    w("    [string] $Clave = 'Codigo',")
    w("    [int] $Lote = 500")
    w(")")
    w("$ErrorActionPreference = 'Stop'")
    w("Import-Module PnP.PowerShell")
    w("Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId")
    w("")
    w("$web = Get-PnPWeb -Includes RegionalSettings.LocaleId")
    w("$cultura = [Globalization.CultureInfo]::GetCultureInfo([int]$web.RegionalSettings.LocaleId)")
    w("$invariante = [Globalization.CultureInfo]::InvariantCulture")
    w("$campos = Get-PnPField -List $Lista | Where-Object { -not $_.Hidden }")
    w("$tipos = @{}; foreach ($f in $campos) { $tipos[$f.InternalName] = $f.TypeAsString }")
    w("")
    w("function Convertir($interno, $valor) {")
    w("    if ([string]::IsNullOrWhiteSpace($valor)) { return $null }")
    w("    switch ($tipos[$interno]) {")
    w("        'DateTime' { return [datetime]::ParseExact($valor, 'yyyy-MM-dd', $invariante).ToString($cultura.DateTimeFormat.ShortDatePattern, $cultura) }")
    w("        'Number'   { return ([double]::Parse($valor, $invariante)).ToString($cultura) }")
    w("        default    { return $valor }")
    w("    }")
    w("}")
    w("")
    w("$filas = Import-Csv -Path $Csv -Encoding utf8")
    w("$desconocidas = $filas[0].PSObject.Properties.Name | Where-Object { -not $tipos.ContainsKey($_) }")
    w("if ($desconocidas) { throw \"Columnas del CSV que no existen en la lista ${Lista}: $($desconocidas -join ', ')\" }")
    w("")
    w("Write-Host \"Leyendo la lista $Lista...\"")
    w("$existentes = @{}")
    w("Get-PnPListItem -List $Lista -PageSize 2000 -Fields $Clave | ForEach-Object { $existentes[[string]$_.FieldValues[$Clave]] = $_.Id }")
    w("Write-Host \"  $($existentes.Count) filas ya cargadas; $($filas.Count) en el CSV\"")
    w("")
    w("$nuevas = 0; $actualizadas = 0; $b = New-PnPBatch; $enLote = 0")
    w("foreach ($fila in $filas) {")
    w("    $valores = @{}")
    w("    foreach ($p in $fila.PSObject.Properties) { $valores[$p.Name] = Convertir $p.Name $p.Value }")
    w("    $clave = [string]$fila.$Clave")
    w("    if ($existentes.ContainsKey($clave)) { Set-PnPListItem -List $Lista -Identity $existentes[$clave] -Values $valores -Batch $b; $actualizadas++ }")
    w("    else { Add-PnPListItem -List $Lista -Values $valores -Batch $b; $nuevas++ }")
    w("    $enLote++")
    w("    if ($enLote -ge $Lote) { Invoke-PnPBatch -Batch $b -StopOnException; $b = New-PnPBatch; $enLote = 0; Write-Host \"  $($nuevas + $actualizadas) de $($filas.Count)\" }")
    w("}")
    w("if ($enLote -gt 0) { Invoke-PnPBatch -Batch $b -StopOnException }")
    w("Write-Host \"Listo: $nuevas nuevas y $actualizadas actualizadas en $Lista.\"")
    (salida / "cargar-lista.ps1").write_text("﻿" + "\n".join(C) + "\n", encoding="utf-8")
    print("Scripts:", salida / "provisionar-sitio.ps1", salida / "cargar-lista.ps1")


# ------------------------------------------------------------------ Carga real (privada)
def cupo_visible(cupo):
    c = (cupo or "").upper()
    return any(k in c for k in M["cupo_especial"]["visibles_si_contiene"])


def periodo_reporte(p):
    """Igual que la tabla TPeriodos de «Cómo está mi facultad»: 2026II → 2026-II y 20263C (cuatrimestral) → 2026-II."""
    t = str(p).strip().upper()
    m = re.fullmatch(r"(\d{4})\s*-?\s*(I{1,2})", t)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m = re.fullmatch(r"(\d{4})3C", t)
    if m:
        return f"{m.group(1)}-II"
    print(f"Aviso: periodo sin regla de reporte, se deja igual: {t}")
    return t


def leer_base(ruta):
    def limpio(v):
        return re.sub(r"\s+", " ", v).strip() if isinstance(v, str) else v

    def entero(v):
        return int(v) if isinstance(v, float) and v.is_integer() else v

    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    filas = []
    for fac in FACULTADES:
        primera = True
        for r in wb[fac].iter_rows(min_col=2, max_col=25, values_only=True):
            if primera:
                primera = False
                continue
            if all(v is None or (isinstance(v, str) and not v.strip()) for v in r):
                continue
            (periodo, programa, _mod, codigo, sexo, nombres, apellidos, mod_ing, matric, cancel, cupo, plan, prom,
             tipo_doc, num_doc, nac, estrato, origen, dep_o, mun_o, colegio, tipo_col, dep_c, mun_c) = r
            if isinstance(nac, dt.datetime):
                nac = nac.date()
            elif isinstance(nac, (int, float)):
                nac = (dt.datetime(1899, 12, 30) + dt.timedelta(days=int(nac))).date()
            prom = entero(prom)
            nombres, apellidos = limpio(nombres) or "", limpio(apellidos) or ""
            filas.append({
                "Codigo": limpio(str(entero(codigo))), "Documento": limpio(str(entero(num_doc))),
                "TipoDocumento": limpio(tipo_doc), "Nombres": nombres, "Apellidos": apellidos,
                "NombreCompleto": f"{nombres} {apellidos}".strip(),
                "Busqueda": norm_busqueda(f"{apellidos} {nombres}"), "BusquedaNombre": norm_busqueda(f"{nombres} {apellidos}"),
                "Sexo": limpio(sexo), "FechaNacimiento": nac, "Facultad": fac, "Programa": limpio(programa),
                "Periodo": periodo_reporte(periodo), "PeriodoOriginal": limpio(str(periodo)), "Matriculado": limpio(matric), "CancelacionSemestre": limpio(cancel),
                "Promedio": round(prom / DIVISOR_PROMEDIO, 2) if isinstance(prom, (int, float)) and prom > 0 else None,
                "PlanEstudio": limpio(str(entero(plan))) if plan is not None else "",
                "ModalidadIngreso": limpio(mod_ing), "_cupo": limpio(cupo) or "",
                "Estrato": limpio(str(entero(estrato))) if estrato is not None else "",
                "Origen": limpio(origen), "DepartamentoOrigen": limpio(dep_o), "MunicipioOrigen": limpio(mun_o),
                "Colegio": limpio(colegio), "TipoColegio": limpio(tipo_col), "DepartamentoColegio": limpio(dep_c),
                "MunicipioColegio": limpio(mun_c), "FechaCorte": FECHA_CORTE,
            })
    wb.close()
    return filas


def carga(base, salida):
    salida = Path(salida)
    salida.mkdir(parents=True, exist_ok=True)
    filas = leer_base(base)
    codigos = [f["Codigo"] for f in filas]
    assert len(codigos) == len(set(codigos)), "Hay códigos repetidos en la base: revisar antes de cargar"
    est_cols = next(l for l in M["listas"] if l["titulo"] == "Estudiantes")["columnas"]
    con_cols = next(l for l in M["listas"] if l["titulo"] == "Condiciones de ingreso")["columnas"]
    est, cond = [], []
    for f in filas:
        visible = cupo_visible(f["_cupo"])
        e = {k: v for k, v in f.items() if not k.startswith("_")}
        e["CupoEspecial"] = f["_cupo"] if visible else ""
        est.append(e)
        if not visible:
            cond.append({"Codigo": f["Codigo"], "Estudiante": f["NombreCompleto"], "Condicion": f["_cupo"],
                         "Periodo": f["Periodo"], "Fuente": "Base académica (cupo especial)"})

    def a_texto(v):
        if isinstance(v, dt.date):
            return v.isoformat()
        if isinstance(v, float):
            return f"{v:.2f}"
        return "" if v is None else str(v)

    def guardar(nombre, columnas, datos):
        with open(salida / f"{nombre}.csv", "w", newline="", encoding="utf-8") as fh:
            wr = csv.writer(fh)
            wr.writerow([c["interno"] for c in columnas])
            for d in datos:
                wr.writerow([a_texto(d.get(c["interno"])) for c in columnas])
        wb = openpyxl.Workbook(write_only=False)
        ws = wb.active
        ws.title = "Datos"
        visibles = [{c["nombre"]: d.get(c["interno"]) for c in columnas} for d in datos]
        escribir_tabla(ws, columnas, visibles, "Tabla" + re.sub(r"\W", "", nombre))
        wb.save(salida / f"{nombre}.xlsx")

    guardar("Estudiantes_carga", est_cols, est)
    guardar("Condiciones_ingreso_carga", con_cols, cond)
    hoy = dt.date(2026, 10, 8)
    menores = sum(1 for e in est if e["FechaNacimiento"] and
                  hoy.year - e["FechaNacimiento"].year - ((hoy.month, hoy.day) < (e["FechaNacimiento"].month, e["FechaNacimiento"].day)) < 18)
    resumen = {
        "estudiantes": len(est), "condiciones_reservadas": len(cond),
        "matriculados": sum(1 for e in est if e["Matriculado"] == "SI"),
        "menores_de_18_al_2026_10_08": menores,
        "sin_promedio": sum(1 for e in est if e["Promedio"] is None),
        "por_facultad": {fac: sum(1 for e in est if e["Facultad"] == fac) for fac in FACULTADES},
    }
    (salida / "resumen_carga.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(resumen, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    accion = sys.argv[1]
    if accion == "plantillas":
        plantillas(sys.argv[2])
    elif accion == "referencia":
        referencia(sys.argv[2])
    elif accion == "scripts":
        scripts(sys.argv[2])
    elif accion == "carga" and len(sys.argv) == 4:
        carga(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
