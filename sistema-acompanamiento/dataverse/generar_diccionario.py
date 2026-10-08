"""Genera el diccionario de datos en Markdown a partir de esquema.json.

Uso: python generar_diccionario.py esquema.json ../docs/02-modelo-de-datos.md
"""
import json
import sys

TIPOS = {
    "Text": "Texto", "Multiline": "Texto largo", "Choice": "Opción", "Lookup": "Búsqueda", "DateOnly": "Fecha",
    "WholeNumber": "Número entero", "Decimal": "Decimal", "Boolean": "Sí/No", "Email": "Correo", "Phone": "Teléfono",
    "Url": "URL", "File": "Archivo", "Autonumber": "Autonumérico",
}


def tipo(c):
    t = TIPOS.get(c["tipo"], c["tipo"])
    if c["tipo"] == "Lookup":
        return f"{t} → `{c['destino']}`"
    if c["tipo"] == "Choice":
        return f"{t} (`{c['opciones']}`)"
    if c["tipo"] in ("Text", "Multiline", "Email", "Phone", "Url") and "max" in c:
        return f"{t} ({c['max']})"
    if c["tipo"] == "Autonumber":
        return f"{t} `{c['formato']}`"
    return t


def main(src, dst):
    s = json.load(open(src, encoding="utf-8"))
    out = ["# Modelo de datos en Dataverse", "",
           "Generado desde `dataverse/esquema.json`. Si cambias el esquema, vuelve a generar este archivo.", "",
           f"Solución: **{s['solucion']['nombre']}** · prefijo `{s['solucion']['prefijo']}_` (sujeto a la convención del editor).", "",
           "## Resumen", "", "| Tabla | Nombre lógico | Tipo | Propiedad | Volumen estimado |", "|---|---|---|---|---|"]
    for t in s["tablas"]:
        out.append(f"| {t['nombre']} | `{t['nombre_logico']}` | {'Actividad' if t['tipo'] == 'Activity' else 'Estándar'} | "
                   f"{'Organización' if t['propiedad'] == 'OrganizationOwned' else 'Usuario o equipo'} | {t.get('volumen', '')} |")
    out += ["", "## Tablas", ""]
    for t in s["tablas"]:
        out.append(f"### {t['nombre']} (`{t['nombre_logico']}`)")
        out.append("")
        if t.get("nota"):
            out += [t["nota"], ""]
        flags = []
        if t.get("auditoria"):
            flags.append("auditoría activa")
        if t.get("registrar_accesos"):
            flags.append("registro de accesos (lecturas)")
        if t.get("habilitar_actividades"):
            flags.append("habilitada para actividades")
        if t.get("claves_alternas"):
            flags.append("clave alterna: " + ", ".join("+".join(k) for k in t["claves_alternas"]))
        if flags:
            out += ["Configuración: " + "; ".join(flags) + ".", ""]
        out += ["| Columna | Nombre lógico | Tipo | Requerida | Notas |", "|---|---|---|---|---|"]
        p = t["principal"]
        out.append(f"| {p['nombre']} (principal) | `{p['nombre_logico']}` | {tipo(p)} | sí | {('Ej.: ' + str(p['ejemplo'])) if p.get('ejemplo') else ''} |")
        for c in t["columnas"]:
            notas = []
            if c.get("seguridad_columna"):
                notas.append(f"Protegida: perfil «{c['seguridad_columna']}»")
            if c.get("nota"):
                notas.append(c["nota"])
            if "ejemplo" in c:
                notas.append(f"Ej.: {c['ejemplo']}")
            out.append(f"| {c['nombre']} | `{c['nombre_logico']}` | {tipo(c)} | {'sí' if c.get('requerida') else ''} | {' · '.join(notas)} |")
        out.append("")
    out += ["## Conjuntos de opciones", ""]
    for k, v in s["opciones"].items():
        out.append(f"- `{k}`: {', '.join(v)}")
    out += ["", "## Estados", ""]
    for k, v in s["estados"].items():
        if "nota" in v:
            out.append(f"- `{k}`: {v['nota']}")
        else:
            out.append(f"- `{k}`: activos {', '.join(v['activo'])}; cerrados {', '.join(v['inactivo'])}")
    out.append("")
    open(dst, "w", encoding="utf-8").write("\n".join(out))
    print("escrito", dst)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
