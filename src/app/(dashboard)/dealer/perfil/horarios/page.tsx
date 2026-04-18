"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const DAYS = [
  { label: "Lunes",     short: "L" },
  { label: "Martes",    short: "M" },
  { label: "Miércoles", short: "X" },
  { label: "Jueves",    short: "J" },
  { label: "Viernes",   short: "V" },
  { label: "Sábado",    short: "S" },
  { label: "Domingo",   short: "D" },
];

interface DaySchedule {
  day_of_week: number;
  is_closed: boolean;
  morning_start: string;
  morning_end: string;
  has_afternoon: boolean;
  afternoon_start: string;
  afternoon_end: string;
}

const DEFAULT_DAY = (dow: number): DaySchedule => ({
  day_of_week: dow,
  is_closed: dow >= 5,
  morning_start: "09:00",
  morning_end: "14:00",
  has_afternoon: false,
  afternoon_start: "16:00",
  afternoon_end: "20:00",
});

export default function HorariosPage() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((_, i) => DEFAULT_DAY(i))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dealer/schedule")
      .then((r) => r.json())
      .then(({ schedule: rows }) => {
        if (rows && rows.length > 0) {
          setSchedule(DAYS.map((_, i) => {
            const row = rows.find((r: { day_of_week: number }) => r.day_of_week === i);
            if (!row) return DEFAULT_DAY(i);
            return {
              day_of_week: i,
              is_closed: row.is_closed,
              morning_start: row.morning_start?.slice(0, 5) || "09:00",
              morning_end: row.morning_end?.slice(0, 5) || "14:00",
              has_afternoon: !!row.afternoon_start,
              afternoon_start: row.afternoon_start?.slice(0, 5) || "16:00",
              afternoon_end: row.afternoon_end?.slice(0, 5) || "20:00",
            };
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function update(dow: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) => prev.map((d) => d.day_of_week === dow ? { ...d, ...patch } : d));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    setError("");
    const days = schedule.map((d) => ({
      day_of_week: d.day_of_week,
      is_closed: d.is_closed,
      morning_start: d.is_closed ? null : d.morning_start,
      morning_end: d.is_closed ? null : d.morning_end,
      afternoon_start: d.is_closed || !d.has_afternoon ? null : d.afternoon_start,
      afternoon_end: d.is_closed || !d.has_afternoon ? null : d.afternoon_end,
    }));
    const res = await fetch("/api/dealer/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    if (res.ok) {
      setMsg("Horario guardado correctamente.");
      setTimeout(() => setMsg(""), 3000);
    } else {
      setError("Error al guardar el horario.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push("/dealer/perfil")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver al perfil
      </button>

      <h1 className="heading text-2xl text-navy mb-2">HORARIO DE APERTURA</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Los clientes solo podrán reservar citas dentro de este horario.
        Puedes configurar jornada continua o partida (mañana y tarde).
      </p>

      <Card>
        <div className="space-y-1">
          {schedule.map((day) => (
            <div
              key={day.day_of_week}
              className={`rounded-xl p-4 transition-colors ${day.is_closed ? "bg-muted/40" : "bg-background"}`}
            >
              {/* Row header */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-[110px]">
                  <span className="font-semibold text-navy w-24">{DAYS[day.day_of_week].label}</span>
                  {day.is_closed && (
                    <span className="text-xs text-muted-foreground font-medium">Cerrado</span>
                  )}
                </div>

                {/* Toggle cerrado */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-muted-foreground">Cerrado</span>
                  <button
                    type="button"
                    onClick={() => update(day.day_of_week, { is_closed: !day.is_closed })}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      width: "40px",
                      height: "22px",
                      borderRadius: "9999px",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background-color 0.25s ease",
                      backgroundColor: day.is_closed ? "#1a2e4a" : "#d1d5db",
                      padding: "2px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "18px",
                        height: "18px",
                        borderRadius: "9999px",
                        backgroundColor: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transition: "transform 0.25s ease",
                        transform: day.is_closed ? "translateX(18px)" : "translateX(0px)",
                      }}
                    />
                  </button>
                </label>
              </div>

              {/* Time inputs */}
              {!day.is_closed && (
                <div className="mt-3 space-y-3">
                  {/* Mañana */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground w-16">
                      {day.has_afternoon ? "Mañana" : "Apertura"}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.morning_start}
                        onChange={(e) => update(day.day_of_week, { morning_start: e.target.value })}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                      />
                      <span className="text-muted-foreground text-sm">—</span>
                      <input
                        type="time"
                        value={day.morning_end}
                        onChange={(e) => update(day.day_of_week, { morning_end: e.target.value })}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                      />
                    </div>
                  </div>

                  {/* Tarde */}
                  {day.has_afternoon && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-muted-foreground w-16">Tarde</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={day.afternoon_start}
                          onChange={(e) => update(day.day_of_week, { afternoon_start: e.target.value })}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                        />
                        <span className="text-muted-foreground text-sm">—</span>
                        <input
                          type="time"
                          value={day.afternoon_end}
                          onChange={(e) => update(day.day_of_week, { afternoon_end: e.target.value })}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                        />
                      </div>
                    </div>
                  )}

                  {/* Añadir/quitar franja tarde */}
                  <button
                    type="button"
                    onClick={() => update(day.day_of_week, { has_afternoon: !day.has_afternoon })}
                    className="text-xs text-navy hover:underline"
                  >
                    {day.has_afternoon ? "− Quitar franja de tarde" : "+ Añadir franja de tarde"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button variant="secondary" onClick={handleSave} loading={saving}>
            Guardar horario
          </Button>
          {msg && <p className="text-sm text-green-600 font-medium">{msg}</p>}
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      </Card>
    </div>
  );
}
