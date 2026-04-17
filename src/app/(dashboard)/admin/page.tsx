"use client";

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="heading text-2xl text-navy mb-8">PANEL DE ADMINISTRACIÓN</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
        <Link
          href="/admin/concesionarios"
          className="group flex flex-col items-center justify-center gap-4 rounded-xl bg-white border border-border p-10 shadow-sm hover:shadow-md hover:border-navy transition-all duration-200"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy/10 group-hover:bg-navy/20 transition-colors">
            <svg className="h-8 w-8 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="heading text-lg text-navy">CONCESIONARIOS</span>
          <p className="text-sm text-muted-foreground text-center">Gestionar concesionarios, crear cuentas y configurar estados de reparación</p>
        </Link>

        <Link
          href="/admin/clientes"
          className="group flex flex-col items-center justify-center gap-4 rounded-xl bg-white border border-border p-10 shadow-sm hover:shadow-md hover:border-navy transition-all duration-200"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange/10 group-hover:bg-orange/20 transition-colors">
            <svg className="h-8 w-8 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="heading text-lg text-navy">CLIENTES</span>
          <p className="text-sm text-muted-foreground text-center">Ver y gestionar todos los clientes registrados en la plataforma</p>
        </Link>

        <Link
          href="/admin/contacto"
          className="group flex flex-col items-center justify-center gap-4 rounded-xl bg-white border border-border p-10 shadow-sm hover:shadow-md hover:border-navy transition-all duration-200"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy/10 group-hover:bg-navy/20 transition-colors">
            <svg className="h-8 w-8 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="heading text-lg text-navy">CONTACTO</span>
          <p className="text-sm text-muted-foreground text-center">Mensajes recibidos a través de los formularios Contact Us y Start Setup</p>
        </Link>
      </div>
    </div>
  );
}
