<#
.SYNOPSIS
  Crea en un sitio de SharePoint las listas, grupos y permisos del sistema de acompañamiento estudiantil.
.DESCRIPTION
  Generado desde microsoft365/modelo.json con generar_kit.py. No editar a mano: cambiar el modelo y regenerar.
  Requisitos: PowerShell 7.4+, módulo PnP.PowerShell 3.x y un registro de aplicación de Entra ID para PnP
  (Register-PnPEntraIDAppForInteractiveLogin). Quien lo ejecute debe ser propietario del sitio.
  Es idempotente: si una lista, columna, grupo o nivel de permiso ya existe, lo deja como está y sigue.
.EXAMPLE
  ./provisionar-sitio.ps1 -SiteUrl https://unimagdalena.sharepoint.com/sites/AcompanamientoEstudiantil -ClientId <id> -Administradores persona1@unimagdalena.edu.co,persona2@unimagdalena.edu.co
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $SiteUrl,
    [Parameter(Mandatory)] [string] $ClientId,
    [Parameter(Mandatory)] [string[]] $Administradores
)
$ErrorActionPreference = 'Stop'
Import-Module PnP.PowerShell
Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

function Paso($texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }

# Nombres de los niveles de permiso integrados en el idioma del sitio (Leer, Colaborar, Control total).
$roles = Get-PnPRoleDefinition
$rolLeer = ($roles | Where-Object { $_.RoleTypeKind -eq 'Reader' }).Name
$rolColaborar = $roles | Where-Object { $_.RoleTypeKind -eq 'Contributor' }
$rolControlTotal = ($roles | Where-Object { $_.RoleTypeKind -eq 'Administrator' }).Name
$grupoPropietarios = Get-PnPGroup -AssociatedOwnerGroup

Paso 'Niveles de permiso personalizados'
function NivelPermiso($nombre, $clonar, [string[]]$incluir, [string[]]$excluir, $descripcion) {
    if (Get-PnPRoleDefinition | Where-Object { $_.Name -eq $nombre }) { Write-Host "  ya existe: $nombre"; return }
    $p = @{ RoleName = $nombre; Description = $descripcion }
    if ($clonar) { $p.Clone = $clonar }
    if ($incluir) { $p.Include = $incluir }
    if ($excluir) { $p.Exclude = $excluir }
    Add-PnPRoleDefinition @p | Out-Null
    Write-Host "  creado: $nombre"
}
NivelPermiso 'AE Colaborar sin eliminar' $rolColaborar @() @('DeleteListItems','DeleteVersions') 'Colaborar sin eliminar elementos ni versiones'
NivelPermiso 'AE Gestionar unidad' $rolColaborar @('CancelCheckout') @('DeleteListItems','DeleteVersions') 'Unidad dueña de una lista de seguimiento: ve y edita todo, no elimina'
NivelPermiso 'AE Consultar unidad' ($roles | Where-Object { $_.RoleTypeKind -eq 'Reader' }) @('CancelCheckout') @() 'Lee todos los elementos de una lista de seguimiento de otra unidad'
NivelPermiso 'AE Remitir' $null @('ViewListItems','AddListItems','ViewFormPages','OpenItems','Open','ViewPages','UseRemoteAPIs','BrowseUserInfo') @() 'Crea remisiones y ve solo las que creó'

Paso 'Grupos de SharePoint'
function Grupo($nombre, $descripcion) {
    try { Get-PnPGroup -Identity $nombre | Out-Null; Write-Host "  ya existe: $nombre" }
    catch { New-PnPGroup -Title $nombre -Description $descripcion -Owner $grupoPropietarios.Title | Out-Null; Write-Host "  creado: $nombre" }
}
Grupo 'AE Personal' 'Todas las personas que usan el sistema. Leen los datos visibles para la red y pueden remitir a cualquier unidad. Cada persona va aquí y, además, en el grupo de su unidad.'
Grupo 'AE Deportes' 'Unidad: Deportes'
Grupo 'AE Cultura' 'Unidad: Cultura'
Grupo 'AE Programas DH' 'Unidad: Programas de Desarrollo Humano'
Grupo 'AE DE Académico' 'Unidad: Desarrollo Estudiantil · académico'
Grupo 'AE DE Psicología' 'Unidad: Desarrollo Estudiantil · psicología'
Grupo 'AE Psicología' 'Unidad: Programa de Atención Psicológica'
Grupo 'AE Salud' 'Unidad: Salud'
Grupo 'AE GAV' 'Unidad: GAV · violencia sexual y VBG'
Grupo 'AE Centro de Escucha' 'Unidad: Centro de Escucha'
Grupo 'AE Trabajo Social' 'Unidad: Trabajo Social'
Grupo 'AE Enlaces' 'Unidad: Estrategia Enlaces'
Grupo 'AE Riesgo Psicosocial' 'Unidad: Prevención del riesgo psicosocial'
Grupo 'AE Prevención Salud' 'Unidad: Prevención para la salud'
Grupo 'AE Orientación Espiritual' 'Unidad: Orientaciones y asesorías espirituales'
Grupo 'AE Infancia CAI' 'Unidad: Centro de Atención Integral a la Infancia'
Grupo 'AE Sala Amiga' 'Unidad: Sala Amiga de la Familia Lactante'
Grupo 'AE IPS FUNPRONIMA' 'Unidad: IPS FUNPRONIMA'
Set-PnPWebPermission -Group 'AE Personal' -AddRole $rolLeer
foreach ($correo in $Administradores) { Add-PnPGroupMember -LoginName $correo -Group $grupoPropietarios.Title }

