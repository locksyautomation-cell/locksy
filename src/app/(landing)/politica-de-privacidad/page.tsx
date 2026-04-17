export const metadata = {
  title: "Política de Privacidad — LOCKSY",
};

export default function PoliticaDePrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="heading text-3xl text-navy mb-2">Política de Privacidad</h1>
      <p className="text-sm text-gray-500 mb-10">Última actualización: marzo de 2026</p>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">1. Responsable del tratamiento</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          LOCKSY S.L., con domicilio social en Sevilla, España. Correo electrónico de contacto:{" "}
          <a href="mailto:legal@locksy.es" className="text-orange hover:underline">
            legal@locksy.es
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">2. Datos que recopilamos</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Recopilamos los siguientes datos personales: nombre y apellidos o razón social, NIF/CIF,
          dirección de correo electrónico, número de teléfono, dirección postal, datos de
          facturación e IBAN, y datos de uso de la plataforma.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">3. Finalidad del tratamiento</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Los datos personales recogidos se utilizan para: gestionar el alta y mantenimiento de
          la cuenta de usuario, prestar los servicios contratados a través de la plataforma,
          gestionar la facturación y los pagos, atender consultas y solicitudes de soporte, y
          cumplir con las obligaciones legales aplicables.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">4. Legitimación</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          La base legal para el tratamiento de sus datos es la ejecución del contrato de
          prestación de servicios suscrito con LOCKSY S.L., el cumplimiento de obligaciones
          legales y, en su caso, el consentimiento expreso del usuario.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">5. Conservación de los datos</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Los datos se conservarán durante el tiempo necesario para la prestación del servicio y,
          una vez finalizada la relación contractual, durante los plazos legalmente establecidos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">6. Comunicación de datos a terceros</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          LOCKSY S.L. no cederá sus datos personales a terceros, salvo obligación legal o cuando
          sea estrictamente necesario para la prestación del servicio (por ejemplo, proveedores de
          servicios de pago o infraestructura tecnológica), quienes actuarán como encargados del
          tratamiento bajo las garantías exigidas por la normativa vigente.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">7. Transferencias internacionales</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          En caso de realizarse transferencias internacionales de datos, estas se efectuarán con
          las garantías adecuadas exigidas por el RGPD, como cláusulas contractuales tipo
          aprobadas por la Comisión Europea.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">8. Derechos del usuario</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          El usuario puede ejercer en cualquier momento sus derechos de acceso, rectificación,
          supresión, oposición, limitación del tratamiento y portabilidad de los datos, enviando
          una solicitud a{" "}
          <a href="mailto:legal@locksy.es" className="text-orange hover:underline">
            legal@locksy.es
          </a>
          , adjuntando copia de su documento de identidad.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">9. Reclamaciones</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          Si considera que el tratamiento de sus datos no se ajusta a la normativa vigente, puede
          presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">10. Cookies</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          La plataforma puede utilizar cookies técnicas y analíticas. Para más información,
          consulte nuestra Política de Cookies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="heading text-lg text-navy mb-3">11. Modificaciones</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          LOCKSY S.L. se reserva el derecho a actualizar esta Política de Privacidad para
          adaptarla a cambios legislativos o del servicio. Se notificará a los usuarios de
          cualquier cambio relevante.
        </p>
      </section>
    </div>
  );
}
