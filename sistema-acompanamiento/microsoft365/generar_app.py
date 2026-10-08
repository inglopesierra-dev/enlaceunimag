"""Genera el código de la app de lienzo de Power Apps a partir de modelo.json.

Uso:  python generar_app.py SALIDA

Escribe en SALIDA:
  formulas-app.txt          Fórmulas con nombre (propiedad Formulas de App), con comas.
  formulas-app-es.txt       Lo mismo con punto y coma, para Power Apps configurado en español.
  pantallas/*.pa.yaml       Cada pantalla completa, para pegar con «Pegar código» en la vista de árbol.
  controles/*.pa.yaml       Solo los controles de cada pantalla, para pegar dentro de una pantalla en blanco.
  receta.md                 Controles y fórmulas pantalla por pantalla, por si hay que armarla a mano.

Las listas, columnas y unidades salen del modelo, así que la app y las listas no se desalinean.
"""
import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
M = json.loads((AQUI / "modelo.json").read_text(encoding="utf-8"))
UNIDADES = M["unidades"]
RESERVADAS = [u for u in UNIDADES if u["nivel"] == "reservado"]
OP = M["opciones"]


# ------------------------------------------------------------------ utilidades de Power Fx
def q(nombre):
    """Identificador de Power Fx: entre comillas simples si tiene espacios, tildes u otros signos."""
    return nombre if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", nombre) else "'" + nombre.replace("'", "''") + "'"


def s(texto):
    return '"' + str(texto).replace('"', '""') + '"'


def tabla_texto(valores):
    return "[" + ", ".join(s(v) for v in valores) + "]"


def catalogo(unidad_expr):
    return f"Sort(Filter({q('Catálogo de servicios')}, Unidad = {unidad_expr} And Activo = \"Sí\"), Orden).Servicio"


NORM = "Upper(q)"
for a, b in (("Á", "A"), ("É", "E"), ("Í", "I"), ("Ó", "O"), ("Ú", "U"), ("Ü", "U"), ("Ñ", "N")):
    NORM = f'Substitute({NORM}, "{a}", "{b}")'


def switch_unidades(var, cuerpo):
    """Switch sobre las listas reservadas. cuerpo(L) devuelve la fórmula para la lista L."""
    ramas = [f'    {s(u["codigo"])}, {cuerpo(q(u["lista"]))}' for u in RESERVADAS]
    return f"Switch({var},\n" + ",\n".join(ramas) + "\n)"


C = {  # colores (fxC en las fórmulas con nombre)
    "Acento": "RGBA(10, 108, 118, 1)", "AcentoSuave": "RGBA(230, 243, 244, 1)", "Texto": "RGBA(22, 50, 79, 1)",
    "Tenue": "RGBA(97, 113, 130, 1)", "Fondo": "RGBA(245, 247, 248, 1)", "Borde": "RGBA(217, 225, 234, 1)",
    "Reservado": "RGBA(91, 63, 160, 1)", "ReservadoSuave": "RGBA(239, 235, 249, 1)", "Aviso": "RGBA(150, 85, 0, 1)",
    "AvisoSuave": "RGBA(255, 244, 224, 1)", "Error": "RGBA(180, 35, 24, 1)", "Blanco": "RGBA(255, 255, 255, 1)",
}


def formulas_app():
    filas = []
    for u in UNIDADES:
        filas.append("    {Codigo: %s, Corto: %s, Nombre: %s, Nivel: %s}" % (s(u["codigo"]), s(u["corto"]), s(u["nombre"]), s(u["nivel"])))
    consulta = " Or ".join(f'(Codigo = {s(otra)} And {s(u["codigo"])} in fxMisAccesos.Unidad)'
                           for u in RESERVADAS for otra in u.get("tambien_consulta", []))
    consulta = f" Or {consulta}" if consulta else ""
    colores = ", ".join(f"{k}: {v}" for k, v in C.items())
    return "\n".join([
        "fxYo = Lower(User().Email);",
        "fxNombreYo = User().FullName;",
        'fxMisAccesos = Filter(Accesos, Correo = fxYo And Activo = "Sí");',
        'fxEsAdmin = Not(IsEmpty(Filter(fxMisAccesos, Unidad = "ADM")));',
        "fxUnidades = Table(\n" + ",\n".join(filas) + "\n);",
        'fxReservadas = Filter(fxUnidades, Nivel = "reservado");',
        "fxGestiona = If(fxEsAdmin, fxUnidades, Filter(fxUnidades, Codigo in fxMisAccesos.Unidad));",
        'fxGestionaReservadas = Filter(fxGestiona, Nivel = "reservado");',
        f"fxLectura = If(fxEsAdmin, fxReservadas, Filter(fxReservadas, Codigo in fxMisAccesos.Unidad{consulta}));",
        'fxRemitente = fxNombreYo & " · " & If(fxEsAdmin, "Administración", Concat(Filter(fxUnidades, Codigo in fxMisAccesos.Unidad), Corto, ", "));',
        "fxC = {" + colores + "};",
    ])


def a_espanol(formula):
    """Convierte la sintaxis con comas a la de Power Apps en español: ; → ;; , → ; y 0.5 → 0,5 (fuera de textos)."""
    out, i, n = [], 0, len(formula)
    while i < n:
        ch = formula[i]
        if ch in ('"', "'"):
            j = i + 1
            while j < n:
                if formula[j] == ch:
                    if j + 1 < n and formula[j + 1] == ch:
                        j += 2
                        continue
                    break
                j += 1
            out.append(formula[i:j + 1])
            i = j + 1
            continue
        if ch == ";":
            out.append(";;")
        elif ch == ",":
            out.append(";")
        elif ch == "." and i > 0 and formula[i - 1].isdigit() and i + 1 < n and formula[i + 1].isdigit():
            out.append(",")
        else:
            out.append(ch)
        i += 1
    return "".join(out)


# ------------------------------------------------------------------ controles
class Ctl:
    def __init__(self, nombre, tipo, props, hijos=None, variante=None):
        self.nombre, self.tipo, self.props, self.hijos, self.variante = nombre, tipo, props, hijos or [], variante


def label(nombre, texto, x, y, w, h, size=12, color="fxC.Texto", bold=False, **extra):
    p = {"Text": texto, "X": x, "Y": y, "Width": w, "Height": h, "Size": str(size), "Color": color,
         "Font": "Font.'Segoe UI'", "PaddingLeft": "0", "PaddingRight": "0", "PaddingTop": "0", "PaddingBottom": "0"}
    if bold:
        p["FontWeight"] = "FontWeight.Semibold"
    p.update(extra)
    return Ctl(nombre, "Label", p)


def boton(nombre, texto, x, y, w, h, onselect, fill="fxC.Acento", color="fxC.Blanco", borde=None, **extra):
    p = {"Text": texto, "X": x, "Y": y, "Width": w, "Height": h, "OnSelect": onselect, "Fill": fill, "Color": color,
         "HoverFill": f"ColorFade({fill}, -15%)", "PressedFill": f"ColorFade({fill}, -25%)", "HoverColor": color,
         "BorderColor": borde or fill, "BorderThickness": "1" if borde else "0", "Size": "12", "Font": "Font.'Segoe UI'",
         "FontWeight": "FontWeight.Semibold", "RadiusTopLeft": "6", "RadiusTopRight": "6", "RadiusBottomLeft": "6", "RadiusBottomRight": "6"}
    p.update(extra)
    return Ctl(nombre, "Classic/Button", p)


def icono(nombre, icon, x, y, w, h, color="fxC.Tenue", **extra):
    p = {"Icon": f"Icon.{icon}", "X": x, "Y": y, "Width": w, "Height": h, "Color": color}
    p.update(extra)
    return Ctl(nombre, "Classic/Icon", p, variante=icon)


def rect(nombre, x, y, w, h, fill, **extra):
    p = {"X": x, "Y": y, "Width": w, "Height": h, "Fill": fill}
    p.update(extra)
    return Ctl(nombre, "Rectangle", p)


def caja(nombre, x, y, w, h, hijos, fill="fxC.Blanco", **extra):
    p = {"X": x, "Y": y, "Width": w, "Height": h, "Fill": fill, "BorderColor": "fxC.Borde", "BorderThickness": "1",
         "RadiusTopLeft": "8", "RadiusTopRight": "8", "RadiusBottomLeft": "8", "RadiusBottomRight": "8", "DropShadow": "DropShadow.None"}
    p.update(extra)
    return Ctl(nombre, "GroupContainer", p, hijos, variante="manualLayoutContainer")


