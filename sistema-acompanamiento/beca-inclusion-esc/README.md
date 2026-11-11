# Beca para la Inclusión y Permanencia Estudiantil · Enfoque Socioeconómico Continuo (ESC)

Propuesta para ordenar el proceso de esta beca: solicitud, caracterización, valoración, confirmación de información, estudio interdisciplinario, recomendación, decisión del Comité de Becas y seguimiento. Está pensada para llevarla a la app PILAS.

> **Estado: propuesta técnica pendiente de aprobación.** Pesos, indicadores, umbrales y categorías no vienen de la Resolución 869 de 2018 ni de sus modificaciones. El puntaje apoya el trabajo profesional; la decisión es del Comité de Becas.

| Archivo | Qué es |
|---|---|
| `ESC-beca-inclusion-permanencia.md` | Documento principal: análisis normativo (Res. 869 de 2018 y Res. 342 de 2019), tensiones, flujo, rúbrica, especificación de la app, confirmación de información, ficha para el Comité, plan piloto y aprobaciones. |
| `rubrica-esc-v0.1.json` | Rúbrica piloto en formato de configuración para PILAS. |
| `calcular_esc.py` | Calculador de referencia, sin dependencias. |
| `casos_ficticios.json` | Seis casos ficticios que sirven de vectores de prueba. |
| `test_calcular_esc.py` | Pruebas con los resultados esperados. |

## Uso

```bash
python calcular_esc.py casos_ficticios.json --parametros-de-prueba
python -m unittest test_calcular_esc.py
```

`--parametros-de-prueba` usa líneas de pobreza **inventadas**. Para casos reales, Bienestar carga en la rúbrica las cifras oficiales del DANE del año. Hasta entonces, la app no sugiere el nivel del indicador de ingreso.

## Reglas

- Aquí no se guardan datos reales de estudiantes: el repositorio es público.
- No se copian identificadores ni datos sensibles en servicios o modelos externos.
- Cualquier cambio de pesos, anclajes o reglas crea una versión nueva de la rúbrica, y esa versión necesita aprobación del Comité.