Paso 'Listas y columnas'
function Lista($titulo, $url, $descripcion) {
    $l = $null; try { $l = Get-PnPList -Identity $titulo -ErrorAction Stop } catch { }
    if (-not $l) { $l = New-PnPList -Title $titulo -Url "Lists/$url" -Template GenericList -EnableVersioning; Write-Host "  creada: $titulo" }
    else { Write-Host "  ya existe: $titulo" }
    Set-PnPList -Identity $titulo -Description $descripcion -EnableVersioning $true -MajorVersions 500 -EnableAttachments $false | Out-Null
    # El Título no se usa: la app trabaja con «Código».
    Set-PnPField -List $titulo -Identity 'Title' -Values @{ Required = $false } | Out-Null
    return $titulo
}
function Columna($lista, $interno, $xml) {
    $existe = $null; try { $existe = Get-PnPField -List $lista -Identity $interno -ErrorAction Stop } catch { }
    if ($existe) { return }
    Add-PnPFieldFromXml -List $lista -FieldXml $xml | Out-Null
}
function VistaPorDefecto($lista, [string[]]$campos) {
    $v = Get-PnPView -List $lista | Where-Object { $_.DefaultView }
    Set-PnPView -List $lista -Identity $v.Id -Fields $campos | Out-Null
}

$l = Lista 'Estudiantes' 'Estudiantes' 'Base de estudiantes del corte vigente. Una fila por estudiante. La carga Administración en cada corte.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" EnforceUniqueValues="TRUE" MaxLength="255" />'
Columna $l 'Documento' '<Field Type="Text" DisplayName="Documento" Name="Documento" StaticName="Documento" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'TipoDocumento' '<Field Type="Text" DisplayName="Tipo de documento" Name="TipoDocumento" StaticName="TipoDocumento" Required="FALSE" MaxLength="255" />'
Columna $l 'Nombres' '<Field Type="Text" DisplayName="Nombres" Name="Nombres" StaticName="Nombres" Required="FALSE" MaxLength="255" />'
Columna $l 'Apellidos' '<Field Type="Text" DisplayName="Apellidos" Name="Apellidos" StaticName="Apellidos" Required="FALSE" MaxLength="255" />'
Columna $l 'NombreCompleto' '<Field Type="Text" DisplayName="Nombre completo" Name="NombreCompleto" StaticName="NombreCompleto" Required="FALSE" MaxLength="255" />'
Columna $l 'Busqueda' '<Field Type="Text" DisplayName="Búsqueda" Name="Busqueda" StaticName="Busqueda" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'BusquedaNombre' '<Field Type="Text" DisplayName="Búsqueda por nombre" Name="BusquedaNombre" StaticName="BusquedaNombre" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Sexo' '<Field Type="Text" DisplayName="Sexo" Name="Sexo" StaticName="Sexo" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaNacimiento' '<Field Type="DateTime" DisplayName="Fecha de nacimiento" Name="FechaNacimiento" StaticName="FechaNacimiento" Required="FALSE" Format="DateOnly" />'
Columna $l 'Facultad' '<Field Type="Text" DisplayName="Facultad" Name="Facultad" StaticName="Facultad" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Programa' '<Field Type="Text" DisplayName="Programa" Name="Programa" StaticName="Programa" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Periodo' '<Field Type="Text" DisplayName="Periodo" Name="Periodo" StaticName="Periodo" Required="FALSE" MaxLength="255" />'
Columna $l 'PeriodoOriginal' '<Field Type="Text" DisplayName="Periodo original" Name="PeriodoOriginal" StaticName="PeriodoOriginal" Required="FALSE" MaxLength="255" />'
Columna $l 'Matriculado' '<Field Type="Text" DisplayName="Matriculado" Name="Matriculado" StaticName="Matriculado" Required="FALSE" MaxLength="255" />'
Columna $l 'CancelacionSemestre' '<Field Type="Text" DisplayName="Cancelación de semestre" Name="CancelacionSemestre" StaticName="CancelacionSemestre" Required="FALSE" MaxLength="255" />'
Columna $l 'Promedio' '<Field Type="Number" DisplayName="Promedio" Name="Promedio" StaticName="Promedio" Required="FALSE" Decimals="2" />'
Columna $l 'PlanEstudio' '<Field Type="Text" DisplayName="Plan de estudio" Name="PlanEstudio" StaticName="PlanEstudio" Required="FALSE" MaxLength="255" />'
Columna $l 'ModalidadIngreso' '<Field Type="Text" DisplayName="Modalidad de ingreso" Name="ModalidadIngreso" StaticName="ModalidadIngreso" Required="FALSE" MaxLength="255" />'
Columna $l 'CupoEspecial' '<Field Type="Text" DisplayName="Cupo especial" Name="CupoEspecial" StaticName="CupoEspecial" Required="FALSE" MaxLength="255" />'
Columna $l 'Estrato' '<Field Type="Text" DisplayName="Estrato" Name="Estrato" StaticName="Estrato" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'DepartamentoOrigen' '<Field Type="Text" DisplayName="Departamento de origen" Name="DepartamentoOrigen" StaticName="DepartamentoOrigen" Required="FALSE" MaxLength="255" />'
Columna $l 'MunicipioOrigen' '<Field Type="Text" DisplayName="Municipio de origen" Name="MunicipioOrigen" StaticName="MunicipioOrigen" Required="FALSE" MaxLength="255" />'
Columna $l 'Colegio' '<Field Type="Text" DisplayName="Colegio" Name="Colegio" StaticName="Colegio" Required="FALSE" MaxLength="255" />'
Columna $l 'TipoColegio' '<Field Type="Text" DisplayName="Tipo de colegio" Name="TipoColegio" StaticName="TipoColegio" Required="FALSE" MaxLength="255" />'
Columna $l 'DepartamentoColegio' '<Field Type="Text" DisplayName="Departamento del colegio" Name="DepartamentoColegio" StaticName="DepartamentoColegio" Required="FALSE" MaxLength="255" />'
Columna $l 'MunicipioColegio' '<Field Type="Text" DisplayName="Municipio del colegio" Name="MunicipioColegio" StaticName="MunicipioColegio" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaCorte' '<Field Type="DateTime" DisplayName="Fecha de corte" Name="FechaCorte" StaticName="FechaCorte" Required="FALSE" Format="DateOnly" />'
VistaPorDefecto $l @('Codigo', 'Documento', 'TipoDocumento', 'Nombres', 'Apellidos', 'NombreCompleto', 'Busqueda', 'BusquedaNombre', 'Sexo', 'FechaNacimiento', 'Facultad', 'Programa')

