"""Pruebas del calculador de referencia del ESC.

    python -m unittest test_calcular_esc.py

Sirven también como vectores de prueba: la app que implemente la rúbrica
(PILAS u otra) debe obtener los mismos resultados con los mismos casos.
"""

import copy
import unittest
from pathlib import Path

import calcular_esc as esc

AQUI = Path(__file__).resolve().parent


class BaseESC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rubrica = esc.cargar_json(AQUI / "rubrica-esc-v0.1.json")
        cls.p = esc.parametros_efectivos(cls.rubrica, usar_prueba=True)
        cls.casos = {c["id"]: c for c in esc.cargar_json(AQUI / "casos_ficticios.json")["casos"]}

    def resultado(self, id_caso, **cambios):
        caso = copy.deepcopy(self.casos[id_caso])
        caso.update(cambios)
        return esc.calcular(self.rubrica, caso, self.p)


class TestEstructura(BaseESC):
    def test_pesos_suman_100(self):
        self.assertEqual(sum(i["peso"] for i in self.rubrica["indicadores"]), 100)

    def test_peso_de_cada_dimension_coincide(self):
        for d in self.rubrica["dimensiones"]:
            suma = sum(i["peso"] for i in self.rubrica["indicadores"] if i["dimension"] == d["codigo"])
            self.assertEqual(suma, d["peso"], d["codigo"])

    def test_cinco_anclajes_por_indicador(self):
        for i in self.rubrica["indicadores"]:
            self.assertEqual(sorted(i["anclajes"]), ["0", "1", "2", "3", "4"], i["codigo"])

    def test_sin_cortes_de_categoria_aprobados(self):
        self.assertIsNone(self.rubrica["categorias_piloto"]["cortes"])

    def test_lineas_de_pobreza_oficiales_quedan_pendientes(self):
        oficial = esc.parametros_efectivos(self.rubrica, usar_prueba=False)
        self.assertIsNone(oficial["linea_pobreza_pc_mensual"])
        self.assertIsNone(esc.sugerir_IE1({"ingreso_mensual_hogar": 1, "personas_hogar": 1}, oficial))

    def test_parametros_normativos(self):
        self.assertEqual(self.p["incentivo_smmlv_por_hora"], 0.0075)
        self.assertEqual(self.p["horas_maximas_semana"], 20)


class TestCasosFicticios(BaseESC):
    ESPERADOS = {
        # id: (puntaje, rango_min, rango_max, definitivo)
        "F-01": (44.565217, 44.565217, 44.565217, True),
        "F-02": (38.25, 38.25, 38.25, True),
        "F-03-preliminar": (42.528736, 37.0, 50.0, False),
        "F-03-definitivo": (36.5, 36.5, 36.5, True),
        "F-04": (26.5, 26.5, 26.5, True),
        "F-05": (56.75, 56.75, 56.75, True),
    }

    def test_puntajes_y_estado(self):
        for id_caso, (puntaje, rmin, rmax, definitivo) in self.ESPERADOS.items():
            with self.subTest(id_caso):
                r = self.resultado(id_caso)
                self.assertAlmostEqual(r["puntaje_normalizado"], puntaje, places=5)
                self.assertAlmostEqual(r["rango"][0], rmin, places=5)
                self.assertAlmostEqual(r["rango"][1], rmax, places=5)
                self.assertEqual(r["puede_ser_definitivo"], definitivo)

    def test_no_aplica_sale_del_denominador(self):
        r = self.resultado("F-01")
        self.assertEqual(r["peso_no_aplica"], 8)
        self.assertAlmostEqual(r["puntaje_normalizado"], 100 * 41 / 92, places=9)

    def test_preliminar_bloqueado_por_criticos_y_discrepancia(self):
        r = self.resultado("F-03-preliminar")
        codigos = {b.split()[0].rstrip(":") for b in r["bloqueos"]}
        self.assertTrue({"B1", "B2", "B4", "B5"} <= codigos)
        self.assertIn("C5", " ".join(r["consistencia"]))
        self.assertFalse(r["listo_para_comite"])

    def test_senal_de_severidad_no_suma_puntos(self):
        r = self.resultado("F-01")
        self.assertTrue(any(s.startswith("S1") for s in r["senales_de_severidad"]))
        self.assertAlmostEqual(sum(f["puntos"] for f in r["indicadores"].values()), 41.0)


