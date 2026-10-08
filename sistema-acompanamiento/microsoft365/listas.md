# Listas de SharePoint

Generado desde `microsoft365/modelo.json` con `python generar_kit.py referencia`. No editar a mano.

## Resumen

| Lista | Nivel | Editan | Leen todo | Permisos por elemento |
|---|---|---|---|---|
| Estudiantes | visible | AE Administradores | AE Personal | No |
| Condiciones de ingreso | reservado | AE Administradores | AE Administradores | No |
| Deportes | visible | AE Deportes | AE Personal | No |
| Cultura | visible | AE Cultura | AE Personal | No |
| Beneficios | visible | AE Programas DH | AE Personal | No |
| Accesos | visible | AE Administradores | AE Personal | No |
| Catálogo de servicios | visible | AE Administradores | AE Personal | No |
| Seguimiento Desarrollo Estudiantil | reservado | AE DE Académico | AE Administradores, AE DE Académico, AE DE Psicología | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Psicología DE | reservado | AE DE Psicología | AE Administradores, AE DE Psicología | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Psicología | reservado | AE Psicología | AE Administradores, AE Psicología | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Salud | reservado | AE Salud | AE Administradores, AE Salud | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento GAV | reservado | AE GAV | AE Administradores, AE GAV | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Centro de Escucha | reservado | AE Centro de Escucha | AE Administradores, AE Centro de Escucha | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Trabajo Social | reservado | AE Trabajo Social | AE Administradores, AE Trabajo Social | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Enlaces | reservado | AE Enlaces | AE Administradores, AE Enlaces | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Riesgo Psicosocial | reservado | AE Riesgo Psicosocial | AE Administradores, AE Riesgo Psicosocial | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Prevención Salud | reservado | AE Prevención Salud | AE Administradores, AE Prevención Salud | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Orientación Espiritual | reservado | AE Orientación Espiritual | AE Administradores, AE Orientación Espiritual | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Infancia CAI | reservado | AE Infancia CAI | AE Administradores, AE Infancia CAI | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento Sala Amiga | reservado | AE Sala Amiga | AE Administradores, AE Sala Amiga | Sí: el resto del personal solo crea remisiones y ve las suyas |
| Seguimiento IPS FUNPRONIMA | reservado | AE IPS FUNPRONIMA | AE Administradores, AE IPS FUNPRONIMA | Sí: el resto del personal solo crea remisiones y ve las suyas |

Los dos administradores (propietarios del sitio) ven y editan todo. Nadie tiene permiso de eliminar, salvo los propietarios.

## Estudiantes

Base de estudiantes del corte vigente. Una fila por estudiante. La carga Administración en cada corte.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Código | Texto | Sí | Sí | `Codigo` |  |
| Documento | Texto |  | Sí | `Documento` |  |
| Tipo de documento | Texto |  |  | `TipoDocumento` |  |
| Nombres | Texto |  |  | `Nombres` |  |
| Apellidos | Texto |  |  | `Apellidos` |  |
| Nombre completo | Texto |  |  | `NombreCompleto` |  |
| Búsqueda | Texto |  | Sí | `Busqueda` | APELLIDOS NOMBRES en mayúsculas y sin tildes. La app busca aquí por apellido. |
| Búsqueda por nombre | Texto |  | Sí | `BusquedaNombre` | NOMBRES APELLIDOS en mayúsculas y sin tildes. La app busca aquí por nombre. |
| Sexo | Texto |  |  | `Sexo` |  |
| Fecha de nacimiento | Fecha |  |  | `FechaNacimiento` |  |
| Facultad | Texto |  | Sí | `Facultad` |  |
| Programa | Texto |  | Sí | `Programa` |  |
| Periodo | Texto |  |  | `Periodo` | Periodo de reporte (los cuatrimestrales 20263C se reportan en 2026-II, como en «Cómo está mi facultad»). |
| Periodo original | Texto |  |  | `PeriodoOriginal` |  |
| Matriculado | Texto |  |  | `Matriculado` |  |
| Cancelación de semestre | Texto |  |  | `CancelacionSemestre` |  |
| Promedio | Número |  |  | `Promedio` |  |
| Plan de estudio | Texto |  |  | `PlanEstudio` |  |
| Modalidad de ingreso | Texto |  |  | `ModalidadIngreso` |  |
| Cupo especial | Texto |  |  | `CupoEspecial` | Solo valores no sensibles (talento, artista, deportista, beca). El resto está en «Condiciones de ingreso». |
| Estrato | Texto |  |  | `Estrato` |  |
| Origen | Texto |  |  | `Origen` |  |
| Departamento de origen | Texto |  |  | `DepartamentoOrigen` |  |
| Municipio de origen | Texto |  |  | `MunicipioOrigen` |  |
| Colegio | Texto |  |  | `Colegio` |  |
| Tipo de colegio | Texto |  |  | `TipoColegio` |  |
| Departamento del colegio | Texto |  |  | `DepartamentoColegio` |  |
| Municipio del colegio | Texto |  |  | `MunicipioColegio` |  |
| Fecha de corte | Fecha |  |  | `FechaCorte` |  |