$l = Lista 'Condiciones de ingreso' 'CondicionesIngreso' 'Cupos especiales que revelan datos sensibles (pertenencia étnica, víctima del conflicto, discapacidad, jefatura de hogar). Solo Administración, salvo que Jurídica autorice a otra unidad.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Condicion' '<Field Type="Text" DisplayName="Condición" Name="Condicion" StaticName="Condicion" Required="FALSE" MaxLength="255" />'
Columna $l 'Periodo' '<Field Type="Text" DisplayName="Periodo" Name="Periodo" StaticName="Periodo" Required="FALSE" MaxLength="255" />'
Columna $l 'Fuente' '<Field Type="Text" DisplayName="Fuente" Name="Fuente" StaticName="Fuente" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Condicion', 'Periodo', 'Fuente')

$l = Lista 'Deportes' 'Deportes' 'Deportistas por disciplina (con ASCUN y nivel), representación en eventos, préstamo de implementos y actividades.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Disciplina' '<Field Type="Text" DisplayName="Disciplina o servicio" Name="Disciplina" StaticName="Disciplina" Required="FALSE" MaxLength="255" />'
Columna $l 'ASCUN' '<Field Type="Text" DisplayName="ASCUN" Name="ASCUN" StaticName="ASCUN" Required="FALSE" MaxLength="255" />'
Columna $l 'Nivel' '<Field Type="Text" DisplayName="Nivel" Name="Nivel" StaticName="Nivel" Required="FALSE" MaxLength="255" />'
Columna $l 'Evento' '<Field Type="Text" DisplayName="Evento o implemento" Name="Evento" StaticName="Evento" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="FALSE" Format="DateOnly" />'
Columna $l 'FechaDevolucion' '<Field Type="DateTime" DisplayName="Fecha de devolución" Name="FechaDevolucion" StaticName="FechaDevolucion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Periodo' '<Field Type="Text" DisplayName="Periodo" Name="Periodo" StaticName="Periodo" Required="FALSE" MaxLength="255" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" MaxLength="255" />'
Columna $l 'Observacion' '<Field Type="Note" DisplayName="Observación" Name="Observacion" StaticName="Observacion" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'TipoRegistro', 'Disciplina', 'ASCUN', 'Nivel', 'Evento', 'Fecha', 'FechaDevolucion', 'Periodo', 'Estado', 'RegistradoPor')

