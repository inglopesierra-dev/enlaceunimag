"""Genera datos 100 % ficticios en CSV para probar el sistema en el entorno de desarrollo de Dataverse.

Ningún dato corresponde a personas reales. Los códigos tienen el formato real (año de ingreso, periodo, programa,
variante y consecutivo) con variantes de la 9 hacia abajo, que la base real no usa; los documentos empiezan por 99.
Los encabezados usan los nombres visibles de las columnas de esquema.json para facilitar
el mapeo al importar (Power Apps > Tablas > Importar, o un flujo de datos de Power Query).

Uso: python generar_datos_ficticios.py --estudiantes 2000 --salida datos_ficticios
"""
import argparse
import sys
import csv
import datetime as dt
import os
import random
import unicodedata

FACULTADES = [("ING", "Ingeniería"), ("BAS", "Ciencias Básicas"), ("EMP", "Ciencias Empresariales y Económicas"),
              ("SAL", "Ciencias de la Salud"), ("HUM", "Humanidades"), ("EDU", "Ciencias de la Educación")]
PROGRAMAS = [("Ingeniería de Sistemas", 0, 10), ("Ingeniería Industrial", 0, 10), ("Ingeniería Civil", 0, 8),
             ("Ingeniería Ambiental y Sanitaria", 0, 8), ("Ingeniería Electrónica", 0, 7), ("Ingeniería Agronómica", 0, 6),
             ("Ingeniería Pesquera", 0, 3), ("Ingeniería en Ciencia de Datos", 0, 1), ("Biología", 1, 4), ("Química", 1, 1),
             ("Administración de Empresas", 2, 9), ("Contaduría Pública", 2, 12), ("Economía", 2, 5),
             ("Negocios Internacionales", 2, 13), ("Administración de Empresas Turísticas y Hoteleras", 2, 5),
             ("Tecnología en Gestión Hotelera y Turística", 2, 7), ("Medicina", 3, 6), ("Enfermería", 3, 5),
             ("Odontología", 3, 6), ("Psicología", 3, 6), ("Antropología", 4, 3), ("Cine y Audiovisuales", 4, 4),
             ("Derecho", 4, 9), ("Historia y Patrimonio", 4, 3), ("Licenciatura en Lenguas Extranjeras", 5, 4),
             ("Licenciatura en Educación Infantil", 5, 3), ("Licenciatura en Matemáticas", 5, 2),
             ("Licenciatura en Literatura y Lengua Castellana", 5, 2), ("Licenciatura en Ciencias Naturales", 5, 2),
             ("Licenciatura en Artes", 5, 2), ("Licenciatura en Etnoeducación", 5, 2)]
# Dígitos de programa del código estudiantil real (posiciones 6 y 7), en el mismo orden de PROGRAMAS.
SEG_PROG = ["14", "16", "15", "17", "19", "11", "13", "18", "38", "99", "22", "24", "20", "26", "27", "27",
            "61", "62", "63", "41", "40", "42", "43", "44", "78", "65", "72", "77", "39", "66", "67"]
NOM_F = ["María José", "Valentina", "Daniela", "Isabella", "Sofía", "Camila", "Mariana", "Gabriela", "Laura", "Natalia",
         "Andrea", "Paula", "Juliana", "Karen", "Luisa Fernanda", "Ana María", "Yuliana", "Melissa", "Sara", "Valeria"]
NOM_M = ["Juan David", "Santiago", "Andrés Felipe", "Carlos", "Sebastián", "Daniel", "Jesús", "Luis Miguel", "Kevin",
         "José Luis", "Miguel Ángel", "Samuel", "Mateo", "Alejandro", "Esteban", "Camilo", "Julián", "Nicolás", "Rafael", "David"]
APE = ["Pérez", "Gómez", "Rodríguez", "Martínez", "García", "López", "Hernández", "Díaz", "Torres", "Ramírez", "Barrios",
       "Castro", "Mendoza", "Ospino", "De la Hoz", "Charris", "Pacheco", "Orozco", "Vergara", "Fontalvo", "Cantillo",
       "Romero", "Polo", "Ariza", "Navarro", "Ruiz", "Suárez", "Jiménez", "Rojas", "Morales", "Contreras", "Padilla"]