## Condiciones de ingreso

Cupos especiales que revelan datos sensibles (pertenencia étnica, víctima del conflicto, discapacidad, jefatura de hogar). Solo Administración, salvo que Jurídica autorice a otra unidad.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Código | Texto | Sí | Sí | `Codigo` |  |
| Estudiante | Texto |  |  | `Estudiante` |  |
| Condición | Texto |  |  | `Condicion` |  |
| Periodo | Texto |  |  | `Periodo` |  |
| Fuente | Texto |  |  | `Fuente` |  |

## Deportes

Deportistas por disciplina (con ASCUN y nivel), representación en eventos, préstamo de implementos y actividades.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Código | Texto | Sí | Sí | `Codigo` |  |
| Estudiante | Texto |  |  | `Estudiante` |  |
| Tipo de registro | Texto | Sí |  | `TipoRegistro` | Deportista inscrito · Representación en evento · Préstamo de implementos · Actividad física musicalizada · Pausas activas |
| Disciplina o servicio | Texto |  |  | `Disciplina` | Catálogo de Deportes |
| ASCUN | Texto |  |  | `ASCUN` | Sí · No |
| Nivel | Texto |  |  | `Nivel` | Recreativo · Formativo · Selección Unimagdalena · Alto rendimiento |
| Evento o implemento | Texto |  |  | `Evento` |  |
| Fecha | Fecha |  |  | `Fecha` |  |
| Fecha de devolución | Fecha |  |  | `FechaDevolucion` |  |
| Periodo | Texto |  |  | `Periodo` |  |
| Estado | Texto |  |  | `Estado` | Activo · Inactivo · Prestado · Devuelto |
| Observación | Texto largo |  |  | `Observacion` |  |
| Registrado por | Texto |  |  | `RegistradoPor` |  |

## Cultura

Integrantes de talleres permanentes y grupos representativos, y participación en presentaciones.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Código | Texto | Sí | Sí | `Codigo` |  |
| Estudiante | Texto |  |  | `Estudiante` |  |
| Tipo de registro | Texto | Sí |  | `TipoRegistro` | Integrante de taller · Grupo representativo · Presentación o evento |
| Taller o grupo | Texto |  |  | `TallerGrupo` | Catálogo de Cultura |
| Rol | Texto |  |  | `Rol` | Integrante · Monitor o monitora · Solista |
| Evento | Texto |  |  | `Evento` |  |
| Fecha | Fecha |  |  | `Fecha` |  |
| Periodo | Texto |  |  | `Periodo` |  |
| Estado | Texto |  |  | `Estado` | Activo · Inactivo |
| Observación | Texto largo |  |  | `Observacion` |  |
| Registrado por | Texto |  |  | `RegistradoPor` |  |

## Beneficios

Programas de Desarrollo Humano visibles para la red: almuerzos y refrigerios, alojamiento, becas, PIC y reconocimientos. El Fondo de calamidad no va aquí: es reservado de Trabajo Social.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Código | Texto | Sí | Sí | `Codigo` |  |
| Estudiante | Texto |  |  | `Estudiante` |  |
| Programa | Texto | Sí |  | `Programa` | Catálogo de Programas de Desarrollo Humano |
| Detalle | Texto |  |  | `Detalle` |  |
| Periodo | Texto |  |  | `Periodo` |  |
| Fecha de inicio | Fecha |  |  | `FechaInicio` |  |
| Fecha de fin | Fecha |  |  | `FechaFin` |  |
| Estado | Texto |  |  | `Estado` | Activo · Suspendido · Finalizado |
| Observación | Texto largo |  |  | `Observacion` |  |
| Registrado por | Texto |  |  | `RegistradoPor` |  |

