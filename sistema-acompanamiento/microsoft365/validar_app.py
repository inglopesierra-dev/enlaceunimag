"""Revisa el código generado por generar_app.py antes de entregarlo.

Uso:  python validar_app.py CARPETA_APP [--esquema pa.schema.yaml]

Comprueba:
  - que cada archivo .pa.yaml sea YAML válido y, si se da el esquema oficial de Power Apps
    (microsoft/PowerApps-Tooling, schemas/pa-yaml/v3.0/pa.schema.yaml), que lo cumpla;
  - en cada fórmula: paréntesis, llaves, corchetes y comillas balanceados, sin comas sueltas;
  - que las funciones existan en Power Apps, que los nombres entre comillas simples sean listas o columnas
    del modelo, que los controles citados existan y que cada variable se asigne con Set en algún lugar.
No reemplaza abrir la app en Power Apps Studio: solo atrapa errores de escritura antes de pegar.
"""
import json
import re
import sys
from pathlib import Path

import yaml

AQUI = Path(__file__).resolve().parent
M = json.loads((AQUI / "modelo.json").read_text(encoding="utf-8"))

FUNCIONES = set("""
Abs And Average Back Blank Char Clear Collect Coalesce ColorFade ColorValue Concat Concatenate Count CountA CountIf CountRows
Date DateAdd DateDiff DateValue Day Defaults Distinct EndsWith Errors Filter Find First FirstN ForAll GroupBy Hour If IfError
IsBlank IsBlankOrError IsEmpty IsError IsMatch IsToday Last LastN Left Len Lower LookUp Max Mid Min Minute Mod Month Navigate
Not Notify Now Or Patch Proper RGBA Refresh Remove Replace Reset Right Round RoundDown RoundUp Select Self Sequence Set
Sort SortByColumns Split StartsWith Substitute Sum Switch Table Text Time Today Trim Upper User Value Weekday With Year
""".split())
ENUMS = {"Font", "FontWeight", "Align", "VerticalAlign", "DisplayMode", "TextMode", "Icon", "ScreenTransition", "SortOrder",
         "NotificationType", "DropShadow", "LoadingSpinner", "DateTimeFormat", "Color", "Parent", "ThisItem", "ThisRecord",
         "FirstError", "Self", "TimeUnit"}
PALABRAS = {"And", "Or", "Not", "in", "exactin", "true", "false", "As"}


def nombres_modelo():
    listas = {l["titulo"] for l in M["listas"]} | {u["lista"] for u in M["unidades"] if u["nivel"] == "reservado"}
    columnas = {c["nombre"] for l in M["listas"] for c in l["columnas"]} | {c["nombre"] for c in M["lista_seguimiento"]["columnas"]}
    return listas, columnas


def recorrer(nodo, ruta=""):
    """Devuelve (ruta, propiedad, fórmula) de cada propiedad y los nombres de control."""
    formulas, controles = [], []
    if isinstance(nodo, dict):
        for k, v in nodo.items():
            if k == "Properties" and isinstance(v, dict):
                for p, f in v.items():
                    formulas.append((ruta, p, f))
            elif k in ("Children",):
                for item in v:
                    for nombre, ctl in item.items():
                        controles.append(nombre)
                        f2, c2 = recorrer(ctl, f"{ruta}/{nombre}")
                        formulas += f2
                        controles += c2
            elif k == "Screens":
                for nombre, pantalla in v.items():
                    controles.append(nombre)
                    f2, c2 = recorrer(pantalla, nombre)
                    formulas += f2
                    controles += c2
    elif isinstance(nodo, list):
        for item in nodo:
            for nombre, ctl in item.items():
                controles.append(nombre)
                f2, c2 = recorrer(ctl, nombre)
                formulas += f2
                controles += c2
    return formulas, controles


def tokens(f):
    """Separa una fórmula en textos ("..."), nombres entre comillas ('...') y el resto."""
    out, i, n = [], 0, len(f)
    while i < n:
        ch = f[i]
        if ch in "\"'":
            j = i + 1
            while j < n:
                if f[j] == ch:
                    if j + 1 < n and f[j + 1] == ch:
                        j += 2
                        continue
                    break
                j += 1
            if j >= n:
                raise ValueError(f"comilla {ch} sin cerrar")
            out.append(("str" if ch == '"' else "id", f[i + 1:j].replace(ch * 2, ch)))
            i = j + 1
        else:
            j = i
            while j < n and f[j] not in "\"'":
                j += 1
            out.append(("code", f[i:j]))
            i = j
    return out


