/**
 * Traduce errores técnicos (Supabase / Postgres / red) a mensajes claros y
 * amigables en español. Nunca mostramos texto crudo del backend al usuario.
 */

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "El correo o la contraseña no son correctos.",
  email_not_confirmed:
    "Aún no confirmaste tu correo. Revisa tu bandeja de entrada y haz clic en el enlace.",
  user_already_exists: "Ya existe una cuenta con este correo. Inicia sesión.",
  email_exists: "Ya existe una cuenta con este correo. Inicia sesión.",
  weak_password: "La contraseña es demasiado débil. Usa al menos 8 caracteres.",
  over_email_send_rate_limit:
    "Enviamos demasiados correos en poco tiempo. Espera unos minutos e inténtalo de nuevo.",
  over_request_rate_limit: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  same_password: "La nueva contraseña debe ser diferente a la anterior.",
  session_expired: "Tu sesión expiró. Inicia sesión otra vez.",
  validation_failed: "Revisa los datos ingresados e inténtalo nuevamente.",
};

const APP_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Necesitas iniciar sesión para continuar.",
  ROLE_NOT_SELECTABLE: "Ese tipo de cuenta no está disponible para registro.",
  ROLE_NOT_GRANTED: "Tu cuenta no tiene ese perfil habilitado.",
};

export function friendlyError(error: unknown, fallback?: string): string {
  const generic =
    fallback ?? "No pudimos completar la acción. Verifica los datos e inténtalo nuevamente.";

  if (!error) return generic;

  const raw = error as { code?: string; message?: string; status?: number };
  const code = typeof raw.code === "string" ? raw.code : "";
  const message = typeof raw.message === "string" ? raw.message : "";

  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];

  for (const key of Object.keys(APP_MESSAGES)) {
    if (message.includes(key)) return APP_MESSAGES[key]!;
  }

  // Postgres / PostgREST
  if (code === "42501" || message.includes("row-level security")) {
    return "No tienes permiso para guardar esta información.";
  }
  if (code === "23505" || code === "23505".toString() || code === "23514") {
    return "Algunos datos no son válidos. Revísalos e inténtalo nuevamente.";
  }
  if (code === "23503") {
    return "Falta información relacionada para guardar estos datos.";
  }
  if (code === "23502") {
    return "Faltan campos obligatorios.";
  }
  if (code === "PGRST301" || raw.status === 401) {
    return "Tu sesión expiró. Inicia sesión otra vez.";
  }

  if (message.toLowerCase().includes("failed to fetch") || message.includes("NetworkError")) {
    return "No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.";
  }

  if (message.includes("Invalid login credentials")) return AUTH_MESSAGES.invalid_credentials!;
  if (message.includes("User already registered")) return AUTH_MESSAGES.user_already_exists!;

  return generic;
}
