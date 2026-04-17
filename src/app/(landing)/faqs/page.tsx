import type { Metadata } from "next";
import Accordion from "@/components/ui/Accordion";

export const metadata: Metadata = { title: "Preguntas Frecuentes" };

const faqItems = [
  {
    id: "1",
    title: "¿Qué es LOCKSY?",
    content:
      "LOCKSY es un software de gestión de talleres diseñado para concesionarios de coches. Permite gestionar citas de reparación, seguimiento en tiempo real, pagos seguros y comunicación directa con los clientes.",
  },
  {
    id: "2",
    title: "¿Cómo me registro como cliente?",
    content:
      "Los clientes se registran a través del enlace único proporcionado por su concesionario. Una vez registrado, podrás reservar citas, seguir el estado de tus reparaciones y realizar pagos de forma segura.",
  },
  {
    id: "3",
    title: "¿Puedo estar registrado en varios concesionarios?",
    content:
      "Sí. Si ya tienes una cuenta y accedes al enlace de registro de otro concesionario, podrás añadir ese concesionario a tu perfil sin necesidad de crear una nueva cuenta.",
  },
  {
    id: "4",
    title: "¿Cómo funciona la entrega de llaves?",
    content:
      "Al reservar una cita, recibirás un código único de 8 caracteres. Este código se utilizará para la entrega y recogida de llaves de forma automatizada, sin esperas en el mostrador.",
  },
  {
    id: "5",
    title: "¿Cómo puedo pagar una reparación?",
    content:
      "Una vez finalizada la reparación, recibirás una notificación con el importe. Podrás realizar el pago de forma segura a través de la plataforma mediante tarjeta de crédito o débito.",
  },
  {
    id: "6",
    title: "¿Puedo ver el historial de reparaciones de mi vehículo?",
    content:
      "Sí. En la sección de citas finalizadas podrás consultar el historial completo de reparaciones, incluyendo facturas, observaciones del taller y recomendaciones.",
  },
  {
    id: "7",
    title: "¿Cómo puedo implementar LOCKSY en mi concesionario?",
    content:
      "Dirígete a la sección 'Start Setup' y completa el formulario de solicitud. Un administrador se pondrá en contacto contigo para personalizar la implementación según las necesidades de tu taller.",
  },
  {
    id: "8",
    title: "¿Es seguro realizar pagos a través de LOCKSY?",
    content:
      "Sí. Todos los pagos se procesan a través de Stripe, una de las plataformas de pago más seguras del mundo, cumpliendo con toda la normativa vigente de protección de datos y pagos online.",
  },
];

export default function FAQsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="heading text-3xl text-navy mb-10 text-center">
        PREGUNTAS FRECUENTES
      </h1>
      <Accordion items={faqItems} />
    </div>
  );
}
