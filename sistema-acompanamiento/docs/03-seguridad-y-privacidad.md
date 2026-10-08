# Seguridad y privacidad

## Principios

1. **Mínimo necesario.** Cada persona ve solo lo que necesita para acompañar al estudiante. Lo «visible para la red» es poco y está definido.
2. **Cada unidad, su propio espacio.** Los seguimientos de cada unidad viven en su propia lista, con sus propios permisos. Un error de configuración en una no expone las otras.
3. **Lo clínico no entra.** La historia clínica sigue en el sistema de Salud y de Psicología. Aquí queda la constancia de la atención, el plan sin datos clínicos y las remisiones.
4. **Huella permanente.** Nadie, salvo Administración, puede eliminar. Una atención equivocada se anula con motivo. SharePoint guarda quién creó y quién cambió cada registro, con su historial de versiones.
5. **Acceso por grupo, no por persona.** Cuando alguien deja su cargo, sale de su grupo y pierde el acceso.
6. **Solo dos personas lo ven todo.** Son las propietarias del sitio (AE Administradores).

## Matriz de acceso

| Dato o acción | Administración (2) | Deportes, Cultura, Programas DH | Unidad reservada (p. ej. GAV, Salud, Desarrollo Estudiantil) | Personal sin unidad |
|---|---|---|---|---|
| Datos básicos, procedencia, programa, promedio y matrícula | Sí | Sí | Sí | Sí |
| Estrato | Sí | Sí | Sí | Sí |
| Beneficios: almuerzos y refrigerios, alojamiento, becas, PIC y reconocimientos | Sí | Ven todo; Programas DH edita | Sí | Sí |
| Deportes (deportista, disciplina, ASCUN, nivel) y Cultura (talleres, grupos) | Sí | Ven todo; cada una edita la suya | Sí | Sí |
| Cupo especial sensible: pertenencia étnica, víctima, discapacidad, jefatura de hogar | Sí (en SharePoint) | No | No | No |
| Seguimientos y atenciones de una unidad reservada | Sí | No | Solo los de su unidad | No |
| Remitir a una unidad reservada | Sí | Sí, y ven solo sus remisiones | Sí, y ven solo sus remisiones a otras unidades | Sí, y ven solo sus remisiones |
| Historia clínica | No está en el sistema | No | No | No |
| Eliminar registros | Sí, con justificación | No | No | No |
| Anular con motivo | Sí | No aplica | Sí, en su lista | No |
| Gestionar grupos y la lista Accesos | Sí | No | No | No |

Ejemplo pedido por Bienestar: la coordinación de Deportes puede agregar y editar en la lista Deportes y ve si el estudiante está en almuerzos y refrigerios y su estrato. No ve seguimientos, atenciones psicológicas ni médicas, ni problemas de salud.

Casos especiales:
- **Desarrollo Estudiantil · psicología** registra en su propia lista y además consulta el seguimiento académico de Desarrollo Estudiantil. Nadie más ve sus registros.
- **GAV** es la lista más cerrada. Quien remite un caso solo ve si la remisión fue tomada.
- **Infancia (CAI)** registra la atención a la madre o el padre estudiante, no datos de los niños.

## Cómo se implementa en Microsoft 365 (camino A)

| Control | Dónde |
|---|---|
| Sitio de comunicación sin grupo de Microsoft 365; propietarias solo las dos personas administradoras | Paso 1 de `05-guia-microsoft365.md` |
| Grupos AE Personal y uno por unidad; permisos por lista sin heredar | `listas.md` y paso 2 de la guía |
| Niveles de permiso sin «Eliminar elementos» ni «Eliminar versiones» | AE Colaborar sin eliminar, AE Gestionar unidad |
| Remisión tipo buzón: el resto del personal crea elementos en la lista de otra unidad pero solo ve los suyos | Permisos de nivel de elemento de la lista más el nivel AE Remitir. La unidad dueña tiene el permiso *Override List Behaviors*. |
| Historial de versiones (500) en todas las listas | Configuración de versiones |
| Índices en Código, Búsqueda, Documento, Fecha y Estado | Para que las consultas no pasen el umbral de 5.000 elementos |
| La app no consulta «Condiciones de ingreso» | Solo Administración la abre en SharePoint |
| La app oculta lo que no corresponde, pero el permiso real es de SharePoint | Si la lista Accesos se desalinea de los grupos, la app muestra menos, nunca más |
| Registros de auditoría | Si el plan de la universidad incluye Auditoría de Microsoft Purview, TI puede consultar quién creó, cambió o vio elementos del sitio |
| Formularios y correos sin datos sensibles | `06-solicitudes-forms-y-flujos.md` |

Límite conocido: quien puede leer una lista puede exportarla a Excel desde SharePoint. Por eso el acceso a las listas reservadas se restringe a la unidad y se firma un acuerdo de confidencialidad.

## Cómo se implementa en Dataverse (camino B)

Si la universidad adquiere licencias Power Apps Premium, el diseño de `dataverse/` ofrece controles más finos:
- unidades de negocio y equipos ligados a grupos de Entra ID;
- perfiles de seguridad de columna;
- registro de accesos de lectura y auditoría de Dataverse;
- app basada en modelo con línea de tiempo.

La matriz de acceso de arriba se mantiene: cada unidad de `microsoft365/modelo.json` corresponde a un equipo propietario y cada lista reservada a un conjunto de privilegios por rol.

## Reglas de uso

Están en `07-proteccion-de-datos-y-menores.md`, junto con el marco normativo, el tratamiento de menores y los borradores de autorización.

## Pruebas de seguridad antes de producción

- [ ] Con una cuenta de cada tipo de la matriz, abrir la misma ficha y comprobar que coincide.
- [ ] Una persona de Deportes abre en SharePoint la lista «Seguimiento GAV» y no ve ningún elemento ajeno.
- [ ] Una persona sin unidad remite a Psicología, ve su remisión y su estado, y no ve los demás registros.
- [ ] Psicología de Desarrollo Estudiantil ve el seguimiento académico. Desarrollo Estudiantil académico no ve el de psicología.
- [ ] Nadie fuera de Administración puede eliminar un elemento. La anulación deja el motivo y la versión anterior.
- [ ] Al sacar a alguien de su grupo, pierde el acceso al abrir de nuevo la app.
- [ ] «Condiciones de ingreso» solo la abren las dos personas administradoras.
- [ ] El formulario y los correos del flujo no llevan nombre, código ni motivo del estudiante.
