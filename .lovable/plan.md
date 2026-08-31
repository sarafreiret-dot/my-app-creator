# Plan MVP: App de Servicios Profesionales Bajo Demanda

Alcance: flujo completo de contratación, **sin pagos**. La base de datos queda preparada para incorporar pagos, comisiones, reembolsos y penalizaciones después, sin tocar las tablas principales.

Flujo núcleo: registro → rol → perfil → ubicación → búsqueda → matching → solicitud → aceptación → seguimiento → inicio → finalización → calificación.

## Diseño visual

Sistema de diseño en `src/styles.css` (tokens semánticos oklch, mobile-first):
- Navy oscuro como primario, azul eléctrico como color de acción.
- Blanco y gris muy claro para fondos; verde reservado a estados positivos (Disponible, Verificado, Aceptado).
- Tarjetas con radio suave, sombras sutiles, jerarquía clara, mapa con protagonismo.

## Modelo de datos

**Identidad y perfiles**
- `profiles` — datos comunes: nombre, foto, rol activo, dirección aproximada (ciudad/sector), fecha de registro. Teléfono y ubicación exacta viven en tablas separadas y protegidas.
- `profile_private` — teléfono y ubicación exacta (lat/lng). Nunca legible por otros usuarios directamente.
- `user_roles` — roles (`client`, `professional`, `admin`) en tabla aparte con función `has_role` de tipo security definer.
- `professional_profiles` — profesión, descripción, experiencia (años), tarifa base y tarifa por hora, radio de cobertura, calificación promedio, servicios completados, estado de verificación.
- `specialties` y `professional_specialties` — catálogo y relación N:N.

**Disponibilidad (tri-estado)**
- `professional_availability` — estado actual: `available_now`, `unavailable`, `scheduled`.
- `availability_schedule` — franjas por día de la semana con hora inicio/fin, para el estado programado.
- Función de base de datos que resuelve si un profesional está disponible en un instante dado, combinando estado actual y franjas.

**Ubicación**
- `professional_locations` — última ubicación reportada del profesional (actualizable), usada solo para matching y seguimiento; nunca expuesta en crudo a clientes salvo servicio activo.

**Solicitudes y servicios**
- `service_requests` — cliente, especialidad, descripción, ubicación del servicio, modo (`now` / `scheduled`), fecha programada, estado (`searching`, `matched`, `accepted`, `en_route`, `in_progress`, `completed`, `cancelled`, `expired`).
- `request_candidates` — profesionales seleccionados por el motor de matching para una solicitud, con el puntaje y el desglose de factores. Permite ofertar en orden y auditar el matching.
- `service_events` — bitácora inmutable de transiciones de estado con timestamp y actor. Base para futuras penalizaciones y disputas.
- `cancellations` — quién canceló (cliente/profesional), motivo (catálogo + texto libre), momento del ciclo en que ocurrió. Estructurada para calcular penalizaciones más adelante sin cambios de esquema.

**Comunicación**
- `service_messages` — chat interno vinculado a la solicitud. Es el único canal por el que se comunican cliente y profesional. Legible solo por las dos partes y solo mientras el servicio está activo o recién finalizado.

**Calificaciones**
- `reviews` — calificación 1-5 y comentario, vinculada a la solicitud finalizada, con autor y destinatario (permite calificación bidireccional a futuro).
- Trigger que recalcula calificación promedio y contador de servicios en `professional_profiles`.

**Aceptación atómica (una sola adjudicación)**
- `service_requests.professional_id` empieza nulo y solo puede fijarse una vez, con restricción que impide reasignarlo.
- La aceptación ocurre en una función de base de datos transaccional: toma un bloqueo de fila sobre la solicitud, verifica que el estado siga siendo `searching`/`matched` y que el profesional sea candidato válido, y solo entonces asigna al profesional y pasa el estado a `accepted`. Todo en una sola transacción.
- El primer profesional que complete la operación obtiene el servicio; cualquier otro recibe de inmediato un resultado explícito de "solicitud ya no disponible", y su tarjeta de solicitud entrante desaparece en tiempo real.
- Los candidatos restantes se marcan como `lost` en `request_candidates` dentro de la misma transacción, dejando trazabilidad.
- La UI del profesional refleja el estado real: el botón se deshabilita y muestra el motivo, sin errores crudos.

