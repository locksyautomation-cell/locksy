export interface User {
  id: string;
  role: "admin" | "dealer" | "client";
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  email: string;
  profile_photo_url?: string;
  dni?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Dealership {
  id: string;
  user_id: string;
  name: string;
  company_name?: string;
  nif_cif?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  logo_url?: string;
  slug: string;
  active: boolean;
  repair_statuses?: string[];
  iban?: string;
  billing_name?: string;
  billing_nif_cif?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address?: string;
  created_at: string;
  updated_at: string;
  client_count?: number;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_period_end?: string | null;
  locator_prefix?: string | null;
  locator_sequence?: number;
  vehicle_type?: "motos" | "coches" | "ambos" | null;
}

export interface DealershipClient {
  id: string;
  dealership_id: string;
  client_id: string;
  registration_date: string;
  active: boolean;
}

export interface Vehicle {
  id: string;
  client_id: string;
  brand: string;
  model: string;
  plate: string;
  chassis_number?: string;
  registration_date?: string;
  tech_file_url?: string;
  vehicle_type?: "motos" | "coches" | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  dealership_id: string;
  client_id?: string | null;
  vehicle_id?: string | null;
  locator: string;
  key_code: string;
  status: "pendiente" | "en_curso" | "finalizada" | "pendiente_aprobacion" | "rechazada";
  repair_status?: string | null;
  scheduled_date: string;
  scheduled_time: string;
  description?: string;
  dealer_observations?: string;
  dealer_recommendations?: string;
  budget_amount?: number;
  budget_status?: "pending" | "accepted" | "rejected";
  budget_url?: string;
  budget_sent_at?: string;
  invoice_url?: string;
  repair_order_url?: string;
  repair_acceptance_token?: string;
  order_accepted_at?: string | null;
  order_return_accepted_at?: string | null;
  vehicle_km?: number | null;
  payment_status: "pending" | "paid" | "not_required";
  payment_method?: "card" | "cash" | null;
  stripe_payment_id?: string;
  vehicle_in_dealership?: boolean;
  key_picked_up_at?: string;
  key_returned_at?: string;
  completed_at?: string;
  // Manual entry fields (no registered client)
  manual_first_name?: string | null;
  manual_last_name?: string | null;
  manual_nif_cif?: string | null;
  manual_email?: string | null;
  manual_phone?: string | null;
  manual_address?: string | null;
  manual_vehicle_brand?: string | null;
  manual_vehicle_model?: string | null;
  manual_vehicle_plate?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  vehicle?: Vehicle;
  client?: User;
  dealership?: Dealership;
}

export interface RepairOrder {
  id: string;
  appointment_id?: string;
  dealership_id: string;
  client_id?: string;
  vehicle_in_dealership: boolean;
  repair_status?: string;
  budget_url?: string;
  invoice_url?: string;
  invoice_amount?: number;
  observations?: string;
  recommendations?: string;
  payment_received: boolean;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  appointment?: Appointment;
}

export interface Attachment {
  id: string;
  appointment_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_type: "photo" | "video" | "audio" | "budget" | "invoice" | "other";
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export interface Signature {
  id: string;
  appointment_id: string;
  signer_id: string;
  signer_name: string;
  signer_dni: string;
  type: "key_pickup" | "key_return";
  signature_url: string;
  accepted_terms: boolean;
  signed_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  appointment_id?: string;
  type: "status_change" | "budget_sent" | "repair_completed" | "repair_order_sent" | "appointment_accepted" | "appointment_rejected";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  // Joined from appointments when fetched via get-notifications API
  appointment?: {
    budget_url?: string | null;
    budget_amount?: number | null;
    locator?: string;
    repair_acceptance_token?: string | null;
    dealership?: { name: string } | null;
  };
}

export interface ScheduleBlock {
  id: string;
  dealership_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
}

export interface ContactRequest {
  id: string;
  type: "setup" | "contact";
  name: string;
  company_name?: string;
  email: string;
  phone?: string;
  address?: string;
  message?: string;
  status: "new" | "contacted" | "resolved";
  created_at: string;
}
