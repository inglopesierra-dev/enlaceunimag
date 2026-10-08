# Receta de la app (respaldo manual)

Generado por `generar_app.py`. Úsalo si «Pegar código» no funciona en tu versión de Power Apps Studio: inserta cada control con el nombre indicado y copia sus propiedades.
Las fórmulas usan comas. Si tu Power Apps está en español y usa punto y coma, cambia `,` por `;` y `;` por `;;` (o usa la configuración regional en inglés mientras construyes).

## scrInicio

| Propiedad de la pantalla | Fórmula |
|---|---|
| Fill | ver abajo |
| OnVisible | ver abajo |

**Fill**

```
fxC.Fondo
```

**OnVisible**

```
If(IsBlank(varUnidadPend) Or Not(varUnidadPend in fxGestionaReservadas.Codigo), Set(varUnidadPend, First(fxGestionaReservadas).Codigo))
```

### rectEncInicio · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Acento` |
| Height | `64` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `0` |

### lblEncTituloInicio · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Acompañamiento Estudiantil"` |
| Width | `520` |
| X | `24` |
| Y | `0` |

### lblEncUsuarioInicio · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Right` |
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `600` |
| X | `Parent.Width - 624` |
| Y | `0` |

**Text**

```
fxNombreYo & "  ·  " & If(fxEsAdmin, "Administración", If(IsEmpty(fxGestiona), "Personal", Concat(fxGestiona, Corto, ", ")))
```

### conBuscar · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 112` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Width | `Parent.Width * 0.58 - 36` |
| X | `24` |
| Y | `88` |

#### lblBuscarTitulo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `28` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `16` |
| Text | `"Buscar estudiante"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `18` |

#### lblBuscarAyuda · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| Wrap | `true` |
| X | `24` |
| Y | `50` |

**Text**

```
"Escribe el código o el documento completos, o las primeras letras del primer apellido o del primer nombre (mínimo 3). No importan las tildes."
```

#### txtBuscar · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| DelayOutput | `true` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `44` |
| HintText | `"Código, documento o apellido"` |
| HoverBorderColor | `fxC.Acento` |
| PaddingLeft | `40` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `96` |

#### icoBuscar · Icono

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Height | `24` |
| Icon | `Icon.Search` |
| Width | `24` |
| X | `34` |
| Y | `106` |

#### lblConteo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `146` |

**Text**

```
If(Len(Trim(txtBuscar.Text)) < 3, "", CountRows(galResultados.AllItems) & If(CountRows(galResultados.AllItems) = 1, " resultado", " resultados"))
```

#### galResultados · Galería en blanco (galleryVertical)

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 180` |
| Items | ver abajo |
| LoadingSpinner | `LoadingSpinner.Data` |
| LoadingSpinnerColor | `fxC.Acento` |
| OnSelect | ver abajo |
| ShowScrollbar | `true` |
| TemplatePadding | `0` |
| TemplateSize | `72` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `172` |

**Items**

```
With({q: Trim(txtBuscar.Text)},
    If(
        Len(q) < 3, Blank(),
        IsMatch(q, "\d+"),
            With({r: Filter(Estudiantes, 'Código' = q)}, If(IsEmpty(r), Filter(Estudiantes, Documento = q), r)),
        With({t: Substitute(Substitute(Substitute(Substitute(Substitute(Substitute(Substitute(Upper(q), "Á", "A"), "É", "E"), "Í", "I"), "Ó", "O"), "Ú", "U"), "Ü", "U"), "Ñ", "N")},
            With({r: Filter(Estudiantes, StartsWith('Búsqueda', t))},
                If(IsEmpty(r), Filter(Estudiantes, StartsWith('Búsqueda por nombre', t)), r)))
    )
)
```

**OnSelect**

```
Set(varEst, LookUp(Estudiantes, 'Código' = ThisItem.'Código'));
Set(varTab, "resumen");
Navigate(scrFicha, ScreenTransition.None)
```

##### lblResNombre · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| OnSelect | `Select(Parent)` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `13` |
| Text | `ThisItem.'Nombre completo'` |
| Width | `Parent.TemplateWidth - 90` |
| X | `20` |
| Y | `12` |

##### lblResDetalle · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `22` |
| OnSelect | `Select(Parent)` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.TemplateWidth - 90` |
| X | `20` |
| Y | `38` |

**Text**

```
ThisItem.'Código' & "  ·  " & ThisItem.Programa & "  ·  " & ThisItem.Facultad & If(ThisItem.Matriculado = "SI", "", "  ·  No matriculado")
```

##### icoResIr · Icono

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Height | `36` |
| Icon | `Icon.ChevronRight` |
| OnSelect | `Select(Parent)` |
| Width | `36` |
| X | `Parent.TemplateWidth - 56` |
| Y | `20` |

##### rectResLinea · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Borde` |
| Height | `1` |
| Width | `Parent.TemplateWidth - 40` |
| X | `20` |
| Y | `Parent.TemplateHeight - 1` |

### conPendientes · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 112` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Width | `Parent.Width * 0.42 - 36` |
| X | `Parent.Width * 0.58 + 12` |
| Y | `88` |

#### lblPendTitulo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `28` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `16` |
| Text | `"Bandeja de tu unidad"` |
| Width | `Parent.Width - 40` |
| X | `20` |
| Y | `18` |

#### lblPendAyuda · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 40` |
| Wrap | `true` |
| X | `20` |
| Y | `50` |

**Text**

```
"Solicitudes del formulario y remisiones que esperan respuesta. Solo ves las de las unidades a las que perteneces."
```

#### galUnidadesPend · Galería en blanco (galleryHorizontal)

| Propiedad | Fórmula |
|---|---|
| Height | `44` |
| Items | `fxGestionaReservadas` |
| LoadingSpinner | `LoadingSpinner.Data` |
| LoadingSpinnerColor | `fxC.Acento` |
| ShowScrollbar | `false` |
| TemplatePadding | `0` |
| TemplateSize | `150` |
| Visible | `Not(IsEmpty(fxGestionaReservadas))` |
| Width | `Parent.Width - 32` |
| X | `16` |
| Y | `96` |

##### btnUnidadPend · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Reservado` |
| BorderThickness | `1` |
| Color | `If(varUnidadPend = ThisItem.Codigo, fxC.Blanco, fxC.Reservado)` |
| Fill | `If(varUnidadPend = ThisItem.Codigo, fxC.Reservado, fxC.Blanco)` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `32` |
| HoverColor | `fxC.Reservado` |
| HoverFill | `fxC.ReservadoSuave` |
| OnSelect | `Set(varUnidadPend, ThisItem.Codigo)` |
| PressedFill | `fxC.ReservadoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `11` |
| Text | `ThisItem.Corto` |
| Width | `Parent.TemplateWidth - 8` |
| X | `4` |
| Y | `4` |

#### lblSinUnidad · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `60` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | ver abajo |
| Visible | `IsEmpty(fxGestionaReservadas)` |
| Width | `Parent.Width - 40` |
| Wrap | `true` |
| X | `20` |
| Y | `100` |

**Text**

```
"No tienes una unidad con seguimiento reservado. Puedes buscar estudiantes, ver los datos visibles y remitir a cualquier unidad."
```

#### lblPendVacio · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `"No hay pendientes en esta unidad."` |
| Visible | `Not(IsEmpty(fxGestionaReservadas)) And IsEmpty(galPendientes.AllItems)` |
| Width | `Parent.Width - 40` |
| X | `20` |
| Y | `156` |

#### galPendientes · Galería en blanco (galleryVertical)

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 156` |
| Items | ver abajo |
| LoadingSpinner | `LoadingSpinner.Data` |
| LoadingSpinnerColor | `fxC.Acento` |
| OnSelect | ver abajo |
| ShowScrollbar | `true` |
| TemplatePadding | `0` |
| TemplateSize | `86` |
| Visible | `Not(IsEmpty(fxGestionaReservadas))` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `148` |

**Items**

```
Sort(Switch(varUnidadPend,
    "DEA", ForAll(Filter('Seguimiento Desarrollo Estudiantil', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "DPS", ForAll(Filter('Seguimiento Psicología DE', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "PSI", ForAll(Filter('Seguimiento Psicología', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "SAL", ForAll(Filter('Seguimiento Salud', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "GAV", ForAll(Filter('Seguimiento GAV', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "CES", ForAll(Filter('Seguimiento Centro de Escucha', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "TSO", ForAll(Filter('Seguimiento Trabajo Social', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "ENL", ForAll(Filter('Seguimiento Enlaces', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "PRP", ForAll(Filter('Seguimiento Riesgo Psicosocial', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "PRS", ForAll(Filter('Seguimiento Prevención Salud', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "ORE", ForAll(Filter('Seguimiento Orientación Espiritual', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "CAI", ForAll(Filter('Seguimiento Infancia CAI', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "SAF", ForAll(Filter('Seguimiento Sala Amiga', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen}),
    "IPS", ForAll(Filter('Seguimiento IPS FUNPRONIMA', Estado = "Pendiente"), {Id: ID, Codigo: 'Código', Estudiante: Estudiante, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Motivo: Motivo, Remitido: 'Remitido por', Prioridad: Prioridad, Origen: Origen})
), Fecha, SortOrder.Descending)
```

**OnSelect**

```
If(IsBlank(LookUp(Estudiantes, 'Código' = ThisItem.Codigo)),
    Notify("El código " & ThisItem.Codigo & " no está en la base de estudiantes. Revísalo en la lista de la unidad.", NotificationType.Warning),
    Set(varEst, LookUp(Estudiantes, 'Código' = ThisItem.Codigo));
    Set(varUnidad, varUnidadPend);
    Set(varTab, "seguimiento");
    Navigate(scrFicha, ScreenTransition.None)
)
```

##### lblPendEst · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `22` |
| OnSelect | `Select(Parent)` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `Coalesce(ThisItem.Estudiante, ThisItem.Codigo)` |
| Width | `Parent.TemplateWidth - 130` |
| X | `16` |
| Y | `10` |

