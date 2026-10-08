# enlaceunimag

Herramientas para mantener el libro **«Cómo está mi facultad»**, el tablero de seguimiento académico por facultad de la Universidad del Magdalena.

> **Los archivos de Excel no se guardan aquí.** Este repositorio es público y la base contiene datos personales de estudiantes (nombres, documentos y fechas de nacimiento), protegidos por la Ley 1581 de 2012. El `.gitignore` bloquea `*.xlsx`, `*.xls` y `*.csv`. Guarda el libro en el OneDrive institucional.

## Qué hace `scripts/build_facultad.py`

Toma el libro original y `BASE_DE_DATOS.xlsx` y genera la versión corregida:

- Recarga en la tabla `TEstudiantes` las filas de las seis hojas de facultad. Quita los espacios sobrantes y restaura las fechas de nacimiento exactas, porque la carga anterior las había corrido entre 4 y 5 horas por la zona horaria.
- Corrige `Periodo reporte`, que salía `#¿NOMBRE?` porque la fórmula citaba la tabla `TPeriodos` sin columna. Con eso el Panel y sus gráficos dejan de mostrar cero.
- Rediseña la hoja **Consulta**:
  - busca por código, documento o nombre, sin importar tildes ni mayúsculas;
  - muestra hasta 100 coincidencias, con filtros por facultad, programa y matrícula;
  - presenta la ficha del estudiante organizada por secciones.
- Agrega:
  - la conciliación por programa en `Matricula_original`;
  - la columna de verificación del estudiante en `Beneficios`;
  - las listas de filtros en `Configuracion`;
  - una guía de uso actualizada.
- Rehace los gráficos del Panel con etiquetas de datos y recupera la lista desplegable del período de reporte.
- Elimina la hoja `Detalle1`, un detalle de tabla dinámica que se creó con un doble clic.

`scripts/postprocess.py` hace tres cosas:

- copia al archivo los valores que calculó LibreOffice, para que se vea completo en las vistas previas;
- corrige la caché de las tablas dinámicas;
- deja Arial como fuente predeterminada.

## Uso

```bash
python scripts/build_facultad.py Como_esta_mi_facultad.xlsx BASE_DE_DATOS.xlsx salida.xlsx
# Opcional: recalcular una copia de salida.xlsx con LibreOffice y pasar sus valores al archivo final
python scripts/postprocess.py salida.xlsx salida_recalculada.xlsx Como_esta_mi_facultad_final.xlsx
```

Requiere Python 3.10 o superior, `openpyxl` y `lxml`.

## Sistema de seguimiento y acompañamiento estudiantil

La carpeta `sistema-acompanamiento/` contiene el sistema para llevar el seguimiento de Bienestar y Desarrollo Estudiantil a Microsoft 365. Incluye:

- el kit para SharePoint, Power Apps y Power Automate con las licencias actuales;
- el diseño alternativo en Dataverse;
- un prototipo con datos ficticios;
- el modelo de permisos por unidad;
- la guía de protección de datos.

Ver `sistema-acompanamiento/README.md`.
