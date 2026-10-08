# Solicitudes por Forms y flujos de Power Automate

Tu formulario de Forms sigue siendo la puerta de entrada para el estudiante: no necesita licencia ni instalar nada. El flujo hace dos cosas: deja la solicitud en la bandeja de la unidad que corresponde y mantiene el correo a Outlook. El seguimiento ocurre después en Power Apps.

```
Estudiante responde el formulario
        │
        ▼
Power Automate (cuando llega una respuesta)
        ├─► crea un elemento en «Seguimiento <unidad>»: Tipo de registro = Solicitud del estudiante, Estado = Pendiente
        ├─► avisa por correo a la unidad (sin detalles sensibles) con el enlace a la app
        └─► confirma al estudiante que la solicitud llegó
        │
        ▼
La unidad abre la app > Bandeja de tu unidad > Tomar > registra la atención y el seguimiento
```

Todos los conectores son estándar: Microsoft Forms, SharePoint, Office 365 Outlook y, si se quiere, Microsoft Teams. Están incluidos en Microsoft 365.

## Ajustes del formulario

1. **Configuración** > **Solo las personas de mi organización pueden responder** y **Registrar nombre**. Así el flujo recibe el correo institucional de quien responde.
2. Preguntas mínimas:

| Pregunta | Tipo | Notas |
|---|---|---|
| Código estudiantil | Texto, obligatoria, restricción «Número» | Es la clave para encontrar al estudiante en la base. |
| ¿Qué atención necesitas? | Opción: Académica (Desarrollo Estudiantil), Psicológica, Médica, Odontológica | Define la unidad destino. |
| ¿Sobre qué es? | Opción: Académico, Adaptación a la vida universitaria, Socioeconómico, Emocional o psicológico, Salud física, Convivencia o relaciones, Familiar, Otro | Igual a la lista «Motivo» de la app. Evita pedir detalles íntimos en el formulario. |
| Cuéntanos en pocas palabras (opcional) | Texto corto | Indica: «No escribas diagnósticos ni detalles íntimos; lo hablarás con el profesional». |
| ¿Cómo prefieres ser atendido? | Opción: Presencial, Virtual, Telefónica | |
| Teléfono de contacto | Texto | |
| ¿Eres menor de 18 años? | Opción: Sí, No | Con bifurcación: si es Sí, abre la sección del representante legal. |
| Nombre y teléfono de tu madre, padre o representante legal | Texto | Solo para menores. La unidad lo contacta para la autorización. |
| Autorización de tratamiento de datos | Opción única «Autorizo», obligatoria | Usa el texto de `07-proteccion-de-datos-y-menores.md`, con el enlace a la política de la universidad. |

3. **Seguridad de las respuestas**:
   - Que el formulario sea de un grupo de Administración, no de una persona.
   - No compartas el enlace de resultados.
   - Cuando las solicitudes ya estén en SharePoint, borra periódicamente las respuestas antiguas en Forms y en el Excel vinculado.

## Flujo «Solicitud de atención a la bandeja»

Créalo con una de las dos cuentas de Administración, que tienen permiso en todas las listas, y agrega a la otra como copropietaria. Todos los elementos que cree el flujo quedarán con esa cuenta en «Creado por»; la app muestra «Formulario de solicitudes» en «Registrado por».

1. **Desencadenador:** Microsoft Forms > **Cuando se envía una respuesta nueva** > tu formulario.
2. **Acción:** Microsoft Forms > **Obtener los detalles de la respuesta** (mismo formulario; Id. de respuesta del paso 1).
3. **Acción:** **Redactar**, con el nombre `Codigo`: `trim(<respuesta «Código estudiantil»>)`.
4. **Acción:** **Switch** sobre la respuesta «¿Qué atención necesitas?». Un caso por opción:

