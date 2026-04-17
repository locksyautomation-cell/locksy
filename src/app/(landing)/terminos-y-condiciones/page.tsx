export const metadata = {
  title: "Términos y Condiciones — LOCKSY",
};

export default function TerminosYCondicionesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="heading text-3xl text-navy mb-2">Términos y Condiciones de Uso</h1>
      <p className="text-sm text-gray-500 mb-10">Última actualización: marzo de 2026</p>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">1. Objeto</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma LOCKSY,
          titularidad de LOCKSY S.L., que presta servicios de gestión operativa y administrativa
          para talleres y concesionarios de motocicletas.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">2. Aceptación</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          El acceso y uso de la plataforma implica la aceptación plena y sin reservas de los
          presentes Términos y Condiciones. Si no está de acuerdo con los mismos, deberá
          abstenerse de utilizar la plataforma.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">3. Acceso a la plataforma</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          El acceso a LOCKSY requiere registro previo. El usuario es responsable de mantener la
          confidencialidad de sus credenciales de acceso y de todas las actividades realizadas
          desde su cuenta.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">4. Uso permitido</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          El usuario se compromete a utilizar la plataforma de conformidad con la ley, la moral
          y el orden público, y se abstendrá de utilizarla con fines fraudulentos, ilícitos o
          que puedan causar daños a terceros.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">5. Propiedad intelectual</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Todos los contenidos de la plataforma, incluyendo textos, imágenes, logotipos, software
          y diseño gráfico, son propiedad de LOCKSY S.L. o de sus licenciantes y están protegidos
          por la legislación vigente en materia de propiedad intelectual e industrial.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">6. Protección de datos</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          El tratamiento de los datos personales de los usuarios se rige por la Política de
          Privacidad de LOCKSY, disponible en la plataforma, y por el Reglamento (UE) 2016/679
          (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">7. Responsabilidad</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          LOCKSY S.L. no se responsabiliza de los daños o perjuicios derivados de interrupciones
          del servicio, fallos técnicos, accesos no autorizados o usos indebidos de la plataforma
          por parte de terceros.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">8. Modificaciones</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          LOCKSY S.L. se reserva el derecho a modificar los presentes Términos y Condiciones en
          cualquier momento. Los cambios serán notificados a los usuarios registrados y publicados
          en la plataforma.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">9. Legislación aplicable y jurisdicción</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Los presentes Términos y Condiciones se rigen por la legislación española. Para la
          resolución de cualquier controversia, las partes se someten a los Juzgados y Tribunales
          de la ciudad de Sevilla, con renuncia expresa a cualquier otro fuero que pudiera
          corresponderles.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">10. Contacto</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Para cualquier consulta relacionada con estos Términos y Condiciones, puede contactar
          con nosotros en:{" "}
          <a href="mailto:legal@locksy.es" className="text-orange hover:underline">
            legal@locksy.es
          </a>
        </p>
      </section>
    </div>
  );
}