## Accesos

Quién pertenece a qué unidad. La app lo usa para mostrar pestañas y botones. El permiso real lo dan los grupos de SharePoint: si esta lista y los grupos no coinciden, la app muestra menos, nunca más.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Correo | Texto | Sí | Sí | `Correo` | Correo institucional en minúsculas. |
| Nombre | Texto |  |  | `Nombre` |  |
| Unidad | Texto | Sí |  | `Unidad` | Código de la unidad (DEP, GAV, SAL…) o ADM para las dos personas administradoras. |
| Rol | Texto |  |  | `Rol` | Coordinación · Profesional · Apoyo |
| Activo | Texto |  |  | `Activo` | Sí · No |

## Catálogo de servicios

Áreas, programas, estrategias, talleres, disciplinas y servicios. La app llena sus listas desplegables desde aquí.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Unidad | Texto | Sí | Sí | `Unidad` |  |
| Área | Texto |  |  | `Area` |  |
| Grupo | Texto |  |  | `Grupo` |  |
| Servicio | Texto | Sí |  | `Servicio` |  |
| Nivel | Texto |  |  | `Nivel` |  |
| Activo | Texto |  |  | `Activo` | Sí · No |
| Orden | Número |  |  | `Orden` |  |

## Seguimiento … (una por unidad reservada)

Plantilla común de las listas reservadas («Seguimiento …»), una por unidad. La unidad ve y edita todo lo de su lista; el resto del personal solo puede crear remisiones y ver las que creó; nadie borra.

| Columna | Tipo | Obligatoria | Indexada | Nombre interno | Valores |
|---|---|---|---|---|---|
| Código | Texto | Sí | Sí | `Codigo` |  |
| Estudiante | Texto |  |  | `Estudiante` |  |
| Fecha | Fecha | Sí | Sí | `Fecha` |  |
| Tipo de registro | Texto | Sí |  | `TipoRegistro` | Atención · Seguimiento · Actividad grupal · Solicitud del estudiante · Remisión recibida · Cierre |
| Servicio | Texto |  |  | `Servicio` |  |
| Modalidad | Texto |  |  | `Modalidad` | Presencial · Virtual · Telefónica · Visita · Grupal |
| Motivo | Texto |  |  | `Motivo` | Académico · Adaptación a la vida universitaria · Socioeconómico · Emocional o psicológico · Salud física · Convivencia o relaciones · Familiar · Violencias o acoso · Consumo de sustancias · Discapacidad o accesibilidad · Orientación vocacional · Otro |
| Resumen | Texto largo |  |  | `Resumen` | Qué se hizo y qué sigue. Sin diagnósticos, medicamentos ni detalles íntimos. |
| Próxima acción | Texto |  |  | `ProximaAccion` |  |
| Fecha próxima acción | Fecha |  |  | `FechaProximaAccion` |  |
| Estado | Texto |  | Sí | `Estado` | Pendiente · En curso · Cerrado · Anulado |
| Prioridad | Texto |  |  | `Prioridad` | Normal · Alta · Urgente |
| Origen | Texto |  |  | `Origen` | Iniciativa de la unidad · Formulario del estudiante · Remisión de otra unidad · Alerta académica |
| Remitido por | Texto |  |  | `RemitidoPor` | Unidad y persona que remite, cuando aplica. |
| Menor de edad | Texto |  |  | `MenorEdad` | Sí · No |
| Autorización de datos | Texto |  |  | `Autorizacion` | Autorizada por el titular · Autorizada por el representante legal · Pendiente · No autoriza datos sensibles |
| Registrado por | Texto |  |  | `RegistradoPor` | Nombre de quien registra (la app lo llena). La huella oficial es «Creado por» y el historial de versiones. |
| Correo de quien registra | Texto |  |  | `CorreoRegistro` |  |
| Motivo de anulación | Texto |  |  | `MotivoAnulacion` |  |
| Asignado a | Texto |  |  | `AsignadoA` | Correo del profesional que toma la solicitud o remisión. |
| Id de solicitud | Texto |  |  | `IdSolicitud` | Número de respuesta del formulario de Forms, para rastrear la solicitud. |

