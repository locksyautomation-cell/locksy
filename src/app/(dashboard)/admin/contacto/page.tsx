"use client";

import { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface ContactMessage {
  id: string;
  form_type: "contact" | "setup";
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  extra_fields: Record<string, string> | null;
  read: boolean;
  created_at: string;
}

const TABS = [
  { id: "contact" as const, label: "Contact Us" },
  { id: "setup" as const, label: "Start Setup" },
];

export default function AdminContactoPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"contact" | "setup">("contact");

  // Reply state: message id → { text, sending, sent, error }
  const [replies, setReplies] = useState<
    Record<string, { open: boolean; text: string; sending: boolean; sent: boolean; error: string }>
  >({});

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/get-messages");
      const data = await res.json();
      if (!res.ok) setError(data.error || "Error al cargar mensajes.");
      else setMessages(data.messages || []);
    } catch {
      setError("Error de conexión.");
    }
    setLoading(false);
  }

  async function markAsRead(id: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    await fetch("/api/admin/mark-message-read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  function toggleReply(id: string) {
    setReplies((prev) => ({
      ...prev,
      [id]: prev[id]
        ? { ...prev[id], open: !prev[id].open }
        : { open: true, text: "", sending: false, sent: false, error: "" },
    }));
  }

  async function sendReply(msg: ContactMessage) {
    const reply = replies[msg.id];
    if (!reply?.text.trim()) return;

    setReplies((prev) => ({ ...prev, [msg.id]: { ...prev[msg.id], sending: true, error: "" } }));

    try {
      const res = await fetch("/api/admin/reply-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: msg.id, reply_text: reply.text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplies((prev) => ({
          ...prev,
          [msg.id]: { ...prev[msg.id], sending: false, error: data.error || "Error al enviar." },
        }));
      } else {
        setReplies((prev) => ({
          ...prev,
          [msg.id]: { ...prev[msg.id], sending: false, sent: true, open: false },
        }));
        if (!msg.read) markAsRead(msg.id);
      }
    } catch {
      setReplies((prev) => ({
        ...prev,
        [msg.id]: { ...prev[msg.id], sending: false, error: "Error de conexión." },
      }));
    }
  }

  function unreadCount(type: "contact" | "setup") {
    return messages.filter((m) => m.form_type === type && !m.read).length;
  }

  const byTab = messages.filter((m) => m.form_type === activeTab);
  const q = search.toLowerCase().trim();
  const filtered = q
    ? byTab.filter(
        (m) =>
          (m.name || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q) ||
          (m.company || "").toLowerCase().includes(q)
      )
    : byTab;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h1 className="heading text-2xl text-navy flex-1">CONTACTO</h1>
        <div className="sm:w-72">
          <Input
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((tab) => {
          const count = unreadCount(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-navy text-navy"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1 text-white text-xs font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {error && <p className="text-sm text-error mb-4 text-center">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          {search ? "No se encontraron resultados." : "No hay mensajes en esta categoría."}
        </p>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {filtered.map((msg) => {
            const reply = replies[msg.id];
            return (
              <div
                key={msg.id}
                className={`rounded-xl border bg-white shadow-sm transition-colors ${
                  msg.read ? "border-border" : "border-orange"
                }`}
              >
                {/* Message header — click to mark as read and open reply */}
                <div
                  onClick={() => { if (!msg.read) markAsRead(msg.id); toggleReply(msg.id); }}
                  className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      {!msg.read && (
                        <span className="h-2 w-2 rounded-full bg-orange flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{msg.name || "—"}</p>
                        {msg.email && (
                          <a
                            href={`mailto:${msg.email}`}
                            className="text-sm text-navy hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {msg.email}
                          </a>
                        )}
                      </div>
                    </div>
                    <time className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(msg.created_at).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                    {msg.phone && (
                      <div>
                        <span className="text-muted-foreground">Teléfono: </span>
                        <span className="font-medium text-foreground">{msg.phone}</span>
                      </div>
                    )}
                    {msg.company && (
                      <div>
                        <span className="text-muted-foreground">Empresa: </span>
                        <span className="font-medium text-foreground">{msg.company}</span>
                      </div>
                    )}
                    {msg.extra_fields?.address && (
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground">Dirección: </span>
                        <span className="font-medium text-foreground">{msg.extra_fields.address}</span>
                      </div>
                    )}
                  </div>

                  {msg.message && (
                    <div className="mt-3 pt-3 border-t border-border text-sm">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mensaje</p>
                      <p className="text-foreground whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  )}
                </div>

                {/* Reply section */}
                <div className="px-5 pb-4 border-t border-border">
                  {reply?.sent ? (
                    <p className="pt-3 text-sm text-green-600 font-medium">
                      ✓ Respuesta enviada correctamente
                    </p>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleReply(msg.id)}
                        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-navy hover:text-navy/70 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        {reply?.open ? "Cancelar respuesta" : "Responder"}
                      </button>

                      {reply?.open && (
                        <div className="mt-3 space-y-2">
                          {msg.email && (
                            <p className="text-xs text-muted-foreground">
                              Para: <span className="font-medium text-foreground">{msg.email}</span>
                            </p>
                          )}
                          <textarea
                            rows={4}
                            placeholder="Escribe tu respuesta..."
                            value={reply.text}
                            onChange={(e) =>
                              setReplies((prev) => ({
                                ...prev,
                                [msg.id]: { ...prev[msg.id], text: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                          />
                          {reply.error && (
                            <p className="text-xs text-error">{reply.error}</p>
                          )}
                          <div className="flex justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => sendReply(msg)}
                              loading={reply.sending}
                              disabled={!reply.text.trim()}
                            >
                              Enviar respuesta
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
