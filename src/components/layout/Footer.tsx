import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="heading text-xl tracking-wider mb-4">LOCKSY</h3>
            <p className="text-sm text-white/70">
              Software de gestión de talleres para concesionarios de coches.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="heading text-sm mb-4">NAVEGACIÓN</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-white/70 hover:text-orange transition-colors">Inicio</Link></li>
              <li><Link href="/setup" className="text-sm text-white/70 hover:text-orange transition-colors">Implementación</Link></li>
              <li><Link href="/faqs" className="text-sm text-white/70 hover:text-orange transition-colors">FAQs</Link></li>
              <li><Link href="/about" className="text-sm text-white/70 hover:text-orange transition-colors">Nosotros</Link></li>
              <li><Link href="/contact" className="text-sm text-white/70 hover:text-orange transition-colors">Contacto</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="heading text-sm mb-4">LEGAL</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terminos-y-condiciones" className="text-sm text-white/70 hover:text-orange transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/politica-de-privacidad" className="text-sm text-white/70 hover:text-orange transition-colors">
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="heading text-sm mb-4">CONTACTO</h4>
            <a
              href="mailto:info@locksy-at.es"
              className="text-sm text-white/70 hover:text-orange transition-colors block mb-2"
            >
              info@locksy-at.es
            </a>
            <Link href="/contact" className="text-sm text-white/70 hover:text-orange transition-colors">
              Formulario de contacto
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-white/20 pt-8 text-center">
          <p className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} LOCKSY. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