def entrada(nombre, x, y, w, h, hint, multilinea=False, **extra):
    p = {"Default": '""', "HintText": s(hint), "X": x, "Y": y, "Width": w, "Height": h, "Size": "12",
         "Font": "Font.'Segoe UI'", "Color": "fxC.Texto", "BorderColor": "fxC.Borde", "BorderThickness": "1",
         "HoverBorderColor": "fxC.Acento", "FocusedBorderColor": "fxC.Acento", "FocusedBorderThickness": "2",
         "RadiusTopLeft": "6", "RadiusTopRight": "6", "RadiusBottomLeft": "6", "RadiusBottomRight": "6", "PaddingLeft": "10"}
    if multilinea:
        p["Mode"] = "TextMode.MultiLine"
    p.update(extra)
    return Ctl(nombre, "Classic/TextInput", p)


def desplegable(nombre, x, y, w, h, items, default=None, **extra):
    p = {"Items": items, "X": x, "Y": y, "Width": w, "Height": h, "Size": "12", "Font": "Font.'Segoe UI'",
         "Color": "fxC.Texto", "BorderColor": "fxC.Borde", "BorderThickness": "1", "ChevronBackground": "fxC.Blanco",
         "ChevronFill": "fxC.Tenue", "HoverFill": "fxC.AcentoSuave", "SelectionFill": "fxC.Acento", "PaddingLeft": "10"}
    if default:
        p["Default"] = default
    p.update(extra)
    return Ctl(nombre, "Classic/DropDown", p)


def fecha(nombre, x, y, w, h, default="Today()", **extra):
    p = {"DefaultDate": default, "X": x, "Y": y, "Width": w, "Height": h, "Size": "12", "Font": "Font.'Segoe UI'",
         "Color": "fxC.Texto", "BorderColor": "fxC.Borde", "IconFill": "fxC.Blanco", "IconBackground": "fxC.Acento",
         "Format": "DateTimeFormat.ShortDate"}
    p.update(extra)
    return Ctl(nombre, "Classic/DatePicker", p)


def html(nombre, x, y, w, h, texto, **extra):
    p = {"HtmlText": texto, "X": x, "Y": y, "Width": w, "Height": h, "PaddingLeft": "0", "PaddingRight": "0",
         "PaddingTop": "0", "PaddingBottom": "0"}
    p.update(extra)
    return Ctl(nombre, "HtmlViewer", p)


def galeria(nombre, x, y, w, h, items, plantilla, hijos, horizontal=False, **extra):
    p = {"Items": items, "X": x, "Y": y, "Width": w, "Height": h, "TemplateSize": str(plantilla), "TemplatePadding": "0",
         "ShowScrollbar": "true", "LoadingSpinner": "LoadingSpinner.Data", "LoadingSpinnerColor": "fxC.Acento"}
    p.update(extra)
    return Ctl(nombre, "Gallery", p, hijos, variante="galleryHorizontal" if horizontal else "galleryVertical")


def encabezado(sufijo, atras=None):
    hijos = [
        rect(f"rectEnc{sufijo}", "0", "0", "Parent.Width", "64", "fxC.Acento"),
        label(f"lblEncTitulo{sufijo}", s("Acompañamiento Estudiantil"), "72" if atras else "24", "0", "520", "64", 18,
              "fxC.Blanco", True),
        label(f"lblEncUsuario{sufijo}", 'fxNombreYo & "  ·  " & If(fxEsAdmin, "Administración", If(IsEmpty(fxGestiona), "Personal", Concat(fxGestiona, Corto, ", ")))',
              "Parent.Width - 624", "0", "600", "64", 11, "fxC.Blanco", False, Align="Align.Right"),
    ]
    if atras:
        hijos.append(icono(f"icoAtras{sufijo}", "ArrowLeft", "16", "12", "40", "40", "fxC.Blanco", OnSelect=atras,
                           Tooltip=s("Volver"), AccessibleLabel=s("Volver"),
                           PaddingTop="8", PaddingBottom="8", PaddingLeft="8", PaddingRight="8"))
    return hijos


# ------------------------------------------------------------------ pantalla Inicio
def p_inicio():
    busqueda = f"""With({{q: Trim(txtBuscar.Text)}},
    If(
        Len(q) < 3, Blank(),
        IsMatch(q, "\\d+"),
            With({{r: Filter(Estudiantes, {q('Código')} = q)}}, If(IsEmpty(r), Filter(Estudiantes, Documento = q), r)),
        With({{t: {NORM}}},
            With({{r: Filter(Estudiantes, StartsWith({q('Búsqueda')}, t))}},
                If(IsEmpty(r), Filter(Estudiantes, StartsWith({q('Búsqueda por nombre')}, t)), r)))
    )
)"""
    plantilla_res = [
        label("lblResNombre", f"ThisItem.{q('Nombre completo')}", "20", "12", "Parent.TemplateWidth - 90", "24", 13, "fxC.Texto", True, OnSelect="Select(Parent)"),
        label("lblResDetalle", f'ThisItem.{q("Código")} & "  ·  " & ThisItem.Programa & "  ·  " & ThisItem.Facultad & If(ThisItem.Matriculado = "SI", "", "  ·  No matriculado")',
              "20", "38", "Parent.TemplateWidth - 90", "22", 11, "fxC.Tenue", OnSelect="Select(Parent)"),
        icono("icoResIr", "ChevronRight", "Parent.TemplateWidth - 56", "20", "36", "36", OnSelect="Select(Parent)"),
        rect("rectResLinea", "20", "Parent.TemplateHeight - 1", "Parent.TemplateWidth - 40", "1", "fxC.Borde"),
    ]
    abrir = f"""Set(varEst, LookUp(Estudiantes, {q('Código')} = ThisItem.{q('Código')}));
Set(varTab, "resumen");
Navigate(scrFicha, ScreenTransition.None)"""
    caja_buscar = caja("conBuscar", "24", "88", "Parent.Width * 0.58 - 36", "Parent.Height - 112", [
        label("lblBuscarTitulo", s("Buscar estudiante"), "24", "18", "Parent.Width - 48", "28", 16, "fxC.Texto", True),
        label("lblBuscarAyuda", s("Escribe el código o el documento completos, o las primeras letras del primer apellido o del primer nombre (mínimo 3). No importan las tildes."),
              "24", "50", "Parent.Width - 48", "40", 11, "fxC.Tenue", Wrap="true"),
        entrada("txtBuscar", "24", "96", "Parent.Width - 48", "44", "Código, documento o apellido", DelayOutput="true", PaddingLeft="40"),
        icono("icoBuscar", "Search", "34", "106", "24", "24"),
        label("lblConteo", 'If(Len(Trim(txtBuscar.Text)) < 3, "", CountRows(galResultados.AllItems) & If(CountRows(galResultados.AllItems) = 1, " resultado", " resultados"))',
              "24", "146", "Parent.Width - 48", "22", 11, "fxC.Tenue"),
        galeria("galResultados", "0", "172", "Parent.Width", "Parent.Height - 180", busqueda, 72, plantilla_res, OnSelect=abrir),
    ])
    tomar = switch_unidades("varUnidadPend", lambda L: f'Patch({L}, LookUp({L}, ID = ThisItem.Id), {{Estado: "En curso", {q("Asignado a")}: fxYo}})')
    pendientes = "Sort(" + switch_unidades("varUnidadPend", lambda L: (
        f'ForAll(Filter({L}, Estado = "Pendiente"), {{Id: ID, Codigo: {q("Código")}, Estudiante: Estudiante, Fecha: Fecha, '
        f'Tipo: {q("Tipo de registro")}, Servicio: Servicio, Motivo: Motivo, Remitido: {q("Remitido por")}, Prioridad: Prioridad, Origen: Origen}})')) + ", Fecha, SortOrder.Descending)"
    abrir_pend = f"""If(IsBlank(LookUp(Estudiantes, {q('Código')} = ThisItem.Codigo)),
    Notify("El código " & ThisItem.Codigo & " no está en la base de estudiantes. Revísalo en la lista de la unidad.", NotificationType.Warning),
    Set(varEst, LookUp(Estudiantes, {q('Código')} = ThisItem.Codigo));
    Set(varUnidad, varUnidadPend);
    Set(varTab, "seguimiento");
    Navigate(scrFicha, ScreenTransition.None)
)"""
    plantilla_pend = [
        label("lblPendEst", "Coalesce(ThisItem.Estudiante, ThisItem.Codigo)", "16", "10", "Parent.TemplateWidth - 130", "22", 12, "fxC.Texto", True, OnSelect="Select(Parent)"),
        label("lblPendInfo", 'ThisItem.Tipo & If(IsBlank(ThisItem.Servicio), "", "  ·  " & ThisItem.Servicio) & "  ·  " & Text(ThisItem.Fecha, "dd/mm/yyyy")',
              "16", "34", "Parent.TemplateWidth - 130", "20", 11, "fxC.Tenue", OnSelect="Select(Parent)"),
        label("lblPendOrigen", 'If(IsBlank(ThisItem.Remitido), ThisItem.Origen, "De: " & ThisItem.Remitido) & If(ThisItem.Prioridad = "Normal" Or IsBlank(ThisItem.Prioridad), "", "  ·  Prioridad " & Lower(ThisItem.Prioridad))',
              "16", "56", "Parent.TemplateWidth - 130", "20", 11,
              'If(ThisItem.Prioridad = "Urgente", fxC.Error, fxC.Tenue)', OnSelect="Select(Parent)"),
        boton("btnTomar", s("Tomar"), "Parent.TemplateWidth - 104", "24", "88", "34",
              f'IfError({tomar}, Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success))',
              Tooltip=s("Asignármela y pasarla a En curso")),
        rect("rectPendLinea", "16", "Parent.TemplateHeight - 1", "Parent.TemplateWidth - 32", "1", "fxC.Borde"),
    ]
    chips = [boton("btnUnidadPend", "ThisItem.Corto", "4", "4", "Parent.TemplateWidth - 8", "32", "Set(varUnidadPend, ThisItem.Codigo)",
                   fill="If(varUnidadPend = ThisItem.Codigo, fxC.Reservado, fxC.Blanco)",
                   color="If(varUnidadPend = ThisItem.Codigo, fxC.Blanco, fxC.Reservado)", borde="fxC.Reservado",
                   HoverFill="fxC.ReservadoSuave", PressedFill="fxC.ReservadoSuave", HoverColor="fxC.Reservado", Size="11")]
    caja_pend = caja("conPendientes", "Parent.Width * 0.58 + 12", "88", "Parent.Width * 0.42 - 36", "Parent.Height - 112", [
        label("lblPendTitulo", s("Bandeja de tu unidad"), "20", "18", "Parent.Width - 40", "28", 16, "fxC.Texto", True),
        label("lblPendAyuda", s("Solicitudes del formulario y remisiones que esperan respuesta. Solo ves las de las unidades a las que perteneces."),
              "20", "50", "Parent.Width - 40", "40", 11, "fxC.Tenue", Wrap="true"),
        galeria("galUnidadesPend", "16", "96", "Parent.Width - 32", "44", "fxGestionaReservadas", 150, chips, horizontal=True,
                ShowScrollbar="false", Visible="Not(IsEmpty(fxGestionaReservadas))"),
        label("lblSinUnidad", s("No tienes una unidad con seguimiento reservado. Puedes buscar estudiantes, ver los datos visibles y remitir a cualquier unidad."),
              "20", "100", "Parent.Width - 40", "60", 12, "fxC.Tenue", Wrap="true", Visible="IsEmpty(fxGestionaReservadas)"),
        label("lblPendVacio", s("No hay pendientes en esta unidad."), "20", "156", "Parent.Width - 40", "24", 12, "fxC.Tenue",
              Visible="Not(IsEmpty(fxGestionaReservadas)) And IsEmpty(galPendientes.AllItems)"),
        galeria("galPendientes", "0", "148", "Parent.Width", "Parent.Height - 156", pendientes, 86, plantilla_pend,
                OnSelect=abrir_pend, Visible="Not(IsEmpty(fxGestionaReservadas))"),
    ])
    hijos = encabezado("Inicio") + [caja_buscar, caja_pend]
    props = {"Fill": "fxC.Fondo",
             "OnVisible": "If(IsBlank(varUnidadPend) Or Not(varUnidadPend in fxGestionaReservadas.Codigo), Set(varUnidadPend, First(fxGestionaReservadas).Codigo))"}
    return "scrInicio", props, hijos