$l = Lista 'Cultura' 'Cultura' 'Integrantes de talleres permanentes y grupos representativos, y participación en presentaciones.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'TallerGrupo' '<Field Type="Text" DisplayName="Taller o grupo" Name="TallerGrupo" StaticName="TallerGrupo" Required="FALSE" MaxLength="255" />'
Columna $l 'Rol' '<Field Type="Text" DisplayName="Rol" Name="Rol" StaticName="Rol" Required="FALSE" MaxLength="255" />'
Columna $l 'Evento' '<Field Type="Text" DisplayName="Evento" Name="Evento" StaticName="Evento" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="FALSE" Format="DateOnly" />'
Columna $l 'Periodo' '<Field Type="Text" DisplayName="Periodo" Name="Periodo" StaticName="Periodo" Required="FALSE" MaxLength="255" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" MaxLength="255" />'
Columna $l 'Observacion' '<Field Type="Note" DisplayName="Observación" Name="Observacion" StaticName="Observacion" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'TipoRegistro', 'TallerGrupo', 'Rol', 'Evento', 'Fecha', 'Periodo', 'Estado', 'RegistradoPor')

$l = Lista 'Beneficios' 'Beneficios' 'Programas de Desarrollo Humano visibles para la red: almuerzos y refrigerios, alojamiento, becas, PIC y reconocimientos. El Fondo de calamidad no va aquí: es reservado de Trabajo Social.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Programa' '<Field Type="Text" DisplayName="Programa" Name="Programa" StaticName="Programa" Required="TRUE" MaxLength="255" />'
Columna $l 'Detalle' '<Field Type="Text" DisplayName="Detalle" Name="Detalle" StaticName="Detalle" Required="FALSE" MaxLength="255" />'
Columna $l 'Periodo' '<Field Type="Text" DisplayName="Periodo" Name="Periodo" StaticName="Periodo" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaInicio' '<Field Type="DateTime" DisplayName="Fecha de inicio" Name="FechaInicio" StaticName="FechaInicio" Required="FALSE" Format="DateOnly" />'
Columna $l 'FechaFin' '<Field Type="DateTime" DisplayName="Fecha de fin" Name="FechaFin" StaticName="FechaFin" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" MaxLength="255" />'
Columna $l 'Observacion' '<Field Type="Note" DisplayName="Observación" Name="Observacion" StaticName="Observacion" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Programa', 'Detalle', 'Periodo', 'FechaInicio', 'FechaFin', 'Estado', 'RegistradoPor')

$l = Lista 'Accesos' 'Accesos' 'Quién pertenece a qué unidad. La app lo usa para mostrar pestañas y botones. El permiso real lo dan los grupos de SharePoint: si esta lista y los grupos no coinciden, la app muestra menos, nunca más.'
Columna $l 'Correo' '<Field Type="Text" DisplayName="Correo" Name="Correo" StaticName="Correo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Nombre' '<Field Type="Text" DisplayName="Nombre" Name="Nombre" StaticName="Nombre" Required="FALSE" MaxLength="255" />'
Columna $l 'Unidad' '<Field Type="Text" DisplayName="Unidad" Name="Unidad" StaticName="Unidad" Required="TRUE" MaxLength="255" />'
Columna $l 'Rol' '<Field Type="Text" DisplayName="Rol" Name="Rol" StaticName="Rol" Required="FALSE" MaxLength="255" />'
Columna $l 'Activo' '<Field Type="Text" DisplayName="Activo" Name="Activo" StaticName="Activo" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Correo', 'Nombre', 'Unidad', 'Rol', 'Activo')

$l = Lista 'Catálogo de servicios' 'CatalogoServicios' 'Áreas, programas, estrategias, talleres, disciplinas y servicios. La app llena sus listas desplegables desde aquí.'
Columna $l 'Unidad' '<Field Type="Text" DisplayName="Unidad" Name="Unidad" StaticName="Unidad" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Area' '<Field Type="Text" DisplayName="Área" Name="Area" StaticName="Area" Required="FALSE" MaxLength="255" />'
Columna $l 'Grupo' '<Field Type="Text" DisplayName="Grupo" Name="Grupo" StaticName="Grupo" Required="FALSE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="TRUE" MaxLength="255" />'
Columna $l 'Nivel' '<Field Type="Text" DisplayName="Nivel" Name="Nivel" StaticName="Nivel" Required="FALSE" MaxLength="255" />'
Columna $l 'Activo' '<Field Type="Text" DisplayName="Activo" Name="Activo" StaticName="Activo" Required="FALSE" MaxLength="255" />'
Columna $l 'Orden' '<Field Type="Number" DisplayName="Orden" Name="Orden" StaticName="Orden" Required="FALSE" Decimals="0" />'
VistaPorDefecto $l @('Unidad', 'Area', 'Grupo', 'Servicio', 'Nivel', 'Activo', 'Orden')

