# Arquitectura y licencias

## Decisión: Power Apps sobre Dataverse, publicado en Teams

El sistema guarda seguimientos de varias áreas, incluidas notas psicológicas y de salud. Esto exige cuatro cosas: separar el contenido clínico del resto, controlar quién ve cada columna, auditar quién hizo qué y responder rápido con más de 100.000 registros.

| Opción | ¿Sirve? | Por qué |
|---|---|---|
| Solo Teams con Listas o SharePoint | No | Las listas se degradan pasados 5.000 elementos por vista y los permisos por elemento no escalan a 20.000 estudiantes. No hay seguridad por columna para datos clínicos. |
| Power Apps con Dataverse for Teams | No | Microsoft documenta que no tiene auditoría, ni seguridad por columna, ni varias unidades de negocio, y que no admite apps basadas en modelo. El tope es de 2 GB por equipo. |
| **Power Apps (app basada en modelo) con Dataverse completo, publicada como pestaña de Teams** | **Sí** | Ofrece roles y equipos por área, perfiles de seguridad de columna, auditoría y registro de accesos, búsqueda en Dataverse, una línea de tiempo por estudiante y flujos de proceso. Se usa dentro de Teams, como en el ejemplo. |

## Componentes

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

## Entornos

| Entorno | Tipo | Datos | Uso |
|---|---|---|---|
| Desarrollo | Developer (gratuito, Plan para desarrolladores) o Sandbox | Solo ficticios | Construcción. Único entorno donde Claude puede conectarse mediante el conector de Dataverse. |
| Pruebas | Sandbox | Ficticios o anonimizados | Pruebas de aceptación con cada rol. |
| Producción | Production, entorno administrado | Reales | Solo recibe soluciones administradas por canalizaciones. Sin agentes de IA conectados. |

## Licencias que debe confirmar TI

Estos puntos se verifican en el Centro de administración de Microsoft 365 (Facturación > Licencias) y en el Centro de administración de Power Platform (Licencias > Complementos de capacidad). Los precios para educación se confirman con el partner de Microsoft.

1. **Plan de Microsoft 365 de la universidad (A1, A3 o A5).** A3 y A5 incluyen Power Apps y Power Automate «para Microsoft 365». Ese derecho solo cubre conectores estándar (SharePoint, Excel, Teams) y **no** cubre Dataverse completo.
2. **Power Apps Premium** (existe versión para educación) para cada profesional o coordinador que use la app. Alternativa: pago por uso con una suscripción de Azure. Los estudiantes no necesitan licencia porque son registros, no usuarios.
3. **Entornos administrados.** Al activarlos, cada usuario activo del entorno necesita una licencia premium. Microsoft muestra avisos dentro de la app a quien no la tenga.
4. **Capacidad de Dataverse.** La capacidad base del inquilino aumenta con cada licencia Premium (unos 250 MB de base de datos por licencia según la guía de licencias). El uso estimado es menor a 2 GB de base de datos por año. Los entornos de desarrollador no consumen capacidad.
5. **Power BI Pro** para quien crea o consume informes. A5 lo incluye para personal docente y administrativo; con A3 se compra aparte. Otra opción es una capacidad de Fabric.
6. **Prototipo sin costo.** El Plan para desarrolladores de Power Apps es gratuito para construir y probar, sin uso en producción. Permite hasta tres entornos por persona, que se eliminan tras 90 días sin uso.

## Cómo puede trabajar Claude dentro del entorno de desarrollo

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