# ------------------------------------------------------------------ pantalla Ficha
def fila_html(k, v):
    return (f'{{k: {s(k)}, v: {v}}}')


def tabla_dl(filas):
    plantilla = ("\"<div style='display:flex;border-bottom:1px solid #D9E1EA;padding:6px 0'><span style='width:45%;color:#617182'>\" & k & "
                 "\"</span><span style='width:55%'>\" & Coalesce(v, \"Sin dato\") & \"</span></div>\"")
    return "Concat(Table(\n        " + ",\n        ".join(fila_html(k, v) for k, v in filas) + "\n    ), " + plantilla + ")"


def p_ficha():
    E = "varEst."
    edad = "Set(varEdad, With({n: varEst.'Fecha de nacimiento'}, If(IsBlank(n), Blank(), Year(Today()) - Year(n) - If(Month(Today()) * 100 + Day(Today()) < Month(n) * 100 + Day(n), 1, 0))))"
    onvisible = f"""{edad};
If(IsBlank(varTab) Or (varTab = "seguimiento" And IsEmpty(fxLectura)), Set(varTab, "resumen"));
If(IsBlank(varUnidad) Or Not(varUnidad in fxLectura.Codigo), Set(varUnidad, First(fxLectura).Codigo));
Set(varAnulando, false)"""
    chips = (
        "\"<div style='font-family:Segoe UI, sans-serif;font-size:12px'>\" &\n"
        "Concat(\n"
        "    Filter(\n"
        "        Table(\n"
        f"            {{t: {E}Facultad, e: \"\"}},\n"
        f"            {{t: {E}Programa, e: \"\"}},\n"
        f"            {{t: If(IsBlank({E}Periodo), \"\", \"Periodo \" & {E}Periodo), e: \"\"}},\n"
        f"            {{t: If({E}Matriculado = \"SI\", \"Matriculado\", \"No matriculado\"), e: If({E}Matriculado = \"SI\", \"ok\", \"aviso\")}},\n"
        f"            {{t: If(IsBlank({E}Promedio), \"Sin promedio\", \"Promedio \" & Text({E}Promedio, \"0.00\")), e: \"\"}},\n"
        f"            {{t: If(IsBlank({E}Estrato), \"\", \"Estrato \" & {E}Estrato), e: \"\"}},\n"
        f"            {{t: If({E}{q('Cupo especial')} = \"N/A\", \"\", {E}{q('Cupo especial')}), e: \"\"}}\n"
        "        ),\n"
        "        Not(IsBlank(t))\n"
        "    ),\n"
        "    \"<span style='display:inline-block;margin:0 6px 6px 0;padding:3px 10px;border-radius:12px;background:\" & "
        "Switch(e, \"ok\", \"#E6F3F4\", \"aviso\", \"#FFF4E0\", \"#EEF2F6\") & \";color:\" & "
        "Switch(e, \"ok\", \"#0A6C76\", \"aviso\", \"#965500\", \"#16324F\") & \"'>\" & t & \"</span>\"\n"
        ") & \"</div>\""
    )
    head = caja("conFichaHead", "24", "80", "Parent.Width - 48", "128", [
        label("lblNombre", f"{E}{q('Nombre completo')}", "24", "14", "Parent.Width - 48", "32", 20, "fxC.Texto", True),
        label("lblIdent", f'"Código " & {E}{q("Código")} & "  ·  " & {E}{q("Tipo de documento")} & " " & {E}Documento & If(IsBlank(varEdad), "", "  ·  " & varEdad & " años")',
              "24", "48", "Parent.Width * 0.5", "22", 12, "fxC.Tenue"),
        label("lblMenor", s("Menor de edad: los datos sensibles requieren la autorización de su representante legal"),
              "Parent.Width * 0.5", "46", "Parent.Width * 0.5 - 24", "26", 11, "fxC.Aviso", True, Fill="fxC.AvisoSuave",
              Align="Align.Center", Visible="Not(IsBlank(varEdad)) And varEdad < 18"),
        html("htmlChips", "24", "80", "Parent.Width - 48", "40", chips),
    ])
    tabs = [("resumen", "Resumen", "true"), ("bienestar", "Bienestar", "true"),
            ("seguimiento", "Seguimiento reservado", "Not(IsEmpty(fxLectura))"), ("remitir", "Remitir", "true")]
    botones_tab = []
    for k, (clave, texto, vis) in enumerate(tabs):
        x = f"24 + {k} * 196" if clave != "remitir" else 'If(IsEmpty(fxLectura), 24 + 2 * 196, 24 + 3 * 196)'
        botones_tab.append(boton(f"btnTab{clave.capitalize()}", s(texto), x, "220", "188", "38",
                                 f'Set(varTab, "{clave}"); Set(varAnulando, false)',
                                 fill=f'If(varTab = "{clave}", fxC.Acento, fxC.Blanco)',
                                 color=f'If(varTab = "{clave}", fxC.Blanco, fxC.Texto)', borde="fxC.Borde",
                                 HoverFill="fxC.AcentoSuave", PressedFill="fxC.AcentoSuave", HoverColor="fxC.Texto", Visible=vis))
    Y0, H0 = "270", "Parent.Height - 290"

    # Resumen
    resumen_html = f"""\"<div style='font-family:Segoe UI, sans-serif;font-size:13px;color:#16324F;display:flex;gap:32px;flex-wrap:wrap'>\" &
\"<div style='flex:1;min-width:280px'><div style='font-weight:600;margin-bottom:8px'>Datos básicos</div>\" &
{tabla_dl([("Nombres", E + "Nombres"), ("Apellidos", E + "Apellidos"), ("Documento", f'{E}{q("Tipo de documento")} & " " & {E}Documento'),
           ("Sexo", E + "Sexo"),
           ("Fecha de nacimiento", f'If(IsBlank({E}{q("Fecha de nacimiento")}), "", Text({E}{q("Fecha de nacimiento")}, "dd/mm/yyyy") & If(IsBlank(varEdad), "", " (" & varEdad & " años)"))'),
           ("Modalidad de ingreso", E + q("Modalidad de ingreso")), ("Plan de estudio", E + q("Plan de estudio")),
           ("Cancelación de semestre", E + q("Cancelación de semestre"))])} &
\"</div><div style='flex:1;min-width:280px'><div style='font-weight:600;margin-bottom:8px'>Procedencia</div>\" &
{tabla_dl([("Origen", E + "Origen"), ("Municipio y departamento", f'{E}{q("Municipio de origen")} & ", " & {E}{q("Departamento de origen")}'),
           ("Colegio", E + "Colegio"), ("Tipo de colegio", E + q("Tipo de colegio")),
           ("Ubicación del colegio", f'{E}{q("Municipio del colegio")} & ", " & {E}{q("Departamento del colegio")}'),
           ("Periodo original", E + q("Periodo original")),
           ("Fecha de corte de la base", f'Text({E}{q("Fecha de corte")}, "dd/mm/yyyy")')])} &
\"</div></div>\""""
    con_resumen = caja("conResumen", "24", Y0, "Parent.Width - 48", H0, [
        html("htmlResumen", "24", "16", "Parent.Width - 48", "Parent.Height - 70", resumen_html),
        label("lblResumenNota", s("Datos visibles para todo el personal del sistema. Los datos sensibles de ingreso (pertenencia étnica, víctima, discapacidad) solo los consulta Administración en SharePoint."),
              "24", "Parent.Height - 48", "Parent.Width - 48", "36", 11, "fxC.Tenue", Wrap="true"),
    ], Visible='varTab = "resumen"')

    # Bienestar (visible)
    fila = ("\"<div style='border-bottom:1px solid #D9E1EA;padding:8px 0'><div style='font-weight:600'>\" & {t} & "
            "\"</div><div style='color:#617182'>\" & {d} & \"</div></div>\"")

    def bloque(lista, orden, titulo_vacio, t, d, extra=""):
        return f"""With({{r: Filter({lista}, {q('Código')} = varEst.{q('Código')})}},
    "<div style='font-family:Segoe UI, sans-serif;font-size:13px;color:#16324F'>" & {extra}
    If(IsEmpty(r), "<div style='color:#617182;padding:8px 0'>{titulo_vacio}</div>",
        Concat(Sort(r, {orden}, SortOrder.Descending), {fila.format(t=t, d=d)})) & "</div>")"""
    ben = bloque("Beneficios", q("Fecha de inicio"), "Sin registros en programas de Desarrollo Humano.", "Programa",
                 'Estado & If(IsBlank(Periodo), "", " · " & Periodo) & If(IsBlank(Detalle), "", " · " & Detalle)')
    dep = bloque("Deportes", "Fecha", "Sin registros en Deportes.", q("Disciplina o servicio"),
                 f'{q("Tipo de registro")} & If(ASCUN = "Sí", " · ASCUN", "") & If(IsBlank(Nivel), "", " · " & Nivel) & If(IsBlank(Estado), "", " · " & Estado)',
                 extra=f"""If("DEPORTISTA" in Upper(varEst.{q('Cupo especial')}), "<div style='margin-bottom:6px;color:#0A6C76'>Ingresó por cupo deportivo</div>", "") &""")
    cul = bloque("Cultura", "Fecha", "Sin registros en Cultura.", q("Taller o grupo"),
                 f'{q("Tipo de registro")} & If(IsBlank(Rol), "", " · " & Rol) & If(IsBlank(Estado), "", " · " & Estado)',
                 extra=f"""If("ARTISTA" in Upper(varEst.{q('Cupo especial')}), "<div style='margin-bottom:6px;color:#0A6C76'>Ingresó por cupo de artista</div>", "") &""")
    colw = "(Parent.Width - 96) / 3"
    bien = []
    for k, (cod, titulo, cuerpo, pantalla) in enumerate([("PDH", "Beneficios", ben, "scrRegBeneficio"), ("DEP", "Deportes", dep, "scrRegDeportes"),
                                                         ("CUL", "Cultura", cul, "scrRegCultura")]):
        x = f"24 + {k} * ({colw} + 24)"
        bien += [
            label(f"lblBien{titulo}", s(titulo), x, "16", colw + " - 110", "28", 14, "fxC.Texto", True),
            boton(f"btnAgregar{titulo}", s("+ Agregar"), f"{x} + {colw} - 100", "14", "100", "32", f"Navigate({pantalla}, ScreenTransition.None)",
                  fill="fxC.Blanco", color="fxC.Acento", borde="fxC.Acento", HoverFill="fxC.AcentoSuave", PressedFill="fxC.AcentoSuave",
                  HoverColor="fxC.Acento", Visible=f'"{cod}" in fxGestiona.Codigo'),
            html(f"htmlBien{titulo}", x, "52", colw, "Parent.Height - 110", cuerpo),
        ]
    bien.append(label("lblBienNota", s("Visible para todo el personal del sistema: programas socioeconómicos, deporte y cultura. Para corregir un registro, ábrelo en la lista de SharePoint de su área."),
                      "24", "Parent.Height - 48", "Parent.Width - 48", "36", 11, "fxC.Tenue", Wrap="true"))
    con_bien = caja("conBienestar", "24", Y0, "Parent.Width - 48", H0, bien, Visible='varTab = "bienestar"')

    # Seguimiento (reservado)
    proy = lambda L: (f"ForAll(Filter({L}, {q('Código')} = varEst.{q('Código')}), {{Id: ID, Fecha: Fecha, Tipo: {q('Tipo de registro')}, "
                      f"Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: {q('Próxima acción')}, "
                      f"FechaProx: {q('Fecha próxima acción')}, Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: {q('Remitido por')}, "
                      f"Registrado: {q('Registrado por')}, Autorizacion: {q('Autorización de datos')}, Anulacion: {q('Motivo de anulación')}, Asignado: {q('Asignado a')}}})")
    items_seg = "Sort(" + switch_unidades("varUnidad", proy) + ", Fecha, SortOrder.Descending)"
    anular = switch_unidades("varUnidad", lambda L: f'Patch({L}, LookUp({L}, ID = varAnular.Id), {{Estado: "Anulado", {q("Motivo de anulación")}: Trim(txtMotivoAnular.Text)}})')
    gestiona = "varUnidad in fxGestionaReservadas.Codigo"
    plantilla_seg = [
        label("lblSegTitulo", 'Text(ThisItem.Fecha, "dd/mm/yyyy") & "  ·  " & ThisItem.Tipo & If(IsBlank(ThisItem.Servicio), "", "  ·  " & ThisItem.Servicio) & If(IsBlank(ThisItem.Motivo), "", "  ·  " & ThisItem.Motivo)',
              "16", "10", "Parent.TemplateWidth - 210", "22", 12, "fxC.Texto", True),
        label("lblSegEstado", "ThisItem.Estado", "Parent.TemplateWidth - 186", "10", "110", "24", 11,
              'Switch(ThisItem.Estado, "Pendiente", fxC.Aviso, "Anulado", fxC.Tenue, "Cerrado", fxC.Acento, fxC.Reservado)', True,
              Fill='Switch(ThisItem.Estado, "Pendiente", fxC.AvisoSuave, "Anulado", fxC.Fondo, "Cerrado", fxC.AcentoSuave, fxC.ReservadoSuave)',
              Align="Align.Center"),
        icono("icoAnular", "Cancel", "Parent.TemplateWidth - 60", "6", "36", "36", "fxC.Error",
              OnSelect="Set(varAnular, ThisItem); Set(varAnulando, true); Reset(txtMotivoAnular)",
              Visible=f'ThisItem.Estado <> "Anulado" And {gestiona}', Tooltip=s("Anular (no se borra: queda en el historial)"),
              AccessibleLabel=s("Anular registro"), PaddingTop="8", PaddingBottom="8", PaddingLeft="8", PaddingRight="8"),
        label("lblSegResumen", "ThisItem.Resumen", "16", "36", "Parent.TemplateWidth - 32", "44", 12, "fxC.Texto",
              Wrap="true", Strikethrough='ThisItem.Estado = "Anulado"', VerticalAlign="VerticalAlign.Top"),
        label("lblSegMeta", '"Registró: " & ThisItem.Registrado & If(IsBlank(ThisItem.Asignado), "", "  ·  A cargo: " & ThisItem.Asignado) & If(IsBlank(ThisItem.Proxima), "", "  ·  Próxima acción: " & ThisItem.Proxima & If(IsBlank(ThisItem.FechaProx), "", " (" & Text(ThisItem.FechaProx, "dd/mm/yyyy") & ")")) & If(IsBlank(ThisItem.Remitido), "", "  ·  Remitido por: " & ThisItem.Remitido) & If(ThisItem.Estado = "Anulado", "  ·  Motivo de anulación: " & ThisItem.Anulacion, "")',
              "16", "84", "Parent.TemplateWidth - 32", "38", 11, "fxC.Tenue", Wrap="true", VerticalAlign="VerticalAlign.Top"),
        rect("rectSegLinea", "16", "Parent.TemplateHeight - 1", "Parent.TemplateWidth - 32", "1", "fxC.Borde"),
    ]
    chips_seg = [boton("btnUnidadSeg", "ThisItem.Corto", "4", "4", "Parent.TemplateWidth - 8", "32",
                       "Set(varUnidad, ThisItem.Codigo); Set(varAnulando, false)",
                       fill="If(varUnidad = ThisItem.Codigo, fxC.Reservado, fxC.Blanco)",
                       color="If(varUnidad = ThisItem.Codigo, fxC.Blanco, fxC.Reservado)", borde="fxC.Reservado",
                       HoverFill="fxC.ReservadoSuave", PressedFill="fxC.ReservadoSuave", HoverColor="fxC.Reservado", Size="11")]
    con_anular = caja("conAnular", "Parent.Width - 444", "60", "420", "236", [
        label("lblAnularTitulo", '"Anular el registro del " & Text(varAnular.Fecha, "dd/mm/yyyy")',
              "20", "16", "Parent.Width - 40", "24", 14, "fxC.Texto", True),
        label("lblAnularAyuda", s("No se borra: queda en el historial de versiones con tu nombre. Escribe por qué se anula."),
              "20", "44", "Parent.Width - 40", "40", 11, "fxC.Tenue", Wrap="true"),
        entrada("txtMotivoAnular", "20", "90", "Parent.Width - 40", "64", "Motivo de la anulación", multilinea=True),
        boton("btnConfirmarAnular", s("Anular"), "Parent.Width - 236", "172", "100", "38",
              f'IfError({anular}, Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false))',
              fill="fxC.Error", DisplayMode="If(Len(Trim(txtMotivoAnular.Text)) < 5, DisplayMode.Disabled, DisplayMode.Edit)"),
        boton("btnCancelarAnular", s("Cancelar"), "Parent.Width - 124", "172", "100", "38", "Set(varAnulando, false)",
              fill="fxC.Blanco", color="fxC.Texto", borde="fxC.Borde", HoverFill="fxC.Fondo", PressedFill="fxC.Fondo", HoverColor="fxC.Texto"),
    ], DropShadow="DropShadow.Bold", Visible="varAnulando")
    con_seg = caja("conSeguimiento", "24", Y0, "Parent.Width - 48", H0, [
        galeria("galUnidadesSeg", "16", "12", "Parent.Width - 240", "44", "fxLectura", 170, chips_seg, horizontal=True, ShowScrollbar="false"),
        boton("btnNuevoRegistro", s("+ Nuevo registro"), "Parent.Width - 196", "16", "176", "36", "Navigate(scrRegSeguimiento, ScreenTransition.None)",
              Visible=gestiona),
        label("lblSegAviso", '"Reservado: solo lo ven " & LookUp(fxUnidades, Codigo = varUnidad).Nombre & " y Administración. No registres diagnósticos, medicamentos ni detalles íntimos: la historia clínica sigue en el sistema del área." & If(' + gestiona + ', "", " Tienes acceso de consulta.")',
              "20", "60", "Parent.Width - 40", "36", 11, "fxC.Reservado", Wrap="true", Fill="fxC.ReservadoSuave",
              PaddingLeft="10", PaddingRight="10"),
        label("lblSegVacio", s("Sin registros de esta unidad para el estudiante."), "20", "112", "Parent.Width - 40", "24", 12, "fxC.Tenue",
              Visible="IsEmpty(galSeg.AllItems)"),
        galeria("galSeg", "0", "104", "Parent.Width", "Parent.Height - 112", items_seg, 132, plantilla_seg),
        con_anular,
    ], Visible='varTab = "seguimiento"')

    # Remitir
    destino = "LookUp(fxReservadas, Nombre = ddDestino.Selected.Nombre).Codigo"
    remitir = switch_unidades("varDestino", lambda L: f"Patch({L}, Defaults({L}), varRem)")
    registro_rem = (f'{{{q("Código")}: varEst.{q("Código")}, Estudiante: varEst.{q("Nombre completo")}, Fecha: Today(), '
                    f'{q("Tipo de registro")}: "Remisión recibida", Motivo: ddMotivoRem.Selected.Value, Resumen: Trim(txtNotaRem.Text), '
                    f'Estado: "Pendiente", Prioridad: ddPrioridadRem.Selected.Value, Origen: "Remisión de otra unidad", '
                    f'{q("Remitido por")}: fxRemitente, {q("Menor de edad")}: If(Not(IsBlank(varEdad)) And varEdad < 18, "Sí", "No"), '
                    f'{q("Autorización de datos")}: "Pendiente", {q("Registrado por")}: fxNombreYo, {q("Correo de quien registra")}: fxYo}}')
    enviar = f"""Set(varDestino, {destino});
Set(varRem, {registro_rem});
IfError(
    {remitir},
    Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error),
    Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)
)"""
    mis_rem = "Sort(" + switch_unidades(destino, lambda L: (
        f'ForAll(Filter({L}, {q("Código")} = varEst.{q("Código")} And {q("Correo de quien registra")} = fxYo And {q("Tipo de registro")} = "Remisión recibida"), '
        f'{{Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: {q("Asignado a")}}})')) + ", Fecha, SortOrder.Descending)"
    w2 = "(Parent.Width - 72) / 2"
    plantilla_rem = [
        label("lblMiRemTitulo", 'Text(ThisItem.Fecha, "dd/mm/yyyy") & "  ·  " & ThisItem.Motivo', "16", "8", "Parent.TemplateWidth - 140", "22", 12, "fxC.Texto", True),
        label("lblMiRemEstado", "ThisItem.Estado", "Parent.TemplateWidth - 124", "8", "108", "24", 11,
              'Switch(ThisItem.Estado, "Pendiente", fxC.Aviso, "Cerrado", fxC.Acento, "Anulado", fxC.Tenue, fxC.Reservado)', True,
              Fill='Switch(ThisItem.Estado, "Pendiente", fxC.AvisoSuave, "Cerrado", fxC.AcentoSuave, "Anulado", fxC.Fondo, fxC.ReservadoSuave)', Align="Align.Center"),
        label("lblMiRemDetalle", '"Prioridad " & Lower(ThisItem.Prioridad) & If(IsBlank(ThisItem.Asignado), "  ·  Sin asignar", "  ·  A cargo de " & ThisItem.Asignado)',
              "16", "34", "Parent.TemplateWidth - 32", "20", 11, "fxC.Tenue"),
        rect("rectMiRemLinea", "16", "Parent.TemplateHeight - 1", "Parent.TemplateWidth - 32", "1", "fxC.Borde"),
    ]
    con_rem = caja("conRemitir", "24", Y0, "Parent.Width - 48", H0, [
        label("lblRemTitulo", s("Remitir a otra unidad"), "24", "16", w2, "28", 14, "fxC.Texto", True),
        label("lblRemAyuda", s("La remisión llega a la bandeja de la unidad destino. Tú solo verás el estado de las remisiones que hagas. Escribe hechos y lo que esperas, sin diagnósticos ni detalles íntimos."),
              "24", "46", w2, "54", 11, "fxC.Tenue", Wrap="true"),
        label("lblDestino", s("Unidad destino"), "24", "106", w2, "20", 11, "fxC.Tenue", True),
        desplegable("ddDestino", "24", "128", w2, "40", "fxReservadas.Nombre"),
        label("lblMotivoRem", s("Motivo general"), "24", "178", f"{w2} / 2 - 8", "20", 11, "fxC.Tenue", True),
        desplegable("ddMotivoRem", "24", "200", f"{w2} / 2 - 8", "40", tabla_texto(OP["motivo"])),
        label("lblPrioridadRem", s("Prioridad"), f"24 + {w2} / 2 + 8", "178", f"{w2} / 2 - 8", "20", 11, "fxC.Tenue", True),
        desplegable("ddPrioridadRem", f"24 + {w2} / 2 + 8", "200", f"{w2} / 2 - 8", "40", tabla_texto(OP["prioridad"]), s("Normal")),
        label("lblNotaRem", s("Qué observaste y qué esperas de la unidad"), "24", "250", w2, "20", 11, "fxC.Tenue", True),
        entrada("txtNotaRem", "24", "272", w2, "Parent.Height - 360", "Por ejemplo: faltó a tres clases y dice que no puede pagar el transporte; pide orientación.", multilinea=True),
        boton("btnEnviarRem", s("Enviar remisión"), "24", "Parent.Height - 72", "200", "40", enviar,
              DisplayMode="If(Len(Trim(txtNotaRem.Text)) < 10, DisplayMode.Disabled, DisplayMode.Edit)"),
        label("lblMisRemTitulo", '"Tus remisiones a " & ddDestino.Selected.Nombre', f"48 + {w2}", "16", w2, "28", 14, "fxC.Texto", True),
        label("lblMisRemVacio", s("No has remitido a este estudiante a esta unidad."), f"48 + {w2}", "52", w2, "24", 12, "fxC.Tenue",
              Visible="IsEmpty(galMisRem.AllItems)"),
        galeria("galMisRem", f"36 + {w2}", "48", f"{w2} + 12", "Parent.Height - 64", mis_rem, 64, plantilla_rem),
    ], Visible='varTab = "remitir"')

    hijos = encabezado("Ficha", atras="Navigate(scrInicio, ScreenTransition.None)") + [head] + botones_tab + [con_resumen, con_bien, con_seg, con_rem]
    return "scrFicha", {"Fill": "fxC.Fondo", "OnVisible": onvisible}, hijos