##### lblPendInfo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `20` |
| OnSelect | `Select(Parent)` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.TemplateWidth - 130` |
| X | `16` |
| Y | `34` |

**Text**

```
ThisItem.Tipo & If(IsBlank(ThisItem.Servicio), "", "  ·  " & ThisItem.Servicio) & "  ·  " & Text(ThisItem.Fecha, "dd/mm/yyyy")
```

##### lblPendOrigen · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `If(ThisItem.Prioridad = "Urgente", fxC.Error, fxC.Tenue)` |
| Font | `Font.'Segoe UI'` |
| Height | `20` |
| OnSelect | `Select(Parent)` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.TemplateWidth - 130` |
| X | `16` |
| Y | `56` |

**Text**

```
If(IsBlank(ThisItem.Remitido), ThisItem.Origen, "De: " & ThisItem.Remitido) & If(ThisItem.Prioridad = "Normal" Or IsBlank(ThisItem.Prioridad), "", "  ·  Prioridad " & Lower(ThisItem.Prioridad))
```

##### btnTomar · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| Fill | `fxC.Acento` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `34` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Acento, -15%)` |
| OnSelect | ver abajo |
| PressedFill | `ColorFade(fxC.Acento, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Tomar"` |
| Tooltip | `"Asignármela y pasarla a En curso"` |
| Width | `88` |
| X | `Parent.TemplateWidth - 104` |
| Y | `24` |

**OnSelect**

```
Switch(varUnidadPend,
    "DEA", IfError(Patch('Seguimiento Desarrollo Estudiantil', LookUp('Seguimiento Desarrollo Estudiantil', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "DPS", IfError(Patch('Seguimiento Psicología DE', LookUp('Seguimiento Psicología DE', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "PSI", IfError(Patch('Seguimiento Psicología', LookUp('Seguimiento Psicología', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "SAL", IfError(Patch('Seguimiento Salud', LookUp('Seguimiento Salud', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "GAV", IfError(Patch('Seguimiento GAV', LookUp('Seguimiento GAV', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "CES", IfError(Patch('Seguimiento Centro de Escucha', LookUp('Seguimiento Centro de Escucha', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "TSO", IfError(Patch('Seguimiento Trabajo Social', LookUp('Seguimiento Trabajo Social', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "ENL", IfError(Patch('Seguimiento Enlaces', LookUp('Seguimiento Enlaces', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "PRP", IfError(Patch('Seguimiento Riesgo Psicosocial', LookUp('Seguimiento Riesgo Psicosocial', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "PRS", IfError(Patch('Seguimiento Prevención Salud', LookUp('Seguimiento Prevención Salud', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "ORE", IfError(Patch('Seguimiento Orientación Espiritual', LookUp('Seguimiento Orientación Espiritual', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "CAI", IfError(Patch('Seguimiento Infancia CAI', LookUp('Seguimiento Infancia CAI', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "SAF", IfError(Patch('Seguimiento Sala Amiga', LookUp('Seguimiento Sala Amiga', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success)),
    "IPS", IfError(Patch('Seguimiento IPS FUNPRONIMA', LookUp('Seguimiento IPS FUNPRONIMA', ID = ThisItem.Id), {Estado: "En curso", 'Asignado a': fxYo}), Notify("No se pudo tomar: " & FirstError.Message, NotificationType.Error), Notify("Quedó a tu nombre y en curso.", NotificationType.Success))
)
```

##### rectPendLinea · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Borde` |
| Height | `1` |
| Width | `Parent.TemplateWidth - 32` |
| X | `16` |
| Y | `Parent.TemplateHeight - 1` |

## scrFicha

| Propiedad de la pantalla | Fórmula |
|---|---|
| Fill | ver abajo |
| OnVisible | ver abajo |

**Fill**

```
fxC.Fondo
```

**OnVisible**

```
Set(varEdad, With({n: varEst.'Fecha de nacimiento'}, If(IsBlank(n), Blank(), Year(Today()) - Year(n) - If(Month(Today()) * 100 + Day(Today()) < Month(n) * 100 + Day(n), 1, 0))));
If(IsBlank(varTab) Or (varTab = "seguimiento" And IsEmpty(fxLectura)), Set(varTab, "resumen"));
If(IsBlank(varUnidad) Or Not(varUnidad in fxLectura.Codigo), Set(varUnidad, First(fxLectura).Codigo));
Set(varAnulando, false)
```

### rectEncFicha · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Acento` |
| Height | `64` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `0` |

### lblEncTituloFicha · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Acompañamiento Estudiantil"` |
| Width | `520` |
| X | `72` |
| Y | `0` |

### lblEncUsuarioFicha · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Right` |
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `600` |
| X | `Parent.Width - 624` |
| Y | `0` |

**Text**

```
fxNombreYo & "  ·  " & If(fxEsAdmin, "Administración", If(IsEmpty(fxGestiona), "Personal", Concat(fxGestiona, Corto, ", ")))
```

### icoAtrasFicha · Icono

| Propiedad | Fórmula |
|---|---|
| AccessibleLabel | `"Volver"` |
| Color | `fxC.Blanco` |
| Height | `40` |
| Icon | `Icon.ArrowLeft` |
| OnSelect | `Navigate(scrInicio, ScreenTransition.None)` |
| PaddingBottom | `8` |
| PaddingLeft | `8` |
| PaddingRight | `8` |
| PaddingTop | `8` |
| Tooltip | `"Volver"` |
| Width | `40` |
| X | `16` |
| Y | `12` |

### conFichaHead · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `128` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `80` |

#### lblNombre · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `32` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `20` |
| Text | `varEst.'Nombre completo'` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `14` |

#### lblIdent · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | ver abajo |
| Width | `Parent.Width * 0.5` |
| X | `24` |
| Y | `48` |

**Text**

```
"Código " & varEst.'Código' & "  ·  " & varEst.'Tipo de documento' & " " & varEst.Documento & If(IsBlank(varEdad), "", "  ·  " & varEdad & " años")
```

#### lblMenor · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Center` |
| Color | `fxC.Aviso` |
| Fill | `fxC.AvisoSuave` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `26` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Menor de edad: los datos sensibles requieren la autorización de su representante legal"` |
| Visible | `Not(IsBlank(varEdad)) And varEdad < 18` |
| Width | `Parent.Width * 0.5 - 24` |
| X | `Parent.Width * 0.5` |
| Y | `46` |

#### htmlChips · Texto HTML

| Propiedad | Fórmula |
|---|---|
| Height | `40` |
| HtmlText | ver abajo |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `80` |

**HtmlText**

```
"<div style='font-family:Segoe UI, sans-serif;font-size:12px'>" &
Concat(
    Filter(
        Table(
            {t: varEst.Facultad, e: ""},
            {t: varEst.Programa, e: ""},
            {t: If(IsBlank(varEst.Periodo), "", "Periodo " & varEst.Periodo), e: ""},
            {t: If(varEst.Matriculado = "SI", "Matriculado", "No matriculado"), e: If(varEst.Matriculado = "SI", "ok", "aviso")},
            {t: If(IsBlank(varEst.Promedio), "Sin promedio", "Promedio " & Text(varEst.Promedio, "0.00")), e: ""},
            {t: If(IsBlank(varEst.Estrato), "", "Estrato " & varEst.Estrato), e: ""},
            {t: If(varEst.'Cupo especial' = "N/A", "", varEst.'Cupo especial'), e: ""}
        ),
        Not(IsBlank(t))
    ),
    "<span style='display:inline-block;margin:0 6px 6px 0;padding:3px 10px;border-radius:12px;background:" & Switch(e, "ok", "#E6F3F4", "aviso", "#FFF4E0", "#EEF2F6") & ";color:" & Switch(e, "ok", "#0A6C76", "aviso", "#965500", "#16324F") & "'>" & t & "</span>"
) & "</div>"
```

### btnTabResumen · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `If(varTab = "resumen", fxC.Blanco, fxC.Texto)` |
| Fill | `If(varTab = "resumen", fxC.Acento, fxC.Blanco)` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `38` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.AcentoSuave` |
| OnSelect | `Set(varTab, "resumen"); Set(varAnulando, false)` |
| PressedFill | `fxC.AcentoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Resumen"` |
| Visible | `true` |
| Width | `188` |
| X | `24 + 0 * 196` |
| Y | `220` |

### btnTabBienestar · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `If(varTab = "bienestar", fxC.Blanco, fxC.Texto)` |
| Fill | `If(varTab = "bienestar", fxC.Acento, fxC.Blanco)` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `38` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.AcentoSuave` |
| OnSelect | `Set(varTab, "bienestar"); Set(varAnulando, false)` |
| PressedFill | `fxC.AcentoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Bienestar"` |
| Visible | `true` |
| Width | `188` |
| X | `24 + 1 * 196` |
| Y | `220` |

### btnTabSeguimiento · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `If(varTab = "seguimiento", fxC.Blanco, fxC.Texto)` |
| Fill | `If(varTab = "seguimiento", fxC.Acento, fxC.Blanco)` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `38` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.AcentoSuave` |
| OnSelect | `Set(varTab, "seguimiento"); Set(varAnulando, false)` |
| PressedFill | `fxC.AcentoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Seguimiento reservado"` |
| Visible | `Not(IsEmpty(fxLectura))` |
| Width | `188` |
| X | `24 + 2 * 196` |
| Y | `220` |

### btnTabRemitir · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `If(varTab = "remitir", fxC.Blanco, fxC.Texto)` |
| Fill | `If(varTab = "remitir", fxC.Acento, fxC.Blanco)` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `38` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.AcentoSuave` |
| OnSelect | `Set(varTab, "remitir"); Set(varAnulando, false)` |
| PressedFill | `fxC.AcentoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Remitir"` |
| Visible | `true` |
| Width | `188` |
| X | `If(IsEmpty(fxLectura), 24 + 2 * 196, 24 + 3 * 196)` |
| Y | `220` |

