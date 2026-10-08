# Modelo de datos en Dataverse

Generado desde `dataverse/esquema.json`. Si cambias el esquema, vuelve a generar este archivo.

Solución: **Acompañamiento estudiantil** · prefijo `unimag_` (sujeto a la convención del editor).

## Resumen

| Tabla | Nombre lógico | Tipo | Propiedad | Volumen estimado |
|---|---|---|---|---|
| Facultad | `unimag_facultad` | Estándar | Organización | ≈ 6 |
| Programa | `unimag_programa` | Estándar | Organización | ≈ 40 |
| Período académico | `unimag_periodo` | Estándar | Organización | pocas filas por año |
| Estudiante | `unimag_estudiante` | Estándar | Usuario o equipo | ≈ 20.000 (crece cada período) |
| Matrícula del período | `unimag_matricula` | Estándar | Usuario o equipo | ≈ 18.000 por período |
| Área | `unimag_area` | Estándar | Organización | ≈ 10 |
| Servicio | `unimag_servicio` | Estándar | Organización | ≈ 40 |
| Atención | `unimag_atencion` | Actividad | Usuario o equipo | 100.000+ por año |
| Nota psicológica | `unimag_notapsicologica` | Estándar | Usuario o equipo | según demanda |
| Nota de salud | `unimag_notasalud` | Estándar | Usuario o equipo | según demanda |
| Caso de acompañamiento | `unimag_caso` | Estándar | Usuario o equipo | miles por año |
| Remisión | `unimag_remision` | Estándar | Usuario o equipo | miles por año |
| Beneficio | `unimag_beneficio` | Estándar | Usuario o equipo | ≈ 10.000 por período |
| Alerta temprana | `unimag_alerta` | Estándar | Usuario o equipo | miles por período |
| Consentimiento | `unimag_consentimiento` | Estándar | Usuario o equipo | ≈ 1 a 3 por estudiante |

## Tablas

### Facultad (`unimag_facultad`)

Configuración: auditoría activa; clave alterna: unimag_codigo.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Nombre (principal) | `unimag_name` | Texto (120) | sí |  |
| Código | `unimag_codigo` | Texto (20) | sí |  |

### Programa (`unimag_programa`)

Configuración: auditoría activa; clave alterna: unimag_codigo.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Nombre (principal) | `unimag_name` | Texto (160) | sí |  |
| Código | `unimag_codigo` | Texto (20) | sí |  |
| Facultad | `unimag_facultadid` | Búsqueda → `unimag_facultad` | sí |  |
| Calendario | `unimag_calendario` | Opción (`unimag_calendario`) |  |  |

### Período académico (`unimag_periodo`)

Configuración: auditoría activa; clave alterna: unimag_name.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Período original (principal) | `unimag_name` | Texto (20) | sí | Ej.: 2026II |
| Período de reporte | `unimag_periodoreporte` | Texto (20) | sí | Ej.: 2026-II |
| Calendario | `unimag_calendario` | Opción (`unimag_calendario`) |  |  |
| Fecha de inicio | `unimag_fechainicio` | Fecha |  |  |
| Fecha de fin | `unimag_fechafin` | Fecha |  |  |

### Estudiante (`unimag_estudiante`)

Una fila por código académico. Debe habilitarse para actividades: así la tabla Atención aparece en la línea de tiempo de la ficha.

Configuración: auditoría activa; habilitada para actividades; clave alterna: unimag_codigo.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Nombre completo (principal) | `unimag_name` | Texto (200) | sí |  |
| Código estudiantil | `unimag_codigo` | Texto (15) | sí |  |
| Nombres | `unimag_nombres` | Texto (100) | sí |  |
| Apellidos | `unimag_apellidos` | Texto (100) | sí |  |
| Tipo de documento | `unimag_tipodocumento` | Opción (`unimag_tipodocumento`) |  |  |
| Número de documento | `unimag_numerodocumento` | Texto (20) |  | Protegida: perfil «Documento completo» |
| Documento (últimos 4) | `unimag_documentoparcial` | Texto (12) |  | Lo calcula un flujo al crear o actualizar: ••••1234 |
| Sexo | `unimag_sexo` | Opción (`unimag_sexo`) |  |  |
| Fecha de nacimiento | `unimag_fechanacimiento` | Fecha |  |  |
| Correo institucional | `unimag_correoinstitucional` | Correo (120) |  |  |
| Celular | `unimag_celular` | Teléfono (20) |  |  |
| Programa actual | `unimag_programaid` | Búsqueda → `unimag_programa` |  |  |
| Facultad | `unimag_facultadid` | Búsqueda → `unimag_facultad` |  |  |
| Estado académico | `unimag_estadoacademico` | Opción (`unimag_estadoacademico`) |  |  |
| Origen | `unimag_origen` | Opción (`unimag_origen`) |  |  |
| Departamento de origen | `unimag_departamentoorigen` | Texto (80) |  |  |
| Municipio de origen | `unimag_municipioorigen` | Texto (80) |  |  |
| Colegio de procedencia | `unimag_colegio` | Texto (200) |  |  |
| Tipo de colegio | `unimag_tipocolegio` | Opción (`unimag_tipocolegio`) |  |  |
| Estrato | `unimag_estrato` | Número entero |  | Protegida: perfil «Datos sensibles» |
| Condición especial | `unimag_condicionespecial` | Opción (`unimag_condicionespecial`) |  | Protegida: perfil «Datos sensibles» |
| Última atención de Bienestar | `unimag_ultimaatencionbienestar` | Fecha |  | La mantiene un flujo; permite a docentes saber que hay acompañamiento sin ver el detalle |
| Alertas activas | `unimag_alertasactivas` | Número entero |  | Columna de resumen (rollup) sobre Alerta temprana |

