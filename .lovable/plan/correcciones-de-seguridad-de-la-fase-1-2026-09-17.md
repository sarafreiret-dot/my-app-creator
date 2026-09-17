# Correcciones de seguridad de la Fase 1

## Alcance
- Mantener `pending`, `verified` y `rejected`, conservando “En revisión” para profesionales pendientes.
- Añadir una regla central en la base de datos que solo autorice funciones profesionales cuando el usuario tenga rol profesional y estado `verified`.
- No crear disponibilidad, solicitudes ni ninguna funcionalidad de la Fase 2.
- Mantener `base_rate` y `hourly_rate` únicamente como datos informativos del perfil.

## Verificación
- Confirmar que clientes y profesionales solo acceden a su área correspondiente.
- Confirmar que un profesional pendiente o rechazado no cumple la regla de acceso profesional.
- Confirmar que ningún usuario puede autoasignarse `admin`.
- Confirmar que teléfono y ubicación exacta continúan limitados a su propietario.
- Ejecutar comprobaciones de seguridad y compilación, y detenerse al terminar.

## Detalles técnicos
- Crear una función `is_verified_professional(uuid)` segura y reutilizable por futuras políticas RLS y operaciones transaccionales.
- Revocar su ejecución pública y permitirla solo a usuarios autenticados y al servicio interno.
- No alterar tablas, rutas, diseño ni lógica de precios.