### conResumen · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 290` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Visible | `varTab = "resumen"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `270` |

#### htmlResumen · Texto HTML

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 70` |
| HtmlText | ver abajo |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `16` |

**HtmlText**

```
"<div style='font-family:Segoe UI, sans-serif;font-size:13px;color:#16324F;display:flex;gap:32px;flex-wrap:wrap'>" &
"<div style='flex:1;min-width:280px'><div style='font-weight:600;margin-bottom:8px'>Datos básicos</div>" &
Concat(Table(
        {k: "Nombres", v: varEst.Nombres},
        {k: "Apellidos", v: varEst.Apellidos},
        {k: "Documento", v: varEst.'Tipo de documento' & " " & varEst.Documento},
        {k: "Sexo", v: varEst.Sexo},
        {k: "Fecha de nacimiento", v: If(IsBlank(varEst.'Fecha de nacimiento'), "", Text(varEst.'Fecha de nacimiento', "dd/mm/yyyy") & If(IsBlank(varEdad), "", " (" & varEdad & " años)"))},
        {k: "Modalidad de ingreso", v: varEst.'Modalidad de ingreso'},
        {k: "Plan de estudio", v: varEst.'Plan de estudio'},
        {k: "Cancelación de semestre", v: varEst.'Cancelación de semestre'}
    ), "<div style='display:flex;border-bottom:1px solid #D9E1EA;padding:6px 0'><span style='width:45%;color:#617182'>" & k & "</span><span style='width:55%'>" & Coalesce(v, "Sin dato") & "</span></div>") &
"</div><div style='flex:1;min-width:280px'><div style='font-weight:600;margin-bottom:8px'>Procedencia</div>" &
Concat(Table(
        {k: "Origen", v: varEst.Origen},
        {k: "Municipio y departamento", v: varEst.'Municipio de origen' & ", " & varEst.'Departamento de origen'},
        {k: "Colegio", v: varEst.Colegio},
        {k: "Tipo de colegio", v: varEst.'Tipo de colegio'},
        {k: "Ubicación del colegio", v: varEst.'Municipio del colegio' & ", " & varEst.'Departamento del colegio'},
        {k: "Periodo original", v: varEst.'Periodo original'},
        {k: "Fecha de corte de la base", v: Text(varEst.'Fecha de corte', "dd/mm/yyyy")}
    ), "<div style='display:flex;border-bottom:1px solid #D9E1EA;padding:6px 0'><span style='width:45%;color:#617182'>" & k & "</span><span style='width:55%'>" & Coalesce(v, "Sin dato") & "</span></div>") &
"</div></div>"
```

#### lblResumenNota · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `36` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| Wrap | `true` |
| X | `24` |
| Y | `Parent.Height - 48` |

**Text**

```
"Datos visibles para todo el personal del sistema. Los datos sensibles de ingreso (pertenencia étnica, víctima, discapacidad) solo los consulta Administración en SharePoint."
```

### conBienestar · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 290` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Visible | `varTab = "bienestar"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `270` |

#### lblBienBeneficios · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `28` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `14` |
| Text | `"Beneficios"` |
| Width | `(Parent.Width - 96) / 3 - 110` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### btnAgregarBeneficios · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `1` |
| Color | `fxC.Acento` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `32` |
| HoverColor | `fxC.Acento` |
| HoverFill | `fxC.AcentoSuave` |
| OnSelect | `Navigate(scrRegBeneficio, ScreenTransition.None)` |
| PressedFill | `fxC.AcentoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"+ Agregar"` |
| Visible | `"PDH" in fxGestiona.Codigo` |
| Width | `100` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24) + (Parent.Width - 96) / 3 - 100` |
| Y | `14` |

#### htmlBienBeneficios · Texto HTML

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 110` |
| HtmlText | ver abajo |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `52` |

**HtmlText**

```
With({r: Filter(Beneficios, 'Código' = varEst.'Código')},
    "<div style='font-family:Segoe UI, sans-serif;font-size:13px;color:#16324F'>" & 
    If(IsEmpty(r), "<div style='color:#617182;padding:8px 0'>Sin registros en programas de Desarrollo Humano.</div>",
        Concat(Sort(r, 'Fecha de inicio', SortOrder.Descending), "<div style='border-bottom:1px solid #D9E1EA;padding:8px 0'><div style='font-weight:600'>" & Programa & "</div><div style='color:#617182'>" & Estado & If(IsBlank(Periodo), "", " · " & Periodo) & If(IsBlank(Detalle), "", " · " & Detalle) & "</div></div>")) & "</div>")
```

#### lblBienDeportes · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `28` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `14` |
| Text | `"Deportes"` |
| Width | `(Parent.Width - 96) / 3 - 110` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### btnAgregarDeportes · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `1` |
| Color | `fxC.Acento` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `32` |
| HoverColor | `fxC.Acento` |
| HoverFill | `fxC.AcentoSuave` |
| OnSelect | `Navigate(scrRegDeportes, ScreenTransition.None)` |
| PressedFill | `fxC.AcentoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"+ Agregar"` |
| Visible | `"DEP" in fxGestiona.Codigo` |
| Width | `100` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24) + (Parent.Width - 96) / 3 - 100` |
| Y | `14` |

#### htmlBienDeportes · Texto HTML

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 110` |
| HtmlText | ver abajo |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `52` |

**HtmlText**

```
With({r: Filter(Deportes, 'Código' = varEst.'Código')},
    "<div style='font-family:Segoe UI, sans-serif;font-size:13px;color:#16324F'>" & If("DEPORTISTA" in Upper(varEst.'Cupo especial'), "<div style='margin-bottom:6px;color:#0A6C76'>Ingresó por cupo deportivo</div>", "") &
    If(IsEmpty(r), "<div style='color:#617182;padding:8px 0'>Sin registros en Deportes.</div>",
        Concat(Sort(r, Fecha, SortOrder.Descending), "<div style='border-bottom:1px solid #D9E1EA;padding:8px 0'><div style='font-weight:600'>" & 'Disciplina o servicio' & "</div><div style='color:#617182'>" & 'Tipo de registro' & If(ASCUN = "Sí", " · ASCUN", "") & If(IsBlank(Nivel), "", " · " & Nivel) & If(IsBlank(Estado), "", " · " & Estado) & "</div></div>")) & "</div>")
```

#### lblBienCultura · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `28` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `14` |
| Text | `"Cultura"` |
| Width | `(Parent.Width - 96) / 3 - 110` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### btnAgregarCultura · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `1` |
| Color | `fxC.Acento` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `32` |
| HoverColor | `fxC.Acento` |
| HoverFill | `fxC.AcentoSuave` |
| OnSelect | `Navigate(scrRegCultura, ScreenTransition.None)` |
| PressedFill | `fxC.AcentoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"+ Agregar"` |
| Visible | `"CUL" in fxGestiona.Codigo` |
| Width | `100` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24) + (Parent.Width - 96) / 3 - 100` |
| Y | `14` |

#### htmlBienCultura · Texto HTML

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 110` |
| HtmlText | ver abajo |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `52` |

**HtmlText**

```
With({r: Filter(Cultura, 'Código' = varEst.'Código')},
    "<div style='font-family:Segoe UI, sans-serif;font-size:13px;color:#16324F'>" & If("ARTISTA" in Upper(varEst.'Cupo especial'), "<div style='margin-bottom:6px;color:#0A6C76'>Ingresó por cupo de artista</div>", "") &
    If(IsEmpty(r), "<div style='color:#617182;padding:8px 0'>Sin registros en Cultura.</div>",
        Concat(Sort(r, Fecha, SortOrder.Descending), "<div style='border-bottom:1px solid #D9E1EA;padding:8px 0'><div style='font-weight:600'>" & 'Taller o grupo' & "</div><div style='color:#617182'>" & 'Tipo de registro' & If(IsBlank(Rol), "", " · " & Rol) & If(IsBlank(Estado), "", " · " & Estado) & "</div></div>")) & "</div>")
```

#### lblBienNota · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `36` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| Wrap | `true` |
| X | `24` |
| Y | `Parent.Height - 48` |

**Text**

```
"Visible para todo el personal del sistema: programas socioeconómicos, deporte y cultura. Para corregir un registro, ábrelo en la lista de SharePoint de su área."
```

### conSeguimiento · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 290` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Visible | `varTab = "seguimiento"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `270` |

#### galUnidadesSeg · Galería en blanco (galleryHorizontal)

| Propiedad | Fórmula |
|---|---|
| Height | `44` |
| Items | `fxLectura` |
| LoadingSpinner | `LoadingSpinner.Data` |
| LoadingSpinnerColor | `fxC.Acento` |
| ShowScrollbar | `false` |
| TemplatePadding | `0` |
| TemplateSize | `170` |
| Width | `Parent.Width - 240` |
| X | `16` |
| Y | `12` |

##### btnUnidadSeg · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Reservado` |
| BorderThickness | `1` |
| Color | `If(varUnidad = ThisItem.Codigo, fxC.Blanco, fxC.Reservado)` |
| Fill | `If(varUnidad = ThisItem.Codigo, fxC.Reservado, fxC.Blanco)` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `32` |
| HoverColor | `fxC.Reservado` |
| HoverFill | `fxC.ReservadoSuave` |
| OnSelect | `Set(varUnidad, ThisItem.Codigo); Set(varAnulando, false)` |
| PressedFill | `fxC.ReservadoSuave` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `11` |
| Text | `ThisItem.Corto` |
| Width | `Parent.TemplateWidth - 8` |
| X | `4` |
| Y | `4` |

#### btnNuevoRegistro · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| Fill | `fxC.Acento` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `36` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Acento, -15%)` |
| OnSelect | `Navigate(scrRegSeguimiento, ScreenTransition.None)` |
| PressedFill | `ColorFade(fxC.Acento, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"+ Nuevo registro"` |
| Visible | `varUnidad in fxGestionaReservadas.Codigo` |
| Width | `176` |
| X | `Parent.Width - 196` |
| Y | `16` |

