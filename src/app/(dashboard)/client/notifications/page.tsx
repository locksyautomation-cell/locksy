"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils/dates";
import type { Notification } from "@/lib/types";

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch(`/api/client/get-notifications?t=${Date.now()}`);
    if (res.ok) {
      const { notifications: data } = await res.json();
      setNotifications((data as Notification[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Re-fetch when user returns to tab (e.g. after signing in a new tab)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // BroadcastChannel — instant re-fetch when signing happens in another tab
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("budget_signed");
      bc.onmessage = () => fetchNotifications();
    } catch { /* not supported */ }

    // Real-time subscription — re-fetch when notifications change
    const supabase = createClient();
    const channel = supabase
      .channel("client-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => { fetchNotifications(); }
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      bc?.close();
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function markAllAsRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // budget_sent notifications are excluded — they require explicit action
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .neq("type", "budget_sent")
      .eq("read", false);

    setNotifications((prev) =>
      prev.map((n) => (n.type !== "budget_sent" ? { ...n, read: true } : n))
    );
  }

  async function handleBudgetResponse(
    notificationId: string,
    appointmentId: string,
    accept: boolean
  ) {
    setResponding(notificationId);
    await fetch("/api/client/respond-budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification_id: notificationId,
        appointment_id: appointmentId,
        accept,
      }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setResponding(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const nonBudgetUnread = notifications.filter(
    (n) => !n.read && n.type !== "budget_sent"
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="heading text-2xl text-navy">NOTIFICACIONES</h1>
          {unreadCount > 0 && (
            <Badge variant="error">{unreadCount}</Badge>
          )}
        </div>
        {nonBudgetUnread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No tienes notificaciones.
        </p>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const budgetUrl = notification.appointment?.budget_url;

            return (
              <Card
                key={notification.id}
                className={
                  !notification.read
                    ? notification.type === "appointment_accepted"
                      ? "border-l-4 border-l-green-500"
                      : notification.type === "appointment_rejected"
                      ? "border-l-4 border-l-red-500"
                      : "border-l-4 border-l-orange"
                    : ""
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold ${
                      notification.type === "appointment_accepted" ? "text-green-700" :
                      notification.type === "appointment_rejected" ? "text-red-600" :
                      "text-foreground"
                    }`}>
                      {notification.type === "appointment_accepted" && (
                        <span className="mr-1">✓</span>
                      )}
                      {notification.type === "appointment_rejected" && (
                        <span className="mr-1">✗</span>
                      )}
                      {notification.title}
                    </h3>
                    {notification.appointment?.dealership?.name && (
                      <p className="text-xs font-medium text-orange mt-0.5">
                        {notification.appointment.dealership.name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>
                </div>

                {/* Budget notification actions */}
                {notification.type === "budget_sent" &&
                  notification.appointment_id && (
                    <div className="mt-4 space-y-3">
                      {/* Amount (if available) */}
                      {notification.appointment?.budget_amount != null && (
                        <p className="text-sm font-medium text-foreground">
                          Importe: {notification.appointment.budget_amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </p>
                      )}

                      {/* Download link — only when file exists */}
                      {budgetUrl ? (
                        <a
                          href={budgetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-orange hover:text-orange-dark font-medium"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Ver / Descargar presupuesto
                        </a>
                      ) : (
                        <a
                          href={`/client/appointments/${notification.appointment_id}`}
                          className="inline-flex items-center gap-1.5 text-sm text-orange hover:text-orange-dark font-medium"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver detalles del presupuesto
                        </a>
                      )}

                      {/* Signed state — use budget_accepted_at as source of truth */}
                      {notification.appointment?.budget_accepted_at ? (
                        <p className="text-sm text-green-600 font-medium">
                          ✓ Presupuesto firmado el {new Date(notification.appointment.budget_accepted_at).toLocaleString("es-ES")}
                        </p>
                      ) : notification.read ? (
                        <p className="text-xs text-muted-foreground">
                          Presupuesto respondido.
                        </p>
                      ) : (
                        <div className="flex gap-3 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            loading={responding === notification.id}
                            onClick={() =>
                              handleBudgetResponse(
                                notification.id,
                                notification.appointment_id!,
                                false
                              )
                            }
                          >
                            Rechazar
                          </Button>
                          {notification.appointment?.budget_acceptance_token ? (
                            <a
                              href={`/presupuesto/${notification.appointment.budget_acceptance_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90 transition-colors"
                            >
                              Firmar presupuesto →
                            </a>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={responding === notification.id}
                              onClick={() =>
                                handleBudgetResponse(
                                  notification.id,
                                  notification.appointment_id!,
                                  true
                                )
                              }
                            >
                              Aceptar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* Repair order notification — link to acceptance page */}
                {notification.type === "repair_order_sent" &&
                  notification.appointment?.repair_acceptance_token && (
                    <div className="mt-4">
                      <a
                        href={`/orden/${notification.appointment.repair_acceptance_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => { if (!notification.read) markAsRead(notification.id); }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:underline"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Revisar y aceptar orden →
                      </a>
                    </div>
                  )}

                {/* Regular notification mark as read */}
                {!notification.read && notification.type !== "budget_sent" && notification.type !== "repair_order_sent" && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="mt-3 text-xs text-orange hover:text-orange-dark"
                  >
                    Marcar como leído
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
