import { z } from "zod";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(2, { message: `${label} debe tener al menos 2 caracteres.` })
    .max(max, { message: `${label} no puede superar ${max} caracteres.` });

export const phoneSchema = z
  .string()
  .trim()
  .min(7, { message: "Ingresa un teléfono válido." })
  .max(25, { message: "El teléfono es demasiado largo." })
  .regex(/^[0-9+\s()-]+$/, { message: "El teléfono solo puede tener números y símbolos + ( ) -" });

export const baseProfileSchema = z.object({
  full_name: requiredText("El nombre completo", 120),
  phone: phoneSchema,
  approximate_city: requiredText("La ciudad", 80),
  approximate_sector: requiredText("El sector", 80),
});

export type BaseProfileValues = z.infer<typeof baseProfileSchema>;

const numberFromInput = (label: string, min: number, max: number) =>
  z.coerce
    .number({ invalid_type_error: `${label} debe ser un número.` })
    .min(min, { message: `${label} debe ser al menos ${min}.` })
    .max(max, { message: `${label} no puede superar ${max}.` });

export const professionalProfileSchema = baseProfileSchema.extend({
  profession: requiredText("La profesión", 80),
  description: z
    .string()
    .trim()
    .min(30, { message: "Cuéntanos un poco más: al menos 30 caracteres." })
    .max(1000, { message: "La descripción no puede superar 1000 caracteres." }),
  years_experience: numberFromInput("Los años de experiencia", 0, 70),
  base_rate: numberFromInput("La tarifa base", 0, 100000),
  hourly_rate: numberFromInput("La tarifa por hora", 0, 100000),
  coverage_radius: numberFromInput("El radio de cobertura", 1, 100),
  specialty_ids: z
    .array(z.string().uuid())
    .min(1, { message: "Selecciona al menos una especialidad." })
    .max(8, { message: "Puedes seleccionar hasta 8 especialidades." }),
});

export type ProfessionalProfileValues = z.infer<typeof professionalProfileSchema>;

export const signUpSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email({ message: "Ingresa un correo válido." })
      .max(255, { message: "El correo es demasiado largo." }),
    password: z
      .string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
      .max(72, { message: "La contraseña no puede superar 72 caracteres." }),
    confirm_password: z.string(),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Las contraseñas no coinciden.",
  });

export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email({ message: "Ingresa un correo válido." }),
  password: z.string().min(1, { message: "Ingresa tu contraseña." }),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Ingresa un correo válido." }),
});

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
      .max(72, { message: "La contraseña no puede superar 72 caracteres." }),
    confirm_password: z.string(),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Las contraseñas no coinciden.",
  });