### Matrícula del período (`unimag_matricula`)

Equivale a la hoja Base_estudiantes del Excel: una fila por estudiante y período.

Configuración: auditoría activa; clave alterna: unimag_name.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Clave (principal) | `unimag_name` | Texto (40) | sí | Ej.: 2026II|2026214962 |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Período | `unimag_periodoid` | Búsqueda → `unimag_periodo` | sí |  |
| Programa | `unimag_programaid` | Búsqueda → `unimag_programa` |  |  |
| Plan de estudio | `unimag_planestudio` | Número entero |  |  |
| Modalidad de ingreso | `unimag_modalidadingreso` | Texto (100) |  |  |
| Matriculado | `unimag_matriculado` | Sí/No |  |  |
| Canceló el semestre | `unimag_cancelacion` | Sí/No |  |  |
| Promedio (valor fuente) | `unimag_promedioorigen` | Número entero |  | Ej.: 318 |
| Promedio acumulado (0 a 5) | `unimag_promedio` | Decimal |  | Ej.: 3.18 |
| Fecha de corte | `unimag_fechacorte` | Fecha |  |  |

### Área (`unimag_area`)

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Nombre (principal) | `unimag_name` | Texto (100) | sí |  |
| Dependencia | `unimag_dependencia` | Opción (`unimag_dependencia`) | sí |  |
| Es área clínica | `unimag_esclinica` | Sí/No |  |  |
| Canal de Teams para avisos | `unimag_canalteams` | URL (400) |  |  |

### Servicio (`unimag_servicio`)

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Nombre (principal) | `unimag_name` | Texto (150) | sí |  |
| Área | `unimag_areaid` | Búsqueda → `unimag_area` | sí |  |
| Tipo | `unimag_tiposervicio` | Opción (`unimag_tiposervicio`) |  |  |
| Es clínico | `unimag_esclinico` | Sí/No |  |  |
| Requiere consentimiento | `unimag_requiereconsentimiento` | Sí/No |  |  |

### Atención (`unimag_atencion`)

Tabla de actividad: hereda Asunto, Referente a (el estudiante), fechas, propietario y estado, y aparece en la línea de tiempo. El propietario es el profesional; Dataverse guarda quién creó y modificó cada registro.

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Asunto (principal) | `subject` | Texto (200) | sí |  |
| Estudiante (Referente a) | `regardingobjectid` | Búsqueda → `unimag_estudiante` | sí | Columna estándar de las actividades |
| Área | `unimag_areaid` | Búsqueda → `unimag_area` | sí |  |
| Servicio | `unimag_servicioid` | Búsqueda → `unimag_servicio` | sí |  |
| Caso | `unimag_casoid` | Búsqueda → `unimag_caso` |  |  |
| Modalidad | `unimag_modalidad` | Opción (`unimag_modalidad`) |  |  |
| Tipo de atención | `unimag_tipoatencion` | Opción (`unimag_tipoatencion`) |  |  |
| Resumen para la red (no clínico) | `unimag_resumen` | Texto largo (500) |  | Protegida: perfil «Resumen de atenciones» |
| Próxima acción | `unimag_proximaaccion` | Texto (120) |  |  |
| Fecha de la próxima acción | `unimag_fechaproximaaccion` | Fecha |  |  |
| Resultado | `unimag_resultado` | Opción (`unimag_resultadoatencion`) |  |  |
| Motivo de anulación | `unimag_motivoanulacion` | Texto (200) |  |  |
| Es atención clínica | `unimag_esclinica` | Sí/No |  |  |
| Alerta prioritaria para coordinación | `unimag_alertaprioritaria` | Sí/No |  | La marca el profesional clínico sin revelar contenido |

