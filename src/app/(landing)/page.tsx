import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LOCKSY - Gestión Inteligente para tu Taller",
};

const features = [
  {
    title: "Gestión de citas",
    description:
      "Reserva y gestiona citas de reparación con tu taller de forma sencilla y rápida.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Notificaciones",
    description:
      "Recibe avisos de cambios de estado, presupuestos y finalización de reparaciones.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: "Taller en tiempo real",
    description:
      "Seguimiento del estado de reparación de tu vehículo en cada momento.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Historial completo",
    description:
      "Acceso a facturas, observaciones y recomendaciones de todas tus reparaciones.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Sin esperas",
    description:
      "Entrega y recogida de llaves automatizada, sin esperas en el mostrador.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Pago seguro",
    description:
      "Paga de forma segura cumpliendo con toda la normativa vigente.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Banner */}
      <section className="bg-navy py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="heading text-3xl sm:text-4xl lg:text-5xl text-white mb-6">
            GESTIÓN INTELIGENTE PARA TU TALLER
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80 mb-10">
            La plataforma que conecta concesionarios y clientes. Gestiona citas,
            seguimiento de reparaciones y pagos de forma sencilla y segura.
          </p>
          <Link
            href="/setup"
            className="inline-block rounded-lg bg-orange px-8 py-4 text-lg font-semibold text-white hover:bg-orange-light transition-colors"
          >
            Empieza Ahora
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border p-8"
              >
                <div className="mb-4 text-orange">{feature.icon}</div>
                <h3 className="heading text-lg text-navy mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="heading text-2xl sm:text-3xl text-navy mb-8">
            ¿LISTO PARA AUMENTAR EL RENDIMIENTO DE TU TALLER?
          </h2>
          <Link
            href="/setup"
            className="inline-block rounded-lg bg-orange px-8 py-4 text-lg font-semibold text-white hover:bg-orange-light transition-colors"
          >
            Empieza Ahora
          </Link>
        </div>
      </section>
    </>
  );
}
