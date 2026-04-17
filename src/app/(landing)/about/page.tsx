import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sobre Nosotros" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="heading text-3xl text-navy mb-10 text-center">
        SOBRE NOSOTROS
      </h1>

      <section className="mb-12">
        <h2 className="heading text-xl text-navy mb-4">¿QUIÉNES SOMOS?</h2>
        <p className="text-foreground leading-relaxed mb-4">
          LOCKSY nace de la necesidad de modernizar la gestión de talleres en
          concesionarios de coches. Somos un equipo de profesionales apasionados
          por la tecnología y el sector automovilístico, comprometidos con
          ofrecer soluciones que simplifiquen el día a día tanto de los
          concesionarios como de sus clientes.
        </p>
        <p className="text-foreground leading-relaxed">
          Nuestra plataforma ha sido diseñada pensando en la experiencia del
          usuario, la eficiencia operativa y la seguridad de los datos.
          Creemos que la digitalización del sector debe ser accesible,
          intuitiva y fiable.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="heading text-xl text-navy mb-4">¿QUÉ HACEMOS?</h2>
        <p className="text-foreground leading-relaxed mb-4">
          Desarrollamos software de gestión integral para talleres de
          concesionarios. Nuestra plataforma permite:
        </p>
        <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
          <li>Gestión completa de citas y reparaciones</li>
          <li>Seguimiento en tiempo real del estado de los vehículos</li>
          <li>Sistema automatizado de entrega y recogida de llaves</li>
          <li>Comunicación directa entre taller y cliente</li>
          <li>Pagos seguros integrados</li>
          <li>Generación automática de documentación y facturas</li>
        </ul>
      </section>

      <section>
        <h2 className="heading text-xl text-navy mb-4">NUESTRA HISTORIA</h2>
        <p className="text-foreground leading-relaxed mb-4">
          LOCKSY fue fundada con la visión de eliminar las fricciones en la
          relación entre concesionarios y sus clientes. Tras años de
          experiencia en el sector automovilístico, identificamos que los
          procesos de gestión de talleres seguían siendo mayoritariamente
          manuales, lentos e ineficientes.
        </p>
        <p className="text-foreground leading-relaxed">
          Desde nuestros inicios, hemos trabajado codo a codo con
          concesionarios reales para desarrollar una herramienta que realmente
          responda a las necesidades del sector. Hoy, LOCKSY es la solución
          integral que ayuda a los talleres a aumentar su rendimiento y a los
          clientes a disfrutar de una experiencia sin fricciones.
        </p>
      </section>
    </div>
  );
}