| Caso | Lista destino | Servicio | Correo de aviso |
|---|---|---|---|
| Académica (Desarrollo Estudiantil) | Seguimiento Desarrollo Estudiantil | Seguimiento académico | Buzón de Desarrollo Estudiantil |
| Psicológica | Seguimiento Psicología | Atención psicológica individual | Buzón del Programa de Atención Psicológica |
| Médica | Seguimiento Salud | Medicina | Buzón de Salud |
| Odontológica | Seguimiento Salud | Odontología | Buzón de Salud |

5. En cada caso, **SharePoint** > **Crear elemento** en el sitio Acompañamiento Estudiantil y la lista de la tabla:

| Columna | Valor |
|---|---|
| Código | salida de `Codigo` |
| Fecha | `utcNow()` (o la fecha de envío de la respuesta) |
| Tipo de registro | `Solicitud del estudiante` |
| Servicio | el de la tabla |
| Modalidad | respuesta «¿Cómo prefieres ser atendido?» |
| Motivo | respuesta «¿Sobre qué es?» |
| Resumen | respuesta «Cuéntanos en pocas palabras» y, en otra línea, «Teléfono: …». Si es menor, agrega «Representante legal: nombre y teléfono». |
| Estado | `Pendiente` |
| Prioridad | `Normal` |
| Origen | `Formulario del estudiante` |
| Menor de edad | respuesta «¿Eres menor de 18 años?» |
| Autorización de datos | `if(equals(<menor>, 'Sí'), 'Pendiente', 'Autorizada por el titular')` |
| Registrado por | `Formulario de solicitudes` |
| Correo de quien registra | correo de quien respondió (paso 1) |
| Id de solicitud | Id. de respuesta (paso 1) |

6. En cada caso, **Office 365 Outlook** > **Enviar un correo electrónico (V2)** al buzón de la unidad:
   - Asunto: «Nueva solicitud en la bandeja de <unidad>».
   - Cuerpo: «Entra a la app Acompañamiento Estudiantil > Bandeja de tu unidad», con el enlace a la app.
   - No pongas el nombre, el código ni el motivo en el correo: los correos se reenvían y quedan en muchos buzones. Así cumples el mismo propósito del correo que ya llega hoy, con menos datos expuestos.
7. (Opcional) **Microsoft Teams** > **Publicar mensaje en un chat o canal**, en el canal privado de la unidad, con el mismo texto sin datos personales.
8. Después del Switch: **Enviar un correo electrónico (V2)** al estudiante (correo del paso 1): «Recibimos tu solicitud de atención. La unidad te contactará. Tratamiento de datos: <enlace a la política>».

Si el código no está en la base, la solicitud igual llega a la bandeja. La app avisa al abrirla y la unidad corrige el código en la lista.

### Si quieres el nombre del estudiante en la solicitud

Agrega antes del Switch **SharePoint** > **Obtener elementos** en la lista Estudiantes, con **Consulta de filtro** `Codigo eq '<salida de Codigo>'` y **Recuento superior** 1. Luego llena «Estudiante» con `Nombre completo` del primer resultado.

El nombre interno `Codigo` vale si las listas se crearon con el script. Si se crearon desde Excel, el nombre interno puede ser `field_1`: búscalo en Configuración de la lista > columna Código, al final de la dirección de la página (`Field=…`).

## Flujo diario de pendientes (opcional)

**Periodicidad:** todos los días a las 7:00. Para cada lista de seguimiento:
1. **Obtener elementos** con la consulta de filtro `Estado eq 'Pendiente' and Created lt '<addDays(utcNow(), -2)>'`. Usa el nombre interno de Estado si las listas se hicieron desde Excel.
2. Si hay resultados, envía un correo a la unidad con el número de pendientes de más de dos días, sin datos personales.

## Qué no conviene hacer

- No pidas en el formulario diagnósticos, medicamentos, hechos de violencia ni detalles íntimos. GAV y Psicología los recogen en la atención, con su protocolo.
- No uses el formulario para casos de riesgo inminente. El formulario debe decir arriba a qué línea o servicio acudir en una urgencia.
- No guardes copias de las respuestas en hojas de Excel compartidas.