def revisar(f, listas, columnas, controles, problemas, donde):
    if not isinstance(f, str) or not f.startswith("="):
        problemas.append(f"{donde}: la fórmula debe empezar con '='")
        return set(), set()
    cuerpo = f[1:]
    try:
        toks = tokens(cuerpo)
    except ValueError as e:
        problemas.append(f"{donde}: {e}")
        return set(), set()
    codigo = " ".join(t[1] if t[0] == "code" else ("S" if t[0] == "str" else "I") for t in toks)
    pila = []
    pares = {")": "(", "]": "[", "}": "{"}
    for ch in codigo:
        if ch in "([{":
            pila.append(ch)
        elif ch in ")]}":
            if not pila or pila.pop() != pares[ch]:
                problemas.append(f"{donde}: '{ch}' sin pareja")
                return set(), set()
    if pila:
        problemas.append(f"{donde}: faltan cierres {''.join(pila)}")
    if re.search(r",\s*[,)\]}]|\(\s*,|;\s*[,)]", codigo):
        problemas.append(f"{donde}: coma o punto y coma fuera de lugar")
    asignadas, usadas = set(), set()
    for t, v in toks:
        if t == "id":
            if v not in listas and v not in columnas and v not in {"Segoe UI"}:
                problemas.append(f"{donde}: nombre entre comillas desconocido '{v}'")
    for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(", codigo):
        nombre = m.group(1)
        if nombre not in FUNCIONES:
            problemas.append(f"{donde}: función desconocida {nombre}()")
    for m in re.finditer(r"\bSet\(\s*([A-Za-z_][A-Za-z0-9_]*)", codigo):
        asignadas.add(m.group(1))
    for m in re.finditer(r"\b(var[A-Z][A-Za-z0-9_]*)", codigo):
        usadas.add(m.group(1))
    for m in re.finditer(r"\b([a-z][A-Za-z0-9]*)\.([A-Z][A-Za-z]*)", codigo):
        ctl = m.group(1)
        if ctl.startswith(("var", "fx")):
            continue
        if ctl not in controles:
            problemas.append(f"{donde}: control desconocido {ctl}.{m.group(2)}")
    return asignadas, usadas


def main(carpeta, esquema=None):
    carpeta = Path(carpeta)
    listas, columnas = nombres_modelo()
    problemas, todas, controles = [], [], []
    validador = None
    if esquema:
        import jsonschema
        validador = jsonschema.Draft7Validator(yaml.safe_load(Path(esquema).read_text(encoding="utf-8")))
    for archivo in sorted((carpeta / "pantallas").glob("*.pa.yaml")):
        doc = yaml.safe_load(archivo.read_text(encoding="utf-8"))
        if validador:
            for e in validador.iter_errors(doc):
                problemas.append(f"{archivo.name}: esquema: {e.message} en {'/'.join(map(str, e.path))}")
        f, c = recorrer(doc)
        todas += [(archivo.name, *x) for x in f]
        controles += c
    for archivo in sorted((carpeta / "controles").glob("*.pa.yaml")):
        doc = yaml.safe_load(archivo.read_text(encoding="utf-8"))
        if not isinstance(doc, list) or not all(isinstance(x, dict) and len(x) == 1 for x in doc):
            problemas.append(f"controles/{archivo.name}: debe ser una lista de controles")
    repetidos = {c for c in controles if controles.count(c) > 1}
    if repetidos:
        problemas.append(f"Nombres de control repetidos: {sorted(repetidos)}")
    controles = set(controles)
    asignadas, usadas = set(), set()
    for archivo, ruta, prop, f in todas:
        a, u = revisar(f, listas, columnas, controles, problemas, f"{archivo} {ruta}.{prop}")
        asignadas |= a
        usadas |= u
    nombradas = set()
    texto_fx = (carpeta / "formulas-app.txt").read_text(encoding="utf-8")
    for decl in re.split(r";\s*\n", texto_fx.strip().rstrip(";")):
        nombre, _, expr = decl.partition("=")
        nombradas.add(nombre.strip())
        revisar("=" + expr.strip(), listas, columnas, controles, problemas, f"formulas-app.txt {nombre.strip()}")
    for archivo, ruta, prop, f in todas:
        for m in re.finditer(r"\b(fx[A-Z][A-Za-z0-9]*)", f):
            if m.group(1) not in nombradas:
                problemas.append(f"{archivo} {ruta}.{prop}: fórmula con nombre desconocida {m.group(1)}")
    for v in sorted(usadas - asignadas):
        problemas.append(f"La variable {v} se usa pero nunca se asigna con Set")
    print(f"{len(todas)} fórmulas en {len(controles)} controles y pantallas; {len(nombradas)} fórmulas con nombre.")
    if problemas:
        print(f"{len(problemas)} problemas:")
        for p in problemas:
            print("  -", p)
        sys.exit(1)
    print("Sin problemas.")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    esquema = None
    if "--esquema" in args:
        i = args.index("--esquema")
        esquema = args[i + 1]
        del args[i:i + 2]
    main(args[0], esquema)