LUGARES = [("Santa Marta", "Magdalena", "Santa Marta", 48), ("Ciénaga", "Magdalena", "Resto del Magdalena", 6),
           ("Zona Bananera", "Magdalena", "Resto del Magdalena", 4), ("Fundación", "Magdalena", "Resto del Magdalena", 3),
           ("El Banco", "Magdalena", "Resto del Magdalena", 3), ("Barranquilla", "Atlántico", "Resto de la región Caribe", 5),
           ("Valledupar", "Cesar", "Resto de la región Caribe", 5), ("Riohacha", "La Guajira", "Resto de la región Caribe", 4),
           ("Bogotá", "Bogotá D.C.", "Resto del país", 3), ("Maracaibo", "Venezuela", "Extranjero", 2)]
COLEGIOS = [("IED Liceo del Caribe", "Público"), ("Institución Educativa San José", "Público"), ("IED Técnica Industrial", "Público"),
            ("Colegio Nuestra Señora del Carmen", "Privado"), ("Colegio Bilingüe del Norte", "Privado")]
CONDICION = [("Ninguna", 90.6), ("Víctima del conflicto armado", 2), ("Comunidad afrocolombiana", 2), ("Comunidad indígena", 1.5),
             ("Persona con discapacidad", 0.6), ("Mujer cabeza de familia", 0.8), ("Deportista destacado", 0.5), ("Artista destacado", 0.5)]
INGRESO = [("Nuevo", 74), ("Programa de talentos regional", 9), ("Traslado", 4), ("Transferencia", 2),
           ("Validación de competencias", 3), ("Simultaneidad", 1), ("Reintegro", 2)]
AREAS = [
    ("Psicología", "Bienestar Universitario", True, ["Consulta psicológica individual", "Intervención en crisis", "Seguimiento psicológico", "Valoración inicial"]),
    ("Salud", "Bienestar Universitario", True, ["Consulta médica general", "Atención de enfermería", "Salud sexual y reproductiva"]),
    ("Trabajo social", "Bienestar Universitario", False, ["Entrevista socio-familiar", "Orientación en rutas y derechos", "Visita domiciliaria"]),
    ("Apoyo socioeconómico", "Bienestar Universitario", False, ["Almuerzo subsidiado", "Refrigerio", "Auxilio de transporte", "Estudio socioeconómico"]),
    ("Deporte y recreación", "Bienestar Universitario", False, ["Selección deportiva", "Actividad física dirigida", "Torneo interno"]),
    ("Arte y cultura", "Bienestar Universitario", False, ["Grupo artístico", "Taller cultural", "Evento cultural"]),
    ("Monitorías y ayudantías", "Desarrollo Estudiantil", False, ["Monitoría académica", "Ayudantía de investigación", "Seguimiento a monitor"]),
    ("Tutorías y permanencia", "Desarrollo Estudiantil", False, ["Tutoría académica", "Consejería de permanencia", "Plan de mejoramiento académico", "Orientación vocacional"]),
]
AREA_W = [12, 10, 8, 22, 12, 6, 12, 18]
BENEFICIOS = {"Almuerzo subsidiado", "Refrigerio", "Auxilio de transporte", "Monitoría académica", "Ayudantía de investigación"}
RESUMEN = {
    2: ["Entrevista sobre la situación familiar y económica; se orienta sobre los apoyos disponibles.", "Seguimiento a compromisos: entrega los documentos solicitados."],
    3: ["Se asigna cupo de almuerzo subsidiado para el período.", "Revisión de requisitos del auxilio de transporte; documentos completos."],
    4: ["Participa en el entrenamiento de la selección.", "Valoración física inicial; se recomienda un plan progresivo."],
    5: ["Asiste al ensayo del grupo artístico.", "Participa en el taller de música tradicional."],
    6: ["Monitor asignado a Cálculo Diferencial; se acuerdan horarios.", "Seguimiento al desempeño como monitor."],
    7: ["Tutoría de Cálculo Diferencial: se repasan límites y derivadas.", "Consejería de permanencia: se revisan carga académica y hábitos de estudio.", "Se formula plan de mejoramiento académico con metas por corte."],
}
PROF = [["Ps. Daniel Ortega", "Ps. Mónica Lozano"], ["Dra. Laura Gómez", "Enf. Yolanda Charris"], ["T.S. Paola Restrepo", "T.S. Hernán Vides"],
        ["Adm. Luz Marina Pabón"], ["Lic. Jairo Pertuz", "Lic. Diana Orozco"], ["Mtra. Silvia Cantillo"], ["Lic. Andrés Ruiz", "Ing. Patricia Navarro"],
        ["Lic. Andrés Ruiz", "Mg. Elena Barros", "Prof. Carlos Méndez"]]
