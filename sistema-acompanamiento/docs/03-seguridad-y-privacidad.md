# Seguridad y privacidad

## Principios

1. **Mínimo necesario.** Cada rol ve solo lo que necesita para acompañar al estudiante.
2. **Lo clínico, aparte.** Las notas de Psicología y de Salud están en tablas propias. Las demás áreas solo ven que hubo una atención, con un resumen estándar.
3. **Huella permanente.** Nadie borra registros. Una atención equivocada se anula con motivo. La auditoría guarda quién creó, cambió o consultó, y cuándo.
4. **Datos reales solo en producción.** Desarrollo y pruebas usan datos ficticios.
5. **Acceso por grupo, no por persona.** Los permisos se asignan a equipos de Dataverse ligados a grupos de Entra ID. Cuando alguien deja su cargo, TI lo saca del grupo y pierde el acceso.

## Matriz de acceso

| Dato o acción | Coordinación | Psicología | Salud | Trabajo social | Desarrollo est. | Docente consejero | Auditoría |
|---|---|---|---|---|---|---|---|
| Datos básicos del estudiante | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Documento completo | Sí | Últimos 4 | Últimos 4 | Últimos 4 | Últimos 4 | Últimos 4 | Últimos 4 |
| Datos sensibles (estrato, etnia, discapacidad, víctima) | Sí | Sí | Sí | Sí | No | No | No |
| Resumen de atenciones de Bienestar | Sí | Sí | Sí | Sí | Sí | No (solo la fecha de la última) | No |
| Resumen de atenciones de Desarrollo estudiantil | Sí | Sí | Sí | Sí | Sí | Sí | No |
| Nota psicológica | No | Sí | No | No | No | No | No |
| Nota de salud | No | No | Sí | No | No | No | No |
| Registrar atenciones | Áreas no clínicas | Psicología | Salud | T. social y apoyo socioeconómico | Monitorías y tutorías | Tutorías | No |
| Borrar | No | No | No | No | No | No | No |
| Exportar a Excel | Sí | No | No | No | No | No | No |
| Historial de auditoría | Sí | No | No | No | No | No | Sí |

## Cómo se implementa en Dataverse

- **Unidades de negocio:** raíz (catálogos, estudiantes y matrícula), Bienestar Universitario y Desarrollo Estudiantil. Cada área tiene un equipo propietario en su unidad.
- **Roles:** los define `dataverse/esquema.json` (sección `roles`). Ningún rol tiene privilegio de borrar sobre tablas operativas.
- **Docentes consejeros:** su rol se asigna en la unidad Desarrollo Estudiantil con lectura de Atención a nivel de unidad. Así ven solo las atenciones de Desarrollo. La columna «Última atención de Bienestar» les indica que existe acompañamiento sin mostrar detalles.
- **Perfiles de seguridad de columna:** Documento completo, Datos sensibles, Resumen de atenciones (excluye Auditoría), Contenido clínico de Psicología y Contenido clínico de Salud.
- **Tablas clínicas separadas:** `unimag_notapsicologica` y `unimag_notasalud`, cada una con privilegios solo para su rol. Un error de configuración en una no expone la otra.
- **Consentimiento obligatorio:** la nota clínica exige un consentimiento vigente. Un complemento de bajo código o una regla del lado del servidor impide guardarla sin él.
- **Alerta sin contenido:** el profesional clínico puede marcar «Alerta prioritaria para coordinación» en la atención. Coordinación se entera de la urgencia sin leer la nota.
- **Auditoría:** activa en el entorno y en todas las tablas, con registro de accesos en las tablas clínicas. La retención se define con Jurídica y Archivo.
- **Registro de lecturas:** se activa el registro de actividad de Dataverse en Microsoft Purview para las tablas clínicas, si el licenciamiento lo permite.
- **Directiva de datos (DLP) del entorno:** Dataverse, Teams, Outlook, Aprobaciones y Power BI quedan en el grupo «Empresarial». Se bloquean HTTP, almacenamiento personal, redes sociales y cualquier conector no aprobado.
- **Entorno administrado** con límites para compartir, verificador de soluciones obligatorio y, si aplica, firewall por IP.
- **Acceso condicional:** MFA para la app y, para los roles clínicos, solo desde dispositivos administrados.
- **Power BI:** solo tablas no clínicas, datos agregados y seguridad por filas según el área.

## Reglas de uso para profesionales

1. El resumen para la red no lleva diagnósticos, medicamentos ni detalles íntimos. Usa hechos y acuerdos: qué se hizo y qué sigue.
2. El contenido clínico va solo en la nota reservada del área.
3. Antes de la primera nota clínica se registra el consentimiento informado. En menores de edad (tarjeta de identidad) se registra además la autorización del acudiente.
4. Remitir no es compartir el caso completo. El motivo de la remisión se escribe sin datos clínicos.
5. No se toman capturas de pantalla ni se descargan fichas.

## Marco normativo a validar con Jurídica y el oficial de protección de datos

- Ley 1581 de 2012 y su reglamentación (Decreto 1074 de 2015): datos sensibles y autorización expresa.
- Ley 1090 de 2006: secreto profesional y registros del psicólogo.
- Resolución 1995 de 1999 y Resolución 839 de 2017 del Ministerio de Salud: reserva y conservación de la historia clínica.
- Ley 1098 de 2006: protección de niñas, niños y adolescentes.
- Política institucional de tratamiento de datos personales.

Si Psicología o Salud ya llevan historia clínica en un sistema propio, se recomienda dejar allí el contenido clínico. En este sistema quedarían solo la atención realizada, la alerta sin contenido y la remisión.

## Pruebas de seguridad antes de producción

- [ ] Con cada rol, abrir la misma ficha y comprobar que coincide con la matriz.
- [ ] Un usuario sin el rol de Psicología no puede abrir, buscar, exportar ni ver en Power BI una nota psicológica.
- [ ] Al intentar borrar una atención, el sistema lo impide; al anularla, quedan el motivo y la huella.
- [ ] La auditoría muestra creación, cambios y lecturas de una nota clínica de prueba.
- [ ] Al quitar a alguien de un grupo de Entra ID, pierde el acceso en la siguiente sincronización.
- [ ] La directiva DLP impide crear un flujo que envíe datos a un conector no aprobado.
