import Link from "next/link";

export const metadata = {
  title: "Política de Privacidad — LOCKSY",
};

export default function PoliticaDePrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="mb-12">
        <h1 className="heading text-3xl sm:text-4xl text-navy mb-3">
          Política de Privacidad
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
        <h2 className="heading text-lg text-navy mb-4">1. Responsable del Tratamiento</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), se informa que el responsable del tratamiento es:
        </p>
        <ul className="space-y-1 text-sm text-foreground/80">
          <li><span className="font-semibold text-foreground">Nombre:</span> Alejandro Rivero Espejo</li>
          <li><span className="font-semibold text-foreground">NIF:</span> 20099824D</li>
          <li><span className="font-semibold text-foreground">Domicilio:</span> Sevilla, España</li>
          <li>
            <span className="font-semibold text-foreground">Correo electrónico:</span>{" "}
            <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
              locksyautomation@gmail.com
            </a>
          </li>
          <li><span className="font-semibold text-foreground">Actividad:</span> Desarrollo y explotación de software de gestión para talleres mecánicos y concesionarios (actividad económica de profesional autónomo).</li>
        </ul>
      </section>

      {/* 2 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">2. Roles en el Tratamiento de Datos: Responsable y Encargado</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          LOCKSY ejerce dos roles diferenciados según el tipo de dato tratado, conforme al art. 4 y art. 28 del RGPD:
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">2.1 LOCKSY como Responsable del tratamiento</h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          LOCKSY actúa como <strong>responsable del tratamiento</strong> respecto a los datos de los talleres y concesionarios que contratan la plataforma (datos del representante, datos de facturación, datos de suscripción), y respecto a los datos de contacto de los clientes finales en lo que afecta a la propia prestación del servicio de software.
        </p>
        <h3 className="font-semibold text-foreground mb-2 text-sm">2.2 LOCKSY como Encargado del tratamiento</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Cuando un taller o concesionario utiliza LOCKSY para gestionar los datos de sus propios clientes finales (nombre, vehículo, historial de reparaciones, facturas…), el taller actúa como responsable del tratamiento de dichos datos, y LOCKSY actúa como <strong>encargado del tratamiento</strong>, limitándose a tratar esos datos conforme a las instrucciones del taller y a lo establecido en el Acuerdo de Encargado del Tratamiento incluido en los Términos y Condiciones del servicio.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed mt-3">
          Esta distinción es esencial: los clientes finales deben dirigir las solicitudes relativas a sus datos de reparación (acceso, rectificación, supresión) tanto a su taller como a LOCKSY. LOCKSY colaborará con el taller en la atención de dichas solicitudes en su condición de encargado.
        </p>
      </section>

      {/* 3 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">3. Datos Personales que Tratamos</h2>
        <h3 className="font-semibold text-foreground mb-2 text-sm">3.1 Talleres y concesionarios (usuarios B2B — LOCKSY como Responsable)</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 mb-5 ml-2">
          <li>Nombre y apellidos del representante</li>
          <li>Nombre comercial o razón social del taller</li>
          <li>NIF / CIF</li>
          <li>Correo electrónico</li>
          <li>Teléfono de contacto</li>
          <li>Dirección postal</li>
          <li>Datos de facturación</li>
          <li>Datos de suscripción y pago (gestionados por Stripe)</li>
        </ul>
        <h3 className="font-semibold text-foreground mb-2 text-sm">3.2 Clientes finales (LOCKSY como Encargado del taller responsable)</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 mb-5 ml-2">
          <li>Nombre y apellidos o razón social</li>
          <li>NIF / CIF</li>
          <li>Correo electrónico</li>
          <li>Teléfono</li>
          <li>Dirección postal</li>
          <li>Foto de perfil (opcional)</li>
          <li>Datos del vehículo: marca, modelo, cilindrada y matrícula</li>
          <li>Historial de reparaciones y facturas asociadas</li>
        </ul>
        <h3 className="font-semibold text-foreground mb-2 text-sm">3.3 Datos generados por el uso del servicio</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2">
          <li>Órdenes de reparación y presupuestos</li>
          <li>Estados de reparación y observaciones técnicas</li>
          <li>Códigos de entrega de llaves</li>
          <li>Notificaciones enviadas</li>
          <li>Datos de rendimiento técnico (Vercel Analytics): URL visitada, referrer, país inferido de IP anonimizada, tipo de navegador y sistema operativo. La dirección IP se anonimiza antes de almacenarse y no permite identificar al usuario.</li>
          <li>Logs de sesión e identificación (timestamps de acceso, token de sesión)</li>
        </ul>
      </section>

      {/* 4 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">4. Información para Interesados cuyos Datos no Proceden Directamente de Ellos (art. 14 RGPD)</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Los clientes finales acceden a la plataforma LOCKSY a través de un enlace proporcionado por su taller o concesionario. En estos casos, LOCKSY recibe datos personales del cliente no directamente de él, sino a través del taller. Conforme al art. 14 del RGPD, se informa de lo siguiente:
        </p>
        <div className="space-y-3 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Fuente de los datos:</span> El taller o concesionario que ha contratado LOCKSY, a través del cual el cliente ha recibido el enlace de registro.</p>
          <p><span className="font-semibold text-foreground">Categorías de datos tratados:</span> Las indicadas en la sección 3.2 de esta política.</p>
          <p><span className="font-semibold text-foreground">Finalidad:</span> Permitir al cliente final acceder al seguimiento de sus reparaciones, consultar presupuestos y facturas, y comunicarse con el taller a través de la plataforma.</p>
          <p><span className="font-semibold text-foreground">Base jurídica:</span> Ejecución de una relación contractual entre el cliente y su taller, en la que LOCKSY actúa como herramienta tecnológica habilitadora (art. 6.1.b RGPD).</p>
          <p><span className="font-semibold text-foreground">Momento de la información:</span> Esta política es accesible públicamente en la plataforma y se presenta al cliente en el momento del registro. Si los datos del cliente son introducidos directamente por el taller (sin registro del cliente), el taller asume la obligación de informar a su cliente conforme al art. 14 RGPD.</p>
        </div>
      </section>

      {/* 5 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">5. Finalidad del Tratamiento</h2>
        <div className="space-y-3 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Prestación del servicio (art. 6.1.b):</span> Gestionar cuentas, citas, órdenes de reparación, notificaciones y el ciclo completo del servicio de taller.</p>
          <p><span className="font-semibold text-foreground">Gestión de pagos (art. 6.1.b):</span> Procesar pagos de suscripción mediante Stripe, emitir facturas y mantener el historial de transacciones.</p>
          <p><span className="font-semibold text-foreground">Comunicaciones transaccionales (art. 6.1.b):</span> Enviar correos sobre estado de reparaciones, confirmaciones de cita, presupuestos y finalización, vía Resend.</p>
          <p><span className="font-semibold text-foreground">Cumplimiento legal (art. 6.1.c):</span> Conservar documentación exigida por normativa fiscal, de consumidores y de protección de datos.</p>
          <p><span className="font-semibold text-foreground">Soporte técnico (art. 6.1.b):</span> Atender consultas, incidencias o reclamaciones de los usuarios.</p>
          <p><span className="font-semibold text-foreground">Métricas técnicas de rendimiento (art. 6.1.f):</span> Analizar el rendimiento técnico de la plataforma mediante Vercel Analytics (datos anonimizados, sin perfilado del usuario ni uso publicitario).</p>
        </div>
      </section>

      {/* 6 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">6. Base Jurídica del Tratamiento</h2>
        <div className="space-y-3 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Ejecución de un contrato (art. 6.1.b RGPD):</span> Tratamiento necesario para la prestación del servicio suscrito por el taller o para ejecutar las acciones solicitadas por el cliente final.</p>
          <p><span className="font-semibold text-foreground">Obligación legal (art. 6.1.c RGPD):</span> Tratamiento necesario para cumplir obligaciones fiscales, mercantiles y de protección de datos establecidas en la legislación española.</p>
          <p><span className="font-semibold text-foreground">Interés legítimo (art. 6.1.f RGPD):</span> Métricas de rendimiento técnico mediante Vercel Analytics, con datos anonimizados, para la mejora de la plataforma. Se ha evaluado el test de ponderación y el interés legítimo no se ve superado por los intereses o derechos fundamentales de los interesados, dado el alto grado de anonimización.</p>
          <p><span className="font-semibold text-foreground">Consentimiento (art. 6.1.a RGPD):</span> Uso de cookies no esenciales de Google Maps (mapa interactivo), previa aceptación mediante el banner de consentimiento de cookies.</p>
        </div>
      </section>

      {/* 7 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">7. Encargados del Tratamiento y Transferencias Internacionales</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          LOCKSY utiliza los siguientes proveedores que actúan como encargados o subencargados del tratamiento. Todos ellos operan bajo acuerdos de protección de datos adecuados conforme al RGPD:
        </p>
        <div className="space-y-4 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Vercel Inc.</span> (sede: EE.UU.) — Garantía de transferencia: EU-US Data Privacy Framework (Decisión de Adecuación de la Comisión Europea, julio 2023). Hosting y despliegue de la aplicación web. Vercel Analytics: recoge URL, referrer, país (IP anonimizada), navegador y SO. No identifica usuarios ni permite perfilado.</p>
          <p><span className="font-semibold text-foreground">Supabase Inc.</span> (sede: EE.UU.) — Garantía de transferencia: Cláusulas Contractuales Tipo (CCT/SCCs) adoptadas por la Comisión Europea. Base de datos relacional y autenticación. Almacena todos los datos estructurados de la plataforma con cifrado en reposo y en tránsito.</p>
          <p><span className="font-semibold text-foreground">Stripe Inc.</span> (sede: EE.UU.) — Garantía de transferencia: EU-US Data Privacy Framework + Cláusulas Contractuales Tipo. Certificación PCI-DSS Level 1. Procesamiento de pagos y suscripciones. Los datos de tarjeta no son almacenados por LOCKSY en ningún momento.</p>
          <p><span className="font-semibold text-foreground">Resend Inc.</span> (sede: EE.UU.) — Garantía de transferencia: Cláusulas Contractuales Tipo (CCT/SCCs). Envío de correos electrónicos transaccionales: confirmaciones, notificaciones de estado y finalización de reparaciones.</p>
          <p><span className="font-semibold text-foreground">Google LLC</span> (sede: EE.UU.) — Garantía de transferencia: EU-US Data Privacy Framework. Google Maps en la landing page. Se carga exclusivamente tras la aceptación del usuario mediante el banner de cookies.</p>
        </div>
        <p className="text-sm text-foreground/60 italic mt-4">
          Puedes consultar los acuerdos de tratamiento de datos (DPA) y políticas de privacidad de cada proveedor en sus respectivos sitios web. LOCKSY mantiene acuerdos escritos con cada encargado conforme al art. 28 RGPD.
        </p>
      </section>

      {/* 8 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">8. Plazos de Conservación</h2>
        <div className="space-y-2 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Datos de cuenta activa:</span> Durante toda la vigencia de la relación contractual.</p>
          <p><span className="font-semibold text-foreground">Datos de facturación:</span> 5 años desde la última transacción (art. 66 Ley General Tributaria).</p>
          <p><span className="font-semibold text-foreground">Órdenes de reparación y facturas:</span> 4 años para obligaciones tributarias; 3 años conforme al Real Decreto 1457/1986.</p>
          <p><span className="font-semibold text-foreground">Logs de sesión y acceso:</span> Máximo 12 meses por razones de seguridad, conforme al principio de minimización (art. 5.1.e RGPD).</p>
          <p><span className="font-semibold text-foreground">Métricas de Vercel Analytics:</span> Máximo 90 días, conforme a la política de retención de Vercel.</p>
          <p><span className="font-semibold text-foreground">Datos tras baja o desvinculación:</span> Bloqueados y conservados únicamente para cumplimiento de obligaciones legales durante los plazos aplicables; eliminados o anonimizados una vez transcurridos.</p>
        </div>
      </section>

      {/* 9 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">9. Derechos de los Interesados (ARCOPOSL)</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Conforme al RGPD y la LOPDGDD, los usuarios pueden ejercer en cualquier momento los siguientes derechos:
        </p>
        <div className="space-y-2 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Acceso (art. 15):</span> Obtener confirmación sobre si tratamos sus datos y acceder a ellos.</p>
          <p><span className="font-semibold text-foreground">Rectificación (art. 16):</span> Solicitar la corrección de datos inexactos o incompletos.</p>
          <p><span className="font-semibold text-foreground">Supresión / «derecho al olvido» (art. 17):</span> Solicitar la eliminación de sus datos cuando no sean necesarios para los fines que motivaron su recogida, salvo que exista obligación legal de conservarlos.</p>
          <p><span className="font-semibold text-foreground">Limitación del tratamiento (art. 18):</span> Solicitar la suspensión temporal del tratamiento de sus datos.</p>
          <p><span className="font-semibold text-foreground">Portabilidad (art. 20):</span> Recibir sus datos en formato estructurado, de uso común y lectura mecánica.</p>
          <p><span className="font-semibold text-foreground">Oposición (art. 21):</span> Oponerse al tratamiento basado en interés legítimo. En particular, puede oponerse en cualquier momento al tratamiento con fines de análisis técnico.</p>
          <p><span className="font-semibold text-foreground">No ser objeto de decisiones automatizadas (art. 22):</span> LOCKSY no toma decisiones que produzcan efectos jurídicos o que afecten significativamente al interesado de forma exclusivamente automatizada.</p>
          <p><span className="font-semibold text-foreground">Retirada del consentimiento:</span> En cualquier momento y sin efecto retroactivo, para los tratamientos basados en consentimiento (cookies de Google Maps).</p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mt-4">
          Para ejercer cualquiera de estos derechos, dirígete a{" "}
          <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
            locksyautomation@gmail.com
          </a>{" "}
          indicando en el asunto «Ejercicio de derechos RGPD» y adjuntando copia de tu documento de identidad. LOCKSY responderá en el plazo máximo de <strong>un mes</strong>, prorrogable dos meses más en casos de especial complejidad.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed mt-3">
          Si consideras que el tratamiento de tus datos no se ajusta a la normativa, puedes presentar una reclamación ante la{" "}
          <strong>Agencia Española de Protección de Datos (AEPD):</strong>{" "}
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
            www.aepd.es
          </a>
        </p>
      </section>

      {/* 10 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">10. Delegado de Protección de Datos (DPO)</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          LOCKSY ha evaluado la obligación de designar un Delegado de Protección de Datos conforme al art. 37 del RGPD y al art. 34 de la LOPDGDD. Dado que LOCKSY es una actividad económica de un profesional autónomo, no realiza tratamientos a gran escala ni trata categorías especiales de datos de forma sistemática, la designación de un DPO no es obligatoria en el momento actual.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Las funciones de punto de contacto en materia de protección de datos son ejercidas directamente por el titular del servicio, Alejandro Rivero Espejo, accesible en{" "}
          <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
            locksyautomation@gmail.com
          </a>
          . Esta evaluación se revisará ante cualquier cambio significativo en el volumen o naturaleza de los datos tratados.
        </p>
      </section>

      {/* 11 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">11. Notificación de Brechas de Seguridad</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          En caso de producirse una brecha de seguridad que afecte a datos personales, LOCKSY actuará conforme a los arts. 33 y 34 del RGPD:
        </p>
        <div className="space-y-3 text-sm text-foreground/80">
          <p><span className="font-semibold text-foreground">Notificación a la AEPD (art. 33):</span> Si la brecha entraña un riesgo para los derechos y libertades de los interesados, LOCKSY lo notificará a la Agencia Española de Protección de Datos en un plazo máximo de <strong>72 horas</strong> desde que tenga constancia de ella.</p>
          <p><span className="font-semibold text-foreground">Comunicación a los afectados (art. 34):</span> Si la brecha entraña un riesgo alto para los derechos y libertades de los interesados, LOCKSY comunicará la incidencia a los afectados sin dilación indebida, informando sobre la naturaleza de la brecha, las posibles consecuencias y las medidas adoptadas o propuestas.</p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mt-4">
          LOCKSY aplica medidas preventivas para minimizar el riesgo de brechas: comunicaciones cifradas TLS/HTTPS, autenticación con 2FA disponible, cifrado de datos en reposo en Supabase, acceso restringido al personal necesario y monitorización de seguridad continua.
        </p>
      </section>

      {/* 12 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">12. Política de Cookies</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          LOCKSY utiliza únicamente cookies técnicas esenciales y, con el consentimiento previo del usuario, cookies de terceros de Google Maps. No se utilizan cookies de publicidad ni de seguimiento de usuarios.
        </p>
        <div className="rounded-xl border border-border overflow-hidden text-sm">
          <div className="grid grid-cols-3 bg-muted px-4 py-2 font-semibold text-foreground text-xs heading">
            <span>Cookie</span>
            <span>Tipo</span>
            <span>Finalidad</span>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 px-4 py-3 text-foreground/80">
              <span className="font-mono text-xs">Sesión Supabase</span>
              <span>Técnica / esencial</span>
              <span>Mantiene la sesión autenticada del usuario</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 text-foreground/80">
              <span className="font-mono text-xs">pending_2fa</span>
              <span>Técnica / esencial</span>
              <span>Gestiona el flujo de autenticación en dos pasos</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 text-foreground/80">
              <span className="font-mono text-xs">Google Maps</span>
              <span className="text-orange font-medium">Terceros (Google)</span>
              <span>Mapa interactivo. Solo se carga con consentimiento previo</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mt-4">
          La preferencia de cookies se almacena en localStorage del navegador del usuario. El usuario puede modificar su preferencia en cualquier momento mediante el enlace{" "}
          <Link href="/" className="text-orange hover:underline">«Gestionar cookies»</Link>{" "}
          disponible en el pie de página de la plataforma.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed mt-2">
          Las cookies técnicas no requieren consentimiento previo conforme al art. 22.2 LSSI, al ser estrictamente necesarias para el funcionamiento del servicio.
        </p>
      </section>

      {/* 13 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">13. Menores de Edad</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          LOCKSY no está dirigido a menores de 14 años, edad mínima de consentimiento digital en España conforme al art. 7 LOPDGDD. No recabamos conscientemente datos de menores. Si un tutor legal detecta que datos de un menor han podido ser facilitados sin su consentimiento, debe contactar con{" "}
          <a href="mailto:locksyautomation@gmail.com" className="text-orange hover:underline">
            locksyautomation@gmail.com
          </a>{" "}
          para su eliminación inmediata.
        </p>
      </section>

      {/* 14 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">14. Medidas de Seguridad</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 ml-2">
          <li>Comunicaciones cifradas mediante TLS/HTTPS en toda la plataforma</li>
          <li>Autenticación de usuarios con verificación en dos pasos (2FA) disponible</li>
          <li>Bases de datos en Supabase con cifrado en reposo y en tránsito</li>
          <li>Acceso a datos limitado al personal estrictamente necesario (principio de minimización)</li>
          <li>Monitorización de rendimiento y disponibilidad mediante Vercel</li>
          <li>Actualización periódica de dependencias y revisión de seguridad del código</li>
          <li>Datos de tarjeta nunca almacenados en LOCKSY (delegado íntegramente en Stripe PCI-DSS Level 1)</li>
        </ul>
      </section>

      {/* 15 */}
      <section className="mb-10">
        <h2 className="heading text-lg text-navy mb-4">15. Modificaciones de la Política de Privacidad</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Nos reservamos el derecho de actualizar esta Política para adaptarla a cambios legislativos, jurisprudenciales o del servicio. Las modificaciones se comunicarán por correo y/o aviso en la plataforma con un mínimo de <strong>15 días de antelación</strong>. La versión vigente estará siempre disponible en la plataforma.
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
