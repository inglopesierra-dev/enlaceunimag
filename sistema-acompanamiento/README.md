# Sistema de seguimiento y acompañamiento estudiantil

Propuesta técnica, prototipo y kit de construcción para que las áreas de Bienestar Universitario y Desarrollo Estudiantil registren y consulten, en un solo lugar, las atenciones y seguimientos de cada estudiante.

Hay dos caminos con el mismo modelo de unidades y permisos:
- **Camino A**, con las licencias actuales: SharePoint, Power Apps, Power Automate y Forms.
- **Camino B**, si se compran licencias Premium: Dataverse.

Ver `docs/01-arquitectura-y-licencias.md`.

## Contenido

| Ruta | Qué es |
|---|---|
| `prototipo/index.html` | Prototipo navegable con datos 100 % ficticios. Tiene el catálogo real de unidades y servicios, 20.000 estudiantes y más de 100.000 seguimientos. Muestra lo que ve cada rol, la bandeja de solicitudes de Forms y las remisiones tipo buzón. |
| `microsoft365/` | Kit del camino A: modelo único, scripts de PnP para TI, código de la app de Power Apps y generadores. Ver `microsoft365/README.md`. |
| `docs/01-arquitectura-y-licencias.md` | Los dos caminos, licencias por verificar y cómo puede trabajar Claude con la cuenta institucional. |
| `docs/02-modelo-de-datos.md` | Diccionario de datos del camino B (Dataverse): 15 tablas y 126 columnas. |
| `docs/03-seguridad-y-privacidad.md` | Matriz de acceso por unidad, controles en SharePoint y en Dataverse, y pruebas de seguridad. |
| `docs/04-plan-de-implementacion.md` | Fases, piloto y criterios de aceptación. |
| `docs/05-guia-microsoft365.md` | Paso a paso del camino A: sitio, listas, permisos, carga de la base, app y piloto. |
| `docs/06-solicitudes-forms-y-flujos.md` | Cómo conectar tu formulario de Forms a las bandejas de las unidades con Power Automate. |
| `docs/07-proteccion-de-datos-y-menores.md` | Marco normativo, menores de edad, VBG, historia clínica, RNBD y borradores de autorización. |
| `dataverse/esquema.json` | Camino B: tablas, columnas, opciones, claves, perfiles de columna, unidades de negocio y roles. El catálogo de unidades vigente está en `microsoft365/modelo.json`. |
| `dataverse/generar_diccionario.py` | Regenera el diccionario de datos a partir del esquema. |
| `dataverse/generar_datos_ficticios.py` | Genera archivos CSV ficticios para cargar un entorno de desarrollo de Dataverse. |

## Uso rápido

```bash
# Camino A: scripts, referencia y app desde el modelo
python microsoft365/generar_kit.py scripts microsoft365/scripts
python microsoft365/generar_app.py microsoft365/app

# Archivos de carga con datos reales (salida privada, fuera del repositorio)
python microsoft365/generar_kit.py carga BASE_DE_DATOS.xlsx ~/OneDrive/carga_privada
```

```bash
# Datos ficticios para el entorno de desarrollo (2.000 estudiantes; usa --estudiantes 20000 para la escala real)
python dataverse/generar_datos_ficticios.py --estudiantes 2000 --salida datos_ficticios

# Regenerar el diccionario después de cambiar el esquema
python dataverse/generar_diccionario.py dataverse/esquema.json docs/02-modelo-de-datos.md
```

Para ver el prototipo localmente, abre `prototipo/index.html` en un navegador.

## Reglas

- Aquí no se guardan datos reales de estudiantes. El repositorio es público y el `.gitignore` bloquea `*.xlsx` y `*.csv`. Los archivos de carga reales se entregan aparte y se guardan en el OneDrive institucional.
- Los códigos ficticios tienen el formato real: año de ingreso, periodo, programa, variante y consecutivo (por ejemplo 2026214962). Usan las variantes de la 9 hacia abajo, que la base real no usa (solo usa de la 0 a la 3); así ningún código de prueba coincide con el de un estudiante real. Los documentos ficticios empiezan por 99, un prefijo que no tienen las cédulas colombianas.