HOY = dt.date(2026, 10, 8)


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def escribir(carpeta, nombre, filas, campos):
    with open(os.path.join(carpeta, nombre), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        w.writerows(filas)
    print(f"{nombre}: {len(filas)} filas")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--estudiantes", type=int, default=2000)
    ap.add_argument("--salida", default="datos_ficticios")
    ap.add_argument("--semilla", type=int, default=20261008)
    a = ap.parse_args()
    rnd = random.Random(a.semilla)
    os.makedirs(a.salida, exist_ok=True)
    w = lambda pares: rnd.choices([p[0] for p in pares], weights=[p[-1] for p in pares])[0]

    escribir(a.salida, "facultades.csv", [{"Código": c, "Nombre": n} for c, n in FACULTADES], ["Código", "Nombre"])
    prog_rows = [{"Código": f"P{101 + i}", "Nombre": p[0], "Facultad": FACULTADES[p[1]][0],
                  "Calendario": "Cuatrimestral" if "Ciencia de Datos" in p[0] else "Semestral"} for i, p in enumerate(PROGRAMAS)]
    escribir(a.salida, "programas.csv", prog_rows, ["Código", "Nombre", "Facultad", "Calendario"])
    escribir(a.salida, "periodos.csv", [
        {"Período original": "2026I", "Período de reporte": "2026-I", "Calendario": "Semestral", "Fecha de inicio": "2026-02-02", "Fecha de fin": "2026-06-30"},
        {"Período original": "2026II", "Período de reporte": "2026-II", "Calendario": "Semestral", "Fecha de inicio": "2026-08-03", "Fecha de fin": "2026-12-11"},
        {"Período original": "20263C", "Período de reporte": "2026-II", "Calendario": "Cuatrimestral", "Fecha de inicio": "2026-09-01", "Fecha de fin": "2026-12-18"}],
        ["Período original", "Período de reporte", "Calendario", "Fecha de inicio", "Fecha de fin"])
    escribir(a.salida, "areas.csv", [{"Nombre": n, "Dependencia": d, "Es área clínica": "Sí" if c else "No"} for n, d, c, _ in AREAS],
             ["Nombre", "Dependencia", "Es área clínica"])
    serv_rows = [{"Nombre": s, "Área": n, "Tipo": "Beneficio" if s in BENEFICIOS else "Atención", "Es clínico": "Sí" if c else "No",
                  "Requiere consentimiento": "Sí" if c else "No"} for n, d, c, ss in AREAS for s in ss]
    escribir(a.salida, "servicios.csv", serv_rows, ["Nombre", "Área", "Tipo", "Es clínico", "Requiere consentimiento"])

    est, mat, ate, cas, rem, ben, ale, con = [], [], [], [], [], [], [], []
    cuenta = {}
    for i in range(a.estudiantes):
        f = rnd.random() < 0.51
        nombres = rnd.choice(NOM_F if f else NOM_M)
        apellidos = f"{rnd.choice(APE)} {rnd.choice(APE)}"
        p = rnd.choices(range(len(PROGRAMAS)), weights=[x[2] for x in PROGRAMAS])[0]
        anio = rnd.choices(range(2019, 2027), weights=[3, 5, 9, 13, 15, 17, 18, 20])[0]
        periodo = 1 if rnd.random() < 0.51 else 2
        grupo = f"{anio}{periodo}{SEG_PROG[p]}"
        n = cuenta.get(grupo, 0)
        cuenta[grupo] = n + 1
        if n >= 600:
            sys.exit("Cohorte de prueba demasiado grande para el formato de código")
        codigo = f"{grupo}{9 - n // 100}{n % 100:02d}"
        nac = dt.date(anio - 17 - min(6, abs(int(rnd.gauss(0, 1.6)))), rnd.randint(1, 12), rnd.randint(1, 28))
        edad = (HOY - nac).days // 365
        doc = f"99{rnd.randint(0, 99999999):08d}"
        lug = rnd.choices(LUGARES, weights=[x[3] for x in LUGARES])[0]
        col = rnd.choice(COLEGIOS)
        estrato = rnd.choices(range(1, 7), weights=[52, 31, 11, 3.2, 1.2, 0.4])[0]
        nuevo = anio == 2026
        prom = 0 if nuevo else round(max(2.1, min(4.9, rnd.gauss(3.66, 0.42))), 2)
        matric = rnd.random() < 0.951
        cancel = matric and rnd.random() < 0.01
        correo = f"{sin_tildes(nombres.split()[0]).lower()}.{sin_tildes(apellidos.split()[0]).lower().replace(' ', '')}{i % 89}@estudiantes.ejemplo.edu.co"
        est.append({"Código estudiantil": codigo, "Nombre completo": f"{nombres} {apellidos}", "Nombres": nombres, "Apellidos": apellidos,
                    "Tipo de documento": "Tarjeta de identidad" if edad < 18 else "Cédula de ciudadanía", "Número de documento": doc,
                    "Documento (últimos 4)": "••••" + doc[-4:], "Sexo": "Femenino" if f else "Masculino", "Fecha de nacimiento": nac.isoformat(),
                    "Correo institucional": correo, "Celular": f"3{rnd.randint(0, 2)}{rnd.randint(0, 9)}0000000", "Programa actual": prog_rows[p]["Código"],
                    "Facultad": FACULTADES[PROGRAMAS[p][1]][0], "Estado académico": "Activo" if matric else "Inactivo", "Origen": lug[2],
                    "Departamento de origen": lug[1], "Municipio de origen": lug[0], "Colegio de procedencia": col[0], "Tipo de colegio": col[1],
                    "Estrato": estrato, "Condición especial": w(CONDICION)})
        mat.append({"Clave": f"2026II|{codigo}", "Estudiante": codigo, "Período": "2026II", "Programa": prog_rows[p]["Código"],
                    "Plan de estudio": rnd.randint(1, 7), "Modalidad de ingreso": w(INGRESO), "Matriculado": "Sí" if matric else "No",
                    "Canceló el semestre": "Sí" if cancel else "No", "Promedio (valor fuente)": int(round(prom * 100)),
                    "Promedio acumulado (0 a 5)": f"{prom:.2f}", "Fecha de corte": "2026-10-07"})
        alerta = (0 < prom < 3) or not matric or cancel
        if 0 < prom < 3:
            ale.append({"Estudiante": codigo, "Período": "2026II", "Tipo de alerta": "Promedio por debajo de 3,0", "Origen": "Automática", "Área asignada": "Tutorías y permanencia", "Estado": "Nueva"})
        if not matric:
            ale.append({"Estudiante": codigo, "Período": "2026II", "Tipo de alerta": "Sin matrícula", "Origen": "Automática", "Área asignada": "Tutorías y permanencia", "Estado": "Nueva"})
        n_at = rnd.choices(range(13), weights=[7, 11, 13, 13, 11, 9, 8, 7, 6, 5, 4, 3, 3])[0] + (rnd.randint(2, 8) if alerta else 0)
        if nuevo:
            n_at = min(n_at, 4)
        dias = sorted(HOY - dt.timedelta(days=rnd.randint(1, 240 if nuevo else 540)) for _ in range(n_at))
        clinica_usada = False
        for d in dias:
            k = rnd.choices(range(8), weights=AREA_W)[0]
            if alerta and rnd.random() < 0.35:
                k = 7
            nombre_area, _, clinica, servicios = AREAS[k]
            serv = rnd.choice(servicios)
            prox = (d + dt.timedelta(days=rnd.randint(5, 30))).isoformat() if rnd.random() < 0.5 else ""
            ate.append({"Asunto": f"{serv} · {codigo}", "Estudiante": codigo, "Área": nombre_area, "Servicio": serv, "Fecha": d.isoformat(),
                        "Hora": f"{rnd.randint(7, 17):02d}:{rnd.choice([0, 15, 30, 45]):02d}", "Modalidad": rnd.choices(["Presencial", "Virtual", "Telefónica"], [70, 20, 10])[0],
                        "Tipo de atención": "Seguimiento" if rnd.random() < 0.7 else "Primera vez",
                        "Resumen para la red (no clínico)": f"Atención de {nombre_area} realizada." if clinica else rnd.choice(RESUMEN[k]),
                        "Próxima acción": ("Sesión de seguimiento" if clinica else "Revisar compromisos") if prox else "", "Fecha de la próxima acción": prox,
                        "Resultado": "No asistió" if rnd.random() < 0.05 else "Realizada", "Profesional": rnd.choice(PROF[k]), "Es atención clínica": "Sí" if clinica else "No"})
            clinica_usada = clinica_usada or clinica
        if clinica_usada:
            con.append({"Estudiante": codigo, "Tipo": "Atención psicológica", "Fecha de firma": (dias[0] - dt.timedelta(days=1)).isoformat(), "Vigente hasta": "2027-12-31", "Revocado": "No"})
        con.append({"Estudiante": codigo, "Tipo": "Tratamiento de datos personales", "Fecha de firma": f"{anio}-02-01", "Vigente hasta": "", "Revocado": "No"})
        if alerta and rnd.random() < 0.6:
            lider = "Tutorías y permanencia" if (0 < prom < 3 or not matric) else rnd.choice(["Trabajo social", "Apoyo socioeconómico", "Psicología"])
            ap_ = HOY - dt.timedelta(days=rnd.randint(3, 300))
            cas.append({"Estudiante": codigo, "Motivo": "Rendimiento académico" if lider == "Tutorías y permanencia" else "Situación socioeconómica",
                        "Área líder": lider, "Prioridad": rnd.choice(["Alta", "Media", "Media", "Baja"]), "Origen": "Alerta temprana",
                        "Resumen (no clínico)": "Promedio en riesgo y ausencias reiteradas; se activa ruta de permanencia.", "Fecha de apertura": ap_.isoformat(),
                        "Estado": rnd.choice(["Abierto", "En seguimiento", "En seguimiento", "Cerrado"])})
            if rnd.random() < 0.5:
                rem.append({"Estudiante": codigo, "Área que remite": lider, "Área destino": rnd.choice([x[0] for x in AREAS if x[0] != lider and not x[2]]),
                            "Motivo (no clínico)": "Requiere apoyo complementario", "Prioridad": "Media", "Estado": rnd.choice(["Pendiente", "Atendida", "Atendida"]),
                            "Fecha": (ap_ + dt.timedelta(days=rnd.randint(1, 20))).isoformat()})
        if matric and estrato <= 2 and rnd.random() < 0.28:
            ben.append({"Estudiante": codigo, "Beneficio (servicio)": "Almuerzo subsidiado", "Período": "2026II", "Fecha de inicio": "2026-08-10", "Estado": "Activo", "Fuente o convocatoria": "Convocatoria 2026-II"})
        if matric and prom >= 4 and rnd.random() < 0.1:
            ben.append({"Estudiante": codigo, "Beneficio (servicio)": "Monitoría académica", "Período": "2026II", "Fecha de inicio": "2026-08-18", "Estado": "Activo", "Fuente o convocatoria": "Convocatoria de monitores 2026-II"})

    escribir(a.salida, "estudiantes.csv", est, list(est[0].keys()))
    escribir(a.salida, "matriculas.csv", mat, list(mat[0].keys()))
    escribir(a.salida, "atenciones.csv", ate, list(ate[0].keys()))
    escribir(a.salida, "casos.csv", cas, list(cas[0].keys()) if cas else ["Estudiante"])
    escribir(a.salida, "remisiones.csv", rem, list(rem[0].keys()) if rem else ["Estudiante"])
    escribir(a.salida, "beneficios.csv", ben, list(ben[0].keys()) if ben else ["Estudiante"])
    escribir(a.salida, "alertas.csv", ale, list(ale[0].keys()) if ale else ["Estudiante"])
    escribir(a.salida, "consentimientos.csv", con, list(con[0].keys()))


if __name__ == "__main__":
    main()