### Nota psicológica (`unimag_notapsicologica`)

Contenido clínico de Psicología. Propietario: equipo Psicología. Solo el rol de Psicología tiene privilegios sobre esta tabla.

Configuración: auditoría activa; registro de accesos (lecturas).

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Nota (principal) | `unimag_name` | Texto (100) | sí |  |
| Atención | `unimag_atencionid` | Búsqueda → `unimag_atencion` | sí |  |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Consentimiento informado | `unimag_consentimientoid` | Búsqueda → `unimag_consentimiento` | sí |  |
| Motivo de consulta | `unimag_motivoconsulta` | Texto largo (4000) |  | Protegida: perfil «Contenido clínico de Psicología» |
| Valoración | `unimag_valoracion` | Texto largo (4000) |  | Protegida: perfil «Contenido clínico de Psicología» |
| Impresión diagnóstica | `unimag_impresiondiagnostica` | Texto (300) |  | Protegida: perfil «Contenido clínico de Psicología» |
| Plan de intervención | `unimag_planintervencion` | Texto largo (4000) |  | Protegida: perfil «Contenido clínico de Psicología» |
| Nivel de riesgo | `unimag_nivelriesgo` | Opción (`unimag_nivelriesgo`) |  | Protegida: perfil «Contenido clínico de Psicología» |

### Nota de salud (`unimag_notasalud`)

Misma estructura que la nota psicológica, separada para aislar el acceso entre Psicología y Salud.

Configuración: auditoría activa; registro de accesos (lecturas).

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Nota (principal) | `unimag_name` | Texto (100) | sí |  |
| Atención | `unimag_atencionid` | Búsqueda → `unimag_atencion` | sí |  |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Consentimiento informado | `unimag_consentimientoid` | Búsqueda → `unimag_consentimiento` | sí |  |
| Motivo de consulta | `unimag_motivoconsulta` | Texto largo (4000) |  | Protegida: perfil «Contenido clínico de Salud» |
| Valoración | `unimag_valoracion` | Texto largo (4000) |  | Protegida: perfil «Contenido clínico de Salud» |
| Impresión diagnóstica | `unimag_impresiondiagnostica` | Texto (300) |  | Protegida: perfil «Contenido clínico de Salud» |
| Conducta y plan | `unimag_conducta` | Texto largo (4000) |  | Protegida: perfil «Contenido clínico de Salud» |

### Caso de acompañamiento (`unimag_caso`)

Flujo de proceso de negocio «Ruta de acompañamiento»: Detección → Valoración → Plan → Seguimiento → Cierre.

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Número de caso (principal) | `unimag_name` | Autonumérico `CAS-{DATETIMEUTC:yyyy}-{SEQNUM:5}` | sí |  |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Motivo | `unimag_motivo` | Opción (`unimag_motivocaso`) | sí |  |
| Área líder | `unimag_arealiderid` | Búsqueda → `unimag_area` | sí |  |
| Prioridad | `unimag_prioridad` | Opción (`unimag_prioridad`) |  |  |
| Origen | `unimag_origen` | Opción (`unimag_origencaso`) |  |  |
| Resumen (no clínico) | `unimag_resumen` | Texto largo (1000) |  |  |
| Fecha de apertura | `unimag_fechaapertura` | Fecha |  |  |
| Fecha de cierre | `unimag_fechacierre` | Fecha |  |  |

### Remisión (`unimag_remision`)

Al crearse, un flujo la asigna al equipo del área destino y publica el aviso en su canal de Teams.

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Número (principal) | `unimag_name` | Autonumérico `REM-{SEQNUM:6}` | sí |  |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Caso | `unimag_casoid` | Búsqueda → `unimag_caso` |  |  |
| Área que remite | `unimag_areaorigenid` | Búsqueda → `unimag_area` | sí |  |
| Área destino | `unimag_areadestinoid` | Búsqueda → `unimag_area` | sí |  |
| Motivo (no clínico) | `unimag_motivo` | Texto (300) | sí |  |
| Prioridad | `unimag_prioridad` | Opción (`unimag_prioridad`) |  |  |
| Respuesta | `unimag_respuesta` | Texto largo (500) |  |  |
| Fecha de respuesta | `unimag_fecharespuesta` | Fecha |  |  |

### Beneficio (`unimag_beneficio`)