#### lblSegAviso · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Reservado` |
| Fill | `fxC.ReservadoSuave` |
| Font | `Font.'Segoe UI'` |
| Height | `36` |
| PaddingBottom | `0` |
| PaddingLeft | `10` |
| PaddingRight | `10` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 40` |
| Wrap | `true` |
| X | `20` |
| Y | `60` |

**Text**

```
"Reservado: solo lo ven " & LookUp(fxUnidades, Codigo = varUnidad).Nombre & " y Administración. No registres diagnósticos, medicamentos ni detalles íntimos: la historia clínica sigue en el sistema del área." & If(varUnidad in fxGestionaReservadas.Codigo, "", " Tienes acceso de consulta.")
```

#### lblSegVacio · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `"Sin registros de esta unidad para el estudiante."` |
| Visible | `IsEmpty(galSeg.AllItems)` |
| Width | `Parent.Width - 40` |
| X | `20` |
| Y | `112` |

#### galSeg · Galería en blanco (galleryVertical)

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 112` |
| Items | ver abajo |
| LoadingSpinner | `LoadingSpinner.Data` |
| LoadingSpinnerColor | `fxC.Acento` |
| ShowScrollbar | `true` |
| TemplatePadding | `0` |
| TemplateSize | `132` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `104` |

**Items**

```
Sort(Switch(varUnidad,
    "DEA", ForAll(Filter('Seguimiento Desarrollo Estudiantil', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "DPS", ForAll(Filter('Seguimiento Psicología DE', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "PSI", ForAll(Filter('Seguimiento Psicología', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "SAL", ForAll(Filter('Seguimiento Salud', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "GAV", ForAll(Filter('Seguimiento GAV', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "CES", ForAll(Filter('Seguimiento Centro de Escucha', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "TSO", ForAll(Filter('Seguimiento Trabajo Social', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "ENL", ForAll(Filter('Seguimiento Enlaces', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "PRP", ForAll(Filter('Seguimiento Riesgo Psicosocial', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "PRS", ForAll(Filter('Seguimiento Prevención Salud', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "ORE", ForAll(Filter('Seguimiento Orientación Espiritual', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "CAI", ForAll(Filter('Seguimiento Infancia CAI', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "SAF", ForAll(Filter('Seguimiento Sala Amiga', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'}),
    "IPS", ForAll(Filter('Seguimiento IPS FUNPRONIMA', 'Código' = varEst.'Código'), {Id: ID, Fecha: Fecha, Tipo: 'Tipo de registro', Servicio: Servicio, Modalidad: Modalidad, Motivo: Motivo, Resumen: Resumen, Proxima: 'Próxima acción', FechaProx: 'Fecha próxima acción', Estado: Estado, Prioridad: Prioridad, Origen: Origen, Remitido: 'Remitido por', Registrado: 'Registrado por', Autorizacion: 'Autorización de datos', Anulacion: 'Motivo de anulación', Asignado: 'Asignado a'})
), Fecha, SortOrder.Descending)
```

##### lblSegTitulo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | ver abajo |
| Width | `Parent.TemplateWidth - 210` |
| X | `16` |
| Y | `10` |

**Text**

```
Text(ThisItem.Fecha, "dd/mm/yyyy") & "  ·  " & ThisItem.Tipo & If(IsBlank(ThisItem.Servicio), "", "  ·  " & ThisItem.Servicio) & If(IsBlank(ThisItem.Motivo), "", "  ·  " & ThisItem.Motivo)
```

##### lblSegEstado · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Center` |
| Color | ver abajo |
| Fill | ver abajo |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `ThisItem.Estado` |
| Width | `110` |
| X | `Parent.TemplateWidth - 186` |
| Y | `10` |

**Color**

```
Switch(ThisItem.Estado, "Pendiente", fxC.Aviso, "Anulado", fxC.Tenue, "Cerrado", fxC.Acento, fxC.Reservado)
```

**Fill**

```
Switch(ThisItem.Estado, "Pendiente", fxC.AvisoSuave, "Anulado", fxC.Fondo, "Cerrado", fxC.AcentoSuave, fxC.ReservadoSuave)
```

##### icoAnular · Icono

| Propiedad | Fórmula |
|---|---|
| AccessibleLabel | `"Anular registro"` |
| Color | `fxC.Error` |
| Height | `36` |
| Icon | `Icon.Cancel` |
| OnSelect | `Set(varAnular, ThisItem); Set(varAnulando, true); Reset(txtMotivoAnular)` |
| PaddingBottom | `8` |
| PaddingLeft | `8` |
| PaddingRight | `8` |
| PaddingTop | `8` |
| Tooltip | `"Anular (no se borra: queda en el historial)"` |
| Visible | `ThisItem.Estado <> "Anulado" And varUnidad in fxGestionaReservadas.Codigo` |
| Width | `36` |
| X | `Parent.TemplateWidth - 60` |
| Y | `6` |

##### lblSegResumen · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `44` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Strikethrough | `ThisItem.Estado = "Anulado"` |
| Text | `ThisItem.Resumen` |
| VerticalAlign | `VerticalAlign.Top` |
| Width | `Parent.TemplateWidth - 32` |
| Wrap | `true` |
| X | `16` |
| Y | `36` |

##### lblSegMeta · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `38` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| VerticalAlign | `VerticalAlign.Top` |
| Width | `Parent.TemplateWidth - 32` |
| Wrap | `true` |
| X | `16` |
| Y | `84` |

**Text**

```
"Registró: " & ThisItem.Registrado & If(IsBlank(ThisItem.Asignado), "", "  ·  A cargo: " & ThisItem.Asignado) & If(IsBlank(ThisItem.Proxima), "", "  ·  Próxima acción: " & ThisItem.Proxima & If(IsBlank(ThisItem.FechaProx), "", " (" & Text(ThisItem.FechaProx, "dd/mm/yyyy") & ")")) & If(IsBlank(ThisItem.Remitido), "", "  ·  Remitido por: " & ThisItem.Remitido) & If(ThisItem.Estado = "Anulado", "  ·  Motivo de anulación: " & ThisItem.Anulacion, "")
```

##### rectSegLinea · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Borde` |
| Height | `1` |
| Width | `Parent.TemplateWidth - 32` |
| X | `16` |
| Y | `Parent.TemplateHeight - 1` |

#### conAnular · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.Bold` |
| Fill | `fxC.Blanco` |
| Height | `236` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Visible | `varAnulando` |
| Width | `420` |
| X | `Parent.Width - 444` |
| Y | `60` |

##### lblAnularTitulo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `14` |
| Text | `"Anular el registro del " & Text(varAnular.Fecha, "dd/mm/yyyy")` |
| Width | `Parent.Width - 40` |
| X | `20` |
| Y | `16` |

##### lblAnularAyuda · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"No se borra: queda en el historial de versiones con tu nombre. Escribe por qué se anula."` |
| Width | `Parent.Width - 40` |
| Wrap | `true` |
| X | `20` |
| Y | `44` |

##### txtMotivoAnular · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `64` |
| HintText | `"Motivo de la anulación"` |
| HoverBorderColor | `fxC.Acento` |
| Mode | `TextMode.MultiLine` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `Parent.Width - 40` |
| X | `20` |
| Y | `90` |