# ------------------------------------------------------------------ formularios de registro
def formulario(sufijo, titulo, aviso, campos, validacion, registro, guardar, volver_tab):
    """campos: lista de dicts con clave, etiqueta, tipo (dd|txt|largo|fecha), fila, col, ancho (1-3), items, default."""
    colw = "(Parent.Width - 96) / 3"
    hijos, resets = [], []
    alto_fila = {}
    for c in campos:
        alto_fila[c["fila"]] = max(alto_fila.get(c["fila"], 76), 130 if c["tipo"] == "largo" else 76)
    y_fila, y = {}, 16
    for f in sorted(alto_fila):
        y_fila[f] = y
        y += alto_fila[f]
    for c in campos:
        x = f"24 + {c['col']} * ({colw} + 24)"
        ancho = c.get("ancho", 1)
        w = colw if ancho == 1 else f"{ancho} * {colw} + {(ancho - 1) * 24}"
        yy = y_fila[c["fila"]]
        hijos.append(label(f"lbl{c['clave']}", s(c["etiqueta"] + (" *" if c.get("obligatorio") else "")), x, str(yy), w, "20", 11, "fxC.Tenue", True))
        cy = str(yy + 22)
        if c["tipo"] == "dd":
            hijos.append(desplegable(c["clave"], x, cy, w, "40", c["items"], c.get("default")))
        elif c["tipo"] == "fecha":
            hijos.append(fecha(c["clave"], x, cy, w, "40", c.get("default", "Today()")))
        elif c["tipo"] == "txt":
            hijos.append(entrada(c["clave"], x, cy, w, "40", c.get("hint", ""), **({"Default": c["default"]} if c.get("default") else {})))
        else:
            hijos.append(entrada(c["clave"], x, cy, w, "96", c.get("hint", ""), multilinea=True))
        resets.append(f"Reset({c['clave']})")
    hijos += [
        label(f"lblError{sufijo}", "varError", "24", str(y + 4), "Parent.Width - 48", "24", 12, "fxC.Error", True, Visible="Not(IsBlank(varError))"),
        boton(f"btnGuardar{sufijo}", s("Guardar"), "24", str(y + 36), "160", "40", f"""Set(varError, {validacion});
If(IsBlank(varError),
    {guardar}
)"""),
        boton(f"btnCancelar{sufijo}", s("Cancelar"), "196", str(y + 36), "120", "40", f'Set(varTab, "{volver_tab}"); Navigate(scrFicha, ScreenTransition.None)',
              fill="fxC.Blanco", color="fxC.Texto", borde="fxC.Borde", HoverFill="fxC.Fondo", PressedFill="fxC.Fondo", HoverColor="fxC.Texto"),
    ]
    contenido = [
        label(f"lblTitulo{sufijo}", titulo, "24", "80", "Parent.Width - 48", "30", 18, "fxC.Texto", True),
        label(f"lblEstudiante{sufijo}", f'varEst.{q("Nombre completo")} & "  ·  Código " & varEst.{q("Código")} & If(Not(IsBlank(varEdad)) And varEdad < 18, "  ·  Menor de edad", "")',
              "24", "112", "Parent.Width - 48", "22", 12, "fxC.Tenue"),
        label(f"lblAviso{sufijo}", aviso, "24", "138", "Parent.Width - 48", "34", 11, "fxC.Reservado" if "reserv" in aviso.lower() else "fxC.Tenue",
              Wrap="true"),
        caja(f"conForm{sufijo}", "24", "178", "Parent.Width - 48", "Parent.Height - 198", hijos),
    ]
    onvisible = "Set(varError, Blank());\n" + ";\n".join(resets)
    return encabezado(sufijo, atras=f'Set(varTab, "{volver_tab}"); Navigate(scrFicha, ScreenTransition.None)') + contenido, onvisible


