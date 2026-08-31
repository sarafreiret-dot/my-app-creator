# Plan: App de Servicios Profesionales Bajo Demanda

## Visión
Marketplace móvil tipo Uber para contratar servicios profesionales: clientes buscan profesionales cercanos por ubicación, especialidad, disponibilidad, tarifa y calificación; solicitan servicios en tiempo real; siguen la llegada en mapa; y califican al finalizar.

## Fase 1: Fundación y autenticación
- Diseño system en `src/styles.css`: navy oscuro como primario, azul eléctrico para acciones, blanco/gris claro para fondos, verde solo para estados positivos. Tipografía moderna, tarjetas redondeadas, sombras sutiles.
- Habilitar autenticación con email/password + Google via Lovable Cloud.
- Crear tabla `profiles` vinculada a `auth.users` con campos comunes (nombre, foto, teléfono, rol, ubicación, dirección) y extensión para profesionales (profesión, especialidades, descripción, experiencia, tarifas, disponibilidad, calificación promedio, servicios realizados, verificado).
- Roles separados en `user_roles` (`client`, `professional`, `admin`) con RLS segura.
- Flujo de onboarding: selección de rol al registrarse, formulario de perfil según rol.
- Rutas protegidas para clientes y profesionales.

## Fase 2: Descubrimiento de profesionales
- Integrar Google Maps (cargar mapa, geolocalización del cliente, marcadores de profesionales).
- Pantalla de búsqueda con filtros: especialidad, disponibilidad ahora/programado, rango de tarifa, calificación mínima, distancia.
- Tarjetas de profesional: foto, nombre, profesión, calificación, tarifa base, distancia, estado disponible.
- Vista de perfil completo del profesional con experiencia, comentarios, tarifas detalladas.

## Fase 3: Solicitud y aceptación de servicios
- Tablas `service_requests`, `service_offers` y `services` (histórico).
- Cliente crea solicitud con ubicación, tipo de servicio, descripción, preferencia de fecha/hora.
- Profesionales cercanos reciben la solicitud en tiempo real (Supabase Realtime).
- Profesional acepta/rechaza; cliente recibe confirmación y datos del profesional asignado.
- Estados del servicio: pendiente, aceptado, en camino, en progreso, completado, cancelado.

## Fase 4: Seguimiento en mapa y finalización
- Pantalla de seguimiento: mapa con ubicación del profesional actualizada periódicamente.
- Tiempo estimado de llegada calculado con Google Routes API.
- Botones de acción: "Llegué", "Iniciar servicio", "Finalizar servicio", confirmación mutua.

## Fase 5: Calificaciones y reseñas
- Tabla `reviews` vinculada a servicios y profesionales.
- Cliente califica y comenta tras finalizar.
- Actualización automática de calificación promedio y contador de servicios en el perfil del profesional.

## Fase 6: Pagos y comisiones
- Tablas `payments`, `payment_providers`, `platform_commissions`.
- Arquitectura modular que permita cambiar de pasarela (Payphone/Kushki inicialmente, Stripe/Paddle futuro).
- Registrar monto total, comisión de plataforma, monto al profesional, estado (pendiente, retenido, liberado, reembolsado).
- Liberación del pago al profesional tras confirmación de servicio completado.
- Flujo de reembolsos y cancelaciones.

## Seguridad y privacidad
- RLS en todas las tablas de usuario; campos sensibles protegidos.
- Validación de inputs con Zod en cliente y servidor.
- Localización y mapa solo con consentimiento explícito.

## Tecnologías
- Lovable Cloud (auth, PostgreSQL, Realtime, Storage).
- TanStack Start + React 19 + Tailwind v4.
- Google Maps Platform (mapa, geocodificación, rutas, Places).
- shadcn/ui para componentes base, personalizados con tokens de diseño.
