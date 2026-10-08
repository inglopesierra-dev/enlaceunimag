# Sistema de seguimiento y acompañamiento estudiantil

Propuesta técnica y prototipo para que las áreas de Bienestar Universitario y Desarrollo Estudiantil registren y consulten, en un solo lugar, las atenciones y seguimientos de cada estudiante. Se apoya en Power Apps, Dataverse, Power Automate y Power BI, y se usa dentro de Microsoft Teams.

## Contenido

| Ruta | Qué es |
|---|---|
| `prototipo/index.html` | Prototipo navegable con datos 100 % ficticios: 20.000 estudiantes, más de 100.000 atenciones, ficha por estudiante en pestañas, línea de tiempo, registro con huella, remisiones, casos y permisos por rol. |
| `docs/01-arquitectura-y-licencias.md` | Por qué Power Apps con Dataverse y no solo Teams, componentes, entornos, licencias por verificar y cómo habilitar el conector de Dataverse para Claude. |
| `docs/02-modelo-de-datos.md` | Diccionario de datos generado desde el esquema: 15 tablas y 126 columnas. |
| `docs/03-seguridad-y-privacidad.md` | Matriz de acceso por rol, controles para datos psicológicos, marco normativo y pruebas de seguridad. |
| `docs/04-plan-de-implementacion.md` | Fases, flujos, piloto, paso a producción y criterios de aceptación. |
| `dataverse/esquema.json` | Esquema legible por máquina: tablas, columnas, opciones, claves, perfiles de columna, unidades de negocio y roles. |
| `dataverse/generar_diccionario.py` | Regenera el diccionario de datos a partir del esquema. |
| `dataverse/generar_datos_ficticios.py` | Genera archivos CSV ficticios para cargar el entorno de desarrollo. |

## Uso rápido

```bash
# Datos ficticios para el entorno de desarrollo (2.000 estudiantes; usa --estudiantes 20000 para la escala real)
python dataverse/generar_datos_ficticios.py --estudiantes 2000 --salida datos_ficticios

# Regenerar el diccionario después de cambiar el esquema
python dataverse/generar_diccionario.py dataverse/esquema.json docs/02-modelo-de-datos.md
```

Para ver el prototipo localmente, abre `prototipo/index.html` en un navegador.

## Reglas

- Aquí no se guardan datos reales de estudiantes. El repositorio es público y el `.gitignore` bloquea `*.xlsx` y `*.csv`.
- Los datos ficticios usan códigos que empiezan por 9 y documentos que empiezan por 99, para que no se confundan con datos reales.
