# Guía de construcción en Microsoft 365 (camino A)

Esta guía arma el sistema con lo que la universidad ya tiene: SharePoint, Listas, Forms, Power Apps y Power Automate con conectores estándar. No necesita licencias Premium ni Dataverse. Si más adelante se compran licencias Premium, el diseño de `dataverse/` sigue siendo el camino B.

Todo lo que aquí se nombra (listas, columnas, grupos, unidades y servicios) sale de `microsoft365/modelo.json`. La referencia completa está en `microsoft365/listas.md`.

## Qué vas a construir

| Pieza | Qué hace |
|---|---|
| Sitio de SharePoint «Acompañamiento Estudiantil» | Guarda los datos. Es un sitio de comunicación: no crea un grupo de Microsoft 365 ni da edición a nadie por defecto. |
| 7 listas compartidas | Estudiantes, Beneficios, Deportes, Cultura, Accesos, Catálogo de servicios y la reservada Condiciones de ingreso. |
| 14 listas «Seguimiento …» | Una por unidad con seguimiento reservado (Desarrollo Estudiantil, Psicología, Salud, GAV, Trabajo Social, Centro de Escucha, Enlaces…). Cada una con sus propios permisos. |
| Grupos de SharePoint | AE Administradores (las 2 personas con acceso total), AE Personal (todo el personal) y un grupo por unidad. |
| App de Power Apps «Acompañamiento Estudiantil» | Búsqueda, ficha del estudiante con pestañas, bandeja de la unidad, registro de seguimientos, remisiones y anulación con motivo. Se puede anclar en Teams. |
| Flujo de Power Automate | Lleva cada respuesta de tu formulario de Forms a la lista de la unidad que corresponde y avisa por Outlook. Ver `06-solicitudes-forms-y-flujos.md`. |

```
Estudiante ──► Forms ──► Power Automate ──► lista «Seguimiento <unidad>» ──► aviso en Outlook/Teams
                                                      ▲
Profesionales ──► Power Apps (ficha, bandeja, registro, remisión) ──┘
                     │
                     └──► listas visibles: Estudiantes, Beneficios, Deportes, Cultura
```

## Paso 0. Comprueba tu licencia y tus accesos (10 minutos)

«Pro Plus» suele ser el nombre de las aplicaciones de escritorio (Office 365 ProPlus, hoy Microsoft 365 Apps). El plan de la universidad que trae SharePoint, Forms, Power Apps y Power Automate suele llamarse Office 365 A1 Plus, A3 o A5. Para saber qué tienes:

