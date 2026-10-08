# Plan de implementación

Cada fase termina con algo que se puede usar o revisar. Las fechas dependen de las aprobaciones de TI y Jurídica.

## Fase 0. Aprobaciones y entornos

| Tarea | Responsable | Resultado |
|---|---|---|
| Confirmar plan de Microsoft 365 y licencias Power Apps Premium y Power BI Pro (ver `01-arquitectura-y-licencias.md`) | TI y partner de Microsoft | Licencias asignadas a los usuarios del piloto |
| Crear entornos de desarrollo, pruebas y producción con Dataverse | Administrador de Power Platform | Tres entornos con su grupo de seguridad de Entra ID |
| Activar entorno administrado, directiva DLP y auditoría | Administrador de Power Platform | Entornos protegidos desde el inicio |
| Validar el tratamiento de datos sensibles y los formatos de consentimiento | Jurídica y oficial de protección de datos | Concepto escrito y formatos aprobados |
| Definir las áreas, los servicios y quién lidera cada uno | Coordinación de Bienestar y Desarrollo Estudiantil | Catálogo final de áreas y servicios |
| Opcional: habilitar el conector de Dataverse para Claude en desarrollo | Administrador de Power Platform y administrador global | Claude puede crear tablas y cargar datos ficticios |

## Fase 1. Datos y seguridad en desarrollo

1. Crear la solución «Acompañamiento estudiantil» con el editor de la universidad (prefijo `unimag`).
2. Crear las 15 tablas de `dataverse/esquema.json`. Esto puede hacerlo Claude con el conector, o un creador en make.powerapps.com con el diccionario `02-modelo-de-datos.md`.
3. Habilitar la tabla Estudiante para actividades y crear Atención como tabla de actividad.
4. Crear claves alternas: código del estudiante y clave período|código en Matrícula.
5. Crear unidades de negocio, equipos por área ligados a grupos de Entra ID, roles y perfiles de seguridad de columna (ver `03-seguridad-y-privacidad.md`).
6. Cargar datos ficticios con `dataverse/generar_datos_ficticios.py`, importando en este orden: facultades → programas → períodos → áreas → servicios → estudiantes → matrículas → consentimientos → atenciones → casos → remisiones → beneficios → alertas.
7. Probar cada rol con usuarios de prueba.

## Fase 2. App, flujos y piloto

**App basada en modelo «Acompañamiento estudiantil»:**
- Formulario del estudiante con pestañas: Resumen (datos básicos, procedencia, datos sensibles protegidos, alertas, casos abiertos) · Atenciones (línea de tiempo filtrable por área) · Casos y remisiones · Beneficios · Académico (matrícula por período) · Trazabilidad (historial de auditoría, solo para Coordinación y Auditoría).
- Formulario rápido «Registrar atención» con huella automática del profesional.
- Vistas: estudiantes con alerta, mis remisiones pendientes, próximas acciones vencidas, casos abiertos por área.
- Flujo de proceso de negocio «Ruta de acompañamiento» en Caso: Detección → Valoración → Plan → Seguimiento → Cierre.
- Publicación como pestaña en el equipo de Teams «Bienestar y Acompañamiento».

**Flujos de Power Automate:**

| Flujo | Disparador | Acción |
|---|---|---|
| Remisión nueva | Se crea una remisión | Asigna la remisión al equipo del área destino y publica una tarjeta en su canal de Teams |
| Remisión respondida | Cambia el estado | Avisa al área que remitió |
| Alertas tempranas | Termina la carga de matrícula | Crea alertas por promedio menor a 3,0, sin matrícula o cancelación, y las asigna a Tutorías y permanencia |
| Próximas acciones | Todos los días a las 7:00 | Envía por chat de Teams a cada profesional sus acciones vencidas |
| Documento parcial | Se crea o actualiza un estudiante | Calcula los últimos 4 dígitos del documento |
| Última atención de Bienestar | Se crea una atención de Bienestar | Actualiza la fecha en la ficha (para docentes) |

**Piloto:** dos áreas (sugerido: Tutorías y permanencia y Trabajo social) durante cuatro semanas, con encuesta de uso al final.

## Fase 3. Producción

1. Exportar la solución como **administrada** y desplegarla con canalizaciones de Power Platform (desarrollo → pruebas → producción).
2. Carga real inicial con un flujo de datos desde el Excel corregido «Cómo está mi facultad». Se aplican las mismas reglas de limpieza (espacios, fechas, códigos como texto) y la actualización por clave.
3. Programar la carga en cada corte de matrícula. Si hay acceso al sistema académico, reemplazar el Excel por una conexión directa.
4. Capacitación por rol (90 minutos) y firma del acuerdo de confidencialidad.
5. Revisar permisos con la matriz antes de abrir a todas las áreas.

## Fase 4. Tableros y mejora continua

- Informe de Power BI: atenciones por área, servicio y mes; cobertura por facultad y programa; casos por etapa y tiempo de cierre; tiempo de respuesta de remisiones; alertas atendidas; beneficios por período. Sin tablas clínicas y con seguridad por filas.
- Revisión trimestral de accesos y de la auditoría con el oficial de protección de datos.
- Posible segunda etapa: portal para que el estudiante solicite citas (Power Pages, con licencia aparte).

## Criterios de aceptación

- [ ] Buscar un estudiante por código, documento o nombre y abrir su ficha en una pestaña propia, en menos de 3 segundos.
- [ ] Ver en una sola línea de tiempo las atenciones de todas las áreas, filtrables por área.
- [ ] Registrar una atención deja autor, fecha y hora sin que el profesional los escriba.
- [ ] Una remisión llega al canal de Teams del área destino en menos de 5 minutos.
- [ ] Cada rol ve exactamente lo que dice la matriz de `03-seguridad-y-privacidad.md`.
- [ ] La carga de una base de 20.000 estudiantes termina sin duplicados de clave.