def p_reg_seguimiento():
    campos = [
        {"clave": "dpSegFecha", "etiqueta": "Fecha", "tipo": "fecha", "fila": 1, "col": 0, "obligatorio": True},
        {"clave": "ddSegTipo", "etiqueta": "Tipo de registro", "tipo": "dd", "fila": 1, "col": 1,
         "items": tabla_texto([v for v in OP["tipo_registro_seguimiento"] if v not in ("Solicitud del estudiante", "Remisión recibida")])},
        {"clave": "ddSegServicio", "etiqueta": "Servicio", "tipo": "dd", "fila": 1, "col": 2, "items": catalogo("varUnidad")},
        {"clave": "ddSegModalidad", "etiqueta": "Modalidad", "tipo": "dd", "fila": 2, "col": 0, "items": tabla_texto(OP["modalidad"])},
        {"clave": "ddSegMotivo", "etiqueta": "Motivo general", "tipo": "dd", "fila": 2, "col": 1, "items": tabla_texto(OP["motivo"])},
        {"clave": "ddSegPrioridad", "etiqueta": "Prioridad", "tipo": "dd", "fila": 2, "col": 2, "items": tabla_texto(OP["prioridad"]), "default": s("Normal")},
        {"clave": "ddSegEstado", "etiqueta": "Estado", "tipo": "dd", "fila": 3, "col": 0,
         "items": tabla_texto([v for v in OP["estado_seguimiento"] if v != "Anulado"]), "default": s("En curso")},
        {"clave": "ddSegAutorizacion", "etiqueta": "Autorización de datos", "tipo": "dd", "fila": 3, "col": 1, "items": tabla_texto(OP["autorizacion"]),
         "default": 'If(Not(IsBlank(varEdad)) And varEdad < 18, "Pendiente", "Autorizada por el titular")'},
        {"clave": "txtSegResumen", "etiqueta": "Resumen: qué se hizo y qué sigue", "tipo": "largo", "fila": 4, "col": 0, "ancho": 3, "obligatorio": True,
         "hint": "Hechos y acuerdos. Sin diagnósticos, medicamentos ni detalles íntimos."},
        {"clave": "txtSegProxima", "etiqueta": "Próxima acción", "tipo": "txt", "fila": 5, "col": 0, "ancho": 2, "hint": "Por ejemplo: revisar asistencia a tutoría"},
        {"clave": "dpSegProxima", "etiqueta": "Fecha de la próxima acción", "tipo": "fecha", "fila": 5, "col": 2, "default": "Blank()"},
    ]
    validacion = """If(
    IsBlank(dpSegFecha.SelectedDate), "Indica la fecha.",
    IsBlank(ddSegServicio.Selected.Servicio), "Elige el servicio.",
    Len(Trim(txtSegResumen.Text)) < 10, "Escribe un resumen de al menos 10 caracteres.",
    Not(IsBlank(varEdad)) And varEdad < 18 And ddSegAutorizacion.Selected.Value = "Autorizada por el titular", "Es menor de edad: la autorización la da su representante legal. Si aún no la tienes, deja Pendiente.",
    Not(IsBlank(dpSegProxima.SelectedDate)) And IsBlank(Trim(txtSegProxima.Text)), "Describe la próxima acción o quita la fecha.",
    Blank()
)"""
    registro = (f'{{{q("Código")}: varEst.{q("Código")}, Estudiante: varEst.{q("Nombre completo")}, Fecha: dpSegFecha.SelectedDate, '
                f'{q("Tipo de registro")}: ddSegTipo.Selected.Value, Servicio: ddSegServicio.Selected.Servicio, Modalidad: ddSegModalidad.Selected.Value, '
                f'Motivo: ddSegMotivo.Selected.Value, Resumen: Trim(txtSegResumen.Text), {q("Próxima acción")}: Trim(txtSegProxima.Text), '
                f'{q("Fecha próxima acción")}: dpSegProxima.SelectedDate, Estado: ddSegEstado.Selected.Value, Prioridad: ddSegPrioridad.Selected.Value, '
                f'Origen: "Iniciativa de la unidad", {q("Menor de edad")}: If(Not(IsBlank(varEdad)) And varEdad < 18, "Sí", "No"), '
                f'{q("Autorización de datos")}: ddSegAutorizacion.Selected.Value, {q("Registrado por")}: fxNombreYo, '
                f'{q("Correo de quien registra")}: fxYo, {q("Asignado a")}: fxYo}}')
    patch = switch_unidades("varUnidad", lambda L: f"Patch({L}, Defaults({L}), varNuevo)")
    guardar = f"""Set(varNuevo, {registro});
    IfError(
        {patch},
        Set(varError, "No se pudo guardar: " & FirstError.Message),
        Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)
    )"""
    hijos, onvisible = formulario("Seg", '"Nuevo registro · " & LookUp(fxUnidades, Codigo = varUnidad).Nombre',
                                  s("Reservado: solo lo verán esta unidad y Administración. La historia clínica sigue en el sistema del área; aquí va la constancia y el plan."),
                                  campos, validacion, registro, guardar, "seguimiento")
    return "scrRegSeguimiento", {"Fill": "fxC.Fondo", "OnVisible": onvisible}, hijos


