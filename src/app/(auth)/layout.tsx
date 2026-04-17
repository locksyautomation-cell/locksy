import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      {/* Minimal header */}
      <header className="bg-navy py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="heading text-xl text-white tracking-wider hover:text-orange transition-colors">
            LOCKSY
          </Link>
          <Link href="/" className="text-sm text-white/70 hover:text-orange transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