$l = Lista 'Seguimiento Desarrollo Estudiantil' 'SegDesarrolloEstudiantil' 'Seguimiento reservado de Desarrollo Estudiantil · académico.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Psicología DE' 'SegPsicologiaDE' 'Seguimiento reservado de Desarrollo Estudiantil · psicología.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Psicología' 'SegPsicologia' 'Seguimiento reservado de Programa de Atención Psicológica.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Salud' 'SegSalud' 'Seguimiento reservado de Salud.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento GAV' 'SegGAV' 'Seguimiento reservado de GAV · violencia sexual y VBG.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Centro de Escucha' 'SegCentroEscucha' 'Seguimiento reservado de Centro de Escucha.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Trabajo Social' 'SegTrabajoSocial' 'Seguimiento reservado de Trabajo Social.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Enlaces' 'SegEnlaces' 'Seguimiento reservado de Estrategia Enlaces.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Riesgo Psicosocial' 'SegRiesgoPsicosocial' 'Seguimiento reservado de Prevención del riesgo psicosocial.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Prevención Salud' 'SegPrevencionSalud' 'Seguimiento reservado de Prevención para la salud.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Orientación Espiritual' 'SegOrientacionEspiritual' 'Seguimiento reservado de Orientaciones y asesorías espirituales.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Infancia CAI' 'SegInfanciaCAI' 'Seguimiento reservado de Centro de Atención Integral a la Infancia.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento Sala Amiga' 'SegSalaAmiga' 'Seguimiento reservado de Sala Amiga de la Familia Lactante.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

$l = Lista 'Seguimiento IPS FUNPRONIMA' 'SegIPSFunpronima' 'Seguimiento reservado de IPS FUNPRONIMA.'
Columna $l 'Codigo' '<Field Type="Text" DisplayName="Código" Name="Codigo" StaticName="Codigo" Required="TRUE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Estudiante' '<Field Type="Text" DisplayName="Estudiante" Name="Estudiante" StaticName="Estudiante" Required="FALSE" MaxLength="255" />'
Columna $l 'Fecha' '<Field Type="DateTime" DisplayName="Fecha" Name="Fecha" StaticName="Fecha" Required="TRUE" Indexed="TRUE" Format="DateOnly" />'
Columna $l 'TipoRegistro' '<Field Type="Text" DisplayName="Tipo de registro" Name="TipoRegistro" StaticName="TipoRegistro" Required="TRUE" MaxLength="255" />'
Columna $l 'Servicio' '<Field Type="Text" DisplayName="Servicio" Name="Servicio" StaticName="Servicio" Required="FALSE" MaxLength="255" />'
Columna $l 'Modalidad' '<Field Type="Text" DisplayName="Modalidad" Name="Modalidad" StaticName="Modalidad" Required="FALSE" MaxLength="255" />'
Columna $l 'Motivo' '<Field Type="Text" DisplayName="Motivo" Name="Motivo" StaticName="Motivo" Required="FALSE" MaxLength="255" />'
Columna $l 'Resumen' '<Field Type="Note" DisplayName="Resumen" Name="Resumen" StaticName="Resumen" Required="FALSE" NumLines="6" RichText="FALSE" AppendOnly="FALSE" />'
Columna $l 'ProximaAccion' '<Field Type="Text" DisplayName="Próxima acción" Name="ProximaAccion" StaticName="ProximaAccion" Required="FALSE" MaxLength="255" />'
Columna $l 'FechaProximaAccion' '<Field Type="DateTime" DisplayName="Fecha próxima acción" Name="FechaProximaAccion" StaticName="FechaProximaAccion" Required="FALSE" Format="DateOnly" />'
Columna $l 'Estado' '<Field Type="Text" DisplayName="Estado" Name="Estado" StaticName="Estado" Required="FALSE" Indexed="TRUE" MaxLength="255" />'
Columna $l 'Prioridad' '<Field Type="Text" DisplayName="Prioridad" Name="Prioridad" StaticName="Prioridad" Required="FALSE" MaxLength="255" />'
Columna $l 'Origen' '<Field Type="Text" DisplayName="Origen" Name="Origen" StaticName="Origen" Required="FALSE" MaxLength="255" />'
Columna $l 'RemitidoPor' '<Field Type="Text" DisplayName="Remitido por" Name="RemitidoPor" StaticName="RemitidoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'MenorEdad' '<Field Type="Text" DisplayName="Menor de edad" Name="MenorEdad" StaticName="MenorEdad" Required="FALSE" MaxLength="255" />'
Columna $l 'Autorizacion' '<Field Type="Text" DisplayName="Autorización de datos" Name="Autorizacion" StaticName="Autorizacion" Required="FALSE" MaxLength="255" />'
Columna $l 'RegistradoPor' '<Field Type="Text" DisplayName="Registrado por" Name="RegistradoPor" StaticName="RegistradoPor" Required="FALSE" MaxLength="255" />'
Columna $l 'CorreoRegistro' '<Field Type="Text" DisplayName="Correo de quien registra" Name="CorreoRegistro" StaticName="CorreoRegistro" Required="FALSE" MaxLength="255" />'
Columna $l 'MotivoAnulacion' '<Field Type="Text" DisplayName="Motivo de anulación" Name="MotivoAnulacion" StaticName="MotivoAnulacion" Required="FALSE" MaxLength="255" />'
Columna $l 'AsignadoA' '<Field Type="Text" DisplayName="Asignado a" Name="AsignadoA" StaticName="AsignadoA" Required="FALSE" MaxLength="255" />'
Columna $l 'IdSolicitud' '<Field Type="Text" DisplayName="Id de solicitud" Name="IdSolicitud" StaticName="IdSolicitud" Required="FALSE" MaxLength="255" />'
VistaPorDefecto $l @('Codigo', 'Estudiante', 'Fecha', 'TipoRegistro', 'Servicio', 'Modalidad', 'Motivo', 'ProximaAccion', 'FechaProximaAccion', 'Estado', 'Prioridad', 'Origen')

