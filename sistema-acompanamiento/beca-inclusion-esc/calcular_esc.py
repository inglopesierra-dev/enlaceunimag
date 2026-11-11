"""Calculador de referencia del Enfoque Socioeconómico Continuo (ESC).

Implementa la rúbrica piloto de `rubrica-esc-v0.1.json` para que cualquier app
(incluida PILAS) pueda comprobar que calcula igual: mismas entradas, mismos
resultados. No decide nada: entrega puntaje, rango, bloqueos y alertas para el
estudio profesional y para el Comité de Becas.

Uso:
    python calcular_esc.py casos_ficticios.json --parametros-de-prueba
    python calcular_esc.py casos_ficticios.json --parametros-de-prueba --json

Solo usa la biblioteca estándar de Python 3.10 o superior.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RUBRICA_POR_DEFECTO = AQUI / "rubrica-esc-v0.1.json"

FALTANTES = {"NSNR", "PEND"}
REQUISITOS_CONSULTABLES = ("R1", "R2", "R4")


def cargar_json(ruta: Path | str) -> dict:
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)


def parametros_efectivos(rubrica: dict, usar_prueba: bool) -> dict:
    """Devuelve los valores numéricos de los parámetros.

    Con `usar_prueba`, las líneas de pobreza salen de `parametros_de_prueba`
    (valores ficticios). Sin esa opción, quedan en None hasta que Bienestar
    cargue las cifras oficiales, y la app no sugiere nivel para IE1.
    """
    p = {k: v.get("valor") for k, v in rubrica["parametros"].items()}
    if usar_prueba:
        prueba = rubrica["parametros_de_prueba"]
        p["linea_pobreza_extrema_pc_mensual"] = prueba["linea_pobreza_extrema_pc_mensual"]
        p["linea_pobreza_pc_mensual"] = prueba["linea_pobreza_pc_mensual"]
    return p


# --- Niveles sugeridos (la persona profesional puede ajustarlos con justificación) ---

def sugerir_IE1(datos: dict, p: dict) -> int | None:
    lpe = p.get("linea_pobreza_extrema_pc_mensual")
    lp = p.get("linea_pobreza_pc_mensual")
    ingreso = datos.get("ingreso_mensual_hogar")
    personas = datos.get("personas_hogar")
    if None in (lpe, lp, ingreso, personas) or personas <= 0:
        return None
    ipc = ingreso / personas
    if ipc <= lpe:
        return 4
    if ipc <= lp:
        return 3
    if ipc <= p["multiplicador_IE1_nivel2"] * lp:
        return 2
    if ipc <= p["multiplicador_IE1_nivel1"] * lp:
        return 1
    return 0


def sugerir_IE3(datos: dict, p: dict) -> int | None:
    personas = datos.get("personas_hogar")
    perceptores = datos.get("perceptores")
    if personas is None or perceptores is None:
        return None
    if perceptores == 0:
        return 4
    razon = personas / perceptores
    for limite, nivel in ((2, 0), (3, 1), (4, 2), (6, 3)):
        if razon <= limite:
            return nivel
    return 4


def sugerir_IV2(datos: dict, p: dict) -> int | None:
    ppc = datos.get("personas_por_cuarto")
    otras = datos.get("carencias_vivienda")
    if ppc is None or otras is None:
        return None
    carencias = otras + (1 if ppc > 3 else 0)
    if carencias == 0:
        return 1 if ppc > 2 else 0
    return min(carencias + 1, 4)


def sugerir_IA2(datos: dict, p: dict) -> int | None:
    horas = datos.get("horas_trabajo_semana")
    if horas is None:
        return None
    for limite, nivel in ((5, 0), (10, 1), (20, 2), (30, 3)):
        if horas <= limite:
            return nivel
    return 4


SUGERENCIAS = {"IE1": sugerir_IE1, "IE3": sugerir_IE3, "IV2": sugerir_IV2, "IA2": sugerir_IA2}


# --- Cálculo ---

def estado_de(registro: dict) -> str:
    """Normaliza el estado de un indicador: VALIDO, NA, NAUT, NSNR o PEND."""
    if not registro:
        return "PEND"
    estado = registro.get("estado")
    if estado in ("NA", "NAUT", "NSNR", "PEND"):
        return estado
    nivel = registro.get("nivel")
    if isinstance(nivel, int) and 0 <= nivel <= 4:
        return "VALIDO"
    return "PEND"


def calcular(rubrica: dict, caso: dict, p: dict) -> dict:
    indicadores = rubrica["indicadores"]
    datos = caso.get("datos", {})
    registros = caso.get("indicadores", {})

    peso_valido = peso_faltante = peso_na = peso_sin_autorizacion = 0.0
    sin_autorizacion: list[str] = []
    puntos = 0.0
    detalle: dict[str, dict] = {}
    bloqueos: list[str] = []
    alertas: list[str] = []
    consistencia: list[str] = []
    por_dimension = {d["codigo"]: {"puntos": 0.0, "peso_valido": 0.0} for d in rubrica["dimensiones"]}

    for ind in indicadores:
        cod, w = ind["codigo"], ind["peso"]
        reg = registros.get(cod, {})
        est = estado_de(reg)
        sugerido = SUGERENCIAS[cod](datos, p) if cod in SUGERENCIAS else None
        fila = {"estado": est, "nivel": reg.get("nivel"), "sugerido": sugerido,
                "verificacion": reg.get("verificacion", "declarado"), "puntos": 0.0}

        if est == "VALIDO":
            x = reg["nivel"]
            aporte = w * x / 4
            puntos += aporte
            peso_valido += w
            fila["puntos"] = aporte
            por_dimension[ind["dimension"]]["puntos"] += aporte
            por_dimension[ind["dimension"]]["peso_valido"] += w
            if sugerido is not None and x != sugerido:
                if reg.get("justificacion"):
                    alertas.append(f"{cod}: nivel ajustado por criterio profesional ({sugerido} → {x}), con justificación.")
                else:
                    bloqueos.append(f"B6 {cod}: nivel {x} distinto del sugerido ({sugerido}) sin justificación escrita.")
            umbral = ind.get("confirmacion_desde_nivel")
            if umbral is not None and x >= umbral and fila["verificacion"] == "declarado":
                bloqueos.append(f"B5 {cod}: nivel {x} solo declarado (se confirma desde el nivel {umbral}); pasa a confirmación.")
        elif est == "NA":
            peso_na += w
            if not reg.get("motivo"):
                bloqueos.append(f"B8 {cod}: «No aplica» sin motivo.")
            if not ind["admite_na"]:
                bloqueos.append(f"B1 {cod}: este indicador no admite «No aplica».")
        elif est == "NAUT":
            # Sin autorización de datos sensibles: sale del cálculo sin bloquear ni penalizar.
            peso_sin_autorizacion += w
            sin_autorizacion.append(cod)
            if not ind["sensible"]:
                bloqueos.append(f"B9 {cod}: «sin autorización» solo vale para indicadores sensibles.")
        else:
            peso_faltante += w
            if ind["critico"]:
                bloqueos.append(f"B1 {cod}: indicador crítico en {est}.")
        detalle[cod] = fila

    denominador = peso_valido + peso_faltante
    normalizado = 100 * puntos / peso_valido if peso_valido else None
    rango = (100 * puntos / denominador, 100 * (puntos + peso_faltante) / denominador) if denominador else (None, None)

    if peso_faltante > p["peso_faltante_maximo_para_definitivo"]:
        bloqueos.append(f"B2: peso faltante {peso_faltante:g} > {p['peso_faltante_maximo_para_definitivo']:g}.")
    if peso_na > p["peso_no_aplica_maximo"]:
        bloqueos.append(f"B3: peso en «No aplica» {peso_na:g} > {p['peso_no_aplica_maximo']:g}.")
    if sin_autorizacion:
        alertas.append(f"Sin autorización de datos sensibles: {', '.join(sin_autorizacion)} fuera del cálculo; "
                       "el puntaje se calcula con los demás indicadores.")
    abiertas = [d for d in caso.get("discrepancias", []) if d.get("estado") != "resuelta"]
    if abiertas:
        bloqueos.append(f"B4: {len(abiertas)} discrepancia(s) abierta(s).")

    # Requisitos: la app nunca rechaza; marca para revisión.
    req = caso.get("requisitos", {})
    decl = caso.get("declaraciones", {})
    for r in REQUISITOS_CONSULTABLES:
        valor = req.get(r, "por_confirmar")
        if valor == "por_confirmar":
            bloqueos.append(f"B7 {r}: requisito por confirmar.")
        elif valor == "no_cumple":
            alertas.append(f"{r}: no cumple un requisito expreso. Revisión profesional y trámite que defina Jurídica; la app no rechaza.")
    if req.get("R2") == "no_cumple" and decl.get("discapacidad_declarada"):
        alertas.append("Ruta de discapacidad: tensión entre los arts. 46 y 49 de la Res. 869. Remitir a criterio jurídico; no rechazar en automático.")
    if decl.get("otros_beneficios"):
        alertas.append("Declara otros beneficios o estímulos: revisión del Comité y concepto jurídico (art. 8 frente a art. 4 num. 8 y 9 y art. 5 par. 2, mod. Res. 342).")
    ocasiones = decl.get("ocasiones_previas", 0)
    if ocasiones >= 3:
        alertas.append("Cuarta ocasión o más: solo con recursos adicionales (art. 7 par. 3, mod. Res. 342).")
    elif ocasiones == 2:
        alertas.append("Tercera ocasión: el Comité decide previo estudio de casos y si se comprueba la continuidad en la vulnerabilidad socioeconómica extrema (art. 7 par. 2, mod. Res. 342).")

    # Señales de severidad: no suman puntos.
    senales = []
    for s in rubrica["senales_de_severidad"]["reglas"]:
        cod, _, valor = s["condicion"].partition(" = ")
        fila = detalle.get(cod.strip())
        if fila and fila["estado"] == "VALIDO" and fila["nivel"] == int(valor):
            senales.append(f"{s['codigo']}: {s['texto']}")

    # Consistencia
    perceptores, personas = datos.get("perceptores"), datos.get("personas_hogar")
    if perceptores is not None and personas is not None and perceptores > personas:
        consistencia.append("C1: hay más perceptores que personas en el hogar.")
    if datos.get("ingreso_mensual_hogar") == 0 and (perceptores or 0) > 0:
        consistencia.append("C2: ingreso 0 con perceptores; pedir aclaración.")
    if detalle["IE2"]["nivel"] == 0 and detalle["IE1"]["nivel"] == 4:
        consistencia.append("C3: ingreso formal estable con ingreso per cápita en pobreza extrema; revisar si falta un ingreso.")
    horas = datos.get("horas_trabajo_semana")
    if horas is not None and not 0 <= horas <= 84:
        consistencia.append("C4: horas de trabajo fuera del rango 0 a 84.")
    if (detalle["IA2"]["nivel"] or 0) >= 2 and datos.get("estudiante_es_perceptor") is False:
        consistencia.append("C5: el estudiante trabaja pero no figura como perceptor; revisar si su ingreso quedó fuera de IE1.")

    av = caso.get("alta_vulnerabilidad", {})
    determinacion = av.get("valor", "pendiente")
    puede_definitivo = not bloqueos
    listo_para_comite = puede_definitivo and determinacion in ("si", "no") and bool(av.get("justificacion"))

    return {
        "id": caso.get("id"),
        "version_rubrica": rubrica["version"],
        "puntaje_normalizado": normalizado,
        "rango": rango,
        "completitud": 100 - peso_faltante,
        "peso_faltante": peso_faltante,
        "peso_no_aplica": peso_na,
        "peso_sin_autorizacion": peso_sin_autorizacion,
        "por_dimension": por_dimension,
        "indicadores": detalle,
        "puede_ser_definitivo": puede_definitivo,
        "tipo_de_puntaje": "definitivo" if puede_definitivo else "preliminar",
        "bloqueos": bloqueos,
        "alertas": alertas,
        "senales_de_severidad": senales,
        "consistencia": consistencia,
        "determinacion_alta_vulnerabilidad": determinacion,
        "listo_para_comite": listo_para_comite,
    }


def comparar_calificaciones(a: dict, b: dict, umbral_puntos: float) -> list[str]:
    """Doble calificación: devuelve los motivos de conciliación (regla C7)."""
    motivos = []
    if a["puntaje_normalizado"] is not None and b["puntaje_normalizado"] is not None:
        diferencia = abs(a["puntaje_normalizado"] - b["puntaje_normalizado"])
        if diferencia > umbral_puntos:
            motivos.append(f"Diferencia de {diferencia:.2f} puntos (> {umbral_puntos:g}).")
    for cod, fa in a["indicadores"].items():
        fb = b["indicadores"][cod]
        if fa["estado"] == fb["estado"] == "VALIDO" and abs(fa["nivel"] - fb["nivel"]) >= 2:
            motivos.append(f"{cod}: niveles {fa['nivel']} y {fb['nivel']} (diferencia de 2 o más).")
        elif fa["estado"] != fb["estado"]:
            motivos.append(f"{cod}: estados distintos ({fa['estado']} y {fb['estado']}).")
    return motivos


def incentivo_mensual(horas_mes: float, smmlv: float, smmlv_por_hora: float = 0.0075) -> float:
    """Res. 869/2018 art. 47: 0,0075 SMMLV por hora de apoyo brindada.

    Las horas las reporta cada mes el responsable de la dependencia a Bienestar
    (art. 47 par.). El tope de 20 horas semanales (art. 48) se valida aparte.
    """
    return horas_mes * smmlv_por_hora * smmlv


# --- Salida legible ---

def _fmt(x: float | None) -> str:
    return "—" if x is None else f"{x:.2f}"


def resumen_texto(r: dict) -> str:
    lineas = [
        f"Caso {r['id']} · rúbrica {r['version_rubrica']}",
        f"  Puntaje {r['tipo_de_puntaje']}: {_fmt(r['puntaje_normalizado'])} / 100"
        f"   rango [{_fmt(r['rango'][0])}, {_fmt(r['rango'][1])}]"
        f"   completitud {r['completitud']:g} %   peso NA {r['peso_no_aplica']:g}",
        "  Por indicador: " + "  ".join(
            f"{c}={'NA' if f['estado'] == 'NA' else f['estado'] if f['estado'] != 'VALIDO' else f['nivel']}"
            + (f"(sug {f['sugerido']})" if f['sugerido'] is not None and f['estado'] == 'VALIDO' and f['sugerido'] != f['nivel'] else "")
            for c, f in r["indicadores"].items()),
    ]
    for titulo, clave in (("Bloqueos", "bloqueos"), ("Alertas", "alertas"),
                          ("Señales de severidad", "senales_de_severidad"), ("Consistencia", "consistencia")):
        if r[clave]:
            lineas.append(f"  {titulo}:")
            lineas.extend(f"    - {x}" for x in r[clave])
    lineas.append(f"  Alta vulnerabilidad (determinación profesional): {r['determinacion_alta_vulnerabilidad']}"
                  f"   Listo para Comité: {'sí' if r['listo_para_comite'] else 'no'}")
    return "\n".join(lineas)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("casos", help="Archivo JSON con una lista de casos")
    ap.add_argument("--rubrica", default=str(RUBRICA_POR_DEFECTO))
    ap.add_argument("--parametros-de-prueba", action="store_true",
                    help="Usa las líneas de pobreza ficticias de la rúbrica (solo para pruebas)")
    ap.add_argument("--json", action="store_true", help="Imprime el resultado completo en JSON")
    args = ap.parse_args(argv)

    rubrica = cargar_json(args.rubrica)
    p = parametros_efectivos(rubrica, args.parametros_de_prueba)
    casos = cargar_json(args.casos)["casos"]
    resultados = [calcular(rubrica, c, p) for c in casos]
    if args.json:
        json.dump(resultados, sys.stdout, ensure_ascii=False, indent=2)
        print()
    else:
        print("\n\n".join(resumen_texto(r) for r in resultados))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