def p_reg_visible(nombre, sufijo, lista, titulo, campos, validacion, campos_registro):
    registro = (f'{{{q("Código")}: varEst.{q("Código")}, Estudiante: varEst.{q("Nombre completo")}, '
                + ", ".join(f"{q(k)}: {v}" for k, v in campos_registro) + f', {q("Registrado por")}: fxNombreYo}}')
    guardar = f"""IfError(
        Patch({lista}, Defaults({lista}), {registro}),
        Set(varError, "No se pudo guardar: " & FirstError.Message),
        Notify("Registro guardado.", NotificationType.Success); Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)
    )"""
    hijos, onvisible = formulario(sufijo, s(titulo), s("Visible para todo el personal del sistema. No escribas aquí datos de salud ni situaciones personales."),
                                  campos, validacion, registro, guardar, "bienestar")
    return nombre, {"Fill": "fxC.Fondo", "OnVisible": onvisible}, hijos


def p_reg_deportes():
    campos = [
        {"clave": "dpDepFecha", "etiqueta": "Fecha", "tipo": "fecha", "fila": 1, "col": 0, "obligatorio": True},
        {"clave": "ddDepTipo", "etiqueta": "Tipo de registro", "tipo": "dd", "fila": 1, "col": 1, "items": tabla_texto(OP["tipo_registro_deportes"])},
        {"clave": "ddDepDisciplina", "etiqueta": "Disciplina o servicio", "tipo": "dd", "fila": 1, "col": 2, "items": catalogo('"DEP"')},
        {"clave": "ddDepAscun", "etiqueta": "Pertenece a ASCUN", "tipo": "dd", "fila": 2, "col": 0, "items": tabla_texto(OP["si_no"]), "default": s("No")},
        {"clave": "ddDepNivel", "etiqueta": "Nivel", "tipo": "dd", "fila": 2, "col": 1, "items": tabla_texto(OP["nivel_deportes"])},
        {"clave": "ddDepEstado", "etiqueta": "Estado", "tipo": "dd", "fila": 2, "col": 2, "items": tabla_texto(OP["estado_deportes"]), "default": s("Activo")},
        {"clave": "txtDepEvento", "etiqueta": "Evento o implemento", "tipo": "txt", "fila": 3, "col": 0, "ancho": 2, "hint": "Torneo, evento o implemento prestado"},
        {"clave": "dpDepDevolucion", "etiqueta": "Fecha de devolución (préstamos)", "tipo": "fecha", "fila": 3, "col": 2, "default": "Blank()"},
        {"clave": "txtDepObs", "etiqueta": "Observación", "tipo": "largo", "fila": 4, "col": 0, "ancho": 3, "hint": "Sin datos de salud ni lesiones: eso va a Salud."},
    ]
    validacion = """If(
    IsBlank(dpDepFecha.SelectedDate), "Indica la fecha.",
    ddDepTipo.Selected.Value = "Préstamo de implementos" And IsBlank(Trim(txtDepEvento.Text)), "Escribe qué implemento se prestó.",
    Blank()
)"""
    regs = [("Fecha", "dpDepFecha.SelectedDate"), ("Tipo de registro", "ddDepTipo.Selected.Value"),
            ("Disciplina o servicio", "ddDepDisciplina.Selected.Servicio"), ("ASCUN", "ddDepAscun.Selected.Value"),
            ("Nivel", "ddDepNivel.Selected.Value"), ("Evento o implemento", "Trim(txtDepEvento.Text)"),
            ("Fecha de devolución", "dpDepDevolucion.SelectedDate"), ("Periodo", "varEst.Periodo"),
            ("Estado", "ddDepEstado.Selected.Value"), ("Observación", "Trim(txtDepObs.Text)")]
    return p_reg_visible("scrRegDeportes", "Dep", "Deportes", "Nuevo registro de Deportes", campos, validacion, regs)