Una fila por asignación (no por cada almuerzo entregado). Reemplaza la hoja Beneficios del Excel.

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Número (principal) | `unimag_name` | Autonumérico `BEN-{SEQNUM:6}` | sí |  |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Beneficio (servicio) | `unimag_servicioid` | Búsqueda → `unimag_servicio` | sí |  |
| Período | `unimag_periodoid` | Búsqueda → `unimag_periodo` | sí |  |
| Fecha de inicio | `unimag_fechainicio` | Fecha |  |  |
| Fecha de fin | `unimag_fechafin` | Fecha |  |  |
| Fuente o convocatoria | `unimag_fuente` | Texto (200) |  |  |
| Observaciones | `unimag_observaciones` | Texto largo (1000) |  |  |

### Alerta temprana (`unimag_alerta`)

Las automáticas las crea un flujo después de cada carga de matrícula.

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Número (principal) | `unimag_name` | Autonumérico `ALE-{SEQNUM:6}` | sí |  |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Período | `unimag_periodoid` | Búsqueda → `unimag_periodo` |  |  |
| Tipo de alerta | `unimag_tipo` | Opción (`unimag_tipoalerta`) | sí |  |
| Origen | `unimag_origen` | Opción (`unimag_origenalerta`) |  |  |
| Área asignada | `unimag_areaasignadaid` | Búsqueda → `unimag_area` |  |  |
| Detalle | `unimag_detalle` | Texto (300) |  |  |

### Consentimiento (`unimag_consentimiento`)

Configuración: auditoría activa.

| Columna | Nombre lógico | Tipo | Requerida | Notas |
|---|---|---|---|---|
| Número (principal) | `unimag_name` | Autonumérico `CON-{SEQNUM:6}` | sí |  |
| Estudiante | `unimag_estudianteid` | Búsqueda → `unimag_estudiante` | sí |  |
| Tipo | `unimag_tipo` | Opción (`unimag_tipoconsentimiento`) | sí |  |
| Fecha de firma | `unimag_fechafirma` | Fecha | sí |  |
| Vigente hasta | `unimag_vigentehasta` | Fecha |  |  |
| Revocado | `unimag_revocado` | Sí/No |  |  |
| Fecha de revocatoria | `unimag_fecharevocatoria` | Fecha |  |  |
| Soporte firmado | `unimag_soporte` | Archivo |  |  |

## Conjuntos de opciones

- `unimag_tipodocumento`: Cédula de ciudadanía, Tarjeta de identidad, Cédula de extranjería, Permiso por protección temporal, Pasaporte, Registro civil, Otro
- `unimag_sexo`: Femenino, Masculino, Intersexual, No reporta
- `unimag_origen`: Santa Marta, Resto del Magdalena, Resto de la región Caribe, Resto del país, Extranjero
- `unimag_tipocolegio`: Público, Privado, Extranjero
- `unimag_condicionespecial`: Ninguna, Víctima del conflicto armado, Comunidad afrocolombiana, Comunidad indígena, Persona con discapacidad, Mujer cabeza de familia, Deportista destacado, Artista destacado, Otra
- `unimag_estadoacademico`: Activo, Inactivo, Graduado, Retirado
- `unimag_calendario`: Semestral, Cuatrimestral, Anual
- `unimag_dependencia`: Bienestar Universitario, Desarrollo Estudiantil
- `unimag_tiposervicio`: Atención, Beneficio, Actividad o programa
- `unimag_modalidad`: Presencial, Virtual, Telefónica
- `unimag_tipoatencion`: Primera vez, Seguimiento, Remisión recibida, Cierre
- `unimag_resultadoatencion`: Realizada, No asistió, Anulada
- `unimag_motivocaso`: Rendimiento académico, Situación socioeconómica, Bienestar emocional, Salud, Adaptación a la vida universitaria, Convivencia, Otro
- `unimag_prioridad`: Alta, Media, Baja
- `unimag_origencaso`: Alerta temprana, Solicitud del estudiante, Remisión docente, Remisión de otra área, Otro
- `unimag_tipoalerta`: Promedio por debajo de 3,0, Sin matrícula, Cancelación de semestre, Inasistencia reiterada, Remisión docente, Otra
- `unimag_origenalerta`: Automática, Manual
- `unimag_tipoconsentimiento`: Tratamiento de datos personales, Tratamiento de datos sensibles, Atención psicológica, Atención en salud, Autorización de acudiente (menor de edad)
- `unimag_nivelriesgo`: Sin riesgo identificado, Bajo, Medio, Alto

## Estados

- `unimag_caso`: activos Abierto, En seguimiento, Remitido; cerrados Cerrado, Anulado
- `unimag_remision`: activos Pendiente, Aceptada; cerrados Atendida, No aceptada
- `unimag_beneficio`: activos Asignado, Activo; cerrados Finalizado, Cancelado
- `unimag_alerta`: activos Nueva, En gestión; cerrados Atendida, Descartada
- `unimag_atencion`: Actividad: Abierta → Completada (Realizada / No asistió) o Cancelada (Anulada).
