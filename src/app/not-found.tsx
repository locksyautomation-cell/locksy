import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <header className="bg-navy py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="heading text-xl text-white tracking-wider hover:text-orange transition-colors">
            LOCKSY
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <p className="heading text-8xl text-orange mb-4">404</p>
          <h1 className="heading text-2xl text-navy mb-4">PÁGINA NO ENCONTRADA</h1>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            La página que buscas no existe o ha sido eliminada.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-navy px-6 py-3 text-sm font-medium text-white hover:bg-navy/80 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
