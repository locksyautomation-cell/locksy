export const COLORS = {
  navy: "#1B2C3C",
  navyLight: "#2a4056",
  navyDark: "#111d28",
  orange: "#FB6D01",
  orangeLight: "#fc8a33",
  orangeDark: "#d95d01",
} as const;

export const ROLES = {
  ADMIN: "admin",
  DEALER: "dealer",
  CLIENT: "client",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const APPOINTMENT_STATUS = {
  PENDING: "pendiente",
  IN_PROGRESS: "en_curso",
  COMPLETED: "finalizada",
} as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const BUDGET_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  NOT_REQUIRED: "not_required",
} as const;

export const NOTIFICATION_TYPES = {
  STATUS_CHANGE: "status_change",
  BUDGET_SENT: "budget_sent",
  REPAIR_COMPLETED: "repair_completed",
} as const;

export const SIGNATURE_TYPES = {
  KEY_PICKUP: "key_pickup",
  KEY_RETURN: "key_return",
} as const;

export const ATTACHMENT_TYPES = {
  PHOTO: "photo",
  VIDEO: "video",
  AUDIO: "audio",
  BUDGET: "budget",
  INVOICE: "invoice",
  OTHER: "other",
} as const;

export const CONTACT_REQUEST_TYPES = {
  SETUP: "setup",
  CONTACT: "contact",
} as const;

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const TIME_SLOTS_INTERVAL = 15; // minutes

export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
export const RESEND_CODE_DELAY_SECONDS = 30;

export const LOCATOR_PREFIX = "#";
export const KEY_CODE_LENGTH = 8;

export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
} as const;

export const NAV_ITEMS = {
  landing: [
    { label: "Inicio", href: "/" },
    { label: "Implementación", href: "/setup" },
    { label: "FAQs", href: "/faqs" },
    { label: "Nosotros", href: "/about" },
    { label: "Contacto", href: "/contact" },
  ],
  admin: [
    { label: "Concesionarios", href: "/admin/concesionarios", icon: "building" },
    { label: "Clientes", href: "/admin/clientes", icon: "users" },
    { label: "Contacto", href: "/admin/contacto", icon: "mail" },
  ],
  client: [
    { label: "Citas", href: "/client/appointments", icon: "calendar" },
    {
      label: "Notificaciones",
      href: "/client/notifications",
      icon: "bell",
    },
    { label: "Mi Perfil", href: "/client/profile", icon: "user" },
  ],
  dealer: [
    { label: "Citas", href: "/dealer/citas", icon: "calendar" },
    { label: "Taller", href: "/dealer/taller", icon: "wrench" },
    { label: "Clientes", href: "/dealer/clientes", icon: "users" },
    { label: "Mi Perfil", href: "/dealer/perfil", icon: "user" },
  ],
} as const;
