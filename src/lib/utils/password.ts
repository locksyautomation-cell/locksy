import { PASSWORD_RULES } from "@/lib/constants";

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Debe tener al menos ${PASSWORD_RULES.minLength} caracteres`);
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Debe contener al menos 1 letra mayúscula");
  }

  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    errors.push("Debe contener al menos 1 número");
  }

  if (
    PASSWORD_RULES.requireSpecialChar &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Debe contener al menos 1 carácter especial");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
