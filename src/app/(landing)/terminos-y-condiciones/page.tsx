import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones — LOCKSY",
};

export default function TerminosYCondicionesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-12">
        <h1 className="heading text-3xl sm:text-4xl text-navy mb-3">
          Términos y Condiciones
        </h1>
        <p className="text-muted-foreground">
          LOCKSY — Plataforma de gestión para talleres y concesionarios
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Versión 1.1 · Abril 2026 · España
        </p>
        <div className="mt-6 h-px bg-border" />
      </div>

      {/* 1 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">1. Objeto y Ámbito de Aplicación</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          Los presentes Términos y Condiciones (en adelante, «las Condiciones») regulan el acceso y uso de la plataforma LOCKSY y los servicios prestados a través de ella, de conformidad con la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI), el Real Decreto Legislativo 1/2007 de Defensa de Consumidores y Usuarios, el Reglamento (UE) 2016/679 (RGPD), y la Ley Orgánica 3/2018 (LOPDGDD).
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          El acceso y uso de la plataforma implica la aceptación plena de estas Condiciones. Si no estás de acuerdo con algún término, debes abstenerte de utilizar el servicio.
        </p>
      </section>

      {/* 2 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">2. Titular del Servicio</h2>
        <ul className="space-y-1 text-sm text-foreground/80 mb-4">
          <li><span className="font-semibold text-foreground">Nombre y apellidos:</span> Alejandro Rivero Espejo</li>
          <li><span className="font-semibold text-foreground">NIF:</span> 20099824D</li>
          <li><span className="font-semibold text-foreground">Domicilio:</span> Sevilla, España</li>
          <li>
            <span className="font-semibold text-foreground">Correo electrónico:</span>{" "}
            <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
              locksyautomation@gmail.com
            </a>
          </li>
        </ul>
        <p className="text-sm text-foreground/60 italic">
          LOCKSY opera como actividad económica de un profesional autónomo. Los presentes Términos y Condiciones constituyen el acuerdo contractual entre el titular y el usuario.
        </p>
      </section>

      {/* 3 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">3. Descripción del Servicio</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          LOCKSY es una plataforma de software como servicio (SaaS) de gestión para talleres mecánicos y concesionarios, que automatiza el ciclo completo de reparación. Incluye:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2 mb-4">
          <li>Gestión de citas y calendario de trabajo</li>
          <li>Gestión de clientes y vehículos</li>
          <li>Creación y seguimiento de órdenes de reparación</li>
          <li>Generación y envío de presupuestos</li>
          <li>Notificaciones automáticas al cliente sobre el estado de la reparación</li>
          <li>Generación y almacenamiento de facturas</li>
          <li>Panel de administración para el taller y panel de seguimiento para el cliente</li>
          <li>Gestión de pagos de suscripción a través de Stripe</li>
        </ul>
        <p className="text-sm text-foreground/80 leading-relaxed">
          LOCKSY es un servicio exclusivamente de software (SaaS). No incluye componentes hardware en su versión actual.
        </p>
      </section>

      {/* 4 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">4. Acceso y Registro</h2>
        <h3 className="font-semibold text-foreground mb-2 text-sm">4.1 Talleres y concesionarios</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          El alta debe solicitarse al titular mediante el formulario de contacto de la landing page. El administrador creará la cuenta y proporcionará un enlace único para que los clientes del taller puedan registrarse y quedar vinculados.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">4.2 Clientes finales</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Los clientes finales solo pueden registrarse a través del enlace proporcionado por su taller. No existe autoregistro independiente.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">4.3 Veracidad de los datos</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          El usuario se compromete a facilitar datos verdaderos, exactos y completos. Cualquier daño derivado del suministro de información falsa será responsabilidad exclusiva del usuario.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">4.4 Credenciales de acceso</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          El usuario es responsable de mantener la confidencialidad de sus credenciales. Debe notificar de inmediato a{" "}
          <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
            locksyautomation@gmail.com
          </a>{" "}
          cualquier uso no autorizado de su cuenta.
        </p>
      </section>

      {/* 5 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">5. Obligaciones y Responsabilidades del Usuario</h2>
        <h3 className="font-semibold text-foreground mb-2 text-sm">5.1 Uso adecuado</h3>
        <p className="text-sm text-foreground/80 mb-3">Queda expresamente prohibido:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2">
          <li>Utilizar la plataforma para fines ilegales o fraudulentos</li>
          <li>Intentar acceder sin autorización a sistemas, datos o cuentas de otros usuarios</li>
          <li>Introducir datos de terceros sin su consentimiento o que infrinjan derechos de propiedad intelectual</li>
          <li>Realizar ingeniería inversa, descompilar o desensamblar el software</li>
          <li>Transmitir virus, malware o cualquier código dañino</li>
          <li>Revender, sublicenciar o explotar comercialmente el acceso sin autorización escrita del titular</li>
        </ul>
      </section>

      {/* 6 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">6. Acuerdo de Encargado del Tratamiento (art. 28 RGPD)</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          La presente sección constituye el <strong>Acuerdo de Encargado del Tratamiento</strong> entre el taller o concesionario que suscribe el servicio (en adelante, «el Responsable») y LOCKSY (en adelante, «el Encargado»), conforme a los requisitos del art. 28 del Reglamento (UE) 2016/679 (RGPD).
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">6.1 Objeto y naturaleza del tratamiento</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          El Responsable encarga a LOCKSY el tratamiento de los datos personales de sus clientes finales estrictamente necesario para la prestación del servicio de software descrito en la cláusula 3. El Encargado tratará dichos datos únicamente siguiendo las instrucciones documentadas del Responsable y nunca para fines propios.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">6.2 Obligaciones del Encargado (LOCKSY)</h3>
        <p className="text-sm text-foreground/80 mb-3">LOCKSY se compromete a:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2 mb-4">
          <li>Tratar los datos personales únicamente conforme a las instrucciones documentadas del Responsable y a estas Condiciones</li>
          <li>Garantizar que las personas autorizadas para tratar los datos personales se han comprometido a respetar la confidencialidad o están sujetas a una obligación de confidencialidad de naturaleza estatutaria</li>
          <li>Adoptar todas las medidas de seguridad técnicas y organizativas requeridas conforme al art. 32 RGPD</li>
          <li>Respetar las condiciones para recurrir a otro encargado del tratamiento (subencargado) establecidas en el apartado 6.3</li>
          <li>Asistir al Responsable, habida cuenta de la naturaleza del tratamiento, en la medida de lo posible, para que pueda cumplir con su obligación de responder a las solicitudes de ejercicio de derechos de los interesados</li>
          <li>Ayudar al Responsable a garantizar el cumplimiento de las obligaciones en materia de seguridad, notificación de brechas, evaluaciones de impacto y consultas previas</li>
          <li>Suprimir o devolver todos los datos personales al Responsable una vez finalice la prestación del servicio, y suprimir las copias existentes, salvo que el derecho de la Unión o de los Estados miembros exija la conservación de los datos</li>
          <li>Poner a disposición del Responsable toda la información necesaria para demostrar el cumplimiento de las obligaciones del art. 28 RGPD</li>
        </ul>
        <h3 className="font-semibold text-foreground mb-2 text-sm">6.3 Subcontratación (subencargados del tratamiento)</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          Conforme al art. 28.2 RGPD, LOCKSY informa al Responsable de que utiliza los siguientes subencargados del tratamiento para la prestación del servicio:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2 mb-4">
          <li>Vercel Inc. (EE.UU.) — Hosting e infraestructura de la plataforma</li>
          <li>Supabase Inc. (EE.UU.) — Base de datos y autenticación</li>
          <li>Stripe Inc. (EE.UU.) — Procesamiento de pagos</li>
          <li>Resend Inc. (EE.UU.) — Envío de correos transaccionales</li>
        </ul>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          El Responsable autoriza expresamente el uso de estos subencargados al aceptar las presentes Condiciones. LOCKSY notificará al Responsable cualquier cambio previsto en la incorporación o sustitución de subencargados, dándole la oportunidad de oponerse a dichos cambios en un plazo de <strong>30 días</strong> desde la notificación. LOCKSY exige a cada subencargado las mismas obligaciones de protección de datos que las recogidas en este acuerdo.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">6.4 Obligaciones del Responsable (el taller)</h3>
        <p className="text-sm text-foreground/80 mb-3">El Responsable se compromete a:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2">
          <li>Informar a sus clientes finales sobre el uso de LOCKSY para el tratamiento de sus datos</li>
          <li>Obtener y documentar las bases jurídicas necesarias para el tratamiento de los datos de sus clientes</li>
          <li>No introducir en la plataforma datos de categorías especiales (datos de salud, ideología, etc.) salvo que disponga de base jurídica explícita para ello</li>
          <li>Cumplir con la normativa de protección de datos aplicable (RGPD, LOPDGDD) en su condición de Responsable del tratamiento</li>
          <li>Responder ante sus propios clientes de las solicitudes de ejercicio de derechos, contando con la colaboración de LOCKSY en su condición de Encargado</li>
        </ul>
      </section>

      {/* 7 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">7. Precios, Pagos y Suscripción</h2>
        <h3 className="font-semibold text-foreground mb-2 text-sm">7.1 Modelo de suscripción</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          El acceso al servicio está sujeto al pago de una suscripción periódica. Las tarifas se comunicarán al taller durante el proceso de alta. Todos los precios se indicarán con el IVA aplicable desglosado. LOCKSY se reserva el derecho de actualizar sus tarifas con un preaviso mínimo de <strong>30 días</strong>.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">7.2 Procesamiento de pagos</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Los pagos se procesan a través de <strong>Stripe</strong> (PCI-DSS Level 1). LOCKSY no almacena datos de tarjeta en ningún momento. El usuario acepta las condiciones de uso de Stripe al realizar pagos a través de la plataforma.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">7.3 Impagos</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          En caso de impago o fallo reiterado en el cobro, LOCKSY podrá suspender el acceso al servicio hasta regularizar la situación, sin perjuicio de las acciones legales que correspondan.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">7.4 Política de reembolsos</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Dado el carácter digital del servicio y su naturaleza de suscripción periódica, no se efectuarán reembolsos por períodos ya facturados, salvo en los casos exigidos por la legislación de consumidores y usuarios aplicable en España.
        </p>
      </section>

      {/* 8 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">8. Propiedad Intelectual e Industrial</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          Todos los derechos de propiedad intelectual e industrial sobre LOCKSY (software, código, diseños, logotipos, textos, interfaces y documentación) son propiedad exclusiva de Alejandro Rivero Espejo o de terceros que han autorizado su uso.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          El acceso al servicio no otorga ningún derecho de propiedad sobre dichos elementos. Queda prohibida su reproducción, distribución o explotación no autorizada.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Los datos introducidos por el usuario en la plataforma son de su exclusiva propiedad. LOCKSY los trata únicamente para la prestación del servicio.
        </p>
      </section>

      {/* 9 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">9. Disponibilidad y Continuidad del Servicio</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          LOCKSY realizará los esfuerzos razonables para mantener la plataforma disponible de forma continua. No obstante, no garantiza la disponibilidad ininterrumpida del servicio, que puede verse afectado por mantenimientos programados, fallos técnicos o dependencias de terceros (Vercel, Supabase, Stripe, Resend). Los mantenimientos programados se comunicarán con la máxima antelación posible.
        </p>
      </section>

      {/* 10 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">10. Fuerza Mayor</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          LOCKSY no será responsable del incumplimiento total o parcial de sus obligaciones cuando este sea consecuencia de un evento de fuerza mayor, entendiendo como tal cualquier circunstancia ajena al control razonable de LOCKSY, imprevisible o inevitable, que incluye sin carácter limitativo: catástrofes naturales, conflictos bélicos, actos terroristas, pandemias, decisiones gubernamentales, cortes de suministro eléctrico o de conectividad a internet, fallos generalizados en servicios de nube de terceros, o cualquier otro evento equivalente.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          En caso de fuerza mayor, LOCKSY notificará al usuario tan pronto como sea razonablemente posible y adoptará las medidas que estén a su alcance para minimizar el impacto del evento.
        </p>
      </section>

      {/* 11 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">11. Limitación de Responsabilidad</h2>
        <p className="text-sm text-foreground/80 mb-3">LOCKSY no será responsable de:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2 mb-4">
          <li>Los daños derivados de un uso inadecuado de la plataforma por parte del usuario</li>
          <li>La pérdida de datos causada por acciones u omisiones del usuario, virus o accesos no autorizados imputables al usuario</li>
          <li>Los daños indirectos, lucro cesante o daños emergentes derivados del uso o imposibilidad de uso del servicio</li>
          <li>El contenido, exactitud o legalidad de los datos introducidos por el taller o sus clientes</li>
          <li>Los fallos o indisponibilidades de servicios de terceros integrados (Vercel, Supabase, Stripe, Resend, Google)</li>
          <li>Las consecuencias derivadas de eventos de fuerza mayor conforme a la cláusula 10</li>
        </ul>
        <p className="text-sm text-foreground/80 leading-relaxed">
          En ningún caso la responsabilidad total acumulada de LOCKSY frente al usuario superará el importe abonado por el usuario en los <strong>tres meses anteriores</strong> al hecho que da lugar a la reclamación. Esta limitación no se aplicará en casos de dolo o culpa grave de LOCKSY, ni cuando la legislación de consumidores y usuarios aplicable establezca una responsabilidad mínima indisponible.
        </p>
      </section>

      {/* 12 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">12. Baja y Resolución del Contrato</h2>
        <h3 className="font-semibold text-foreground mb-2 text-sm">12.1 Baja voluntaria del taller</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          El taller puede solicitar la baja en cualquier momento mediante comunicación a{" "}
          <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
            locksyautomation@gmail.com
          </a>
          . La baja será efectiva al final del período de facturación en curso. Los datos se conservarán conforme a los plazos legales y posteriormente serán eliminados o anonimizados.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">12.2 Desvinculación de cliente</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          El taller puede desvincular a un cliente de su cuenta. Esta acción elimina el acceso del cliente al servicio, pero no borra los datos históricos de reparaciones almacenados por el taller.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">12.3 Resolución por incumplimiento</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          LOCKSY puede suspender o cancelar el acceso de cualquier usuario que incumpla estas Condiciones, sin perjuicio de las acciones legales o económicas que correspondan.
        </p>
      </section>

      {/* 13 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">13. Cesión del Contrato</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          El usuario no podrá ceder, transferir ni subrogar los derechos y obligaciones derivados de las presentes Condiciones sin el consentimiento previo y por escrito de LOCKSY.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          LOCKSY podrá ceder el contrato, total o parcialmente, a un tercero en caso de fusión, adquisición, reestructuración empresarial o venta del negocio o de los activos relevantes, siempre que el cesionario asuma íntegramente las obligaciones derivadas de las presentes Condiciones. El usuario será notificado de dicha cesión con un mínimo de <strong>30 días de antelación</strong> y tendrá derecho a resolver el contrato sin penalización si no acepta la cesión.
        </p>
      </section>

      {/* 14 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">14. Comunicaciones</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          Las comunicaciones entre las partes se realizarán preferentemente por correo electrónico a las direcciones facilitadas durante el proceso de alta. El correo electrónico se considerará medio válido de comunicación formal, siendo el momento de la recepción en el servidor del destinatario el que determinará la fecha de notificación a efectos de los plazos establecidos en estas Condiciones.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          LOCKSY utilizará la dirección{" "}
          <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
            locksyautomation@gmail.com
          </a>{" "}
          como dirección oficial de comunicaciones. El usuario es responsable de mantener actualizada su dirección de correo electrónico en la plataforma.
        </p>
      </section>

      {/* 15 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">15. Modificaciones de las Condiciones</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          LOCKSY podrá modificar las presentes Condiciones con notificación previa de <strong>15 días</strong> por correo y/o aviso en la plataforma. El uso continuado del servicio tras la entrada en vigor implicará su aceptación. Si el usuario no acepta las nuevas condiciones, podrá solicitar la baja sin penalización.
        </p>
      </section>

      {/* 16 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">16. Nulidad Parcial</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Si cualquier disposición de las presentes Condiciones fuera declarada nula, inválida o inaplicable, total o parcialmente, por cualquier tribunal u órgano competente, dicha nulidad no afectará a las restantes disposiciones, que permanecerán en pleno vigor y efecto. Las partes negociarán de buena fe una disposición válida que, en la medida de lo posible, alcance el mismo objetivo económico y jurídico que la disposición declarada nula.
        </p>
      </section>

      {/* 17 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">17. Acuerdo Completo</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Las presentes Condiciones, junto con la{" "}
          <Link href="/politica-de-privacidad" className="text-orange hover:underline">
            Política de Privacidad
          </Link>{" "}
          y cualquier acuerdo específico firmado entre las partes, constituyen el acuerdo íntegro entre LOCKSY y el usuario en relación con el objeto de las mismas, y sustituyen a cualquier negociación, representación, garantía o acuerdo anterior, oral o escrito, relacionado con dicho objeto.
        </p>
      </section>

      {/* 18 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">18. Legislación Aplicable y Jurisdicción</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          Las presentes Condiciones se rigen por la legislación española. Para la resolución de cualquier controversia, las partes se someten, con renuncia a cualquier otro fuero, a la jurisdicción de los Juzgados y Tribunales de <strong>Sevilla (España)</strong>.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Si el usuario tiene la condición de consumidor, podrá acudir a los órganos de arbitraje de consumo o a la plataforma europea de resolución de litigios en línea:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:underline"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          .
        </p>
      </section>

      {/* Footer note */}
      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Última actualización: <strong>Abril de 2026</strong> (v1.1) · Alejandro Rivero Espejo ·{" "}
          <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
            locksyautomation@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
