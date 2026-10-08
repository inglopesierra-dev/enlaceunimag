# Plan de implementación

Cada fase termina con algo que se puede usar o revisar. Las fechas dependen de las aprobaciones de TI y Jurídica. El plan sigue el camino A (Microsoft 365 con las licencias actuales). El camino B (Dataverse) queda como etapa posterior si se compran licencias Premium.

## Fase 0. Aprobaciones (semana 1)

| Tarea | Responsable | Resultado |
|---|---|---|
| Confirmar plan de Microsoft 365, acceso a Power Apps y Power Automate y creación del sitio (paso 0 de `05-guia-microsoft365.md`) | Administración del sistema y TI | Sitio «Acompañamiento Estudiantil» creado |
| Validar finalidades, autorizaciones y tratamiento de menores (`07-proteccion-de-datos-y-menores.md`) | Jurídica y oficial de protección de datos | Concepto y textos de autorización aprobados |
| Confirmar el catálogo de unidades y servicios (`microsoft365/modelo.json`), en especial qué es PIC y si IPS FUNPRONIMA registrará atenciones | Coordinaciones de Bienestar y Desarrollo Estudiantil | Catálogo final |
| Definir quién va en cada grupo | Administración del sistema | Lista de personas por unidad |

## Fase 1. Sitio, listas y permisos (semana 2)

1. Listas, columnas, índices, grupos y niveles de permiso: con el script de TI (`provisionar-sitio.ps1`) o a mano (paso 2B de la guía).
2. Pruebas de permisos con cuentas de prueba, usando la lista de `03-seguridad-y-privacidad.md`.
3. Carga de Estudiantes (18.185) y de Condiciones de ingreso (615) con los archivos privados.

## Fase 2. App y formulario (semana 3)

1. Crear la app y pegar las pantallas (paso 5 de la guía).
2. Conectar el formulario de Forms con el flujo (`06-solicitudes-forms-y-flujos.md`).
3. Publicar la app en Teams.

## Fase 3. Piloto (semanas 4 a 7)

- Dos unidades: Deportes (visible) y Desarrollo Estudiantil · académico (reservada).
- Capacitación de 60 minutos por unidad y firma del acuerdo de confidencialidad.
- Al final: encuesta de uso y ajustes del catálogo y de los campos.

## Fase 4. Todas las unidades (semanas 8 a 12)

- Se suman Salud, Psicología, Trabajo Social, Centro de Escucha y Enlaces. GAV entra cuando su protocolo esté alineado con la Resolución 020310 de 2026.
- Revisión de accesos al cerrar la fase.

## Fase 5. Tableros y mejora continua

- Tablero con números agregados (atenciones por unidad, solicitudes pendientes, tiempos de respuesta, beneficiarios), sin datos reservados:
  - con licencias Power BI Pro, en Power BI;
  - sin ellas, con vistas agrupadas de las listas y gráficos de Excel conectados a SharePoint.
- Revisión trimestral de accesos.
- Actualización de la base de estudiantes en cada corte de matrícula.
- Si Jurídica exige registro de lecturas para GAV o Psicología, evaluar el camino B solo para esas unidades.

## Criterios de aceptación

- [ ] Buscar un estudiante por código, documento o apellido y abrir su ficha en menos de 3 segundos.
- [ ] La ficha muestra datos básicos, estrato, beneficios, deporte y cultura a todo el personal, y los seguimientos solo a su unidad y a Administración.
- [ ] Registrar un seguimiento deja autor, fecha y hora sin que el profesional los escriba.
- [ ] Una solicitud del formulario llega a la bandeja de la unidad correcta en menos de 5 minutos.
- [ ] Una remisión llega a la bandeja de la unidad destino y quien la hizo solo ve su estado.
- [ ] Nadie fuera de Administración puede eliminar; las anulaciones guardan el motivo.
- [ ] La carga de 18.185 estudiantes termina sin códigos repetidos.