def p_reg_cultura():
    campos = [
        {"clave": "dpCulFecha", "etiqueta": "Fecha", "tipo": "fecha", "fila": 1, "col": 0, "obligatorio": True},
        {"clave": "ddCulTipo", "etiqueta": "Tipo de registro", "tipo": "dd", "fila": 1, "col": 1, "items": tabla_texto(OP["tipo_registro_cultura"])},
        {"clave": "ddCulTaller", "etiqueta": "Taller o grupo", "tipo": "dd", "fila": 1, "col": 2, "items": catalogo('"CUL"')},
        {"clave": "ddCulRol", "etiqueta": "Rol", "tipo": "dd", "fila": 2, "col": 0, "items": tabla_texto(OP["rol_cultura"])},
        {"clave": "ddCulEstado", "etiqueta": "Estado", "tipo": "dd", "fila": 2, "col": 1, "items": tabla_texto(OP["estado_participacion"]), "default": s("Activo")},
        {"clave": "txtCulEvento", "etiqueta": "Evento", "tipo": "txt", "fila": 2, "col": 2, "hint": "Presentación o evento, si aplica"},
        {"clave": "txtCulObs", "etiqueta": "Observación", "tipo": "largo", "fila": 3, "col": 0, "ancho": 3, "hint": "Sin datos de salud ni situaciones personales."},
    ]
    validacion = 'If(IsBlank(dpCulFecha.SelectedDate), "Indica la fecha.", Blank())'
    regs = [("Fecha", "dpCulFecha.SelectedDate"), ("Tipo de registro", "ddCulTipo.Selected.Value"), ("Taller o grupo", "ddCulTaller.Selected.Servicio"),
            ("Rol", "ddCulRol.Selected.Value"), ("Evento", "Trim(txtCulEvento.Text)"), ("Periodo", "varEst.Periodo"),
            ("Estado", "ddCulEstado.Selected.Value"), ("Observación", "Trim(txtCulObs.Text)")]
    return p_reg_visible("scrRegCultura", "Cul", "Cultura", "Nuevo registro de Cultura", campos, validacion, regs)


