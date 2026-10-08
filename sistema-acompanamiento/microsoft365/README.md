# Kit de Microsoft 365

Todo lo necesario para montar el sistema en SharePoint, Power Apps y Power Automate con las licencias actuales de la universidad (camino A). La guía paso a paso está en `../docs/05-guia-microsoft365.md`.

| Archivo | Qué es |
|---|---|
| `modelo.json` | Fuente única: unidades, catálogo real de servicios, listas, columnas, grupos y niveles de permiso. |
| `listas.md` | Referencia de listas, columnas, índices y permisos, generada desde el modelo. |
| `scripts/provisionar-sitio.ps1` | Para TI: crea listas, columnas, índices, grupos, niveles de permiso y permisos por lista (PnP PowerShell). |
| `scripts/cargar-lista.ps1` | Para TI: carga o actualiza una lista desde un CSV, por código. |
| `app/formulas-app.txt` | Fórmulas con nombre de la app (propiedad Formulas). `formulas-app-es.txt` es la versión con punto y coma. |
| `app/pantallas/*.pa.yaml` | Las 6 pantallas de la app para pegar en Power Apps Studio. |
| `app/controles/*.pa.yaml` | Los mismos controles sin la pantalla, por si hay que pegarlos dentro de una pantalla en blanco. |
| `app/receta.md` | Cada control con sus fórmulas, para armar a mano si no se puede pegar. |
| `generar_kit.py` | Genera las plantillas de Excel, los scripts, la referencia y los archivos de carga desde BASE_DE_DATOS. |
| `generar_app.py` | Genera el código de la app desde el modelo. |
| `validar_app.py` | Revisa el código de la app antes de entregarlo: YAML, esquema de Power Apps, fórmulas y nombres. |

## Regenerar después de cambiar el modelo

```bash
python generar_kit.py scripts scripts
python generar_kit.py referencia listas.md
python generar_app.py app
python validar_app.py app --esquema pa.schema.yaml   # esquema oficial de microsoft/PowerApps-Tooling (opcional)
python generar_kit.py plantillas <carpeta>          # plantillas de Excel con datos ficticios
```

## Archivos de carga con datos reales

```bash
python generar_kit.py carga BASE_DE_DATOS.xlsx <carpeta privada>
```

Escribe `Estudiantes_carga.csv/.xlsx`, `Condiciones_ingreso_carga.csv/.xlsx` y `resumen_carga.json`:
- quita espacios sobrantes;
- calcula el promedio de 0 a 5 y las columnas de búsqueda sin tildes;
- reporta los periodos cuatrimestrales en el semestral, como «Cómo está mi facultad»;
- separa los cupos especiales sensibles.

Esos archivos tienen datos personales: se guardan en el OneDrive institucional y **nunca** en este repositorio (el `.gitignore` bloquea `*.xlsx` y `*.csv`).

## Qué se probó aquí y qué no

- Los scripts de PowerShell pasan el analizador de PowerShell 7.4. También se ejecutaron contra dobles de PnP con los mismos nombres de parámetro de la documentación oficial: crean las 21 listas, los 21 grupos, los 4 niveles de permiso y los 72 servicios, y cargan las 18.185 filas sin columnas desconocidas. No se ejecutaron contra un SharePoint real.
- El código de la app cumple el esquema oficial de pa.yaml y pasa `validar_app.py`. No se abrió en Power Apps Studio: el primer pegado es la prueba real. Si una pantalla no pega, `receta.md` permite armarla a mano.