**Preparado para pagos (sin implementar)**
- `service_requests` incluye desde ya campos de monto estimado y monto acordado.
- Las tablas `cancellations` y `service_events` registran el contexto necesario para penalizaciones.
- No se crean tablas de pago ni integración de pasarela en esta fase; se añadirán como tablas satélite (`payments`, `commissions`, `refunds`) sin alterar las existentes.


## Motor de matching (modular)

Módulo aislado en `src/lib/matching/` con funciones puras y pesos configurables, para poder ajustar la fórmula sin tocar la UI:
- **Disponibilidad** — filtro duro: solo profesionales disponibles ahora (o en la franja programada).
- **Especialidad** — filtro duro: debe coincidir con la solicitada.
- **Distancia / tiempo de llegada** — calculado con Google Routes; se puntúa el tiempo estimado, no la distancia en línea recta.
- **Calificación** — promedio ponderado por cantidad de reseñas (evita que un 5.0 con una reseña domine).
- **Experiencia** — años y servicios completados.
- **Tarifa** — cercanía a la tarifa esperada/mediana del mercado; no simplemente "el más barato".
- Puntaje final normalizado con pesos, guardado en `request_candidates` con el desglose por factor.

Ordenamiento nunca es solo por distancia; se muestra al cliente el porqué de cada recomendación ("Muy bien calificado", "Llega en 8 min", "Tarifa competitiva").

## Pantallas

1. **Auth** — registro/inicio con email + Google.
2. **Selección de rol** — cliente o profesional.
3. **Onboarding de perfil** — formulario según rol; el profesional añade profesión, especialidades, experiencia, tarifas, cobertura.
4. **Permiso de ubicación** — solicitud explícita con explicación de uso.
5. **Inicio cliente** — mapa centrado en la ubicación del cliente **sin marcadores de profesionales**. En su lugar, un indicador agregado tipo "12 profesionales disponibles cerca de ti" y, opcionalmente, una zona difusa de cobertura. Buscador de especialidad y filtros como acción principal.
6. **Resultados con matching** — solo tras buscar una especialidad (ej. "Electricista") se listan los profesionales que pueden atender, ordenados por puntaje, con información suficiente para elegir (foto, calificación, experiencia, tarifa, tiempo estimado de llegada, sector aproximado) y los motivos de la recomendación. Nunca coordenadas exactas.

7. **Perfil del profesional** — experiencia, tarifas, reseñas, disponibilidad, botón de solicitar.
8. **Crear solicitud** — especialidad, descripción, ubicación, ahora o programado.
9. **Buscando profesional** — estado en vivo mientras se ofrece a candidatos.
10. **Seguimiento** — mapa con posición del profesional, ETA, chat interno, botón cancelar.
11. **Servicio en curso** — acciones de estado (llegué, iniciar, finalizar) y chat.
12. **Calificación** — estrellas y comentario al finalizar.
13. **Panel profesional** — interruptor de disponibilidad, horario programado, solicitudes entrantes en tiempo real, historial.
14. **Historial y cancelación** — para ambos roles, con motivo obligatorio.

## Seguridad y privacidad

- RLS en todas las tablas; ninguna es legible públicamente.
- `profile_private` (teléfono) y `professional_locations` (ubicación exacta): solo el propio dueño accede directamente. La contraparte accede a datos mínimos únicamente a través de funciones del servidor que verifican que existe un servicio activo entre ambos.
- **La ubicación exacta de un profesional nunca sale del servidor antes de la aceptación.** Las pantallas previas usan solo datos derivados: conteos agregados, sector aproximado y tiempo estimado de llegada calculado en el servidor. El mapa de inicio no recibe coordenadas de profesionales.
- El chat interno es el único canal de contacto; no se expone el teléfono en la interfaz.
- `has_role` como función security definer para evitar recursión en políticas.
- La adjudicación de solicitudes pasa siempre por la función transaccional; los clientes no pueden asignarse ni reasignarse un profesional mediante escrituras directas.
- GRANT explícito por tabla según las políticas definidas.
- Validación de entradas con Zod en cliente y servidor.


## Fases de implementación

1. Diseño system, autenticación (email + Google), perfiles, roles, onboarding.
2. Ubicación, disponibilidad tri-estado, panel del profesional.
3. Mapa con Google Maps, búsqueda y motor de matching.
4. Solicitudes, ofertas a candidatos, aceptación atómica en tiempo real.
5. Seguimiento con ETA, chat interno, transiciones de estado.
6. Cancelaciones con motivos, calificaciones y recálculo de promedios.

Los pagos quedan explícitamente fuera de este MVP.