## Listas de seguimiento por unidad

| Unidad | Código | Lista | Grupo | Servicios del catálogo |
|---|---|---|---|---|
| Desarrollo Estudiantil · académico | DEA | Seguimiento Desarrollo Estudiantil | AE DE Académico | Seguimiento académico · Alerta académica · Orientación académica · Tutoría o monitoría · Permanencia y graduación |
| Desarrollo Estudiantil · psicología | DPS | Seguimiento Psicología DE | AE DE Psicología | Acompañamiento psicológico · Orientación vocacional · Taller grupal |
| Programa de Atención Psicológica | PSI | Seguimiento Psicología | AE Psicología | Atención psicológica individual · Atención en crisis · Intervención grupal |
| Salud | SAL | Seguimiento Salud | AE Salud | Atención médica en eventos · Enfermería · Fisioterapia · Fonoaudiología · Medicina · Medicina del deporte · Odontología · Orientación en nutrición y dietética · Psiquiatría · Terapia ocupacional |
| GAV · violencia sexual y VBG | GAV | Seguimiento GAV | AE GAV | Atención de violencia sexual y VBG |
| Centro de Escucha | CES | Seguimiento Centro de Escucha | AE Centro de Escucha | Centro de Escucha |
| Trabajo Social | TSO | Seguimiento Trabajo Social | AE Trabajo Social | Trabajo social · Fondo de calamidad |
| Estrategia Enlaces | ENL | Seguimiento Enlaces | AE Enlaces | Estrategia Enlaces |
| Prevención del riesgo psicosocial | PRP | Seguimiento Riesgo Psicosocial | AE Riesgo Psicosocial | Prevención del riesgo psicosocial |
| Prevención para la salud | PRS | Seguimiento Prevención Salud | AE Prevención Salud | Prevención para la salud |
| Orientaciones y asesorías espirituales | ORE | Seguimiento Orientación Espiritual | AE Orientación Espiritual | Orientaciones y asesorías espirituales |
| Centro de Atención Integral a la Infancia | CAI | Seguimiento Infancia CAI | AE Infancia CAI | Centro de Atención Integral a la Infancia |
| Sala Amiga de la Familia Lactante | SAF | Seguimiento Sala Amiga | AE Sala Amiga | Sala Amiga de la Familia Lactante |
| IPS FUNPRONIMA | IPS | Seguimiento IPS FUNPRONIMA | AE IPS FUNPRONIMA | IPS FUNPRONIMA |

## Unidades que editan listas visibles

| Unidad | Código | Lista | Grupo |
|---|---|---|---|
| Deportes | DEP | Deportes | AE Deportes |
| Cultura | CUL | Cultura | AE Cultura |
| Programas de Desarrollo Humano | PDH | Beneficios | AE Programas DH |

## Niveles de permiso personalizados

| Nivel | Se crea a partir de | Quita | Agrega | Uso |
|---|---|---|---|---|
| AE Colaborar sin eliminar | Colaborar (Contribute) | Eliminar elementos, Eliminar versiones | — | Unidades que editan una lista visible (Deportes, Cultura, Beneficios). |
| AE Gestionar unidad | Colaborar (Contribute) | Eliminar elementos, Eliminar versiones | Invalidar comportamiento de lista | La unidad dueña de una lista «Seguimiento …»: ve y edita todo, no borra. |
| AE Consultar unidad | Leer (Read) | — | Invalidar comportamiento de lista | Lectura completa de otra lista reservada, cuando la matriz lo permite (psicología de Desarrollo Estudiantil sobre el seguimiento académico). |
| AE Remitir | ninguna | — | Ver elementos, Agregar elementos, Ver páginas de aplicación, Abrir, Ver páginas, Usar interfaces remotas | Todo el personal sobre cada lista reservada: puede crear una remisión y ver solo las que creó. |