Paso 'Permisos por lista'
function Romper($lista) { Set-PnPList -Identity $lista -BreakRoleInheritance -CopyRoleAssignments | Out-Null }
# Quita todos los permisos de un grupo sobre una lista (si no tenía, no pasa nada).
function QuitarGrupo($lista, $grupo) {
    $l = Get-PnPList -Identity $lista
    $g = Get-PnPGroup -Identity $grupo
    try { $l.RoleAssignments.GetByPrincipal($g).DeleteObject(); Invoke-PnPQuery } catch { }
}
# En listas reservadas no deben quedar el personal general ni los grupos Miembros y Visitantes del sitio.
function QuitarPersonal($lista) {
    QuitarGrupo $lista 'AE Personal'
    QuitarGrupo $lista (Get-PnPGroup -AssociatedMemberGroup).Title
    QuitarGrupo $lista (Get-PnPGroup -AssociatedVisitorGroup).Title
}
Romper 'Condiciones de ingreso'; QuitarPersonal 'Condiciones de ingreso'
Romper 'Deportes'
Set-PnPListPermission -Identity 'Deportes' -Group 'AE Deportes' -AddRole 'AE Colaborar sin eliminar'
Romper 'Cultura'
Set-PnPListPermission -Identity 'Cultura' -Group 'AE Cultura' -AddRole 'AE Colaborar sin eliminar'
Romper 'Beneficios'
Set-PnPListPermission -Identity 'Beneficios' -Group 'AE Programas DH' -AddRole 'AE Colaborar sin eliminar'
Romper 'Seguimiento Desarrollo Estudiantil'; QuitarPersonal 'Seguimiento Desarrollo Estudiantil'
Set-PnPListPermission -Identity 'Seguimiento Desarrollo Estudiantil' -Group 'AE DE Académico' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Desarrollo Estudiantil' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Desarrollo Estudiantil' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Desarrollo Estudiantil' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Psicología DE'; QuitarPersonal 'Seguimiento Psicología DE'
Set-PnPListPermission -Identity 'Seguimiento Psicología DE' -Group 'AE DE Psicología' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Psicología DE' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Psicología DE' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Psicología DE' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Psicología'; QuitarPersonal 'Seguimiento Psicología'
Set-PnPListPermission -Identity 'Seguimiento Psicología' -Group 'AE Psicología' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Psicología' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Psicología' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Psicología' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Salud'; QuitarPersonal 'Seguimiento Salud'
Set-PnPListPermission -Identity 'Seguimiento Salud' -Group 'AE Salud' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Salud' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Salud' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Salud' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento GAV'; QuitarPersonal 'Seguimiento GAV'
Set-PnPListPermission -Identity 'Seguimiento GAV' -Group 'AE GAV' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento GAV' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento GAV' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento GAV' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Centro de Escucha'; QuitarPersonal 'Seguimiento Centro de Escucha'
Set-PnPListPermission -Identity 'Seguimiento Centro de Escucha' -Group 'AE Centro de Escucha' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Centro de Escucha' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Centro de Escucha' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Centro de Escucha' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Trabajo Social'; QuitarPersonal 'Seguimiento Trabajo Social'
Set-PnPListPermission -Identity 'Seguimiento Trabajo Social' -Group 'AE Trabajo Social' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Trabajo Social' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Trabajo Social' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Trabajo Social' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Enlaces'; QuitarPersonal 'Seguimiento Enlaces'
Set-PnPListPermission -Identity 'Seguimiento Enlaces' -Group 'AE Enlaces' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Enlaces' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Enlaces' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Enlaces' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Riesgo Psicosocial'; QuitarPersonal 'Seguimiento Riesgo Psicosocial'
Set-PnPListPermission -Identity 'Seguimiento Riesgo Psicosocial' -Group 'AE Riesgo Psicosocial' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Riesgo Psicosocial' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Riesgo Psicosocial' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Riesgo Psicosocial' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Prevención Salud'; QuitarPersonal 'Seguimiento Prevención Salud'
Set-PnPListPermission -Identity 'Seguimiento Prevención Salud' -Group 'AE Prevención Salud' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Prevención Salud' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Prevención Salud' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Prevención Salud' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Orientación Espiritual'; QuitarPersonal 'Seguimiento Orientación Espiritual'
Set-PnPListPermission -Identity 'Seguimiento Orientación Espiritual' -Group 'AE Orientación Espiritual' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Orientación Espiritual' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Orientación Espiritual' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Orientación Espiritual' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Infancia CAI'; QuitarPersonal 'Seguimiento Infancia CAI'
Set-PnPListPermission -Identity 'Seguimiento Infancia CAI' -Group 'AE Infancia CAI' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Infancia CAI' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Infancia CAI' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Infancia CAI' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento Sala Amiga'; QuitarPersonal 'Seguimiento Sala Amiga'
Set-PnPListPermission -Identity 'Seguimiento Sala Amiga' -Group 'AE Sala Amiga' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento Sala Amiga' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento Sala Amiga' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento Sala Amiga' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Romper 'Seguimiento IPS FUNPRONIMA'; QuitarPersonal 'Seguimiento IPS FUNPRONIMA'
Set-PnPListPermission -Identity 'Seguimiento IPS FUNPRONIMA' -Group 'AE IPS FUNPRONIMA' -AddRole 'AE Gestionar unidad'
Set-PnPListPermission -Identity 'Seguimiento IPS FUNPRONIMA' -Group 'AE Personal' -AddRole 'AE Remitir'
Set-PnPList -Identity 'Seguimiento IPS FUNPRONIMA' -ReadSecurity AllUsersReadAccessOnItemsTheyCreate -WriteSecurity WriteOnlyMyItems | Out-Null
Set-PnPField -List 'Seguimiento IPS FUNPRONIMA' -Identity 'Author' -Values @{ Indexed = $true } | Out-Null
Set-PnPListPermission -Identity 'Seguimiento Desarrollo Estudiantil' -Group 'AE DE Psicología' -AddRole 'AE Consultar unidad'