def p_reg_beneficio():
    campos = [
        {"clave": "ddPdhPrograma", "etiqueta": "Programa", "tipo": "dd", "fila": 1, "col": 0, "items": catalogo('"PDH"')},
        {"clave": "txtPdhDetalle", "etiqueta": "Detalle", "tipo": "txt", "fila": 1, "col": 1, "hint": "Almuerzo, refrigerio, tipo de beca…"},
        {"clave": "txtPdhPeriodo", "etiqueta": "Periodo", "tipo": "txt", "fila": 1, "col": 2, "default": "varEst.Periodo"},
        {"clave": "dpPdhInicio", "etiqueta": "Fecha de inicio", "tipo": "fecha", "fila": 2, "col": 0, "obligatorio": True},
        {"clave": "dpPdhFin", "etiqueta": "Fecha de fin", "tipo": "fecha", "fila": 2, "col": 1, "default": "Blank()"},
        {"clave": "ddPdhEstado", "etiqueta": "Estado", "tipo": "dd", "fila": 2, "col": 2, "items": tabla_texto(OP["estado_beneficio"]), "default": s("Activo")},
        {"clave": "txtPdhObs", "etiqueta": "Observación", "tipo": "largo", "fila": 3, "col": 0, "ancho": 3,
         "hint": "Sin situaciones personales: el Fondo de calamidad y los casos van en Trabajo Social (reservado)."},
    ]
    validacion = """If(
    IsBlank(dpPdhInicio.SelectedDate), "Indica la fecha de inicio.",
    Not(IsBlank(dpPdhFin.SelectedDate)) And dpPdhFin.SelectedDate < dpPdhInicio.SelectedDate, "La fecha de fin no puede ser anterior a la de inicio.",
    Blank()
)"""
    regs = [("Programa", "ddPdhPrograma.Selected.Servicio"), ("Detalle", "Trim(txtPdhDetalle.Text)"), ("Periodo", "Trim(txtPdhPeriodo.Text)"),
            ("Fecha de inicio", "dpPdhInicio.SelectedDate"), ("Fecha de fin", "dpPdhFin.SelectedDate"),
            ("Estado", "ddPdhEstado.Selected.Value"), ("Observación", "Trim(txtPdhObs.Text)")]
    return p_reg_visible("scrRegBeneficio", "Pdh", "Beneficios", "Nuevo registro de programas de Desarrollo Humano", campos, validacion, regs)


PANTALLAS = [p_inicio, p_ficha, p_reg_seguimiento, p_reg_deportes, p_reg_cultura, p_reg_beneficio]


# ------------------------------------------------------------------ YAML
def valor_yaml(formula, sangria):
    f = "=" + formula
    if "\n" in f or ": " in f or " #" in f or f.endswith(":") or f.startswith("= "):
        pad = " " * (sangria + 2)
        return "|-\n" + "\n".join(pad + linea if linea else "" for linea in f.split("\n"))
    return f


def emitir_control(c, sangria):
    sp = " " * sangria
    out = [f"{sp}- {c.nombre}:", f"{sp}    Control: {c.tipo}"]
    if c.variante:
        out.append(f"{sp}    Variant: {c.variante}")
    out.append(f"{sp}    Properties:")
    for k in sorted(c.props):
        out.append(f"{sp}      {k}: {valor_yaml(c.props[k], sangria + 6)}")
    if c.hijos:
        out.append(f"{sp}    Children:")
        for h in c.hijos:
            out.extend(emitir_control(h, sangria + 6))
    return out


def emitir_pantalla(nombre, props, hijos):
    out = ["Screens:", f"  {nombre}:", "    Properties:"]
    for k in sorted(props):
        out.append(f"      {k}: {valor_yaml(props[k], 6)}")
    out.append("    Children:")
    for h in hijos:
        out.extend(emitir_control(h, 6))
    return "\n".join(out) + "\n"


def emitir_controles(hijos):
    out = []
    for h in hijos:
        out.extend(emitir_control(h, 0))
    return "\n".join(out) + "\n"


def receta(pantallas):
    out = ["# Receta de la app (respaldo manual)", "",
           "Generado por `generar_app.py`. Úsalo si «Pegar código» no funciona en tu versión de Power Apps Studio: inserta cada control con el nombre indicado y copia sus propiedades.",
           "Las fórmulas usan comas. Si tu Power Apps está en español y usa punto y coma, cambia `,` por `;` y `;` por `;;` (o usa la configuración regional en inglés mientras construyes).", ""]
    tipos = {"Label": "Etiqueta de texto", "Classic/Button": "Botón (clásico)", "Classic/TextInput": "Entrada de texto (clásica)",
             "Classic/DropDown": "Lista desplegable (clásica)", "Classic/DatePicker": "Selector de fecha (clásico)", "Classic/Icon": "Icono",
             "Rectangle": "Rectángulo", "GroupContainer": "Contenedor", "Gallery": "Galería en blanco", "HtmlViewer": "Texto HTML"}

    def control(c, nivel):
        out.append(f"{'#' * min(6, nivel)} {c.nombre} · {tipos.get(c.tipo, c.tipo)}{' (' + c.variante + ')' if c.variante and c.tipo == 'Gallery' else ''}")
        out.append("")
        out.append("| Propiedad | Fórmula |")
        out.append("|---|---|")
        largas = []
        for k in sorted(c.props):
            v = c.props[k]
            if "\n" in v or len(v) > 90:
                largas.append((k, v))
                out.append(f"| {k} | ver abajo |")
            else:
                out.append(f"| {k} | `{v.replace('|', '¦')}` |")
        out.append("")
        for k, v in largas:
            out.extend([f"**{k}**", "", "```", v, "```", ""])
        for h in c.hijos:
            control(h, nivel + 1)

    for nombre, props, hijos in pantallas:
        out += [f"## {nombre}", "", "| Propiedad de la pantalla | Fórmula |", "|---|---|"]
        for k, v in sorted(props.items()):
            out.append(f"| {k} | ver abajo |")
        out.append("")
        for k, v in sorted(props.items()):
            out += [f"**{k}**", "", "```", v, "```", ""]
        for h in hijos:
            control(h, 3)
    return "\n".join(out) + "\n"


def main(salida):
    salida = Path(salida)
    (salida / "pantallas").mkdir(parents=True, exist_ok=True)
    (salida / "controles").mkdir(parents=True, exist_ok=True)
    fx = formulas_app()
    (salida / "formulas-app.txt").write_text(fx + "\n", encoding="utf-8")
    (salida / "formulas-app-es.txt").write_text(a_espanol(fx) + "\n", encoding="utf-8")
    pantallas = [p() for p in PANTALLAS]
    nombres = set()
    for nombre, props, hijos in pantallas:
        def recorrer(c):
            assert c.nombre not in nombres, f"Nombre de control repetido: {c.nombre}"
            nombres.add(c.nombre)
            for h in c.hijos:
                recorrer(h)
        for h in hijos:
            recorrer(h)
        (salida / "pantallas" / f"{nombre}.pa.yaml").write_text(emitir_pantalla(nombre, props, hijos), encoding="utf-8")
        (salida / "controles" / f"{nombre}.pa.yaml").write_text(emitir_controles(hijos), encoding="utf-8")
    (salida / "receta.md").write_text(receta(pantallas), encoding="utf-8")
    print(f"App: {len(pantallas)} pantallas y {len(nombres)} controles en {salida}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
