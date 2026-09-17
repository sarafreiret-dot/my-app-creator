# Roadmap

## Fase 1 — Diseño, autenticación, roles, perfiles y onboarding (COMPLETA)
- [x] Sistema de diseño mobile-first con tokens OKLCH (navy, azul eléctrico, verde para estados positivos)
- [x] Tablas: profiles, profile_private, user_roles, professional_profiles, specialties, professional_specialties
- [x] RLS estricta + has_role (security definer) + assign_initial_role (impide autoasignarse admin)
- [x] Google OAuth (Lovable Cloud) + email/contraseña
- [x] Bucket privado de avatares con políticas por usuario
- [x] Pantallas: landing, acceso, recuperación de contraseña, onboarding, panel cliente, panel profesional
- [x] Verificación: registro, login, onboarding, rutas protegidas, RLS
- [x] Regla interna: solo profesionales `verified` pueden autorizar funciones profesionales futuras
- [x] Tarifas conservadas únicamente como información de perfil, sin cálculo de precios ni matching

## Fase 2 — Ubicación, disponibilidad, panel profesional
- [ ] Disponibilidad: disponible ahora / no disponible / programada
- [ ] Ubicación aproximada y exacta (privada)

## Fase 3 — Google Maps, búsqueda y matching
- [ ] Motor de matching modular (disponibilidad, especialidad, ETA, calificación, experiencia, tarifa)
- [ ] Inicio cliente: solo conteo agregado de profesionales cercanos (sin ubicaciones exactas)

## Fase 4 — Solicitudes y aceptación atómica
- [ ] service_requests, request_candidates
- [ ] Aceptación transaccional con bloqueo de fila: solo el primero gana; el resto recibe "no disponible"
- [ ] Tiempo real
- [ ] **Expansión progresiva de búsqueda**: ampliar radio y/o pasar al siguiente grupo de candidatos
- [ ] **Sin estados colgados**: tiempo máximo de búsqueda configurable para solicitudes `now`;
      tras varios intentos sin candidatos la solicitud pasa a `expired`
- [ ] **Solicitudes programadas**: el matching inicia en el momento adecuado antes de la hora prevista
- [ ] **UX de expiración**: opciones de ampliar horario, cambiar servicio o reintentar

## Fase 5 — Seguimiento, ETA, chat, estados del servicio

## Fase 6 — Cancelaciones, reviews y calificaciones

## Fase futura — Pagos, comisiones, reembolsos y penalizaciones
