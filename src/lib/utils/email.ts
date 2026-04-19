import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "LOCKSY <noreply@locksy-at.es>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";
const EMAILS_ENABLED = process.env.RESEND_ENABLED !== "false";

/** Sends the 2FA verification code to the user */
export async function sendVerificationCode(email: string, code: string) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendVerificationCode → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Tu código de acceso a LOCKSY",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Código de verificación</h2>
        <p>Introduce este código para completar el inicio de sesión:</p>
        <div style="text-align:center;margin:32px 0;">
          <span style="display:inline-block;background:#0a1628;color:#fff;font-size:32px;font-weight:700;
                       letter-spacing:10px;padding:16px 32px;border-radius:12px;font-family:monospace;">
            ${code}
          </span>
        </div>
        <p style="color:#666;font-size:13px;">Este código caduca en 10 minutos. Si no has intentado iniciar sesión, ignora este mensaje.</p>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

/** Sends a repair status change notification to the client */
export async function sendStatusChangeEmail(
  email: string,
  name: string,
  locator: string,
  newStatus: string,
  appointmentId: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendStatusChangeEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Actualización de tu reparación — ${locator}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Actualización de tu reparación</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>El estado de tu reparación <strong>${locator}</strong> ha cambiado:</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:24px 0;text-align:center;">
          <span style="font-size:18px;font-weight:600;color:#0a1628;">${newStatus}</span>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/client/appointments/${appointmentId}"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi cita
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

/** Sends a budget notification to the client */
export async function sendBudgetEmail(
  email: string,
  name: string,
  locator: string,
  amount: number,
  appointmentId: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendBudgetEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Presupuesto disponible para tu reparación — ${locator}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Tienes un presupuesto pendiente</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>El concesionario ha enviado un presupuesto para tu reparación <strong>${locator}</strong>:</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:24px 0;text-align:center;">
          <span style="font-size:24px;font-weight:700;color:#0a1628;">${amount.toFixed(2)} €</span>
        </div>
        <p>Accede a tu cita para aceptarlo o rechazarlo.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/client/appointments/${appointmentId}"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver presupuesto
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #8 — Confirmación de cita (cliente) ─────────────────────────────
export async function sendAppointmentConfirmationEmail(
  email: string,
  clientName: string,
  dealerName: string,
  dealerAddress: string,
  locator: string,
  scheduledDate: string,
  scheduledTime: string,
  vehicleInfo: string,
  appointmentId: string,
  loanerRequested = false
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendAppointmentConfirmationEmail → ${email}`); return; }
  const dateFormatted = new Date(scheduledDate).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Confirmación de cita — ${locator}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Cita confirmada</h2>
        <p>Hola${clientName ? ` ${clientName}` : ""},</p>
        <p>Tu cita ha sido registrada correctamente. Aquí tienes los detalles:</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin:24px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:40%;">Localizador</td><td style="padding:6px 0;font-weight:600;">${locator}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Taller</td><td style="padding:6px 0;">${dealerName}</td></tr>
            ${dealerAddress ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Dirección</td><td style="padding:6px 0;">${dealerAddress}</td></tr>` : ""}
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Fecha</td><td style="padding:6px 0;">${dateFormatted}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Hora</td><td style="padding:6px 0;">${scheduledTime}</td></tr>
            ${vehicleInfo ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Vehículo</td><td style="padding:6px 0;">${vehicleInfo}</td></tr>` : ""}
            ${loanerRequested ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Vehículo sustitución</td><td style="padding:6px 0;color:#e07b3a;font-weight:600;">Solicitado — pendiente de confirmación</td></tr>` : ""}
          </table>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/client/appointments/${appointmentId}"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi cita
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #9 — Concesionario eliminado (cliente) ──────────────────────────
export async function sendDealershipDeletedEmail(
  email: string,
  clientName: string,
  dealerName: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendDealershipDeletedEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Concesionario desvinculado — ${dealerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Concesionario desvinculado</h2>
        <p>Hola${clientName ? ` ${clientName}` : ""},</p>
        <p>El concesionario <strong>${dealerName}</strong> ha sido eliminado de la plataforma LOCKSY.</p>
        <p>Tu historial de citas y datos se han conservado. Si tienes alguna duda, contacta con el equipo de LOCKSY.</p>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #10 — Confirmación de pago (cliente) ────────────────────────────
export async function sendPaymentConfirmedEmail(
  email: string,
  clientName: string,
  locator: string,
  amount: number,
  appointmentId: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendPaymentConfirmedEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Confirmación de pago — ${locator}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Pago confirmado</h2>
        <p>Hola${clientName ? ` ${clientName}` : ""},</p>
        <p>Hemos recibido correctamente el pago de tu reparación <strong>${locator}</strong>.</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:24px 0;text-align:center;">
          <span style="font-size:28px;font-weight:700;color:#0a1628;">${amount.toFixed(2)} €</span>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/client/appointments/${appointmentId}"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi cita
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #11 — Cambio en el calendario (concesionario) ───────────────────
export async function sendDealerAppointmentNotificationEmail(
  email: string,
  dealerName: string,
  eventType: "nueva" | "solicitada" | "cancelada" | "modificada",
  locator: string,
  clientName: string,
  scheduledDate: string,
  scheduledTime: string,
  vehicleInfo: string,
  appointmentId: string,
  loanerRequested = false
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendDealerAppointmentNotificationEmail → ${email}`); return; }
  const eventLabels = {
    nueva: "Nueva cita registrada",
    solicitada: "Solicitud de cita recibida",
    cancelada: "Cita cancelada",
    modificada: "Cita modificada",
  };
  const dateFormatted = new Date(scheduledDate).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `${eventLabels[eventType]} — ${locator}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">${eventLabels[eventType]}</h2>
        <p>Hola${dealerName ? ` ${dealerName}` : ""},</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin:24px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:40%;">Localizador</td><td style="padding:6px 0;font-weight:600;">${locator}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Cliente</td><td style="padding:6px 0;">${clientName || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Fecha</td><td style="padding:6px 0;">${dateFormatted}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;">Hora</td><td style="padding:6px 0;">${scheduledTime}</td></tr>
            ${vehicleInfo ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Vehículo</td><td style="padding:6px 0;">${vehicleInfo}</td></tr>` : ""}
            ${loanerRequested ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;">Vehículo sustitución</td><td style="padding:6px 0;color:#e07b3a;font-weight:600;">⚠ Solicitado por el cliente</td></tr>` : ""}
          </table>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/dealer/citas/${appointmentId}"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver la cita
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #12 — Suscripción activada (concesionario) ─────────────────────
export async function sendSubscriptionActivatedEmail(email: string, name: string) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendSubscriptionActivatedEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Suscripción activada correctamente — LOCKSY",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Suscripción activa</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>Tu suscripción mensual a LOCKSY está activa. Ya tienes acceso completo a todas las funcionalidades de la plataforma.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/dealer/perfil/pagos"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi suscripción
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #13 — Pago mensual de suscripción (concesionario) ──────────────
export async function sendSubscriptionPaymentEmail(
  email: string,
  name: string,
  amount: number,
  periodEnd: Date
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendSubscriptionPaymentEmail → ${email}`); return; }
  const periodEndFormatted = periodEnd.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Pago de suscripción recibido — LOCKSY",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Pago de suscripción</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>Hemos procesado correctamente el pago de tu suscripción mensual a LOCKSY.</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:24px 0;text-align:center;">
          <span style="font-size:28px;font-weight:700;color:#0a1628;">${amount.toFixed(2)} €</span>
          <p style="margin:8px 0 0;color:#666;font-size:13px;">Próximo cargo: ${periodEndFormatted}</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/dealer/perfil/pagos"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mis facturas
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #14 — Suscripción cancelada (concesionario) ────────────────────
export async function sendSubscriptionCancelledEmail(
  email: string,
  name: string,
  periodEnd: string | null
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendSubscriptionCancelledEmail → ${email}`); return; }
  const periodFormatted = periodEnd
    ? new Date(periodEnd).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
    : null;
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Suscripción cancelada — LOCKSY",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Suscripción cancelada</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>Tu suscripción a LOCKSY ha sido cancelada${periodFormatted ? ` y tendrás acceso hasta el <strong>${periodFormatted}</strong>` : ""}.</p>
        <p>Si esto ha sido un error o deseas reactivarla, puedes hacerlo desde tu perfil.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/dealer/perfil/pagos"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi suscripción
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email #15 — Suscripción reactivada (concesionario) ───────────────────
export async function sendSubscriptionReactivatedEmail(email: string, name: string) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendSubscriptionReactivatedEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Reactivación de suscripción — LOCKSY",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Suscripción reactivada</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>Tu suscripción a LOCKSY ha sido reactivada correctamente. El acceso a la plataforma continúa sin interrupciones.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/dealer/perfil/pagos"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi suscripción
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

/** Notifies a dealer that their subscription price has been updated */
export async function sendPriceChangeEmail(
  email: string,
  name: string,
  newAmountEur: number
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendPriceChangeEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Actualización del precio de tu suscripción LOCKSY",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Actualización de precio</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>El administrador ha actualizado el precio de tu suscripción mensual a LOCKSY:</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:24px 0;text-align:center;">
          <span style="font-size:28px;font-weight:700;color:#0a1628;">${newAmountEur.toFixed(2)} € <span style="font-size:14px;font-weight:400;color:#666;">/ mes (IVA exc.)</span></span>
        </div>
        <p>El nuevo precio entrará en vigor a partir del <strong>próximo período de facturación</strong>. No se realizará ningún cargo adicional en el ciclo actual.</p>
        <p>Accede a tu perfil para confirmar el cambio.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/dealer/perfil/pagos"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi suscripción
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

/** Sends appointment accepted/rejected notification to the client */
export async function sendAppointmentStatusEmail(
  email: string,
  name: string,
  locator: string,
  accepted: boolean,
  appointmentId: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendAppointmentStatusEmail → ${email}`); return; }
  const subject = accepted
    ? `Cita confirmada — ${locator}`
    : `Solicitud de cita rechazada — ${locator}`;

  const body = accepted
    ? `Tu solicitud de cita <strong>${locator}</strong> ha sido <strong style="color:#16a34a;">aceptada</strong>. El concesionario se pondrá en contacto contigo para confirmar los detalles.`
    : `Tu solicitud de cita <strong>${locator}</strong> ha sido <strong style="color:#dc2626;">rechazada</strong>. Puedes solicitar una nueva cita desde la app.`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">${accepted ? "Cita confirmada" : "Solicitud rechazada"}</h2>
        <p>Hola${name ? ` ${name}` : ""},</p>
        <p>${body}</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/client/appointments/${appointmentId}"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi cita
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

/** Notifica al cliente que su orden de reparación está lista para aceptar */
export async function sendRepairOrderEmail(
  email: string,
  clientName: string,
  locator: string,
  dealershipName: string,
  vehicleLabel: string,
  acceptanceUrl: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendRepairOrderEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Orden de reparación lista para aceptar — ${locator}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <div style="background:#0a1628;border-radius:12px 12px 0 0;padding:28px 32px;">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:1px;">LOCKSY</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
          <h2 style="color:#0a1628;margin:0 0 16px;">Orden de reparación disponible</h2>
          <p style="margin:0 0 8px;">Hola${clientName ? ` ${clientName}` : ""},</p>
          <p style="margin:0 0 24px;color:#444;">
            El concesionario <strong>${dealershipName}</strong> ha generado la orden de reparación
            para tu vehículo <strong>${vehicleLabel}</strong> (cita <strong>${locator}</strong>).
          </p>
          <p style="margin:0 0 24px;color:#444;">
            Por favor revisa las reparaciones previstas y acepta la orden para que puedan comenzar los trabajos.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${acceptanceUrl}"
               style="background:#e07b3a;color:#fff;padding:14px 32px;border-radius:8px;
                      text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
              Revisar y aceptar orden
            </a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">
            Si el botón no funciona, copia este enlace en tu navegador:<br/>
            <a href="${acceptanceUrl}" style="color:#e07b3a;">${acceptanceUrl}</a>
          </p>
          <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
        </div>
      </div>
    `,
  });
}

// ── Email — Respuesta vehículo de sustitución (cliente) ───────────────────
export async function sendLoanerVehicleResponseEmail(
  email: string,
  clientName: string,
  locator: string,
  dealerName: string,
  accepted: boolean,
  appointmentId: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendLoanerVehicleResponseEmail → ${email}`); return; }
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Vehículo de sustitución ${accepted ? "confirmado" : "no disponible"} — ${locator}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Vehículo de sustitución</h2>
        <p>Hola${clientName ? ` ${clientName}` : ""},</p>
        ${accepted
          ? `<p>El taller <strong>${dealerName}</strong> ha <strong style="color:#16a34a;">confirmado</strong> que dispondrá de un vehículo de sustitución para tu cita <strong>${locator}</strong>.</p>`
          : `<p>El taller <strong>${dealerName}</strong> nos informa de que <strong style="color:#dc2626;">no podrá proporcionarte</strong> un vehículo de sustitución para tu cita <strong>${locator}</strong>.</p>`
        }
        <div style="text-align:center;margin:24px 0;">
          <a href="${APP_URL}/client/appointments/${appointmentId}"
             style="background:#0a1628;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ver mi cita
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });
}

// ── Email — Confirmación de firma de orden (evidencia legal) ─────────────────
export async function sendSignatureConfirmationEmail(
  email: string,
  clientName: string,
  locator: string,
  dealershipName: string,
  type: "key_pickup" | "key_return" | "budget_accepted",
  signedAt: string,
  ip: string
) {
  if (!EMAILS_ENABLED) { console.log(`[email disabled] sendSignatureConfirmationEmail → ${email}`); return; }
  const label = type === "key_pickup" ? "Entrega de vehículo" : type === "key_return" ? "Recogida de vehículo" : "Aceptación de presupuesto";
  const date = new Date(signedAt).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" });
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Confirmación de firma — ${locator} (${label})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
        <div style="background:#0a1628;border-radius:12px 12px 0 0;padding:28px 32px;">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:1px;">LOCKSY</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
          <h2 style="color:#0a1628;margin:0 0 16px;">Firma registrada correctamente</h2>
          <p style="margin:0 0 8px;">Hola${clientName ? ` ${clientName}` : ""},</p>
          <p style="margin:0 0 24px;color:#444;">
            Hemos registrado tu firma electrónica para la cita <strong>${locator}</strong>
            en <strong>${dealershipName}</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:10px 0;color:#6b7280;width:40%;">Tipo de firma</td>
              <td style="padding:10px 0;font-weight:600;">${label}</td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:10px 0;color:#6b7280;">Fecha y hora</td>
              <td style="padding:10px 0;">${date}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6b7280;">IP registrada</td>
              <td style="padding:10px 0;font-family:monospace;">${ip}</td>
            </tr>
          </table>
          <p style="color:#888;font-size:12px;">
            Guarda este email como comprobante. Si no has realizado esta acción, contacta con nosotros inmediatamente.
          </p>
          <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
        </div>
      </div>
    `,
  });
}
