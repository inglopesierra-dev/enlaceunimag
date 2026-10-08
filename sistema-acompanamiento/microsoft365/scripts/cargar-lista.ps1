<#
.SYNOPSIS
  Carga o actualiza una lista desde un CSV (UTF-8) cuyos encabezados son los nombres internos de las columnas.
.DESCRIPTION
  Actualiza por clave: si el Código ya existe en la lista, actualiza la fila; si no, la crea. No borra nada.
  Las fechas (aaaa-mm-dd) y los números (punto decimal) del CSV se convierten al formato regional del sitio,
  porque las cargas por lotes de SharePoint los validan con esa configuración.
  Generado por generar_kit.py. Úsalo con los archivos de «generar_kit.py carga», que no se guardan en el repositorio.
.EXAMPLE
  ./cargar-lista.ps1 -SiteUrl https://unimagdalena.sharepoint.com/sites/AcompanamientoEstudiantil -ClientId <id> -Lista Estudiantes -Csv ./Estudiantes_carga.csv
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $SiteUrl,
    [Parameter(Mandatory)] [string] $ClientId,
    [Parameter(Mandatory)] [string] $Lista,
    [Parameter(Mandatory)] [string] $Csv,
    [string] $Clave = 'Codigo',
    [int] $Lote = 500
)
$ErrorActionPreference = 'Stop'
Import-Module PnP.PowerShell
Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

$web = Get-PnPWeb -Includes RegionalSettings.LocaleId
$cultura = [Globalization.CultureInfo]::GetCultureInfo([int]$web.RegionalSettings.LocaleId)
$invariante = [Globalization.CultureInfo]::InvariantCulture
$campos = Get-PnPField -List $Lista | Where-Object { -not $_.Hidden }
$tipos = @{}; foreach ($f in $campos) { $tipos[$f.InternalName] = $f.TypeAsString }

function Convertir($interno, $valor) {
    if ([string]::IsNullOrWhiteSpace($valor)) { return $null }
    switch ($tipos[$interno]) {
        'DateTime' { return [datetime]::ParseExact($valor, 'yyyy-MM-dd', $invariante).ToString($cultura.DateTimeFormat.ShortDatePattern, $cultura) }
        'Number'   { return ([double]::Parse($valor, $invariante)).ToString($cultura) }
        default    { return $valor }
    }
}

$filas = Import-Csv -Path $Csv -Encoding utf8
$desconocidas = $filas[0].PSObject.Properties.Name | Where-Object { -not $tipos.ContainsKey($_) }
if ($desconocidas) { throw "Columnas del CSV que no existen en la lista ${Lista}: $($desconocidas -join ', ')" }

Write-Host "Leyendo la lista $Lista..."
$existentes = @{}
Get-PnPListItem -List $Lista -PageSize 2000 -Fields $Clave | ForEach-Object { $existentes[[string]$_.FieldValues[$Clave]] = $_.Id }
Write-Host "  $($existentes.Count) filas ya cargadas; $($filas.Count) en el CSV"

$nuevas = 0; $actualizadas = 0; $b = New-PnPBatch; $enLote = 0
foreach ($fila in $filas) {
    $valores = @{}
    foreach ($p in $fila.PSObject.Properties) { $valores[$p.Name] = Convertir $p.Name $p.Value }
    $clave = [string]$fila.$Clave
    if ($existentes.ContainsKey($clave)) { Set-PnPListItem -List $Lista -Identity $existentes[$clave] -Values $valores -Batch $b; $actualizadas++ }
    else { Add-PnPListItem -List $Lista -Values $valores -Batch $b; $nuevas++ }
    $enLote++
    if ($enLote -ge $Lote) { Invoke-PnPBatch -Batch $b -StopOnException; $b = New-PnPBatch; $enLote = 0; Write-Host "  $($nuevas + $actualizadas) de $($filas.Count)" }
}
if ($enLote -gt 0) { Invoke-PnPBatch -Batch $b -StopOnException }
Write-Host "Listo: $nuevas nuevas y $actualizadas actualizadas en $Lista."