1. Entra a [myaccount.microsoft.com](https://myaccount.microsoft.com) con tu cuenta institucional y abre **Suscripciones**. Anota los nombres que aparecen.
2. Entra a [make.powerapps.com](https://make.powerapps.com). Si te deja abrir **+ Crear** y elegir **Aplicación de lienzo en blanco**, tienes Power Apps con conectores estándar.
3. Entra a [make.powerautomate.com](https://make.powerautomate.com) y comprueba que puedes crear un **Flujo de nube automatizado**.
4. En SharePoint, revisa si ves **+ Crear sitio** en la página de inicio. Si no aparece, la creación de sitios está restringida y TI debe crear el sitio.

Si algo falla, pide a la mesa de ayuda de TI: «Power Apps y Power Automate para Microsoft 365 (conectores estándar) y la creación de un sitio de comunicación de SharePoint». No hace falta comprar nada para este camino.

## Elige cómo crear las listas

| | Con apoyo de TI (recomendado) | Tú sola o solo |
|---|---|---|
| Tiempo | 15 minutos más la carga | Unas 3 horas |
| Qué se usa | `microsoft365/scripts/provisionar-sitio.ps1` y `cargar-lista.ps1` (PnP PowerShell) | Las plantillas de Excel del kit y la configuración de SharePoint |
| Resultado | Idéntico al modelo, con nombres internos limpios, índices y permisos | Igual en lo que ve la gente; los nombres internos de columna quedan como los ponga SharePoint |
| Requisitos | PowerShell 7.4+, módulo PnP.PowerShell 3.x y un registro de aplicación en Entra ID con consentimiento de un administrador | Ser propietaria o propietario del sitio |

## Paso 1. Crea el sitio

En la página de inicio de SharePoint: **+ Crear sitio** > **Sitio de comunicación** > nombre **Acompañamiento Estudiantil**, idioma **Español**. La dirección debe quedar como `/sites/AcompanamientoEstudiantil`.

Luego, en **Configuración** (engranaje) > **Permisos del sitio**, deja como propietarias solo a las dos personas administradoras. No uses los grupos «Miembros» ni «Visitantes» del sitio: los permisos van por los grupos AE.

## Paso 2A. Listas y permisos con el script (TI)

1. Instalar PnP.PowerShell en PowerShell 7.4 o superior: `Install-Module PnP.PowerShell -Scope CurrentUser`.
2. Registrar una aplicación para PnP (una sola vez por universidad; necesita un administrador que dé el consentimiento):

   ```powershell
   Register-PnPEntraIDAppForInteractiveLogin -ApplicationName "PnP Acompanamiento Estudiantil" `
     -Tenant <inquilino>.onmicrosoft.com -SharePointDelegatePermissions "AllSites.FullControl" -GraphDelegatePermissions "User.Read"
   ```

   Anotar el **ClientId** que devuelve.
3. Crear listas, columnas, índices, grupos, niveles de permiso y permisos por lista:

   ```powershell
   ./provisionar-sitio.ps1 -SiteUrl https://<inquilino>.sharepoint.com/sites/AcompanamientoEstudiantil `
     -ClientId <ClientId> -Administradores persona1@unimagdalena.edu.co,persona2@unimagdalena.edu.co
   ```

   El script se puede repetir sin dañar nada: lo que ya existe lo deja igual.
4. Cargar la base de estudiantes y las condiciones reservadas con los archivos privados que te entregué (no están en el repositorio):

   ```powershell
   ./cargar-lista.ps1 -SiteUrl <url del sitio> -ClientId <ClientId> -Lista Estudiantes -Csv ./Estudiantes_carga.csv
   ./cargar-lista.ps1 -SiteUrl <url del sitio> -ClientId <ClientId> -Lista "Condiciones de ingreso" -Csv ./Condiciones_ingreso_carga.csv
   ```

   Actualiza por código: si el estudiante ya está, actualiza la fila; si no, la crea. Sirve igual para cada corte de matrícula.
5. Al terminar, quien ejecutó los scripts sale de Propietarios si no es una de las dos personas administradoras.

## Paso 2B. Listas y permisos sin script (tú)

### Listas compartidas

Para cada plantilla del kit (Estudiantes, Condiciones de ingreso, Deportes, Cultura, Beneficios, Accesos y Catálogo de servicios):

1. En el sitio: **+ Nuevo** > **Lista** > **Desde Excel** > sube la plantilla.
2. Revisa el tipo de cada columna contra la hoja **Columnas** de la plantilla: Texto, Fecha o Número.
3. Ponle a la lista exactamente el nombre de la plantilla. La app los busca por nombre.
4. Borra la fila de ejemplo (es ficticia).
5. En **Configuración de la lista**:
   - Confirma que hay una columna llamada **Código**. Si el asistente puso el código en «Título», renómbrala a «Código».
   - Abre la columna **Título** y marca que no es obligatoria.
   - En **Configuración de versiones**, crea una versión en cada edición y guarda hasta 500.
   - En **Columnas indexadas**, crea un índice por cada columna marcada «Indexada» en `listas.md`. Las más importantes son Código, Búsqueda, Búsqueda por nombre y Documento.
6. Borra el archivo que quedó en **Contenido del sitio** > **Activos del sitio**. Ahí guarda SharePoint una copia del Excel que subiste.

Catálogo de servicios ya trae los 72 servicios del catálogo real. Estudiantes y Condiciones de ingreso se crean vacías y se llenan en el paso 3.

### Listas de seguimiento (una por unidad)

1. Crea la primera desde la plantilla **Seguimiento (plantilla)** con el nombre **Seguimiento Desarrollo Estudiantil** y aplícale los pasos 2 a 6 de arriba. Indexa también **Fecha** y **Estado**.
2. Crea las otras 13 con **+ Nuevo** > **Lista** > **Desde una lista existente** > la primera. Copia los nombres de la tabla de `listas.md` sin cambiar ni una tilde.
3. En cada una, en **Configuración de la lista** > **Configuración avanzada** > **Permisos de nivel de elemento**:
   - Acceso de lectura: **Leer los elementos creados por el usuario**.
   - Acceso de creación y edición: **Crear elementos y editar los elementos creados por el usuario**.

   Así, quien remite solo ve sus propias remisiones. La unidad dueña ve todo porque su nivel de permiso incluye «Invalidar comportamientos de lista».

### Grupos y niveles de permiso

En **Configuración** > **Permisos del sitio** > **Configuración de permisos avanzada**:

1. **Niveles de permiso** > selecciona **Colaborar** > **Copiar nivel de permiso**:
   - **AE Colaborar sin eliminar**: desmarca «Eliminar elementos» y «Eliminar versiones».
   - **AE Gestionar unidad**: desmarca «Eliminar elementos» y «Eliminar versiones» y marca el permiso de lista que dice «…cambiar o reemplazar la configuración que permite a los usuarios leer o editar solo sus propios elementos» (en inglés, *Override List Behaviors*).
2. **Niveles de permiso** > **Agregar un nivel de permiso**:
   - **AE Remitir**: marca solo Ver elementos, Agregar elementos, Abrir elementos, Ver páginas de la aplicación, Ver páginas, Abrir, Examinar información de usuario y Usar interfaces remotas.
   - **AE Consultar unidad**: copia de «Leer» más el mismo permiso de *Override List Behaviors*.
3. **Crear grupo**: AE Personal y un grupo por unidad (la columna «Grupo» de `listas.md`). Como propietario de cada grupo pon al grupo de Propietarios del sitio.
4. Da al grupo **AE Personal** el nivel **Leer** en el sitio.

### Permisos de cada lista

En cada lista: **Configuración de la lista** > **Permisos para esta lista** > **Dejar de heredar permisos**. Luego:

| Lista | Quita | Concede |
|---|---|---|
| Estudiantes, Accesos, Catálogo de servicios | No rompas la herencia | (Propietarios: control total; AE Personal: leer) |
| Deportes | — | AE Deportes: AE Colaborar sin eliminar |
| Cultura | — | AE Cultura: AE Colaborar sin eliminar |
| Beneficios | — | AE Programas DH: AE Colaborar sin eliminar |
| Condiciones de ingreso | AE Personal, Miembros y Visitantes | Nada más: solo Propietarios |
| Cada «Seguimiento …» | AE Personal (leer), Miembros y Visitantes | Grupo de la unidad: AE Gestionar unidad · AE Personal: AE Remitir |
| Seguimiento Desarrollo Estudiantil (además) | — | AE DE Psicología: AE Consultar unidad |

## Paso 3. Carga la base de estudiantes

Te entregué tres archivos privados generados desde BASE_DE_DATOS:

| Archivo | Filas | Uso |
|---|---|---|
| `Estudiantes_carga.xlsx` y `.csv` | 18.185 | Lista Estudiantes. Sin cupos especiales sensibles. |
| `Condiciones_ingreso_carga.xlsx` y `.csv` | 615 | Lista reservada Condiciones de ingreso: pertenencia étnica, víctima, discapacidad y jefatura de hogar. |
| `resumen_carga.json` | — | Conteos para verificar después de cargar. |

- **Con TI:** paso 2A, punto 4. Tarda minutos.
- **Sin TI, con Microsoft Access** (viene en Office Pro Plus para Windows):
  1. Access > **Base de datos en blanco**.
  2. **Datos externos** > **Nuevo origen de datos** > **Desde servicios en línea** > **Lista de SharePoint** > dirección del sitio > **Vincular al origen de datos creando una tabla vinculada** > elige **Estudiantes**.
  3. **Datos externos** > **Nuevo origen de datos** > **Desde archivo** > **Excel** > `Estudiantes_carga.xlsx` > **Importar** a una tabla nueva.
  4. **Crear** > **Diseño de consulta** > **Anexar** a la tabla vinculada Estudiantes, asignando cada columna con la del mismo nombre. Ejecútala.
  5. Repite con `Condiciones_ingreso_carga.xlsx` y la lista Condiciones de ingreso.
  6. Borra la base de Access y la copia del Excel al terminar.

  Access no usa el asistente «Desde Excel», que se recomienda hasta 5.000 filas por archivo. En los siguientes cortes, la misma tabla vinculada sirve para una consulta de actualización por Código.
- Comprueba al final que la lista Estudiantes tiene 18.185 elementos y Condiciones de ingreso, 615.

## Paso 4. Personas y accesos

1. Agrega a cada persona a **AE Personal** y al grupo de su unidad.
2. Registra la misma pertenencia en la lista **Accesos**:
   - Una fila por persona y unidad, con el correo en minúsculas y **Activo = Sí**.
   - Para las dos personas administradoras, **Unidad = ADM**.

La app usa Accesos para decidir qué pestañas y botones mostrar. El permiso real lo dan los grupos: si Accesos y los grupos no coinciden, la app muestra menos, nunca más.

Códigos de unidad: DEP, CUL, PDH, DEA, DPS, PSI, SAL, GAV, CES, TSO, ENL, PRP, PRS, ORE, CAI, SAF, IPS (ver `listas.md`).

## Paso 5. Crea la app

1. En [make.powerapps.com](https://make.powerapps.com): **+ Crear** > **Aplicación de lienzo en blanco** > nombre **Acompañamiento Estudiantil** > formato **Tableta**.
2. **Datos** > **Agregar datos** > **SharePoint** > el sitio > marca estas listas:
   - Estudiantes, Beneficios, Deportes, Cultura, Accesos y Catálogo de servicios.
   - Las 14 «Seguimiento …».
   - No agregues Condiciones de ingreso: la consultan solo las dos personas administradoras, directo en SharePoint.
3. **Configuración** > **General** > **Límite de filas de datos**: 2000.
4. Selecciona **App** en la vista de árbol. En el selector de propiedades elige **Formulas** y pega el contenido de `microsoft365/app/formulas-app.txt`. Si tu Power Apps usa punto y coma en las fórmulas, por ejemplo `If(a; b; c)`, pega `formulas-app-es.txt`.
5. Pega las pantallas en este orden:
   - scrInicio, scrFicha, scrRegSeguimiento, scrRegDeportes, scrRegCultura y scrRegBeneficio.
   - Para cada una: abre `microsoft365/app/pantallas/<pantalla>.pa.yaml`, copia todo y en la vista de árbol usa **Pegar código** (clic derecho), o selecciona el árbol y pulsa Ctrl+V.
6. Si una pantalla completa no se deja pegar:
   - Crea una pantalla en blanco con ese nombre.
   - Pon su **Fill** y **OnVisible** como dice `app/receta.md`.
   - Selecciona la pantalla y pega `app/controles/<pantalla>.pa.yaml`.
   - Si tampoco funciona, `receta.md` trae cada control con sus fórmulas para crearlos a mano.
7. Borra **Screen1**, deja **scrInicio** de primera y abre el **Comprobador de aplicaciones** para revisar errores.
8. **Guardar** > **Publicar**. **Compartir** con las personas de AE Personal, una por una o con un grupo de seguridad de Entra que cree TI. Compartir la app no da acceso a datos: eso lo controla SharePoint.
9. En Teams: **Aplicaciones** > **Power Apps** > la app > **Agregar**, o desde make.powerapps.com > la app > **Agregar a Teams**. También se puede anclar como pestaña en el canal de cada área.

Avisos esperados del comprobador:
- Delegación en la búsqueda y en las tablas de la ficha. Las consultas filtran primero en SharePoint por columnas indexadas y traen pocos registros por estudiante, así que no afectan el resultado.
- La búsqueda por apellido trae hasta 2.000 coincidencias, que es más de lo que se puede leer en pantalla.

### Cómo busca la app

| Lo que escribes | Cómo busca |
|---|---|
| Solo números (código o documento) | Coincidencia exacta con Código y, si no hay, con Documento |
| Letras (mínimo 3) | Empieza por, sin tildes ni mayúsculas, en «Búsqueda» (apellidos y nombres) y, si no hay, en «Búsqueda por nombre» (nombres y apellidos) |

Las dos columnas de búsqueda vienen calculadas en el archivo de carga. Por eso la búsqueda funciona con 18.000 estudiantes sin pasar el umbral de 5.000 elementos de SharePoint.

## Paso 6. Conecta el formulario de solicitudes

Sigue `06-solicitudes-forms-y-flujos.md`. Tu formulario actual se conserva; el flujo agrega la solicitud a la bandeja de la unidad y mantiene el correo a Outlook.

## Paso 7. Piloto

Cuatro semanas con dos unidades, por ejemplo Deportes (visible) y Desarrollo Estudiantil · académico (reservado). Antes de empezar, prueba con una cuenta de cada tipo:

- [ ] Coordinación de Deportes ve datos básicos, estrato, almuerzos y refrigerios, deporte y cultura. No ve la pestaña «Seguimiento reservado» y, si abre una lista de seguimiento en SharePoint, no ve nada salvo sus propias remisiones.
- [ ] Desarrollo Estudiantil ve y registra en su lista. No ve Psicología, Salud ni GAV.
- [ ] Psicología de Desarrollo Estudiantil registra en su lista y consulta la académica.
- [ ] Una persona sin unidad puede remitir a GAV y ver el estado de su remisión, pero no los demás registros de GAV.
- [ ] Nadie, salvo Administración, puede eliminar un elemento. Una anulación deja el motivo y el historial de versiones.
- [ ] La búsqueda por código, documento y apellido responde en menos de 3 segundos.
- [ ] Una respuesta del formulario aparece en la bandeja de la unidad correcta en menos de 5 minutos.

## Operación

| Tarea | Cuándo | Cómo |
|---|---|---|
| Actualizar la base de estudiantes | En cada corte de matrícula | Genera los archivos con `python generar_kit.py carga BASE_DE_DATOS.xlsx <carpeta>` y cárgalos con `cargar-lista.ps1` o con la consulta de actualización de Access. |
| Revisar quién tiene acceso | Cada trimestre | Grupos AE y lista Accesos. Quien deja el cargo sale el mismo día. |
| Agregar una unidad nueva | Cuando se cree | Se agrega a `modelo.json` y se regeneran los scripts y la app. Luego se crea su lista «Desde una lista existente», sus permisos y su grupo, y se vuelven a pegar las pantallas. |
| Respaldo | Permanente | SharePoint guarda el historial de versiones y la papelera de reciclaje (93 días). Si la universidad tiene Microsoft 365 Backup u otra herramienta institucional, que TI incluya el sitio. No exportes las listas reservadas a Excel como respaldo: cada copia es otro lugar que proteger. |

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| «La columna X no existe» en la app | La lista o la columna no se llama exactamente igual | Compara con `listas.md`: cuentan tildes, espacios y mayúsculas. |
| «Se excedió el umbral de la vista de lista» | Falta un índice | Crea los índices de `listas.md` (Código, Búsqueda, Búsqueda por nombre, Documento, Fecha, Estado). |
| No aparece la pestaña de seguimiento | La persona no está en Accesos o tiene **Activo = No** | Revisa Accesos y el grupo de la unidad. |
| «Acceso denegado» al abrir la app | Falta en AE Personal | Agrégala al grupo. |
| No sale «Pegar código» | Versión de Power Apps Studio | Pega con Ctrl+V sobre la vista de árbol o usa `receta.md`. |
| Las fórmulas pegadas muestran errores de separador | Configuración regional en español | Usa `formulas-app-es.txt` o cambia el idioma de Power Apps a inglés mientras construyes. |