Paso 'Catálogo de servicios y accesos de administración'
if (-not (Get-PnPListItem -List 'Catálogo de servicios' -PageSize 1 | Select-Object -First 1)) {
    $b = New-PnPBatch
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Servicios'; Servicio = 'Actividad física musicalizada'; Nivel = 'visible'; Activo = 'Sí'; Orden = '1' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Servicios'; Servicio = 'Pausas activas'; Nivel = 'visible'; Activo = 'Sí'; Orden = '2' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Servicios'; Servicio = 'Representación en eventos'; Nivel = 'visible'; Activo = 'Sí'; Orden = '3' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Servicios'; Servicio = 'Préstamo de implementos'; Nivel = 'visible'; Activo = 'Sí'; Orden = '4' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Ajedrez'; Nivel = 'visible'; Activo = 'Sí'; Orden = '5' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Atletismo'; Nivel = 'visible'; Activo = 'Sí'; Orden = '6' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Baloncesto'; Nivel = 'visible'; Activo = 'Sí'; Orden = '7' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Fitness-E. Corporal'; Nivel = 'visible'; Activo = 'Sí'; Orden = '8' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Fútbol 11'; Nivel = 'visible'; Activo = 'Sí'; Orden = '9' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Fútbol sala'; Nivel = 'visible'; Activo = 'Sí'; Orden = '10' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Karate Do'; Nivel = 'visible'; Activo = 'Sí'; Orden = '11' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Natación'; Nivel = 'visible'; Activo = 'Sí'; Orden = '12' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Patinaje'; Nivel = 'visible'; Activo = 'Sí'; Orden = '13' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Porrismo'; Nivel = 'visible'; Activo = 'Sí'; Orden = '14' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Rugby'; Nivel = 'visible'; Activo = 'Sí'; Orden = '15' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Sóftbol'; Nivel = 'visible'; Activo = 'Sí'; Orden = '16' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Taekwondo'; Nivel = 'visible'; Activo = 'Sí'; Orden = '17' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Tenis de campo'; Nivel = 'visible'; Activo = 'Sí'; Orden = '18' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Tenis de mesa'; Nivel = 'visible'; Activo = 'Sí'; Orden = '19' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Ultimate'; Nivel = 'visible'; Activo = 'Sí'; Orden = '20' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEP'; Area = 'Deportes'; Grupo = 'Disciplinas'; Servicio = 'Voleibol / Voleibol playa'; Nivel = 'visible'; Activo = 'Sí'; Orden = '21' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Artes plásticas'; Nivel = 'visible'; Activo = 'Sí'; Orden = '22' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Coro'; Nivel = 'visible'; Activo = 'Sí'; Orden = '23' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Danzas folclóricas'; Nivel = 'visible'; Activo = 'Sí'; Orden = '24' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Danzas modernas'; Nivel = 'visible'; Activo = 'Sí'; Orden = '25' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Guitarra y Grupo Fusión'; Nivel = 'visible'; Activo = 'Sí'; Orden = '26' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Jazz y percusión'; Nivel = 'visible'; Activo = 'Sí'; Orden = '27' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Literatura'; Nivel = 'visible'; Activo = 'Sí'; Orden = '28' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Orquesta tropical'; Nivel = 'visible'; Activo = 'Sí'; Orden = '29' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Piano'; Nivel = 'visible'; Activo = 'Sí'; Orden = '30' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Tambora'; Nivel = 'visible'; Activo = 'Sí'; Orden = '31' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Teatro'; Nivel = 'visible'; Activo = 'Sí'; Orden = '32' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Vientos'; Nivel = 'visible'; Activo = 'Sí'; Orden = '33' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Talleres permanentes'; Servicio = 'Violín, viola y violonchelo'; Nivel = 'visible'; Activo = 'Sí'; Orden = '34' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CUL'; Area = 'Cultura'; Grupo = 'Estrategias'; Servicio = 'Presentaciones y eventos culturales'; Nivel = 'visible'; Activo = 'Sí'; Orden = '35' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PDH'; Area = 'Desarrollo Humano'; Grupo = 'Programas'; Servicio = 'Almuerzos y refrigerios'; Nivel = 'visible'; Activo = 'Sí'; Orden = '36' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PDH'; Area = 'Desarrollo Humano'; Grupo = 'Programas'; Servicio = 'Alojamientos universitarios'; Nivel = 'visible'; Activo = 'Sí'; Orden = '37' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PDH'; Area = 'Desarrollo Humano'; Grupo = 'Programas'; Servicio = 'Becas para la permanencia y graduación'; Nivel = 'visible'; Activo = 'Sí'; Orden = '38' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PDH'; Area = 'Desarrollo Humano'; Grupo = 'Programas'; Servicio = 'PIC'; Nivel = 'visible'; Activo = 'Sí'; Orden = '39' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PDH'; Area = 'Desarrollo Humano'; Grupo = 'Programas'; Servicio = 'Reconocimiento y conmemoración'; Nivel = 'visible'; Activo = 'Sí'; Orden = '40' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEA'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Seguimiento académico'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '41' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEA'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Alerta académica'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '42' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEA'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Orientación académica'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '43' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEA'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Tutoría o monitoría'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '44' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DEA'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Permanencia y graduación'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '45' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DPS'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Acompañamiento psicológico'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '46' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DPS'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Orientación vocacional'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '47' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'DPS'; Area = 'Desarrollo Estudiantil'; Grupo = 'Servicios'; Servicio = 'Taller grupal'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '48' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PSI'; Area = 'Programa de Atención Psicológica'; Grupo = 'Servicios'; Servicio = 'Atención psicológica individual'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '49' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PSI'; Area = 'Programa de Atención Psicológica'; Grupo = 'Servicios'; Servicio = 'Atención en crisis'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '50' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PSI'; Area = 'Programa de Atención Psicológica'; Grupo = 'Servicios'; Servicio = 'Intervención grupal'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '51' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Atención médica en eventos'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '52' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Enfermería'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '53' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Fisioterapia'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '54' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Fonoaudiología'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '55' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Medicina'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '56' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Medicina del deporte'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '57' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Odontología'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '58' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Orientación en nutrición y dietética'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '59' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Psiquiatría'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '60' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAL'; Area = 'Salud'; Grupo = 'Servicios'; Servicio = 'Terapia ocupacional'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '61' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'GAV'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Atención de violencia sexual y VBG'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '62' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CES'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Centro de Escucha'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '63' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'TSO'; Area = 'Desarrollo Humano'; Grupo = 'Servicios'; Servicio = 'Trabajo social'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '64' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'TSO'; Area = 'Desarrollo Humano'; Grupo = 'Servicios'; Servicio = 'Fondo de calamidad'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '65' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'ENL'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Estrategia Enlaces'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '66' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PRP'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Prevención del riesgo psicosocial'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '67' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'PRS'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Prevención para la salud'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '68' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'ORE'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Orientaciones y asesorías espirituales'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '69' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'CAI'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Centro de Atención Integral a la Infancia'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '70' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'SAF'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'Sala Amiga de la Familia Lactante'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '71' }
    Add-PnPListItem -List 'Catálogo de servicios' -Batch $b -Values @{ Unidad = 'IPS'; Area = 'Desarrollo Humano'; Grupo = 'Estrategia'; Servicio = 'IPS FUNPRONIMA'; Nivel = 'reservado'; Activo = 'Sí'; Orden = '72' }
    Invoke-PnPBatch -Batch $b
}
foreach ($correo in $Administradores) {
    $c = $correo.ToLower()
    $consulta = "<View><Query><Where><And><Eq><FieldRef Name='Correo'/><Value Type='Text'>$c</Value></Eq><Eq><FieldRef Name='Unidad'/><Value Type='Text'>ADM</Value></Eq></And></Where></Query></View>"
    if (-not (Get-PnPListItem -List 'Accesos' -Query $consulta)) {
        Add-PnPListItem -List 'Accesos' -Values @{ Correo = $c; Unidad = 'ADM'; Rol = 'Coordinación'; Activo = 'Sí' } | Out-Null
    }
}

Paso 'Listo'
Write-Host 'Revisa la guía: agrega a cada persona a «AE Personal» y al grupo de su unidad, y registra la misma pertenencia en la lista Accesos.'
Write-Host 'Si quien ejecutó el script no es uno de los dos administradores, quítate de Propietarios del sitio al terminar.'
