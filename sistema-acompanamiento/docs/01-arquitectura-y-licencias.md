# Arquitectura y licencias

## Decisión: dos caminos, empezando con lo que ya hay

La licencia que reportó Bienestar es «Pro Plus». Ese nombre corresponde a las aplicaciones de escritorio de Office. El plan de la universidad que trae SharePoint, Forms, Power Apps y Power Automate (por ejemplo Office 365 A1 Plus, A3 o A5) incluye Power Apps y Power Automate solo con conectores estándar. Por eso el sistema tiene dos caminos con el mismo modelo de unidades y permisos (`microsoft365/modelo.json`):

| | Camino A: Microsoft 365 (ahora) | Camino B: Dataverse (si se compran licencias) |
|---|---|---|
| Datos | Listas de SharePoint: una por unidad reservada, más las listas compartidas | Tablas de Dataverse (`dataverse/esquema.json`) |
| App | Power Apps de lienzo (`microsoft365/app`) | App basada en modelo con línea de tiempo |
| Licencias | Las de Microsoft 365 de la universidad | Power Apps Premium para quien registra o consulta |
| Separación entre unidades | Permisos por lista y permisos de nivel de elemento para las remisiones | Unidades de negocio, equipos y perfiles de seguridad de columna |
| Auditoría | Historial de versiones; Auditoría de Purview si el plan la incluye | Auditoría de Dataverse con registro de lecturas |
| Guía | `05-guia-microsoft365.md` | Este documento y `04-plan-de-implementacion.md` |

Por qué el camino A sí sirve, aunque antes se descartaron las listas:
- **Volumen.** La búsqueda usa columnas indexadas y consultas delegables, así que funciona con 20.000 estudiantes y más de 100.000 registros sin pasar el umbral de 5.000 elementos.
- **Permisos.** No se usan permisos únicos por elemento. Cada unidad tiene su propia lista con permisos propios, y las remisiones usan la opción de lista «leer y editar solo lo propio», que no crea permisos por elemento.
- **Seguridad por columna.** No hace falta: los datos sensibles están en listas aparte («Condiciones de ingreso» y las listas reservadas), no en columnas de una lista compartida.

Lo que el camino A no da, y el B sí, es un registro de quién **leyó** cada registro, salvo que el plan incluya Auditoría de Purview. Si Jurídica lo exige para GAV o Psicología, ese es el argumento para el camino B en esas unidades.

| Opción evaluada | ¿Sirve? | Por qué |
|---|---|---|
| Solo Teams, con una lista compartida para todo | No | Una sola lista no separa lo que ve cada unidad y no hay seguridad por columna. |
| Power Apps con Dataverse for Teams | No | Microsoft documenta que no tiene auditoría, seguridad por columna ni varias unidades de negocio. El tope es de 2 GB por equipo. |
| **Camino A: SharePoint con una lista por unidad, Power Apps de lienzo y Power Automate** | **Sí, ahora** | Cabe en las licencias actuales y separa el acceso por unidad desde SharePoint. |
| **Camino B: Power Apps con Dataverse completo, en Teams** | **Sí, cuando haya licencias** | Controles más finos y auditoría de lecturas. |

## Componentes del camino B (Dataverse)

| Componente | Función |
|---|---|
| Microsoft Teams | Puerta de entrada: equipo «Bienestar y Acompañamiento» con canales por área, pestaña de la app y pestaña de Power BI. |
| Power Apps (app basada en modelo) | Ficha del estudiante con pestañas, vistas, búsqueda, línea de tiempo, formularios de atención, casos con etapas y remisiones. |
| Dataverse | Datos, seguridad (roles, equipos, unidades de negocio, perfiles de columna), auditoría y claves alternas para las cargas. |
| Power Automate | Remisiones con aviso en Teams, alertas tempranas después de cada carga, recordatorios de próximas acciones y campos derivados. |
| Flujos de datos de Power Query | Carga programada desde el Excel en OneDrive o SharePoint, o desde el sistema académico, con actualización por clave (código y período). |
| Power BI | Tableros agregados con seguridad por filas, sin datos clínicos. |
| Microsoft Entra ID | Cuentas institucionales, grupos de seguridad por área (ligados a equipos de Dataverse), MFA y acceso condicional. |
| Microsoft Purview | Registro de actividad de Dataverse (incluidas lecturas) para auditoría de cumplimiento, si el licenciamiento lo permite. |

## Entornos del camino B

| Entorno | Tipo | Datos | Uso |
|---|---|---|---|
| Desarrollo | Developer (gratuito, Plan para desarrolladores) o Sandbox | Solo ficticios | Construcción. Único entorno donde Claude puede conectarse mediante el conector de Dataverse. |
| Pruebas | Sandbox | Ficticios o anonimizados | Pruebas de aceptación con cada rol. |
| Producción | Production, entorno administrado | Reales | Solo recibe soluciones administradas por canalizaciones. Sin agentes de IA conectados. |

## Licencias del camino B que debe confirmar TI

Estos puntos se verifican en el Centro de administración de Microsoft 365 (Facturación > Licencias) y en el Centro de administración de Power Platform (Licencias > Complementos de capacidad). Los precios para educación se confirman con el partner de Microsoft.