##### btnConfirmarAnular · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Error` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| DisplayMode | `If(Len(Trim(txtMotivoAnular.Text)) < 5, DisplayMode.Disabled, DisplayMode.Edit)` |
| Fill | `fxC.Error` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `38` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Error, -15%)` |
| OnSelect | ver abajo |
| PressedFill | `ColorFade(fxC.Error, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Anular"` |
| Width | `100` |
| X | `Parent.Width - 236` |
| Y | `172` |

**OnSelect**

```
Switch(varUnidad,
    "DEA", IfError(Patch('Seguimiento Desarrollo Estudiantil', LookUp('Seguimiento Desarrollo Estudiantil', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "DPS", IfError(Patch('Seguimiento Psicología DE', LookUp('Seguimiento Psicología DE', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "PSI", IfError(Patch('Seguimiento Psicología', LookUp('Seguimiento Psicología', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "SAL", IfError(Patch('Seguimiento Salud', LookUp('Seguimiento Salud', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "GAV", IfError(Patch('Seguimiento GAV', LookUp('Seguimiento GAV', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "CES", IfError(Patch('Seguimiento Centro de Escucha', LookUp('Seguimiento Centro de Escucha', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "TSO", IfError(Patch('Seguimiento Trabajo Social', LookUp('Seguimiento Trabajo Social', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "ENL", IfError(Patch('Seguimiento Enlaces', LookUp('Seguimiento Enlaces', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "PRP", IfError(Patch('Seguimiento Riesgo Psicosocial', LookUp('Seguimiento Riesgo Psicosocial', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "PRS", IfError(Patch('Seguimiento Prevención Salud', LookUp('Seguimiento Prevención Salud', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "ORE", IfError(Patch('Seguimiento Orientación Espiritual', LookUp('Seguimiento Orientación Espiritual', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "CAI", IfError(Patch('Seguimiento Infancia CAI', LookUp('Seguimiento Infancia CAI', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "SAF", IfError(Patch('Seguimiento Sala Amiga', LookUp('Seguimiento Sala Amiga', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false)),
    "IPS", IfError(Patch('Seguimiento IPS FUNPRONIMA', LookUp('Seguimiento IPS FUNPRONIMA', ID = varAnular.Id), {Estado: "Anulado", 'Motivo de anulación': Trim(txtMotivoAnular.Text)}), Notify("No se pudo anular: " & FirstError.Message, NotificationType.Error), Notify("Registro anulado.", NotificationType.Success); Set(varAnulando, false))
)
```

##### btnCancelarAnular · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `38` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.Fondo` |
| OnSelect | `Set(varAnulando, false)` |
| PressedFill | `fxC.Fondo` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Cancelar"` |
| Width | `100` |
| X | `Parent.Width - 124` |
| Y | `172` |

### conRemitir · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 290` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Visible | `varTab = "remitir"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `270` |

#### lblRemTitulo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `28` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `14` |
| Text | `"Remitir a otra unidad"` |
| Width | `(Parent.Width - 72) / 2` |
| X | `24` |
| Y | `16` |

#### lblRemAyuda · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `54` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `(Parent.Width - 72) / 2` |
| Wrap | `true` |
| X | `24` |
| Y | `46` |

**Text**

```
"La remisión llega a la bandeja de la unidad destino. Tú solo verás el estado de las remisiones que hagas. Escribe hechos y lo que esperas, sin diagnósticos ni detalles íntimos."
```

#### lblDestino · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Unidad destino"` |
| Width | `(Parent.Width - 72) / 2` |
| X | `24` |
| Y | `106` |

#### ddDestino · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `fxReservadas.Nombre` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 72) / 2` |
| X | `24` |
| Y | `128` |

#### lblMotivoRem · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Motivo general"` |
| Width | `(Parent.Width - 72) / 2 / 2 - 8` |
| X | `24` |
| Y | `178` |

#### ddMotivoRem · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | ver abajo |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 72) / 2 / 2 - 8` |
| X | `24` |
| Y | `200` |

**Items**

```
["Académico", "Adaptación a la vida universitaria", "Socioeconómico", "Emocional o psicológico", "Salud física", "Convivencia o relaciones", "Familiar", "Violencias o acoso", "Consumo de sustancias", "Discapacidad o accesibilidad", "Orientación vocacional", "Otro"]
```

#### lblPrioridadRem · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Prioridad"` |
| Width | `(Parent.Width - 72) / 2 / 2 - 8` |
| X | `24 + (Parent.Width - 72) / 2 / 2 + 8` |
| Y | `178` |

#### ddPrioridadRem · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `"Normal"` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Normal", "Alta", "Urgente"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 72) / 2 / 2 - 8` |
| X | `24 + (Parent.Width - 72) / 2 / 2 + 8` |
| Y | `200` |

#### lblNotaRem · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Qué observaste y qué esperas de la unidad"` |
| Width | `(Parent.Width - 72) / 2` |
| X | `24` |
| Y | `250` |

#### txtNotaRem · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `Parent.Height - 360` |
| HintText | ver abajo |
| HoverBorderColor | `fxC.Acento` |
| Mode | `TextMode.MultiLine` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `(Parent.Width - 72) / 2` |
| X | `24` |
| Y | `272` |

**HintText**

```
"Por ejemplo: faltó a tres clases y dice que no puede pagar el transporte; pide orientación."
```

#### btnEnviarRem · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| DisplayMode | `If(Len(Trim(txtNotaRem.Text)) < 10, DisplayMode.Disabled, DisplayMode.Edit)` |
| Fill | `fxC.Acento` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Acento, -15%)` |
| OnSelect | ver abajo |
| PressedFill | `ColorFade(fxC.Acento, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Enviar remisión"` |
| Width | `200` |
| X | `24` |
| Y | `Parent.Height - 72` |

**OnSelect**

```
Set(varDestino, LookUp(fxReservadas, Nombre = ddDestino.Selected.Nombre).Codigo);
Set(varRem, {'Código': varEst.'Código', Estudiante: varEst.'Nombre completo', Fecha: Today(), 'Tipo de registro': "Remisión recibida", Motivo: ddMotivoRem.Selected.Value, Resumen: Trim(txtNotaRem.Text), Estado: "Pendiente", Prioridad: ddPrioridadRem.Selected.Value, Origen: "Remisión de otra unidad", 'Remitido por': fxRemitente, 'Menor de edad': If(Not(IsBlank(varEdad)) And varEdad < 18, "Sí", "No"), 'Autorización de datos': "Pendiente", 'Registrado por': fxNombreYo, 'Correo de quien registra': fxYo});
Switch(varDestino,
    "DEA", IfError(Patch('Seguimiento Desarrollo Estudiantil', Defaults('Seguimiento Desarrollo Estudiantil'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "DPS", IfError(Patch('Seguimiento Psicología DE', Defaults('Seguimiento Psicología DE'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "PSI", IfError(Patch('Seguimiento Psicología', Defaults('Seguimiento Psicología'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "SAL", IfError(Patch('Seguimiento Salud', Defaults('Seguimiento Salud'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "GAV", IfError(Patch('Seguimiento GAV', Defaults('Seguimiento GAV'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "CES", IfError(Patch('Seguimiento Centro de Escucha', Defaults('Seguimiento Centro de Escucha'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "TSO", IfError(Patch('Seguimiento Trabajo Social', Defaults('Seguimiento Trabajo Social'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "ENL", IfError(Patch('Seguimiento Enlaces', Defaults('Seguimiento Enlaces'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "PRP", IfError(Patch('Seguimiento Riesgo Psicosocial', Defaults('Seguimiento Riesgo Psicosocial'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "PRS", IfError(Patch('Seguimiento Prevención Salud', Defaults('Seguimiento Prevención Salud'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "ORE", IfError(Patch('Seguimiento Orientación Espiritual', Defaults('Seguimiento Orientación Espiritual'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "CAI", IfError(Patch('Seguimiento Infancia CAI', Defaults('Seguimiento Infancia CAI'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "SAF", IfError(Patch('Seguimiento Sala Amiga', Defaults('Seguimiento Sala Amiga'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem)),
    "IPS", IfError(Patch('Seguimiento IPS FUNPRONIMA', Defaults('Seguimiento IPS FUNPRONIMA'), varRem), Notify("No se pudo remitir: " & FirstError.Message, NotificationType.Error), Notify("Remisión enviada a " & ddDestino.Selected.Nombre & ".", NotificationType.Success); Reset(txtNotaRem))
)
```

#### lblMisRemTitulo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `28` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `14` |
| Text | `"Tus remisiones a " & ddDestino.Selected.Nombre` |
| Width | `(Parent.Width - 72) / 2` |
| X | `48 + (Parent.Width - 72) / 2` |
| Y | `16` |

#### lblMisRemVacio · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `"No has remitido a este estudiante a esta unidad."` |
| Visible | `IsEmpty(galMisRem.AllItems)` |
| Width | `(Parent.Width - 72) / 2` |
| X | `48 + (Parent.Width - 72) / 2` |
| Y | `52` |

#### galMisRem · Galería en blanco (galleryVertical)

| Propiedad | Fórmula |
|---|---|
| Height | `Parent.Height - 64` |
| Items | ver abajo |
| LoadingSpinner | `LoadingSpinner.Data` |
| LoadingSpinnerColor | `fxC.Acento` |
| ShowScrollbar | `true` |
| TemplatePadding | `0` |
| TemplateSize | `64` |
| Width | `(Parent.Width - 72) / 2 + 12` |
| X | `36 + (Parent.Width - 72) / 2` |
| Y | `48` |

**Items**

```
Sort(Switch(LookUp(fxReservadas, Nombre = ddDestino.Selected.Nombre).Codigo,
    "DEA", ForAll(Filter('Seguimiento Desarrollo Estudiantil', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "DPS", ForAll(Filter('Seguimiento Psicología DE', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "PSI", ForAll(Filter('Seguimiento Psicología', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "SAL", ForAll(Filter('Seguimiento Salud', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "GAV", ForAll(Filter('Seguimiento GAV', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "CES", ForAll(Filter('Seguimiento Centro de Escucha', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "TSO", ForAll(Filter('Seguimiento Trabajo Social', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "ENL", ForAll(Filter('Seguimiento Enlaces', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "PRP", ForAll(Filter('Seguimiento Riesgo Psicosocial', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "PRS", ForAll(Filter('Seguimiento Prevención Salud', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "ORE", ForAll(Filter('Seguimiento Orientación Espiritual', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "CAI", ForAll(Filter('Seguimiento Infancia CAI', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "SAF", ForAll(Filter('Seguimiento Sala Amiga', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'}),
    "IPS", ForAll(Filter('Seguimiento IPS FUNPRONIMA', 'Código' = varEst.'Código' And 'Correo de quien registra' = fxYo And 'Tipo de registro' = "Remisión recibida"), {Id: ID, Fecha: Fecha, Estado: Estado, Motivo: Motivo, Prioridad: Prioridad, Asignado: 'Asignado a'})
), Fecha, SortOrder.Descending)
```

##### lblMiRemTitulo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `Text(ThisItem.Fecha, "dd/mm/yyyy") & "  ·  " & ThisItem.Motivo` |
| Width | `Parent.TemplateWidth - 140` |
| X | `16` |
| Y | `8` |

##### lblMiRemEstado · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Center` |
| Color | ver abajo |
| Fill | ver abajo |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `ThisItem.Estado` |
| Width | `108` |
| X | `Parent.TemplateWidth - 124` |
| Y | `8` |

**Color**

```
Switch(ThisItem.Estado, "Pendiente", fxC.Aviso, "Cerrado", fxC.Acento, "Anulado", fxC.Tenue, fxC.Reservado)
```

**Fill**

```
Switch(ThisItem.Estado, "Pendiente", fxC.AvisoSuave, "Cerrado", fxC.AcentoSuave, "Anulado", fxC.Fondo, fxC.ReservadoSuave)
```

##### lblMiRemDetalle · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.TemplateWidth - 32` |
| X | `16` |
| Y | `34` |

**Text**

```
"Prioridad " & Lower(ThisItem.Prioridad) & If(IsBlank(ThisItem.Asignado), "  ·  Sin asignar", "  ·  A cargo de " & ThisItem.Asignado)
```

##### rectMiRemLinea · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Borde` |
| Height | `1` |
| Width | `Parent.TemplateWidth - 32` |
| X | `16` |
| Y | `Parent.TemplateHeight - 1` |

## scrRegSeguimiento

| Propiedad de la pantalla | Fórmula |
|---|---|
| Fill | ver abajo |
| OnVisible | ver abajo |

**Fill**

```
fxC.Fondo
```

**OnVisible**

```
Set(varError, Blank());
Reset(dpSegFecha);
Reset(ddSegTipo);
Reset(ddSegServicio);
Reset(ddSegModalidad);
Reset(ddSegMotivo);
Reset(ddSegPrioridad);
Reset(ddSegEstado);
Reset(ddSegAutorizacion);
Reset(txtSegResumen);
Reset(txtSegProxima);
Reset(dpSegProxima)
```

### rectEncSeg · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Acento` |
| Height | `64` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `0` |

### lblEncTituloSeg · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Acompañamiento Estudiantil"` |
| Width | `520` |
| X | `72` |
| Y | `0` |

### lblEncUsuarioSeg · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Right` |
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `600` |
| X | `Parent.Width - 624` |
| Y | `0` |

**Text**

```
fxNombreYo & "  ·  " & If(fxEsAdmin, "Administración", If(IsEmpty(fxGestiona), "Personal", Concat(fxGestiona, Corto, ", ")))
```

### icoAtrasSeg · Icono

| Propiedad | Fórmula |
|---|---|
| AccessibleLabel | `"Volver"` |
| Color | `fxC.Blanco` |
| Height | `40` |
| Icon | `Icon.ArrowLeft` |
| OnSelect | `Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)` |
| PaddingBottom | `8` |
| PaddingLeft | `8` |
| PaddingRight | `8` |
| PaddingTop | `8` |
| Tooltip | `"Volver"` |
| Width | `40` |
| X | `16` |
| Y | `12` |

### lblTituloSeg · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `30` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Nuevo registro · " & LookUp(fxUnidades, Codigo = varUnidad).Nombre` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `80` |

### lblEstudianteSeg · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `112` |

**Text**

```
varEst.'Nombre completo' & "  ·  Código " & varEst.'Código' & If(Not(IsBlank(varEdad)) And varEdad < 18, "  ·  Menor de edad", "")
```

### lblAvisoSeg · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Reservado` |
| Font | `Font.'Segoe UI'` |
| Height | `34` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| Wrap | `true` |
| X | `24` |
| Y | `138` |

**Text**

```
"Reservado: solo lo verán esta unidad y Administración. La historia clínica sigue en el sistema del área; aquí va la constancia y el plan."
```

### conFormSeg · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 198` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `178` |

#### lbldpSegFecha · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Fecha *"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### dpSegFecha · Selector de fecha (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| Color | `fxC.Texto` |
| DefaultDate | `Today()` |
| Font | `Font.'Segoe UI'` |
| Format | `DateTimeFormat.ShortDate` |
| Height | `40` |
| IconBackground | `fxC.Acento` |
| IconFill | `fxC.Blanco` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lblddSegTipo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Tipo de registro"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### ddSegTipo · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Atención", "Seguimiento", "Actividad grupal", "Cierre"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lblddSegServicio · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Servicio"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### ddSegServicio · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | ver abajo |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

**Items**

```
Sort(Filter('Catálogo de servicios', Unidad = varUnidad And Activo = "Sí"), Orden).Servicio
```

#### lblddSegModalidad · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Modalidad"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddSegModalidad · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Presencial", "Virtual", "Telefónica", "Visita", "Grupal"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lblddSegMotivo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Motivo general"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddSegMotivo · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | ver abajo |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

**Items**

```
["Académico", "Adaptación a la vida universitaria", "Socioeconómico", "Emocional o psicológico", "Salud física", "Convivencia o relaciones", "Familiar", "Violencias o acoso", "Consumo de sustancias", "Discapacidad o accesibilidad", "Orientación vocacional", "Otro"]
```

#### lblddSegPrioridad · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Prioridad"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddSegPrioridad · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `"Normal"` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Normal", "Alta", "Urgente"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lblddSegEstado · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Estado"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `168` |

#### ddSegEstado · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `"En curso"` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Pendiente", "En curso", "Cerrado"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `190` |

#### lblddSegAutorizacion · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Autorización de datos"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `168` |

#### ddSegAutorizacion · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `If(Not(IsBlank(varEdad)) And varEdad < 18, "Pendiente", "Autorizada por el titular")` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | ver abajo |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `190` |

**Items**

```
["Autorizada por el titular", "Autorizada por el representante legal", "Pendiente", "No autoriza datos sensibles"]
```

#### lbltxtSegResumen · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Resumen: qué se hizo y qué sigue *"` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `244` |

#### txtSegResumen · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `96` |
| HintText | `"Hechos y acuerdos. Sin diagnósticos, medicamentos ni detalles íntimos."` |
| HoverBorderColor | `fxC.Acento` |
| Mode | `TextMode.MultiLine` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `266` |

#### lbltxtSegProxima · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Próxima acción"` |
| Width | `2 * (Parent.Width - 96) / 3 + 24` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `374` |

#### txtSegProxima · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HintText | `"Por ejemplo: revisar asistencia a tutoría"` |
| HoverBorderColor | `fxC.Acento` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `2 * (Parent.Width - 96) / 3 + 24` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `396` |

#### lbldpSegProxima · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Fecha de la próxima acción"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `374` |

#### dpSegProxima · Selector de fecha (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| Color | `fxC.Texto` |
| DefaultDate | `Blank()` |
| Font | `Font.'Segoe UI'` |
| Format | `DateTimeFormat.ShortDate` |
| Height | `40` |
| IconBackground | `fxC.Acento` |
| IconFill | `fxC.Blanco` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `396` |

#### lblErrorSeg · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Error` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `varError` |
| Visible | `Not(IsBlank(varError))` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `454` |

#### btnGuardarSeg · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| Fill | `fxC.Acento` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Acento, -15%)` |
| OnSelect | ver abajo |
| PressedFill | `ColorFade(fxC.Acento, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Guardar"` |
| Width | `160` |
| X | `24` |
| Y | `486` |

**OnSelect**

```
Set(varError, If(
    IsBlank(dpSegFecha.SelectedDate), "Indica la fecha.",
    IsBlank(ddSegServicio.Selected.Servicio), "Elige el servicio.",
    Len(Trim(txtSegResumen.Text)) < 10, "Escribe un resumen de al menos 10 caracteres.",
    Not(IsBlank(varEdad)) And varEdad < 18 And ddSegAutorizacion.Selected.Value = "Autorizada por el titular", "Es menor de edad: la autorización la da su representante legal. Si aún no la tienes, deja Pendiente.",
    Not(IsBlank(dpSegProxima.SelectedDate)) And IsBlank(Trim(txtSegProxima.Text)), "Describe la próxima acción o quita la fecha.",
    Blank()
));
If(IsBlank(varError),
    Set(varNuevo, {'Código': varEst.'Código', Estudiante: varEst.'Nombre completo', Fecha: dpSegFecha.SelectedDate, 'Tipo de registro': ddSegTipo.Selected.Value, Servicio: ddSegServicio.Selected.Servicio, Modalidad: ddSegModalidad.Selected.Value, Motivo: ddSegMotivo.Selected.Value, Resumen: Trim(txtSegResumen.Text), 'Próxima acción': Trim(txtSegProxima.Text), 'Fecha próxima acción': dpSegProxima.SelectedDate, Estado: ddSegEstado.Selected.Value, Prioridad: ddSegPrioridad.Selected.Value, Origen: "Iniciativa de la unidad", 'Menor de edad': If(Not(IsBlank(varEdad)) And varEdad < 18, "Sí", "No"), 'Autorización de datos': ddSegAutorizacion.Selected.Value, 'Registrado por': fxNombreYo, 'Correo de quien registra': fxYo, 'Asignado a': fxYo});
    Switch(varUnidad,
    "DEA", IfError(Patch('Seguimiento Desarrollo Estudiantil', Defaults('Seguimiento Desarrollo Estudiantil'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "DPS", IfError(Patch('Seguimiento Psicología DE', Defaults('Seguimiento Psicología DE'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "PSI", IfError(Patch('Seguimiento Psicología', Defaults('Seguimiento Psicología'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "SAL", IfError(Patch('Seguimiento Salud', Defaults('Seguimiento Salud'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "GAV", IfError(Patch('Seguimiento GAV', Defaults('Seguimiento GAV'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "CES", IfError(Patch('Seguimiento Centro de Escucha', Defaults('Seguimiento Centro de Escucha'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "TSO", IfError(Patch('Seguimiento Trabajo Social', Defaults('Seguimiento Trabajo Social'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "ENL", IfError(Patch('Seguimiento Enlaces', Defaults('Seguimiento Enlaces'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "PRP", IfError(Patch('Seguimiento Riesgo Psicosocial', Defaults('Seguimiento Riesgo Psicosocial'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "PRS", IfError(Patch('Seguimiento Prevención Salud', Defaults('Seguimiento Prevención Salud'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "ORE", IfError(Patch('Seguimiento Orientación Espiritual', Defaults('Seguimiento Orientación Espiritual'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "CAI", IfError(Patch('Seguimiento Infancia CAI', Defaults('Seguimiento Infancia CAI'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "SAF", IfError(Patch('Seguimiento Sala Amiga', Defaults('Seguimiento Sala Amiga'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)),
    "IPS", IfError(Patch('Seguimiento IPS FUNPRONIMA', Defaults('Seguimiento IPS FUNPRONIMA'), varNuevo), Set(varError, "No se pudo guardar: " & FirstError.Message), Notify("Registro guardado.", NotificationType.Success); Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None))
)
)
```

#### btnCancelarSeg · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.Fondo` |
| OnSelect | `Set(varTab, "seguimiento"); Navigate(scrFicha, ScreenTransition.None)` |
| PressedFill | `fxC.Fondo` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Cancelar"` |
| Width | `120` |
| X | `196` |
| Y | `486` |

## scrRegDeportes

| Propiedad de la pantalla | Fórmula |
|---|---|
| Fill | ver abajo |
| OnVisible | ver abajo |

**Fill**

```
fxC.Fondo
```

**OnVisible**

```
Set(varError, Blank());
Reset(dpDepFecha);
Reset(ddDepTipo);
Reset(ddDepDisciplina);
Reset(ddDepAscun);
Reset(ddDepNivel);
Reset(ddDepEstado);
Reset(txtDepEvento);
Reset(dpDepDevolucion);
Reset(txtDepObs)
```

### rectEncDep · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Acento` |
| Height | `64` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `0` |

### lblEncTituloDep · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Acompañamiento Estudiantil"` |
| Width | `520` |
| X | `72` |
| Y | `0` |

### lblEncUsuarioDep · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Right` |
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `600` |
| X | `Parent.Width - 624` |
| Y | `0` |

**Text**

```
fxNombreYo & "  ·  " & If(fxEsAdmin, "Administración", If(IsEmpty(fxGestiona), "Personal", Concat(fxGestiona, Corto, ", ")))
```

### icoAtrasDep · Icono

| Propiedad | Fórmula |
|---|---|
| AccessibleLabel | `"Volver"` |
| Color | `fxC.Blanco` |
| Height | `40` |
| Icon | `Icon.ArrowLeft` |
| OnSelect | `Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)` |
| PaddingBottom | `8` |
| PaddingLeft | `8` |
| PaddingRight | `8` |
| PaddingTop | `8` |
| Tooltip | `"Volver"` |
| Width | `40` |
| X | `16` |
| Y | `12` |

### lblTituloDep · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `30` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Nuevo registro de Deportes"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `80` |

### lblEstudianteDep · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `112` |

**Text**

```
varEst.'Nombre completo' & "  ·  Código " & varEst.'Código' & If(Not(IsBlank(varEdad)) And varEdad < 18, "  ·  Menor de edad", "")
```

### lblAvisoDep · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `34` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| Wrap | `true` |
| X | `24` |
| Y | `138` |

**Text**

```
"Visible para todo el personal del sistema. No escribas aquí datos de salud ni situaciones personales."
```

### conFormDep · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 198` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `178` |

#### lbldpDepFecha · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Fecha *"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### dpDepFecha · Selector de fecha (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| Color | `fxC.Texto` |
| DefaultDate | `Today()` |
| Font | `Font.'Segoe UI'` |
| Format | `DateTimeFormat.ShortDate` |
| Height | `40` |
| IconBackground | `fxC.Acento` |
| IconFill | `fxC.Blanco` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lblddDepTipo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Tipo de registro"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### ddDepTipo · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | ver abajo |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

**Items**

```
["Deportista inscrito", "Representación en evento", "Préstamo de implementos", "Actividad física musicalizada", "Pausas activas"]
```

#### lblddDepDisciplina · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Disciplina o servicio"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### ddDepDisciplina · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `Sort(Filter('Catálogo de servicios', Unidad = "DEP" And Activo = "Sí"), Orden).Servicio` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lblddDepAscun · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Pertenece a ASCUN"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddDepAscun · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `"No"` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Sí", "No"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lblddDepNivel · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Nivel"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddDepNivel · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Recreativo", "Formativo", "Selección Unimagdalena", "Alto rendimiento"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lblddDepEstado · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Estado"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddDepEstado · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `"Activo"` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Activo", "Inactivo", "Prestado", "Devuelto"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lbltxtDepEvento · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Evento o implemento"` |
| Width | `2 * (Parent.Width - 96) / 3 + 24` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `168` |

#### txtDepEvento · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HintText | `"Torneo, evento o implemento prestado"` |
| HoverBorderColor | `fxC.Acento` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `2 * (Parent.Width - 96) / 3 + 24` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `190` |

#### lbldpDepDevolucion · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Fecha de devolución (préstamos)"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `168` |

#### dpDepDevolucion · Selector de fecha (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| Color | `fxC.Texto` |
| DefaultDate | `Blank()` |
| Font | `Font.'Segoe UI'` |
| Format | `DateTimeFormat.ShortDate` |
| Height | `40` |
| IconBackground | `fxC.Acento` |
| IconFill | `fxC.Blanco` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `190` |

#### lbltxtDepObs · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Observación"` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `244` |

#### txtDepObs · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `96` |
| HintText | `"Sin datos de salud ni lesiones: eso va a Salud."` |
| HoverBorderColor | `fxC.Acento` |
| Mode | `TextMode.MultiLine` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `266` |

#### lblErrorDep · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Error` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `varError` |
| Visible | `Not(IsBlank(varError))` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `378` |

#### btnGuardarDep · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| Fill | `fxC.Acento` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Acento, -15%)` |
| OnSelect | ver abajo |
| PressedFill | `ColorFade(fxC.Acento, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Guardar"` |
| Width | `160` |
| X | `24` |
| Y | `410` |

**OnSelect**

```
Set(varError, If(
    IsBlank(dpDepFecha.SelectedDate), "Indica la fecha.",
    ddDepTipo.Selected.Value = "Préstamo de implementos" And IsBlank(Trim(txtDepEvento.Text)), "Escribe qué implemento se prestó.",
    Blank()
));
If(IsBlank(varError),
    IfError(
        Patch(Deportes, Defaults(Deportes), {'Código': varEst.'Código', Estudiante: varEst.'Nombre completo', Fecha: dpDepFecha.SelectedDate, 'Tipo de registro': ddDepTipo.Selected.Value, 'Disciplina o servicio': ddDepDisciplina.Selected.Servicio, ASCUN: ddDepAscun.Selected.Value, Nivel: ddDepNivel.Selected.Value, 'Evento o implemento': Trim(txtDepEvento.Text), 'Fecha de devolución': dpDepDevolucion.SelectedDate, Periodo: varEst.Periodo, Estado: ddDepEstado.Selected.Value, 'Observación': Trim(txtDepObs.Text), 'Registrado por': fxNombreYo}),
        Set(varError, "No se pudo guardar: " & FirstError.Message),
        Notify("Registro guardado.", NotificationType.Success); Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)
    )
)
```

#### btnCancelarDep · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.Fondo` |
| OnSelect | `Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)` |
| PressedFill | `fxC.Fondo` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Cancelar"` |
| Width | `120` |
| X | `196` |
| Y | `410` |

## scrRegCultura

| Propiedad de la pantalla | Fórmula |
|---|---|
| Fill | ver abajo |
| OnVisible | ver abajo |

**Fill**

```
fxC.Fondo
```

**OnVisible**

```
Set(varError, Blank());
Reset(dpCulFecha);
Reset(ddCulTipo);
Reset(ddCulTaller);
Reset(ddCulRol);
Reset(ddCulEstado);
Reset(txtCulEvento);
Reset(txtCulObs)
```

### rectEncCul · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Acento` |
| Height | `64` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `0` |

### lblEncTituloCul · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Acompañamiento Estudiantil"` |
| Width | `520` |
| X | `72` |
| Y | `0` |

### lblEncUsuarioCul · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Right` |
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `600` |
| X | `Parent.Width - 624` |
| Y | `0` |

**Text**

```
fxNombreYo & "  ·  " & If(fxEsAdmin, "Administración", If(IsEmpty(fxGestiona), "Personal", Concat(fxGestiona, Corto, ", ")))
```

### icoAtrasCul · Icono

| Propiedad | Fórmula |
|---|---|
| AccessibleLabel | `"Volver"` |
| Color | `fxC.Blanco` |
| Height | `40` |
| Icon | `Icon.ArrowLeft` |
| OnSelect | `Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)` |
| PaddingBottom | `8` |
| PaddingLeft | `8` |
| PaddingRight | `8` |
| PaddingTop | `8` |
| Tooltip | `"Volver"` |
| Width | `40` |
| X | `16` |
| Y | `12` |

### lblTituloCul · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `30` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Nuevo registro de Cultura"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `80` |

### lblEstudianteCul · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `112` |

**Text**

```
varEst.'Nombre completo' & "  ·  Código " & varEst.'Código' & If(Not(IsBlank(varEdad)) And varEdad < 18, "  ·  Menor de edad", "")
```

### lblAvisoCul · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `34` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| Wrap | `true` |
| X | `24` |
| Y | `138` |

**Text**

```
"Visible para todo el personal del sistema. No escribas aquí datos de salud ni situaciones personales."
```

### conFormCul · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 198` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `178` |

#### lbldpCulFecha · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Fecha *"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### dpCulFecha · Selector de fecha (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| Color | `fxC.Texto` |
| DefaultDate | `Today()` |
| Font | `Font.'Segoe UI'` |
| Format | `DateTimeFormat.ShortDate` |
| Height | `40` |
| IconBackground | `fxC.Acento` |
| IconFill | `fxC.Blanco` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lblddCulTipo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Tipo de registro"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### ddCulTipo · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Integrante de taller", "Grupo representativo", "Presentación o evento"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lblddCulTaller · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Taller o grupo"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### ddCulTaller · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `Sort(Filter('Catálogo de servicios', Unidad = "CUL" And Activo = "Sí"), Orden).Servicio` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lblddCulRol · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Rol"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddCulRol · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Integrante", "Monitor o monitora", "Solista"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lblddCulEstado · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Estado"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddCulEstado · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `"Activo"` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Activo", "Inactivo"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lbltxtCulEvento · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Evento"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### txtCulEvento · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HintText | `"Presentación o evento, si aplica"` |
| HoverBorderColor | `fxC.Acento` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lbltxtCulObs · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Observación"` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `168` |

#### txtCulObs · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `96` |
| HintText | `"Sin datos de salud ni situaciones personales."` |
| HoverBorderColor | `fxC.Acento` |
| Mode | `TextMode.MultiLine` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `190` |

#### lblErrorCul · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Error` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `varError` |
| Visible | `Not(IsBlank(varError))` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `302` |

#### btnGuardarCul · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| Fill | `fxC.Acento` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Acento, -15%)` |
| OnSelect | ver abajo |
| PressedFill | `ColorFade(fxC.Acento, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Guardar"` |
| Width | `160` |
| X | `24` |
| Y | `334` |

**OnSelect**

```
Set(varError, If(IsBlank(dpCulFecha.SelectedDate), "Indica la fecha.", Blank()));
If(IsBlank(varError),
    IfError(
        Patch(Cultura, Defaults(Cultura), {'Código': varEst.'Código', Estudiante: varEst.'Nombre completo', Fecha: dpCulFecha.SelectedDate, 'Tipo de registro': ddCulTipo.Selected.Value, 'Taller o grupo': ddCulTaller.Selected.Servicio, Rol: ddCulRol.Selected.Value, Evento: Trim(txtCulEvento.Text), Periodo: varEst.Periodo, Estado: ddCulEstado.Selected.Value, 'Observación': Trim(txtCulObs.Text), 'Registrado por': fxNombreYo}),
        Set(varError, "No se pudo guardar: " & FirstError.Message),
        Notify("Registro guardado.", NotificationType.Success); Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)
    )
)
```

#### btnCancelarCul · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.Fondo` |
| OnSelect | `Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)` |
| PressedFill | `fxC.Fondo` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Cancelar"` |
| Width | `120` |
| X | `196` |
| Y | `334` |

## scrRegBeneficio

| Propiedad de la pantalla | Fórmula |
|---|---|
| Fill | ver abajo |
| OnVisible | ver abajo |

**Fill**

```
fxC.Fondo
```

**OnVisible**

```
Set(varError, Blank());
Reset(ddPdhPrograma);
Reset(txtPdhDetalle);
Reset(txtPdhPeriodo);
Reset(dpPdhInicio);
Reset(dpPdhFin);
Reset(ddPdhEstado);
Reset(txtPdhObs)
```

### rectEncPdh · Rectángulo

| Propiedad | Fórmula |
|---|---|
| Fill | `fxC.Acento` |
| Height | `64` |
| Width | `Parent.Width` |
| X | `0` |
| Y | `0` |

### lblEncTituloPdh · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Acompañamiento Estudiantil"` |
| Width | `520` |
| X | `72` |
| Y | `0` |

### lblEncUsuarioPdh · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Align | `Align.Right` |
| Color | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| Height | `64` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `600` |
| X | `Parent.Width - 624` |
| Y | `0` |

**Text**

```
fxNombreYo & "  ·  " & If(fxEsAdmin, "Administración", If(IsEmpty(fxGestiona), "Personal", Concat(fxGestiona, Corto, ", ")))
```

### icoAtrasPdh · Icono

| Propiedad | Fórmula |
|---|---|
| AccessibleLabel | `"Volver"` |
| Color | `fxC.Blanco` |
| Height | `40` |
| Icon | `Icon.ArrowLeft` |
| OnSelect | `Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)` |
| PaddingBottom | `8` |
| PaddingLeft | `8` |
| PaddingRight | `8` |
| PaddingTop | `8` |
| Tooltip | `"Volver"` |
| Width | `40` |
| X | `16` |
| Y | `12` |

### lblTituloPdh · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `30` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `18` |
| Text | `"Nuevo registro de programas de Desarrollo Humano"` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `80` |

### lblEstudiantePdh · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `22` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `112` |

**Text**

```
varEst.'Nombre completo' & "  ·  Código " & varEst.'Código' & If(Not(IsBlank(varEdad)) And varEdad < 18, "  ·  Menor de edad", "")
```

### lblAvisoPdh · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| Height | `34` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | ver abajo |
| Width | `Parent.Width - 48` |
| Wrap | `true` |
| X | `24` |
| Y | `138` |

**Text**

```
"Visible para todo el personal del sistema. No escribas aquí datos de salud ni situaciones personales."
```

### conFormPdh · Contenedor

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| DropShadow | `DropShadow.None` |
| Fill | `fxC.Blanco` |
| Height | `Parent.Height - 198` |
| RadiusBottomLeft | `8` |
| RadiusBottomRight | `8` |
| RadiusTopLeft | `8` |
| RadiusTopRight | `8` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `178` |

#### lblddPdhPrograma · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Programa"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### ddPdhPrograma · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `Sort(Filter('Catálogo de servicios', Unidad = "PDH" And Activo = "Sí"), Orden).Servicio` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lbltxtPdhDetalle · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Detalle"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### txtPdhDetalle · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HintText | `"Almuerzo, refrigerio, tipo de beca…"` |
| HoverBorderColor | `fxC.Acento` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lbltxtPdhPeriodo · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Periodo"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `16` |

#### txtPdhPeriodo · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `varEst.Periodo` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HintText | `""` |
| HoverBorderColor | `fxC.Acento` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `38` |

#### lbldpPdhInicio · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Fecha de inicio *"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### dpPdhInicio · Selector de fecha (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| Color | `fxC.Texto` |
| DefaultDate | `Today()` |
| Font | `Font.'Segoe UI'` |
| Format | `DateTimeFormat.ShortDate` |
| Height | `40` |
| IconBackground | `fxC.Acento` |
| IconFill | `fxC.Blanco` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lbldpPdhFin · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Fecha de fin"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### dpPdhFin · Selector de fecha (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| Color | `fxC.Texto` |
| DefaultDate | `Blank()` |
| Font | `Font.'Segoe UI'` |
| Format | `DateTimeFormat.ShortDate` |
| Height | `40` |
| IconBackground | `fxC.Acento` |
| IconFill | `fxC.Blanco` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 1 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lblddPdhEstado · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Estado"` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `92` |

#### ddPdhEstado · Lista desplegable (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| ChevronBackground | `fxC.Blanco` |
| ChevronFill | `fxC.Tenue` |
| Color | `fxC.Texto` |
| Default | `"Activo"` |
| Font | `Font.'Segoe UI'` |
| Height | `40` |
| HoverFill | `fxC.AcentoSuave` |
| Items | `["Activo", "Suspendido", "Finalizado"]` |
| PaddingLeft | `10` |
| SelectionFill | `fxC.Acento` |
| Size | `12` |
| Width | `(Parent.Width - 96) / 3` |
| X | `24 + 2 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `114` |

#### lbltxtPdhObs · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Tenue` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `20` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `11` |
| Text | `"Observación"` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `168` |

#### txtPdhObs · Entrada de texto (clásica)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Default | `""` |
| FocusedBorderColor | `fxC.Acento` |
| FocusedBorderThickness | `2` |
| Font | `Font.'Segoe UI'` |
| Height | `96` |
| HintText | ver abajo |
| HoverBorderColor | `fxC.Acento` |
| Mode | `TextMode.MultiLine` |
| PaddingLeft | `10` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Width | `3 * (Parent.Width - 96) / 3 + 48` |
| X | `24 + 0 * ((Parent.Width - 96) / 3 + 24)` |
| Y | `190` |

**HintText**

```
"Sin situaciones personales: el Fondo de calamidad y los casos van en Trabajo Social (reservado)."
```

#### lblErrorPdh · Etiqueta de texto

| Propiedad | Fórmula |
|---|---|
| Color | `fxC.Error` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `24` |
| PaddingBottom | `0` |
| PaddingLeft | `0` |
| PaddingRight | `0` |
| PaddingTop | `0` |
| Size | `12` |
| Text | `varError` |
| Visible | `Not(IsBlank(varError))` |
| Width | `Parent.Width - 48` |
| X | `24` |
| Y | `302` |

#### btnGuardarPdh · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Acento` |
| BorderThickness | `0` |
| Color | `fxC.Blanco` |
| Fill | `fxC.Acento` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Blanco` |
| HoverFill | `ColorFade(fxC.Acento, -15%)` |
| OnSelect | ver abajo |
| PressedFill | `ColorFade(fxC.Acento, -25%)` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Guardar"` |
| Width | `160` |
| X | `24` |
| Y | `334` |

**OnSelect**

```
Set(varError, If(
    IsBlank(dpPdhInicio.SelectedDate), "Indica la fecha de inicio.",
    Not(IsBlank(dpPdhFin.SelectedDate)) And dpPdhFin.SelectedDate < dpPdhInicio.SelectedDate, "La fecha de fin no puede ser anterior a la de inicio.",
    Blank()
));
If(IsBlank(varError),
    IfError(
        Patch(Beneficios, Defaults(Beneficios), {'Código': varEst.'Código', Estudiante: varEst.'Nombre completo', Programa: ddPdhPrograma.Selected.Servicio, Detalle: Trim(txtPdhDetalle.Text), Periodo: Trim(txtPdhPeriodo.Text), 'Fecha de inicio': dpPdhInicio.SelectedDate, 'Fecha de fin': dpPdhFin.SelectedDate, Estado: ddPdhEstado.Selected.Value, 'Observación': Trim(txtPdhObs.Text), 'Registrado por': fxNombreYo}),
        Set(varError, "No se pudo guardar: " & FirstError.Message),
        Notify("Registro guardado.", NotificationType.Success); Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)
    )
)
```

#### btnCancelarPdh · Botón (clásico)

| Propiedad | Fórmula |
|---|---|
| BorderColor | `fxC.Borde` |
| BorderThickness | `1` |
| Color | `fxC.Texto` |
| Fill | `fxC.Blanco` |
| Font | `Font.'Segoe UI'` |
| FontWeight | `FontWeight.Semibold` |
| Height | `40` |
| HoverColor | `fxC.Texto` |
| HoverFill | `fxC.Fondo` |
| OnSelect | `Set(varTab, "bienestar"); Navigate(scrFicha, ScreenTransition.None)` |
| PressedFill | `fxC.Fondo` |
| RadiusBottomLeft | `6` |
| RadiusBottomRight | `6` |
| RadiusTopLeft | `6` |
| RadiusTopRight | `6` |
| Size | `12` |
| Text | `"Cancelar"` |
| Width | `120` |
| X | `196` |
| Y | `334` |