class TestReglas(BaseESC):
    def test_umbrales_IE1(self):
        lpe, lp = self.p["linea_pobreza_extrema_pc_mensual"], self.p["linea_pobreza_pc_mensual"]
        for ipc, nivel in ((lpe, 4), (lpe + 1, 3), (lp, 3), (1.5 * lp, 2), (2.5 * lp, 1), (2.5 * lp + 1, 0)):
            with self.subTest(ipc=ipc):
                self.assertEqual(esc.sugerir_IE1({"ingreso_mensual_hogar": ipc, "personas_hogar": 1}, self.p), nivel)

    def test_umbrales_IE3_IV2_IA2(self):
        self.assertEqual(esc.sugerir_IE3({"personas_hogar": 3, "perceptores": 0}, self.p), 4)
        self.assertEqual(esc.sugerir_IE3({"personas_hogar": 6, "perceptores": 1}, self.p), 3)
        self.assertEqual(esc.sugerir_IV2({"personas_por_cuarto": 2.5, "carencias_vivienda": 0}, self.p), 1)
        self.assertEqual(esc.sugerir_IV2({"personas_por_cuarto": 3.5, "carencias_vivienda": 0}, self.p), 2)
        self.assertEqual(esc.sugerir_IV2({"personas_por_cuarto": 3.5, "carencias_vivienda": 3}, self.p), 4)
        self.assertEqual(esc.sugerir_IA2({"horas_trabajo_semana": 20}, self.p), 2)
        self.assertEqual(esc.sugerir_IA2({"horas_trabajo_semana": 31}, self.p), 4)

    def test_ajuste_sin_justificacion_bloquea(self):
        caso = copy.deepcopy(self.casos["F-02"])
        caso["indicadores"]["IE1"] = {"nivel": 3}  # la app sugiere 2
        r = esc.calcular(self.rubrica, caso, self.p)
        self.assertTrue(any(b.startswith("B6 IE1") for b in r["bloqueos"]))
        caso["indicadores"]["IE1"] = {"nivel": 3, "verificacion": "documento", "justificacion": "Ingreso del último mes atípico."}
        r = esc.calcular(self.rubrica, caso, self.p)
        self.assertFalse(any(b.startswith("B6") for b in r["bloqueos"]))

    def test_la_app_no_rechaza_por_requisitos(self):
        r = self.resultado("F-04")
        self.assertTrue(r["puede_ser_definitivo"])
        self.assertTrue(any("Ruta de discapacidad" in a for a in r["alertas"]))

    def test_requisito_por_confirmar_bloquea(self):
        r = self.resultado("F-02", requisitos={"R1": "cumple", "R2": "por_confirmar", "R4": "cumple"})
        self.assertTrue(any(b.startswith("B7 R2") for b in r["bloqueos"]))

    def test_tercera_ocasion_y_otros_beneficios_van_al_comite(self):
        r = self.resultado("F-05")
        texto = " ".join(r["alertas"])
        self.assertIn("Tercera ocasión", texto)
        self.assertIn("otros beneficios", texto)

    def test_sin_autorizacion_de_sensibles_no_bloquea_ni_penaliza(self):
        caso = copy.deepcopy(self.casos["F-02"])
        for cod in ("IS1", "IS2", "IS3"):
            caso["indicadores"][cod] = {"estado": "NAUT"}
        r = esc.calcular(self.rubrica, caso, self.p)
        self.assertTrue(r["puede_ser_definitivo"])
        self.assertEqual(r["peso_sin_autorizacion"], 20)
        self.assertEqual(r["peso_faltante"], 0)
        self.assertAlmostEqual(r["puntaje_normalizado"], 100 * 32.75 / 80)

    def test_sin_autorizacion_solo_en_indicadores_sensibles(self):
        caso = copy.deepcopy(self.casos["F-02"])
        caso["indicadores"]["IE2"] = {"estado": "NAUT"}
        r = esc.calcular(self.rubrica, caso, self.p)
        self.assertTrue(any(b.startswith("B9 IE2") for b in r["bloqueos"]))

    def test_na_no_admitido_en_indicador_critico(self):
        caso = copy.deepcopy(self.casos["F-02"])
        caso["indicadores"]["IE2"] = {"estado": "NA", "motivo": "x"}
        r = esc.calcular(self.rubrica, caso, self.p)
        self.assertTrue(any(b.startswith("B1 IE2") for b in r["bloqueos"]))


class TestDobleCalificacion(BaseESC):
    def test_conciliacion(self):
        a = self.resultado("F-02")
        caso_b = copy.deepcopy(self.casos["F-02"])
        caso_b["indicadores"]["IR1"] = {"nivel": 4}
        b = esc.calcular(self.rubrica, caso_b, self.p)
        motivos = esc.comparar_calificaciones(a, b, self.p["diferencia_maxima_entre_calificadores"])
        self.assertEqual(len(motivos), 1)
        self.assertIn("IR1", motivos[0])


class TestIncentivo(unittest.TestCase):
    def test_formula_art_47(self):
        self.assertAlmostEqual(esc.incentivo_mensual(80, 1000), 600.0)


if __name__ == "__main__":
    unittest.main()