1. **Plan de Microsoft 365 de la universidad (A1, A3 o A5).** A3 y A5 incluyen Power Apps y Power Automate «para Microsoft 365». Ese derecho solo cubre conectores estándar (SharePoint, Excel, Teams) y **no** cubre Dataverse completo.
2. **Power Apps Premium** (existe versión para educación) para cada profesional o coordinador que use la app. Alternativa: pago por uso con una suscripción de Azure. Los estudiantes no necesitan licencia porque son registros, no usuarios.
3. **Entornos administrados.** Al activarlos, cada usuario activo del entorno necesita una licencia premium. Microsoft muestra avisos dentro de la app a quien no la tenga.
4. **Capacidad de Dataverse.** La capacidad base del inquilino aumenta con cada licencia Premium (unos 250 MB de base de datos por licencia según la guía de licencias). El uso estimado es menor a 2 GB de base de datos por año. Los entornos de desarrollador no consumen capacidad.
5. **Power BI Pro** para quien crea o consume informes. A5 lo incluye para personal docente y administrativo; con A3 se compra aparte. Otra opción es una capacidad de Fabric.
6. **Prototipo sin costo.** El Plan para desarrolladores de Power Apps es gratuito para construir y probar, sin uso en producción. Permite hasta tres entornos por persona, que se eliminan tras 90 días sin uso.

## Cómo puede trabajar Claude con la cuenta institucional

Desde una sesión en la nube, Claude no puede entrar al Microsoft 365 de la universidad. Hay dos formas de dárselo:

1. **Usar tu computador.** Instala la app de escritorio de Claude, inicia sesión y activa el uso del computador (*Settings > This computer > Computer use*). En claude.ai, antes de enviar el mensaje, elige tu computador en el botón **+** > **Dispositivos**. Así Claude trabaja en el navegador de tu equipo, donde ya iniciaste sesión con tu cuenta de la universidad, y tú apruebas cada aplicación. Sirve para el camino A: crear el sitio, las listas, los permisos y la app. En ese modo se trabaja con datos ficticios hasta que el diseño esté aprobado.
2. **Conector de Dataverse (camino B).** Solo sirve en un entorno de desarrollo de Dataverse, con los pasos de abajo.

### Conector de Dataverse para el camino B

Existe un conector oficial «Microsoft Dataverse» para Claude que usa el servidor MCP de Dataverse. Para habilitarlo:

1. Un administrador de Power Platform activa **Entorno administrado** en el entorno de desarrollo.
2. En *Configuración > Producto > Características* activa **Protocolo de contexto de modelo (MCP) de Dataverse**.
3. En *Configuración avanzada* habilita el cliente correspondiente (lista de clientes MCP permitidos).
4. Un administrador global del inquilino otorga, una sola vez, el consentimiento de la aplicación.
5. La persona usuaria conecta «Microsoft Dataverse» en claude.ai (Personalizar > Conectores) con su cuenta institucional y abre una sesión nueva.

Notas: Microsoft marca esta función como versión preliminar, no recomendada para producción. El uso desde clientes que no son Copilot Studio puede consumir créditos de Copilot, lo que se confirma con el licenciamiento. Se usa solo en desarrollo y con datos ficticios.

## Fuentes

- [Comparación entre Dataverse for Teams y Dataverse](https://learn.microsoft.com/en-us/power-apps/teams/data-platform-compare)
- [Licenciamiento de entornos administrados](https://learn.microsoft.com/en-us/power-platform/admin/managed-environment-licensing)
- [Capacidad de almacenamiento de Dataverse](https://learn.microsoft.com/en-us/power-platform/admin/capacity-storage)
- [Plan para desarrolladores de Power Apps](https://www.microsoft.com/en/power-platform/products/power-apps/free)
- [Configurar el servidor MCP de Dataverse en un entorno](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-mcp-disable)
- [Conectar clientes MCP que no son de Microsoft](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-mcp-other-clients)
- [Incrustar una app basada en modelo en Teams](https://learn.microsoft.com/en-us/powerapps/teams/embed-model-driven-teams-personal)
- [Crear una lista a partir de una hoja de cálculo (Microsoft Lists)](https://support.microsoft.com/en-us/topic/380cfeb5-6e14-438e-988a-c2b9bea574fa)
- [Límites al importar a Listas desde Excel (Collab365)](https://go.collab365.com/microsoft-list-import-help)
- [Exportar una tabla de Excel a SharePoint](https://support.microsoft.com/es-ES/Excel/export-an-excel-table-to-sharepoint)
- [Plan de lanzamiento: apps de lienzo como archivos YAML legibles](https://learn.microsoft.com/en-us/power-platform/release-plan/2024wave1/power-apps/save-canvas-applications-as-human-readable-yaml-files)
- [Esquema oficial de pa.yaml (PowerApps-Tooling)](https://github.com/microsoft/PowerApps-Tooling/blob/master/schemas/pa-yaml/v3.0/pa.schema.yaml)
- [Ver y pegar código en Power Apps Studio (Pragmatic Works)](https://pragmaticworks.com/blog/power-apps-canvas-code-editor-everything-you-need-to-know)
- [Documentación de PnP PowerShell](https://github.com/pnp/powershell/tree/dev/documentation)
