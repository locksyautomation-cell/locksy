/**
 * LOCKSY — Generador de Manual de Usuario en PDF
 * Usa pdfkit con fuentes integradas (Helvetica / Helvetica-Bold)
 * Ejecutar: node scripts/generate-manual.js
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ─── Configuración ──────────────────────────────────────────────────────────
const OUTPUT_PATH = path.join(__dirname, "..", "manual-locksy.pdf");
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const INNER_MARGIN = 70; // binding side
const OUTER_MARGIN = 50; // outer edge
const CONTENT_WIDTH = PAGE_WIDTH - INNER_MARGIN - OUTER_MARGIN; // 475.28 — constant

const COLORS = {
  navy: "#1a2e4a",
  orange: "#e07b3a",
  gray: "#888888",
  lightGray: "#cccccc",
  black: "#1a1a1a",
  white: "#ffffff",
  tableHeader: "#f0f3f7",
  tableRow: "#f8f9fa",
  underlineNavy: "#1a2e4a",
};

const FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
};

// ─── Estado global ───────────────────────────────────────────────────────────
let doc;
let pageNumber = 0;
let isCoverPage = true;
let tocEntries = [];
let MARGIN = INNER_MARGIN; // dynamic: inner on recto (odd), outer on verso (even)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addPage() {
  doc.addPage();
  pageNumber++;
  // Odd pages (recto) → inner margin on left; even pages (verso) → outer margin on left
  MARGIN = pageNumber % 2 === 1 ? INNER_MARGIN : OUTER_MARGIN;
  isCoverPage = false;
  drawPageDecorations();
}

function drawPageDecorations() {
  if (isCoverPage) return;

  const isRecto = pageNumber % 2 === 1;

  // Header: "LOCKSY" — recto top-right, verso top-left
  doc
    .font(FONTS.bold)
    .fontSize(9)
    .fillColor(COLORS.gray)
    .text("LOCKSY", MARGIN, 25, {
      width: CONTENT_WIDTH,
      align: isRecto ? "right" : "left",
    });

  // Thin top line
  doc
    .moveTo(MARGIN, 38)
    .lineTo(MARGIN + CONTENT_WIDTH, 38)
    .strokeColor(COLORS.lightGray)
    .lineWidth(0.5)
    .stroke();

  // Page number — recto bottom-right, verso bottom-left
  doc
    .font(FONTS.regular)
    .fontSize(9)
    .fillColor(COLORS.gray)
    .text(String(pageNumber), MARGIN, PAGE_HEIGHT - 35, {
      width: CONTENT_WIDTH,
      align: isRecto ? "right" : "left",
    });

  // Thin bottom line
  doc
    .moveTo(MARGIN, PAGE_HEIGHT - 42)
    .lineTo(MARGIN + CONTENT_WIDTH, PAGE_HEIGHT - 42)
    .strokeColor(COLORS.lightGray)
    .lineWidth(0.5)
    .stroke();
}

function currentY() {
  return doc.y;
}

function ensureSpace(needed) {
  if (currentY() + needed > PAGE_HEIGHT - 80) {
    addPage();
    doc.y = 60;
  }
}

function sectionHeader(title, registerToc = true) {
  addPage();
  doc.y = 60;

  if (registerToc) {
    tocEntries.push({ title, page: pageNumber, level: 0 });
  }

  doc
    .font(FONTS.bold)
    .fontSize(18)
    .fillColor(COLORS.navy)
    .text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });

  const lineY = doc.y + 2;
  doc
    .moveTo(MARGIN, lineY)
    .lineTo(MARGIN + CONTENT_WIDTH, lineY)
    .strokeColor(COLORS.navy)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(1.2);
}

function subsectionHeader(title) {
  ensureSpace(50);
  doc.moveDown(0.6);
  tocEntries.push({ title, page: pageNumber, level: 1 });
  doc
    .font(FONTS.bold)
    .fontSize(13)
    .fillColor(COLORS.black)
    .text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.5);
}

function subsubHeader(title) {
  ensureSpace(35);
  doc.moveDown(0.3);
  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(COLORS.navy)
    .text(title, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.3);
}

function bodyText(text) {
  ensureSpace(20);
  doc
    .font(FONTS.regular)
    .fontSize(11)
    .fillColor(COLORS.black)
    .text(text, MARGIN, doc.y, {
      width: CONTENT_WIDTH,
      lineGap: 6,
      align: "justify",
    });
  doc.moveDown(0.4);
}

function bulletList(items, indent = 0) {
  const x = MARGIN + indent;
  const w = CONTENT_WIDTH - indent;
  items.forEach((item) => {
    ensureSpace(18);
    doc
      .font(FONTS.regular)
      .fontSize(11)
      .fillColor(COLORS.black)
      .text("•  " + item, x, doc.y, { width: w, lineGap: 5 });
  });
  doc.moveDown(0.4);
}

function infoBox(label, value) {
  ensureSpace(22);
  const y = doc.y;
  doc
    .font(FONTS.bold)
    .fontSize(10)
    .fillColor(COLORS.navy)
    .text(label + ":", MARGIN, y, { continued: true, width: 160 });
  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.black)
    .text("  " + value, { width: CONTENT_WIDTH - 160, lineGap: 4 });
}

function note(text) {
  ensureSpace(30);
  doc.moveDown(0.3);
  const y = doc.y;
  doc
    .rect(MARGIN, y, CONTENT_WIDTH, 1)
    .fillColor(COLORS.tableHeader)
    .fill();
  doc
    .rect(MARGIN, y, 3, 30)
    .fillColor(COLORS.orange)
    .fill();
  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.black)
    .text(text, MARGIN + 10, y + 8, { width: CONTENT_WIDTH - 14, lineGap: 4 });
  doc.y = y + 34;
  doc.moveDown(0.3);
}

function drawTableRow(cols, isHeader = false, y = null) {
  const rowY = y !== null ? y : doc.y;
  ensureSpace(22);
  const colWidth = CONTENT_WIDTH / cols.length;

  if (isHeader) {
    doc
      .rect(MARGIN, rowY, CONTENT_WIDTH, 20)
      .fillColor(COLORS.tableHeader)
      .fill();
  }

  cols.forEach((col, i) => {
    doc
      .font(isHeader ? FONTS.bold : FONTS.regular)
      .fontSize(isHeader ? 9 : 10)
      .fillColor(isHeader ? COLORS.navy : COLORS.black)
      .text(col, MARGIN + i * colWidth + 4, rowY + 5, {
        width: colWidth - 8,
        lineGap: 2,
      });
  });

  doc
    .moveTo(MARGIN, rowY + 20)
    .lineTo(MARGIN + CONTENT_WIDTH, rowY + 20)
    .strokeColor(COLORS.lightGray)
    .lineWidth(0.3)
    .stroke();

  doc.y = rowY + 22;
}

// ─── PORTADA ─────────────────────────────────────────────────────────────────
function drawCover() {
  isCoverPage = true;
  pageNumber = 0; // cover is page 0

  // Navy background rectangle top portion
  doc
    .rect(0, 0, PAGE_WIDTH, 320)
    .fillColor(COLORS.navy)
    .fill();

  // Orange accent bar
  doc
    .rect(0, 320, PAGE_WIDTH, 8)
    .fillColor(COLORS.orange)
    .fill();

  // LOCKSY title
  doc
    .font(FONTS.bold)
    .fontSize(72)
    .fillColor(COLORS.white)
    .text("LOCKSY", 0, 110, { width: PAGE_WIDTH, align: "center" });

  // Tagline
  doc
    .font(FONTS.regular)
    .fontSize(16)
    .fillColor("#a8bcd4")
    .text("Plataforma de Gestión para Talleres y Concesionarios", 0, 210, {
      width: PAGE_WIDTH,
      align: "center",
    });

  // Subtitle
  doc
    .font(FONTS.bold)
    .fontSize(20)
    .fillColor(COLORS.white)
    .text("Manual de Usuario — Guía Completa", 0, 248, {
      width: PAGE_WIDTH,
      align: "center",
    });

  // Version
  doc
    .font(FONTS.regular)
    .fontSize(13)
    .fillColor(COLORS.navy)
    .text("v1.0 — 2026", 0, 356, { width: PAGE_WIDTH, align: "center" });

  // Description block
  doc
    .font(FONTS.regular)
    .fontSize(11)
    .fillColor(COLORS.black)
    .text(
      "Este manual cubre el uso completo de LOCKSY: el panel de administración, el panel del concesionario y la experiencia del cliente. Incluye guías de instalación, estructura de la base de datos y referencia técnica.",
      MARGIN + 30,
      410,
      { width: CONTENT_WIDTH - 60, align: "center", lineGap: 6 }
    );

  // Decorative line
  doc
    .moveTo(MARGIN + 60, 490)
    .lineTo(PAGE_WIDTH - MARGIN - 60, 490)
    .strokeColor(COLORS.lightGray)
    .lineWidth(1)
    .stroke();

  // Footer info
  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.gray)
    .text("Confidencial — Uso interno y formación", 0, 500, {
      width: PAGE_WIDTH,
      align: "center",
    });
  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.gray)
    .text("© 2026 LOCKSY. Todos los derechos reservados.", 0, 516, {
      width: PAGE_WIDTH,
      align: "center",
    });
}

// ─── TABLA DE CONTENIDOS ─────────────────────────────────────────────────────
function drawTOC(entries) {
  addPage();
  doc.y = 60;

  doc
    .font(FONTS.bold)
    .fontSize(18)
    .fillColor(COLORS.navy)
    .text("TABLA DE CONTENIDOS", MARGIN, doc.y, { width: CONTENT_WIDTH });

  const lineY = doc.y + 2;
  doc
    .moveTo(MARGIN, lineY)
    .lineTo(MARGIN + CONTENT_WIDTH, lineY)
    .strokeColor(COLORS.navy)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(1.5);

  entries.forEach((entry) => {
    ensureSpace(18);
    const isSection = entry.level === 0;
    const displayTitle = isSection ? entry.title : "    " + entry.title;

    doc
      .font(isSection ? FONTS.bold : FONTS.regular)
      .fontSize(isSection ? 11 : 10)
      .fillColor(isSection ? COLORS.navy : COLORS.black)
      .text(displayTitle, MARGIN, doc.y, { continued: true, width: CONTENT_WIDTH - 50 });

    doc
      .font(FONTS.regular)
      .fontSize(10)
      .fillColor(COLORS.gray)
      .text(String(entry.page), MARGIN, doc.y - (isSection ? 13 : 12), {
        width: CONTENT_WIDTH,
        align: "right",
      });

    if (isSection) doc.moveDown(0.4);
  });
}

// ─── SECCIÓN 1: PANEL DE ADMINISTRACIÓN ─────────────────────────────────────
function writeSection1() {
  sectionHeader("SECCIÓN 1 — PANEL DE ADMINISTRACIÓN");

  bodyText(
    "El Panel de Administración es la interfaz central de control de LOCKSY, accesible exclusivamente para el rol de administrador del sistema. Desde este panel se gestionan todos los concesionarios, clientes, mensajes de contacto y la facturación global de la plataforma."
  );

  // 1.1
  subsectionHeader("1.1  Acceso y Autenticación");
  bodyText(
    "El administrador accede a la plataforma a través de la ruta /login. Las credenciales de administrador son asignadas directamente en la base de datos Supabase y no son gestionables desde la interfaz de usuario."
  );
  subsubHeader("Proceso de inicio de sesión:");
  bulletList([
    "Navegar a la URL de la aplicación y acceder a /login.",
    "Introducir el correo electrónico y contraseña del administrador.",
    "Tras la autenticación correcta, el sistema redirige automáticamente a /admin.",
    "En caso de contraseña olvidada, utilizar la opción /reset-password.",
  ]);
  bodyText(
    "El sistema identifica el rol del usuario (admin, dealer o client) mediante el campo role de la tabla public.users. Los usuarios con rol admin tienen acceso completo a todas las funcionalidades del sistema, sin restricciones de Row Level Security (RLS)."
  );

  // 1.2
  subsectionHeader("1.2  Panel Principal (/admin)");
  bodyText(
    "La página de inicio del administrador muestra un dashboard con accesos directos a las secciones principales de la plataforma:"
  );
  bulletList([
    "Gestión de Concesionarios — ver, crear y editar concesionarios.",
    "Gestión de Clientes — listar y gestionar todos los clientes registrados.",
    "Mensajes de Contacto — revisar solicitudes recibidas desde el formulario público.",
    "Facturación Global — resumen de ingresos y suscripciones activas.",
  ]);
  bodyText(
    "La barra lateral (AdminSidebar) permanece visible en todas las páginas del panel de administración y proporciona navegación rápida entre secciones."
  );

  // 1.3
  subsectionHeader("1.3  Gestión de Concesionarios (/admin/concesionarios)");
  bodyText(
    "Esta sección centraliza la administración completa de todos los concesionarios registrados en la plataforma. La vista principal muestra una tabla con la siguiente información de cada concesionario:"
  );
  bulletList([
    "Nombre y NIF/CIF del concesionario.",
    "Correo electrónico de contacto.",
    "Teléfono de contacto.",
    "Número total de clientes registrados.",
    "Fecha de alta en la plataforma.",
    "Botón de acceso rápido para editar.",
  ]);

  subsubHeader("Buscador de concesionarios");
  bodyText(
    "En la parte superior derecha de la lista se encuentra un campo de búsqueda que filtra los concesionarios en tiempo real por nombre, correo electrónico o NIF/CIF."
  );

  subsubHeader("Crear nuevo concesionario");
  bodyText(
    "Al pulsar 'Añadir concesionario' se abre un modal con el formulario de creación. Los campos disponibles son:"
  );
  bulletList([
    "Nombre / Empresa (obligatorio) — nombre comercial del concesionario.",
    "NIF / CIF — identificación fiscal.",
    "Correo electrónico del concesionario (obligatorio) — email de contacto.",
    "Teléfono — número de contacto.",
    "Dirección — dirección postal.",
    "Ciudad — ciudad del concesionario.",
    "Código postal — código postal.",
    "Email de acceso (obligatorio) — credencial de acceso al panel de concesionario.",
    "Contraseña (obligatorio) — clave inicial de acceso.",
    "Prefijo localizador (opcional) — 2 letras mayúsculas únicas (ej: MS). Se usará para los identificadores de citas: MS-0001, MS-0002...",
    "Estados de reparación — se incluyen tres estados por defecto (En espera, En reparación, Reparación finalizada) más los que el administrador añada.",
  ]);
  note(
    "NOTA: El slug del concesionario se genera automáticamente a partir del nombre, normalizando a minúsculas y reemplazando caracteres especiales por guiones. Se utiliza en la URL del enlace de registro de clientes."
  );

  bodyText(
    "Tras crear el concesionario, el sistema muestra automáticamente el enlace de registro generado, con formato: https://[dominio]/register/[slug]. Este enlace debe compartirse con los clientes para que puedan crear sus cuentas vinculadas al concesionario."
  );

  subsubHeader("Editar concesionario existente");
  bodyText(
    "Al pulsar 'Editar' en cualquier fila de la tabla, se abre el mismo modal de formulario con los datos actuales del concesionario cargados. En la edición no es posible cambiar el correo electrónico de acceso (campo deshabilitado) ni la contraseña. El prefijo del localizador se gestiona desde el detalle del concesionario (pestaña Estados de reparación)."
  );

  // 1.4
  subsectionHeader("1.4  Detalle de Concesionario (/admin/concesionarios/[id])");
  bodyText(
    "Al hacer clic en cualquier fila de la tabla de concesionarios, se accede a la vista de detalle. Esta página organiza la información en cinco pestañas:"
  );

  subsubHeader("Pestaña: Pagos");
  bodyText(
    "Muestra el estado de suscripción del concesionario con Stripe, incluyendo:"
  );
  bulletList([
    "Estado de suscripción (activa, inactiva, cancelada, trial).",
    "Precio mensual de la suscripción.",
    "Fecha de renovación del próximo período.",
  ]);
  bodyText(
    "Además, permite gestionar las Facturas LOCKSY — documentos de facturación internos emitidos por LOCKSY al concesionario. Se pueden crear nuevas facturas (con concepto, importe, URL de archivo y URL de pago), editar facturas existentes y eliminarlas."
  );

  subsubHeader("Pestaña: Citas");
  bodyText(
    "Lista todas las citas asociadas al concesionario con:"
  );
  bulletList([
    "Localizador único de la cita.",
    "Nombre del cliente (registrado o manual).",
    "Matrícula del vehículo.",
    "Fecha y hora programada.",
    "Estado de la cita (Pendiente, En curso, Finalizada).",
    "Estado de reparación personalizado.",
  ]);
  bodyText(
    "Incluye un buscador por localizador, nombre de cliente o matrícula, y un selector de orden (más recientes primero o más antiguas primero). Al hacer clic en una cita, se navega al detalle de esa cita (/admin/concesionarios/[id]/citas/[apptId])."
  );

  subsubHeader("Pestaña: Estados de reparación");
  bodyText(
    "Permite configurar los estados de reparación del concesionario. Siempre existen tres estados por defecto no eliminables:"
  );
  bulletList([
    "En espera",
    "En reparación",
    "Reparación finalizada",
  ]);
  bodyText(
    "El administrador puede añadir estados personalizados adicionales y eliminar los que no son por defecto. Los cambios se guardan inmediatamente."
  );
  bodyText(
    "También se gestiona el Prefijo del localizador: un código de exactamente 2 letras mayúsculas, único por concesionario (ej: 'AB'). Los localizadores de citas toman el formato XX-0000, donde XX es el prefijo y los cuatro dígitos se incrementan secuencialmente. Si se cambia el prefijo, el sistema renumera automáticamente todos los localizadores existentes de ese concesionario."
  );

  subsubHeader("Pestaña: Facturación");
  bodyText(
    "Muestra un resumen de los ingresos del concesionario (cobros realizados a sus clientes) filtrados por período. Los períodos disponibles son: Últimos 12 meses, 6 meses, 3 meses, 30 días, 7 días, Hoy e Intervalo personalizado. Para cada período se muestran las citas finalizadas con importe, nombre de cliente, matrícula y estado de pago."
  );

  subsubHeader("Pestaña: Enlace de registro");
  bodyText(
    "Muestra el enlace único de registro para que los clientes creen sus cuentas vinculadas a este concesionario. Incluye un botón de copia al portapapeles."
  );

  // 1.5
  subsectionHeader("1.5  Gestión de Clientes (/admin/clientes)");
  bodyText(
    "Proporciona una vista completa de todos los clientes registrados en la plataforma, independientemente del concesionario al que estén vinculados."
  );

  subsubHeader("Lista de clientes");
  bodyText(
    "La lista muestra para cada cliente: nombre completo, correo electrónico, DNI, teléfono y fecha de registro. Incluye un buscador en tiempo real que filtra por nombre, email o DNI."
  );

  subsubHeader("Detalle de cliente");
  bodyText(
    "Al hacer clic sobre un cliente se accede a su ficha detallada con:"
  );
  bulletList([
    "Información personal: nombre, apellidos, DNI, teléfono, correo electrónico, dirección.",
    "Foto de perfil (si disponible).",
    "Lista de vehículos vinculados con marca, modelo y matrícula.",
    "Historial completo de citas con todos los concesionarios.",
  ]);
  bodyText(
    "El administrador puede editar los datos personales del cliente directamente desde esta vista. Los vehículos también son editables (marca, modelo, matrícula, número de bastidor, fecha de matriculación)."
  );

  // 1.6
  subsectionHeader("1.6  Mensajes de Contacto (/admin/contacto)");
  bodyText(
    "Centraliza todas las solicitudes de contacto recibidas desde los formularios públicos de la landing page. Existen dos tipos de solicitudes:"
  );
  bulletList([
    "setup — solicitudes de configuración y alta de nuevos concesionarios desde la página /setup.",
    "contact — mensajes generales desde el formulario de contacto en /contact.",
  ]);
  bodyText(
    "Cada solicitud muestra: nombre, empresa (si procede), email, teléfono, dirección, mensaje y estado. Los estados posibles son: nueva (new), contactado (contacted) y resuelto (resolved)."
  );
  bodyText(
    "El administrador puede cambiar el estado de cada solicitud (marcar como contactado o resuelto) y responder directamente por email a través del formulario de respuesta integrado."
  );

  // 1.7
  subsectionHeader("1.7  Facturación Global (/admin/facturacion)");
  bodyText(
    "Vista consolidada de los ingresos de LOCKSY provenientes de las suscripciones de los concesionarios."
  );
  bodyText(
    "La página muestra:"
  );
  bulletList([
    "Número de suscripciones activas en el momento actual.",
    "Total de ingresos en el período seleccionado.",
    "Listado detallado de facturas por concesionario, con concepto, importe y fecha.",
    "Filtros por mes/año o intervalo personalizado de fechas.",
  ]);
  bodyText(
    "El administrador también puede configurar el precio de suscripción global utilizado por Stripe para los nuevos concesionarios que se suscriban."
  );
}

// ─── SECCIÓN 2: PANEL DE CONCESIONARIO ───────────────────────────────────────
function writeSection2() {
  sectionHeader("SECCIÓN 2 — PANEL DE CONCESIONARIO");

  bodyText(
    "El Panel de Concesionario es el espacio de trabajo principal para los talleres y concesionarios adheridos a LOCKSY. Permite gestionar la agenda de citas, el flujo de reparaciones en el taller, los clientes y el perfil del negocio."
  );

  // 2.1
  subsectionHeader("2.1  Acceso al Panel");
  bodyText(
    "Los concesionarios acceden a LOCKSY mediante las credenciales creadas por el administrador del sistema (email y contraseña). No existe registro público para concesionarios — el acceso es gestionado íntegramente por el administrador."
  );
  bulletList([
    "URL de acceso: /login",
    "Tras autenticarse, el sistema redirige automáticamente a /dealer/citas (panel de citas).",
    "La barra lateral (Sidebar) muestra las opciones: Citas, Taller, Clientes y Mi Perfil.",
  ]);

  // 2.2
  subsectionHeader("2.2  Gestión de Citas (/dealer/citas)");
  bodyText(
    "El módulo de citas es el núcleo operativo del concesionario. Presenta una interfaz de calendario que puede visualizarse en dos modos:"
  );
  bulletList([
    "Vista mensual — muestra el mes completo con indicadores de citas por día.",
    "Vista semanal — presenta la semana actual con franjas horarias de 6:00 a 22:00, visualizando las citas en su franja de tiempo correspondiente.",
  ]);

  subsubHeader("Crear una nueva cita");
  bodyText(
    "Al pulsar el botón 'Nueva cita' o hacer clic en un hueco del calendario, se abre el formulario de creación de cita. El proceso soporta dos modos:"
  );

  subsubHeader("Modo 1: Cliente registrado");
  bulletList([
    "Utilizar el buscador de clientes para encontrar un cliente existente (registrado o manual).",
    "El buscador consulta la API /api/dealer/search-clients filtrando por nombre, email o NIF/CIF.",
    "Seleccionar el cliente y elegir uno de sus vehículos vinculados.",
    "Seleccionar la fecha y hora de la cita.",
    "Añadir una descripción del trabajo a realizar (opcional).",
  ]);

  subsubHeader("Modo 2: Entrada manual (sin cuenta registrada)");
  bodyText(
    "Para clientes sin cuenta en la plataforma, se introducen los datos manualmente:"
  );
  bulletList([
    "Nombre (obligatorio)",
    "Apellido",
    "NIF/CIF",
    "Correo electrónico",
    "Teléfono",
    "Dirección",
    "Marca del vehículo",
    "Modelo del vehículo",
    "Matrícula del vehículo",
    "Fecha y hora de la cita",
    "Descripción del trabajo",
  ]);
  note(
    "Las citas manuales quedan registradas en la base de datos con los campos manual_first_name, manual_last_name, etc. Posteriormente se pueden unificar con una cuenta registrada desde el módulo de clientes."
  );

  subsubHeader("Bloquear franja horaria");
  bodyText(
    "El concesionario puede bloquear franjas horarias para impedir que los clientes reserven en determinados momentos (vacaciones, mantenimiento del taller, etc.). Los bloqueos se gestionan desde el mismo calendario y se almacenan en la tabla schedule_blocks."
  );

  subsubHeader("Editar y eliminar citas");
  bodyText(
    "Desde la vista de detalle de una cita (accesible desde el calendario), el concesionario puede:"
  );
  bulletList([
    "Modificar la fecha y hora de la cita.",
    "Actualizar la descripción.",
    "Editar los datos del cliente manual (nombre, vehículo, etc.).",
    "Eliminar la cita (solo si está en estado 'pendiente').",
  ]);

  subsubHeader("Confirmar recogida de llaves");
  bodyText(
    "Cuando el cliente entrega las llaves del vehículo, el concesionario puede marcar la recogida desde el detalle de la cita. Esto registra la fecha y hora exacta en el campo key_picked_up_at y transiciona la cita al estado 'en_curso'. La confirmación genera automáticamente un código de llaves (key_code) único para la cita."
  );

  // 2.3
  subsectionHeader("2.3  Taller (/dealer/taller)");
  bodyText(
    "El módulo de Taller gestiona todas las reparaciones activas del concesionario. La lista muestra las citas en estado 'en_curso' con información resumida del cliente y vehículo."
  );

  subsubHeader("Detalle de reparación (/dealer/taller/[id])");
  bodyText(
    "Al acceder al detalle de una reparación, el concesionario dispone de un panel completo con todas las acciones disponibles:"
  );

  subsubHeader("Información del cliente y vehículo");
  bulletList([
    "Nombre y datos de contacto del cliente (registrado o manual).",
    "Datos del vehículo: marca, modelo, matrícula.",
    "Localizador único de la cita.",
    "Descripción del trabajo solicitado.",
  ]);

  subsubHeader("Cambiar estado de reparación");
  bodyText(
    "El selector de estado de reparación permite cambiar entre los estados configurados para el concesionario (por defecto: En espera, En reparación, Reparación finalizada, más cualquier estado personalizado). Al cambiar el estado, se envía automáticamente una notificación al cliente (si está registrado) de tipo status_change."
  );

  subsubHeader("Marcar vehículo en taller");
  bodyText(
    "El toggle 'Vehículo en taller' indica si el vehículo se encuentra físicamente en las instalaciones del concesionario. Se puede activar y desactivar en cualquier momento, actualizando el campo vehicle_in_dealership."
  );

  subsubHeader("Enviar presupuesto");
  bodyText(
    "El concesionario puede enviar un presupuesto al cliente desde esta pantalla:"
  );
  bulletList([
    "Introducir el importe del presupuesto (campo numérico con decimales).",
    "Adjuntar opcionalmente un archivo PDF con el desglose del presupuesto.",
    "Al enviar, el sistema crea una notificación de tipo budget_sent para el cliente.",
    "El estado del presupuesto queda como 'pending' hasta que el cliente responda.",
    "El cliente puede aceptar o rechazar el presupuesto desde su panel de notificaciones.",
  ]);

  subsubHeader("Finalizar reparación");
  bodyText(
    "Cuando el trabajo está terminado y el vehículo listo para entrega, el concesionario finaliza la reparación:"
  );
  bulletList([
    "Introducir el importe final de la factura.",
    "Adjuntar opcionalmente el PDF de la factura.",
    "Añadir observaciones del taller y recomendaciones para el cliente.",
    "Al confirmar, la cita pasa al estado 'finalizada' y se registra la fecha en completed_at.",
    "Se envía una notificación de tipo repair_completed al cliente.",
  ]);

  subsubHeader("Registrar pago");
  bodyText(
    "Para gestionar el cobro, el concesionario dispone de dos opciones de pago presencial:"
  );
  bulletList([
    "Marcar pagado en efectivo — registra payment_method = 'cash' y payment_status = 'paid'.",
    "Marcar pagado con tarjeta — registra payment_method = 'card' y payment_status = 'paid'.",
  ]);
  bodyText(
    "Estas opciones están disponibles para TODOS los tipos de clientes, incluyendo los registrados que también pueden pagar online mediante Stripe. El indicador de método de pago es clicable en la pantalla de facturación para cambiar entre efectivo y tarjeta."
  );

  subsubHeader("Adjuntar factura tardía");
  bodyText(
    "Si al finalizar la reparación no se adjuntó la factura, el concesionario puede añadirla posteriormente desde el detalle de la reparación o desde el historial de reparaciones finalizadas. La factura se sube al bucket 'invoices' de Supabase Storage."
  );

  subsubHeader("Confirmar retirada del vehículo");
  bodyText(
    "Una vez el cliente recoge el vehículo, el concesionario confirma la entrega, registrando la fecha en key_returned_at. Esto cierra el ciclo completo de la reparación."
  );

  // 2.4
  subsectionHeader("2.4  Gestión de Clientes (/dealer/clientes)");
  bodyText(
    "El módulo de clientes del concesionario muestra el directorio completo de contactos asociados: tanto clientes con cuenta registrada en LOCKSY como clientes ingresados manualmente en citas anteriores."
  );

  subsubHeader("Lista de contactos");
  bodyText(
    "La lista incluye todos los contactos del concesionario con:"
  );
  bulletList([
    "Nombre completo.",
    "Tipo de cuenta: registrado (icono de usuario verificado) o manual (icono de usuario genérico).",
    "Correo electrónico y teléfono.",
    "Número de citas realizadas con este concesionario.",
  ]);

  subsubHeader("Detalle de cliente (/dealer/clientes/[id])");
  bodyText(
    "La ficha de cliente muestra:"
  );
  bulletList([
    "Datos de contacto completos: nombre, apellidos, NIF/CIF, email, teléfono, dirección.",
    "Lista de vehículos vinculados al cliente.",
    "Historial completo de citas con este concesionario.",
  ]);

  subsubHeader("Historial de citas con modal de detalle");
  bodyText(
    "Al hacer clic en cualquier cita del historial, se abre un modal con todos los detalles: estado, fechas, importes, documentos adjuntos (presupuesto, factura, orden de reparación)."
  );

  subsubHeader("Adjuntar factura desde historial");
  bodyText(
    "Si una cita finalizada no tiene factura adjunta, aparece un botón 'Adjuntar factura' directamente en el historial del cliente, permitiendo subir el documento sin necesidad de navegar al módulo de taller."
  );

  subsubHeader("Unificar perfil manual con cuenta registrada (merge)");
  bodyText(
    "Cuando un cliente que fue introducido manualmente en una cita crea posteriormente una cuenta en LOCKSY, el concesionario puede unificar ambos perfiles. La función de merge:"
  );
  bulletList([
    "Vincula todas las citas del contacto manual a la cuenta registrada del cliente.",
    "Elimina el contacto manual duplicado.",
    "Conserva el historial completo de citas.",
    "Se realiza buscando la cuenta registrada del cliente y confirmando la unificación.",
  ]);

  // 2.5
  subsectionHeader("2.5  Mi Perfil (/dealer/perfil)");
  bodyText(
    "Sección de configuración y consulta del perfil del concesionario, organizada en tres subsecciones accesibles desde el menú de perfil:"
  );

  subsubHeader("Información del concesionario");
  bodyText(
    "Muestra los datos del perfil del concesionario: nombre, email, teléfono, dirección, ciudad, código postal y NIF/CIF. También incluye los datos de facturación (nombre fiscal, NIF/CIF fiscal, email de facturación, IBAN)."
  );

  subsubHeader("Facturación (/dealer/perfil/facturacion)");
  bodyText(
    "Resumen de todos los cobros recibidos de clientes por reparaciones. Permite filtrar por período (12 meses, 6 meses, 3 meses, 30 días, 7 días, hoy o intervalo personalizado). La tabla muestra:"
  );
  bulletList([
    "Localizador de la cita.",
    "Nombre del cliente.",
    "Matrícula del vehículo.",
    "Importe de la factura.",
    "Método de pago: efectivo (cash) o tarjeta (card). El indicador es clicable para cambiar el método de pago registrado.",
    "Fecha de finalización de la reparación.",
  ]);

  subsubHeader("Historial de reparaciones (/dealer/perfil/historial)");
  bodyText(
    "Lista todas las reparaciones finalizadas del concesionario. Desde esta vista se puede acceder al detalle de cada reparación y adjuntar facturas tardías a reparaciones que no las tienen."
  );

  subsubHeader("Pagos / Suscripción (/dealer/perfil/pagos)");
  bodyText(
    "Gestión del estado de la suscripción del concesionario con LOCKSY a través de Stripe:"
  );
  bulletList([
    "Visualizar el estado actual (activa, cancelada, trial, past_due).",
    "Ver la fecha de próxima renovación.",
    "Ver el importe mensual de la suscripción.",
    "Suscribirse si no tiene suscripción activa (redirige a Stripe Checkout).",
    "Cancelar la suscripción activa.",
    "Reactivar una suscripción cancelada.",
  ]);
}

// ─── SECCIÓN 3: PERFIL DE CLIENTE ────────────────────────────────────────────
function writeSection3() {
  sectionHeader("SECCIÓN 3 — PERFIL DE CLIENTE");

  bodyText(
    "El módulo de cliente de LOCKSY permite a los propietarios de vehículos registrarse en uno o más concesionarios, gestionar sus citas, seguir el estado de las reparaciones en tiempo real, responder presupuestos y realizar pagos online de manera segura."
  );

  // 3.1
  subsectionHeader("3.1  Registro (/register/[dealershipSlug])");
  bodyText(
    "El registro de clientes está restringido al enlace único de cada concesionario. No existe un registro abierto global — cada cliente debe registrarse a través del enlace proporcionado por su concesionario."
  );

  subsubHeader("Acceso al formulario de registro");
  bodyText(
    "La URL de registro tiene el formato: /register/[slug], donde [slug] es el identificador único del concesionario. El sistema valida el slug al cargar la página: si el concesionario no existe o no está activo, se muestra un mensaje de error."
  );

  subsubHeader("Formulario de registro");
  bodyText(
    "El formulario solicita:"
  );
  bulletList([
    "Correo electrónico.",
    "Contraseña — debe cumplir los siguientes requisitos: mínimo 8 caracteres, al menos 1 letra mayúscula, al menos 1 número, al menos 1 carácter especial (!@#$%^&* etc.).",
    "Confirmar contraseña — debe coincidir exactamente con la contraseña introducida.",
    "Aceptar los Términos y Condiciones (obligatorio).",
  ]);
  bodyText(
    "Los requisitos de contraseña se validan en tiempo real con indicadores visuales (verde/gris) que muestran cuáles se cumplen."
  );

  subsubHeader("Cliente con sesión ya iniciada");
  bodyText(
    "Si el usuario accede al enlace de registro mientras tiene una sesión activa como cliente, el sistema ofrece directamente la opción de añadir el concesionario a su cuenta existente, sin necesidad de crear una nueva cuenta."
  );

  // 3.2
  subsectionHeader("3.2  Verificación de Email y Completar Perfil (/verify, /complete-profile)");

  subsubHeader("Verificación del correo electrónico (/verify)");
  bodyText(
    "Tras el registro, el sistema envía automáticamente un código de verificación de 6 dígitos al correo electrónico del usuario. El código tiene una validez de 10 minutos. El cliente debe introducirlo en la página /verify para activar su cuenta."
  );
  bulletList([
    "Si el código caduca, se puede solicitar el reenvío desde la misma página.",
    "El código se genera de forma aleatoria y se almacena cifrado en la tabla users.",
    "Una vez verificado, el usuario es redirigido a /complete-profile.",
  ]);

  subsubHeader("Completar perfil (/complete-profile)");
  bodyText(
    "En este paso el cliente completa su perfil personal con los siguientes campos:"
  );
  bulletList([
    "Nombre (obligatorio).",
    "Apellido (obligatorio).",
    "DNI / NIF.",
    "Teléfono.",
    "Dirección.",
    "Foto de perfil (opcional, se sube al bucket 'avatars' de Supabase Storage).",
  ]);
  bodyText(
    "También se ofrece la posibilidad de añadir el primer vehículo al perfil (marca, modelo, matrícula). Tras completar el perfil, el cliente accede directamente al panel de citas."
  );

  // 3.3
  subsectionHeader("3.3  Citas (/client/appointments)");
  bodyText(
    "La página principal del cliente organiza sus citas en tres pestañas:"
  );
  bulletList([
    "Pendientes — citas programadas que aún no han comenzado.",
    "En Curso — citas actualmente en proceso de reparación.",
    "Finalizadas — citas completadas y cerradas.",
  ]);

  subsubHeader("Información de cada cita");
  bodyText(
    "Cada tarjeta de cita muestra:"
  );
  bulletList([
    "Nombre del concesionario (resaltado en color naranja).",
    "Datos del vehículo: marca, modelo y matrícula.",
    "Fecha y hora programada.",
    "Estado de la cita (Pendiente, En Curso, Finalizada).",
    "Estado de reparación personalizado del concesionario (si está disponible).",
    "Localizador único de la cita.",
  ]);

  subsubHeader("Ordenación y filtros en citas finalizadas");
  bodyText(
    "En la pestaña 'Finalizadas', el cliente puede ordenar las citas por:"
  );
  bulletList([
    "Fecha: de más antigua a más reciente.",
    "Fecha: de más reciente a más antigua.",
    "Importe: de mayor a menor.",
    "Importe: de menor a mayor.",
  ]);

  subsubHeader("Nueva cita (/client/appointments/new)");
  bodyText(
    "El cliente puede solicitar una nueva cita seleccionando:"
  );
  bulletList([
    "Concesionario — de la lista de concesionarios vinculados a su cuenta.",
    "Vehículo — de los vehículos registrados en su perfil.",
    "Fecha y hora — del calendario de disponibilidad del concesionario (respeta los bloqueos de horario configurados).",
    "Descripción — descripción del problema o servicio solicitado.",
  ]);

  // 3.4
  subsectionHeader("3.4  Detalle de Cita (/client/appointments/[id])");
  bodyText(
    "La vista de detalle de cita muestra toda la información relevante sobre una reparación:"
  );

  subsubHeader("Información general");
  bulletList([
    "Nombre del concesionario.",
    "Fecha y hora de la cita.",
    "Estado actual de la cita y estado de reparación.",
    "Localizador de la cita.",
    "Código de llaves — código único generado al confirmar la recogida de llaves.",
    "Observaciones del taller y recomendaciones.",
  ]);

  subsubHeader("Sección de pago");
  bodyText(
    "La sección de pago muestra el importe de la factura y el estado del pago:"
  );
  bulletList([
    "Pendiente de pago — muestra el importe y un botón 'Pagar' que redirige a Stripe Checkout para pago con tarjeta online.",
    "Pagado — muestra el sello de 'Pagado' y el método de pago utilizado (online, efectivo o tarjeta).",
    "No requerido — cuando el concesionario ha marcado que no se requiere pago.",
  ]);

  subsubHeader("Documentos");
  bulletList([
    "Orden de reparación (PDF) — descargable cuando está disponible.",
    "Factura — enlace para ver y descargar si el concesionario la ha adjuntado. Si no está disponible, se muestra el mensaje 'La factura aún no está disponible'.",
  ]);

  // 3.5
  subsectionHeader("3.5  Notificaciones (/client/notifications)");
  bodyText(
    "El sistema de notificaciones informa al cliente sobre los cambios en sus reparaciones en tiempo real, utilizando la funcionalidad Realtime de Supabase."
  );

  subsubHeader("Badge de notificaciones no leídas");
  bodyText(
    "En la barra lateral del cliente, el elemento 'Notificaciones' muestra un badge numérico (en naranja) a la derecha del texto indicando la cantidad de notificaciones no leídas."
  );

  subsubHeader("Tipos de notificaciones");
  bulletList([
    "status_change — Cambio de estado de reparación: informa al cliente cuando el concesionario cambia el estado de su reparación.",
    "budget_sent — Presupuesto enviado: notifica al cliente cuando el concesionario ha enviado un presupuesto para su aprobación.",
    "repair_completed — Reparación completada: informa al cliente cuando la reparación ha finalizado y el vehículo está listo para recoger.",
  ]);

  subsubHeader("Información de cada notificación");
  bodyText(
    "Cada tarjeta de notificación muestra:"
  );
  bulletList([
    "Título de la notificación.",
    "Nombre del concesionario (resaltado en naranja).",
    "Mensaje descriptivo.",
    "Fecha y hora de la notificación.",
  ]);

  subsubHeader("Acciones sobre notificaciones de presupuesto");
  bodyText(
    "Las notificaciones de tipo budget_sent incluyen botones de acción directa:"
  );
  bulletList([
    "Aceptar — el cliente acepta el presupuesto; el estado cambia a 'accepted' en la base de datos.",
    "Rechazar — el cliente rechaza el presupuesto; el estado cambia a 'rejected'.",
    "Ver/Descargar — si el presupuesto incluye un PDF adjunto, se muestra un botón para verlo/descargarlo.",
    "Ver cita — enlace directo al detalle de la cita relacionada.",
  ]);

  subsubHeader("Marcar todas como leídas");
  bodyText(
    "El botón 'Marcar todas como leídas' marca como leídas todas las notificaciones, EXCEPTO las de tipo budget_sent (presupuestos), ya que estas requieren una acción explícita del cliente (aceptar o rechazar). No existe la opción de marcar una notificación de presupuesto como leída de forma individual sin responderla."
  );

  // 3.6
  subsectionHeader("3.6  Mi Perfil (/client/profile)");
  bodyText(
    "La sección de perfil del cliente permite consultar y actualizar su información personal, gestionar sus vehículos y ver los concesionarios vinculados."
  );

  subsubHeader("Datos personales");
  bodyText(
    "El cliente puede ver y editar:"
  );
  bulletList([
    "Nombre y apellidos.",
    "DNI / NIF.",
    "Teléfono.",
    "Dirección.",
    "Foto de perfil (con opción de actualizar; se almacena en Supabase Storage, bucket 'avatars').",
  ]);

  subsubHeader("Vehículos");
  bodyText(
    "Lista de todos los vehículos vinculados al perfil del cliente. Para cada vehículo se muestra:"
  );
  bulletList([
    "Marca y modelo.",
    "Matrícula.",
    "Número de bastidor (si disponible).",
    "Fecha de matriculación.",
    "Ficha técnica — PDF descargable si ha sido subido.",
  ]);
  bodyText(
    "El cliente puede añadir nuevos vehículos, editar los existentes y adjuntar la ficha técnica en formato PDF (almacenada en el bucket 'appointment-attachments')."
  );

  subsubHeader("Concesionarios vinculados");
  bodyText(
    "Lista de todos los concesionarios a los que el cliente está vinculado, con el nombre del concesionario y la fecha de vinculación."
  );
}

// ─── SECCIÓN 4: REFERENCIA TÉCNICA ───────────────────────────────────────────
function writeSection4() {
  sectionHeader("SECCIÓN 4 — REFERENCIA TÉCNICA");

  bodyText(
    "Esta sección documenta el stack tecnológico, la estructura de la base de datos, la guía de instalación y las variables de entorno necesarias para desplegar y mantener LOCKSY."
  );

  // 4.1
  subsectionHeader("4.1  Stack Tecnológico");

  subsubHeader("Frontend y Framework");
  bulletList([
    "Next.js 16 (App Router) — framework React con renderizado en servidor, enrutamiento por directorio y API Routes integradas.",
    "React 19 — biblioteca de interfaz de usuario.",
    "TypeScript 5 — tipado estático para mayor robustez y mantenibilidad del código.",
    "Tailwind CSS 4 — framework de utilidades CSS para el diseño responsivo.",
  ]);

  subsubHeader("Backend y Base de Datos");
  bulletList([
    "Supabase — plataforma BaaS (Backend as a Service) que proporciona:",
    "  · Auth — autenticación y gestión de sesiones con JWT.",
    "  · Database (PostgreSQL) — base de datos relacional con Row Level Security.",
    "  · Storage — almacenamiento de archivos (facturas, presupuestos, fotos de perfil).",
    "  · Realtime — suscripciones en tiempo real para notificaciones.",
    "@supabase/ssr — cliente SSR optimizado para Next.js App Router.",
  ]);

  subsubHeader("Pagos");
  bulletList([
    "Stripe 20 — procesamiento de pagos online y suscripciones recurrentes.",
    "@stripe/react-stripe-js — componentes de Stripe para el frontend.",
    "Webhooks de Stripe — para sincronizar el estado de suscripciones y pagos.",
  ]);

  subsubHeader("Formularios y Validación");
  bulletList([
    "react-hook-form 7 — manejo eficiente de formularios con mínimas re-renders.",
    "@hookform/resolvers 5 — integración de validadores con react-hook-form.",
    "zod 4 — validación de esquemas de datos en TypeScript.",
  ]);

  subsubHeader("Email");
  bulletList([
    "Resend 6 — servicio de envío de emails transaccionales (verificación de cuenta, respuestas de contacto).",
  ]);

  subsubHeader("Generación de Documentos");
  bulletList([
    "PDFKit — generación de documentos PDF en Node.js (órdenes de reparación, facturas).",
  ]);

  // 4.2
  subsectionHeader("4.2  Estructura de la Base de Datos");
  bodyText(
    "La base de datos de LOCKSY está construida sobre PostgreSQL mediante Supabase, con Row Level Security (RLS) habilitado en todas las tablas para garantizar el aislamiento de datos entre usuarios. A continuación se documentan todas las tablas con sus columnas principales."
  );

  // Table: users
  ensureSpace(160);
  subsubHeader("Tabla: public.users");
  bodyText("Extiende auth.users de Supabase. Almacena los perfiles de todos los usuarios de la plataforma.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  const usersRows = [
    ["id", "UUID PK", "Referencia a auth.users(id)"],
    ["role", "TEXT", "Rol: 'admin', 'dealer' o 'client'"],
    ["first_name", "TEXT", "Nombre del usuario"],
    ["last_name", "TEXT", "Apellido del usuario"],
    ["company_name", "TEXT", "Nombre de empresa (opcional)"],
    ["phone", "TEXT", "Teléfono de contacto"],
    ["email", "TEXT", "Correo electrónico"],
    ["profile_photo_url", "TEXT", "URL de la foto de perfil en Storage"],
    ["dni", "TEXT", "DNI o NIF del usuario"],
    ["address", "TEXT", "Dirección postal"],
    ["city", "TEXT", "Ciudad"],
    ["postal_code", "TEXT", "Código postal"],
    ["verification_code", "TEXT", "Código de verificación de email (6 dígitos)"],
    ["verification_code_expires_at", "TIMESTAMPTZ", "Expiración del código (10 min)"],
    ["created_at", "TIMESTAMPTZ", "Fecha de creación del registro"],
    ["updated_at", "TIMESTAMPTZ", "Última actualización (auto)"],
  ];
  usersRows.forEach((r) => drawTableRow(r));

  // Table: dealerships
  ensureSpace(180);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.dealerships");
  bodyText("Almacena la información de cada concesionario/taller registrado en LOCKSY.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  const dealershipsRows = [
    ["id", "UUID PK", "Identificador único del concesionario"],
    ["user_id", "UUID FK", "Referencia al usuario dealer en public.users"],
    ["name", "TEXT", "Nombre comercial del concesionario"],
    ["company_name", "TEXT", "Razón social"],
    ["nif_cif", "TEXT", "NIF o CIF fiscal"],
    ["email", "TEXT", "Correo electrónico de contacto"],
    ["phone", "TEXT", "Teléfono"],
    ["address", "TEXT", "Dirección"],
    ["city", "TEXT", "Ciudad"],
    ["postal_code", "TEXT", "Código postal"],
    ["logo_url", "TEXT", "URL del logotipo"],
    ["slug", "TEXT UNIQUE", "Identificador URL único (auto-generado del nombre)"],
    ["active", "BOOLEAN", "Indica si el concesionario está activo"],
    ["repair_statuses", "JSONB", "Array de estados de reparación configurados"],
    ["iban", "TEXT", "IBAN para facturación"],
    ["billing_name", "TEXT", "Nombre fiscal para facturación"],
    ["billing_nif_cif", "TEXT", "NIF/CIF fiscal"],
    ["billing_email", "TEXT", "Email de facturación"],
    ["billing_phone", "TEXT", "Teléfono de facturación"],
    ["billing_address", "TEXT", "Dirección de facturación"],
    ["stripe_customer_id", "TEXT", "ID de cliente en Stripe"],
    ["stripe_subscription_id", "TEXT", "ID de suscripción activa en Stripe"],
    ["subscription_status", "TEXT", "Estado: active, canceled, past_due, etc."],
    ["subscription_period_end", "TEXT", "Fin del período de suscripción"],
    ["locator_prefix", "TEXT UNIQUE", "Prefijo de 2 letras para localizadores"],
    ["locator_sequence", "INTEGER", "Contador de localizadores emitidos"],
  ];
  dealershipsRows.forEach((r) => drawTableRow(r));

  // Table: dealership_clients
  ensureSpace(100);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.dealership_clients");
  bodyText("Tabla de relación muchos-a-muchos entre concesionarios y clientes registrados.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador de la relación"],
    ["dealership_id", "UUID FK", "Concesionario al que pertenece"],
    ["client_id", "UUID FK", "Cliente vinculado"],
    ["registration_date", "TIMESTAMPTZ", "Fecha en que el cliente se vinculó"],
    ["active", "BOOLEAN", "Indica si la vinculación está activa"],
  ].forEach((r) => drawTableRow(r));

  // Table: vehicles
  ensureSpace(130);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.vehicles");
  bodyText("Almacena los vehículos de los clientes registrados.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador del vehículo"],
    ["client_id", "UUID FK", "Propietario del vehículo"],
    ["brand", "TEXT", "Marca del vehículo"],
    ["model", "TEXT", "Modelo del vehículo"],
    ["displacement", "TEXT", "Cilindrada"],
    ["plate", "TEXT", "Matrícula"],
    ["chassis_number", "VARCHAR(17)", "Número de bastidor (VIN)"],
    ["registration_date", "DATE", "Fecha de matriculación"],
    ["tech_file_url", "TEXT", "URL de la ficha técnica en Storage"],
  ].forEach((r) => drawTableRow(r));

  // Table: appointments
  ensureSpace(40);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.appointments");
  bodyText("Tabla central del sistema. Almacena todas las citas, tanto de clientes registrados como manuales.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador de la cita"],
    ["dealership_id", "UUID FK", "Concesionario al que pertenece la cita"],
    ["client_id", "UUID FK (nullable)", "Cliente registrado (null si es manual)"],
    ["vehicle_id", "UUID FK (nullable)", "Vehículo (null si es manual)"],
    ["locator", "TEXT UNIQUE", "Localizador único: XX-0000"],
    ["key_code", "TEXT", "Código de identificación de llaves"],
    ["status", "TEXT", "pendiente | en_curso | finalizada"],
    ["repair_status", "TEXT", "Estado de reparación personalizado"],
    ["scheduled_date", "DATE", "Fecha programada"],
    ["scheduled_time", "TIME", "Hora programada"],
    ["description", "TEXT", "Descripción del trabajo"],
    ["dealer_observations", "TEXT", "Observaciones del taller"],
    ["dealer_recommendations", "TEXT", "Recomendaciones del técnico"],
    ["budget_amount", "DECIMAL(10,2)", "Importe del presupuesto"],
    ["budget_status", "TEXT", "pending | accepted | rejected"],
    ["budget_url", "TEXT", "URL del PDF del presupuesto"],
    ["invoice_url", "TEXT", "URL del PDF de la factura"],
    ["repair_order_url", "TEXT", "URL del PDF de la orden de reparación"],
    ["payment_status", "TEXT", "pending | paid | not_required"],
    ["payment_method", "TEXT", "card | cash (null si no aplica)"],
    ["stripe_payment_id", "TEXT", "ID del pago en Stripe"],
    ["vehicle_in_dealership", "BOOLEAN", "Indica si el vehículo está en taller"],
    ["key_picked_up_at", "TIMESTAMPTZ", "Fecha/hora de recogida de llaves"],
    ["key_returned_at", "TIMESTAMPTZ", "Fecha/hora de devolución de llaves"],
    ["completed_at", "TIMESTAMPTZ", "Fecha/hora de finalización"],
    ["manual_first_name", "TEXT", "Nombre (clientes manuales)"],
    ["manual_last_name", "TEXT", "Apellido (clientes manuales)"],
    ["manual_nif_cif", "TEXT", "NIF/CIF (clientes manuales)"],
    ["manual_email", "TEXT", "Email (clientes manuales)"],
    ["manual_phone", "TEXT", "Teléfono (clientes manuales)"],
    ["manual_address", "TEXT", "Dirección (clientes manuales)"],
    ["manual_vehicle_brand", "TEXT", "Marca vehículo (manual)"],
    ["manual_vehicle_model", "TEXT", "Modelo vehículo (manual)"],
    ["manual_vehicle_plate", "TEXT", "Matrícula vehículo (manual)"],
  ].forEach((r) => drawTableRow(r));

  // Table: attachments
  ensureSpace(120);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.attachments");
  bodyText("Archivos adjuntos a citas: fotos, vídeos, presupuestos, facturas.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador del adjunto"],
    ["appointment_id", "UUID FK", "Cita a la que pertenece"],
    ["uploaded_by", "UUID FK", "Usuario que subió el archivo"],
    ["file_name", "TEXT", "Nombre original del archivo"],
    ["file_url", "TEXT", "URL pública en Supabase Storage"],
    ["file_type", "TEXT", "photo | video | audio | budget | invoice | other"],
    ["file_size", "INTEGER", "Tamaño en bytes"],
    ["mime_type", "TEXT", "Tipo MIME del archivo"],
  ].forEach((r) => drawTableRow(r));

  // Table: signatures
  ensureSpace(100);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.signatures");
  bodyText("Firmas digitales para la recogida y devolución de llaves.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador de la firma"],
    ["appointment_id", "UUID FK", "Cita asociada (única por tipo)"],
    ["signer_id", "UUID FK", "Usuario que firma"],
    ["signer_name", "TEXT", "Nombre del firmante"],
    ["signer_dni", "TEXT", "DNI del firmante"],
    ["type", "TEXT", "key_pickup | key_return"],
    ["signature_url", "TEXT", "URL de la imagen de la firma"],
    ["accepted_terms", "BOOLEAN", "Aceptación de términos"],
    ["signed_at", "TIMESTAMPTZ", "Fecha y hora de la firma"],
  ].forEach((r) => drawTableRow(r));

  // Table: notifications
  ensureSpace(100);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.notifications");
  bodyText("Notificaciones enviadas a los clientes. Habilitada para Supabase Realtime.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador de la notificación"],
    ["user_id", "UUID FK", "Usuario destinatario"],
    ["appointment_id", "UUID FK (nullable)", "Cita relacionada"],
    ["type", "TEXT", "status_change | budget_sent | repair_completed"],
    ["title", "TEXT", "Título de la notificación"],
    ["message", "TEXT", "Mensaje descriptivo"],
    ["read", "BOOLEAN", "Indica si ha sido leída (default: false)"],
    ["created_at", "TIMESTAMPTZ", "Fecha de creación"],
  ].forEach((r) => drawTableRow(r));

  // Table: schedule_blocks
  ensureSpace(100);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.schedule_blocks");
  bodyText("Bloqueos de horario configurados por el concesionario.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador del bloqueo"],
    ["dealership_id", "UUID FK", "Concesionario propietario"],
    ["block_date", "DATE", "Fecha bloqueada"],
    ["start_time", "TIME", "Hora de inicio del bloqueo"],
    ["end_time", "TIME", "Hora de fin del bloqueo"],
    ["reason", "TEXT", "Motivo del bloqueo (opcional)"],
    ["created_at", "TIMESTAMPTZ", "Fecha de creación"],
  ].forEach((r) => drawTableRow(r));

  // Table: contact_requests
  ensureSpace(100);
  doc.moveDown(0.8);
  subsubHeader("Tabla: public.contact_requests");
  bodyText("Solicitudes de contacto recibidas desde los formularios públicos de la landing page.");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador de la solicitud"],
    ["type", "TEXT", "setup | contact"],
    ["name", "TEXT", "Nombre del solicitante"],
    ["company_name", "TEXT", "Empresa (opcional)"],
    ["email", "TEXT", "Correo de contacto"],
    ["phone", "TEXT", "Teléfono (opcional)"],
    ["address", "TEXT", "Dirección (opcional)"],
    ["message", "TEXT", "Mensaje del formulario"],
    ["status", "TEXT", "new | contacted | resolved"],
    ["created_at", "TIMESTAMPTZ", "Fecha de envío"],
  ].forEach((r) => drawTableRow(r));

  // Table: dealer_contacts (manual)
  ensureSpace(80);
  doc.moveDown(0.8);
  subsubHeader("Tabla: dealer_contacts (contactos manuales del concesionario)");
  bodyText("Registra los contactos manuales creados por los concesionarios para clientes sin cuenta. Estos contactos pueden unificarse posteriormente con cuentas registradas mediante la función de merge.");

  // Table: locksy_invoices
  ensureSpace(100);
  doc.moveDown(0.8);
  subsubHeader("Tabla: locksy_invoices");
  bodyText("Facturas internas de LOCKSY emitidas a los concesionarios (gestionadas desde el panel de administración).");
  drawTableRow(["Columna", "Tipo", "Descripción"], true);
  [
    ["id", "UUID PK", "Identificador de la factura"],
    ["dealer_id", "UUID FK", "Concesionario facturado"],
    ["concept", "TEXT", "Concepto de la factura"],
    ["amount", "DECIMAL", "Importe de la factura"],
    ["file_url", "TEXT", "URL del PDF de la factura"],
    ["payment_url", "TEXT", "URL de pago (Stripe o similar)"],
    ["sent_at", "TIMESTAMPTZ", "Fecha de envío de la factura"],
    ["created_at", "TIMESTAMPTZ", "Fecha de creación"],
  ].forEach((r) => drawTableRow(r));

  // 4.3
  subsectionHeader("4.3  Guía de Instalación");

  subsubHeader("Requisitos previos");
  bulletList([
    "Node.js 18 o superior.",
    "npm 9 o superior.",
    "Cuenta activa en Supabase (https://supabase.com).",
    "Cuenta activa en Stripe (https://stripe.com).",
    "Cuenta en Resend para el envío de emails (https://resend.com) — opcional pero recomendado.",
    "Git instalado en el sistema.",
  ]);

  subsubHeader("Clonación e instalación de dependencias");
  bodyText("Ejecutar los siguientes comandos en la terminal:");
  bulletList([
    "git clone [url-del-repositorio] locksy",
    "cd locksy",
    "npm install",
  ]);

  subsubHeader("Configuración de variables de entorno");
  bodyText(
    "Copiar el archivo .env.example como .env.local y completar todas las variables requeridas (ver sección 4.4)."
  );
  bulletList([
    "cp .env.example .env.local",
    "Editar .env.local con los valores correctos de Supabase y Stripe.",
  ]);

  subsubHeader("Ejecutar migraciones SQL en Supabase");
  bodyText(
    "Las migraciones deben ejecutarse en el SQL Editor de Supabase en orden numérico, desde 00001 hasta 00014:"
  );
  bulletList([
    "00001_create_users.sql — tabla de usuarios y trigger de creación automática.",
    "00002_create_dealerships.sql — tabla de concesionarios.",
    "00003_create_dealership_clients.sql — relación concesionario-cliente.",
    "00004_create_vehicles.sql — tabla de vehículos.",
    "00005_create_appointments.sql — tabla de citas y secuencia de localizadores.",
    "00006_create_attachments.sql — tabla de archivos adjuntos.",
    "00007_create_signatures.sql — tabla de firmas digitales.",
    "00008_create_notifications.sql — tabla de notificaciones + Realtime.",
    "00009_create_schedule_blocks.sql — tabla de bloqueos de horario.",
    "00010_create_contact_requests.sql — tabla de solicitudes de contacto.",
    "00011_admin_panel_updates.sql — columnas adicionales para el panel admin.",
    "00012_dealer_panel_updates.sql — soporte para citas manuales y órdenes de reparación.",
    "00013_add_payment_method.sql — campo de método de pago en citas.",
    "00014_locator_prefix.sql — prefijo y secuencia de localizadores por concesionario.",
  ]);

  subsubHeader("Crear buckets en Supabase Storage");
  bodyText("En el panel de Supabase, sección Storage, crear los siguientes buckets:");
  bulletList([
    "budgets — para los PDFs de presupuestos enviados por el concesionario.",
    "invoices — para los PDFs de facturas.",
    "appointment-attachments — para adjuntos de citas (fotos, vídeos, fichas técnicas).",
    "avatars — para las fotos de perfil de los clientes.",
  ]);
  note(
    "Configurar las políticas de acceso (RLS) de cada bucket según los requisitos de privacidad. Los buckets de facturas y presupuestos deben ser privados; avatars puede ser público para facilitar la carga de fotos de perfil."
  );

  subsubHeader("Configurar webhook de Stripe");
  bodyText(
    "En el panel de Stripe, crear un webhook que apunte a: [URL_DE_LA_APP]/api/webhooks/stripe. Configurar los eventos a escuchar:"
  );
  bulletList([
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ]);
  bodyText(
    "Copiar el Signing Secret del webhook y añadirlo a la variable STRIPE_WEBHOOK_SECRET del archivo .env.local."
  );

  subsubHeader("Iniciar el servidor de desarrollo");
  bulletList([
    "npm run dev — inicia el servidor en http://localhost:3000",
    "npm run build — genera la build de producción.",
    "npm run start — inicia el servidor de producción.",
  ]);

  // 4.4
  subsectionHeader("4.4  Variables de Entorno");
  bodyText(
    "El archivo .env.local debe contener las siguientes variables de entorno. NUNCA deben ser expuestas públicamente ni incluidas en el control de versiones."
  );

  ensureSpace(40);
  drawTableRow(["Variable", "Descripción", "Visibilidad"], true);
  [
    ["NEXT_PUBLIC_SUPABASE_URL", "URL pública del proyecto Supabase. Se obtiene desde Settings > API en el panel de Supabase.", "Pública"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Clave anónima de Supabase para peticiones del cliente. Se obtiene desde Settings > API.", "Pública"],
    ["SUPABASE_SERVICE_ROLE_KEY", "Clave de servicio de Supabase. Bypasa las RLS. Usar SOLO en el servidor. NUNCA exponer al cliente.", "Privada"],
    ["STRIPE_SECRET_KEY", "Clave secreta de Stripe (sk_live_... o sk_test_...). NUNCA exponer al cliente.", "Privada"],
    ["STRIPE_WEBHOOK_SECRET", "Secreto para verificar la autenticidad de los webhooks recibidos de Stripe (whsec_...).", "Privada"],
    ["STRIPE_PRICE_ID", "ID del precio de suscripción mensual configurado en Stripe (price_...).", "Privada"],
    ["NEXT_PUBLIC_APP_URL", "URL pública de la aplicación (ej: https://locksy.app). Se usa en enlaces de registro y emails.", "Pública"],
    ["RESEND_API_KEY", "Clave de la API de Resend para el envío de emails transaccionales.", "Privada"],
    ["RESEND_FROM_EMAIL", "Dirección de email remitente para los emails enviados (ej: LOCKSY <noreply@locksy.app>).", "Privada"],
    ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "Clave publicable de Stripe (pk_live_... o pk_test_...). Se usa en el cliente para Stripe.js.", "Pública"],
  ].forEach((r) => drawTableRow(r));

  doc.moveDown(1);
  bodyText(
    "Las variables con prefijo NEXT_PUBLIC_ son accesibles desde el cliente (navegador). Las variables sin este prefijo son exclusivas del servidor. NUNCA exponer SUPABASE_SERVICE_ROLE_KEY ni STRIPE_SECRET_KEY al cliente."
  );

  // Final note
  ensureSpace(80);
  doc.moveDown(1);
  doc
    .rect(MARGIN, doc.y, CONTENT_WIDTH, 60)
    .fillColor(COLORS.navy)
    .fill();
  doc
    .font(FONTS.bold)
    .fontSize(13)
    .fillColor(COLORS.white)
    .text("LOCKSY — Manual de Usuario", MARGIN + 10, doc.y - 50, {
      width: CONTENT_WIDTH - 20,
      align: "center",
    });
  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor("#a8bcd4")
    .text("v1.0 — 2026 · Documento confidencial para uso interno", MARGIN + 10, doc.y - 30, {
      width: CONTENT_WIDTH - 20,
      align: "center",
    });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const { Writable } = require("stream");

class NullWritable extends Writable {
  _write(chunk, encoding, cb) { cb(); }
  _final(cb) { cb(); }
}

function createDocInstance() {
  return new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    autoFirstPage: true,
    bufferPages: true,
    info: {
      Title: "LOCKSY — Manual de Usuario",
      Author: "LOCKSY",
      Subject: "Manual de Usuario v1.0",
      Keywords: "locksy, manual, concesionario, taller, citas",
      Creator: "LOCKSY PDF Generator",
      Producer: "PDFKit",
    },
  });
}

function resetState() {
  pageNumber = 0;
  isCoverPage = true;
  tocEntries = [];
  MARGIN = INNER_MARGIN;
}

function generate() {
  // ── PASS 1: recolectar números de página reales ──────────────────────────
  console.log("Pass 1: recolectando numeros de pagina...");
  resetState();
  doc = createDocInstance();
  doc.pipe(new NullWritable());

  drawCover();
  addPage(); // TOC placeholder — mismo avance que drawTOC() haría
  doc.y = 60;
  writeSection1();
  writeSection2();
  writeSection3();
  writeSection4();

  // tocEntries está completamente poblado aquí (sincrónico)
  const realTocEntries = [...tocEntries];
  doc.end();

  console.log(`Pass 1 completo. Paginas: ${pageNumber}. Entradas TOC: ${realTocEntries.length}`);

  // ── PASS 2: generar PDF final con TOC correcto ───────────────────────────
  console.log("Pass 2: generando PDF final...");
  resetState();
  doc = createDocInstance();

  const stream = fs.createWriteStream(OUTPUT_PATH);
  doc.pipe(stream);

  drawCover();
  drawTOC(realTocEntries);
  writeSection1();
  writeSection2();
  writeSection3();
  writeSection4();

  doc.end();

  stream.on("finish", () => {
    const stats = fs.statSync(OUTPUT_PATH);
    const sizeKB = Math.round(stats.size / 1024);
    console.log("\n====================================================");
    console.log("  LOCKSY Manual de Usuario — GENERADO CON EXITO");
    console.log("====================================================");
    console.log(`  Archivo: ${OUTPUT_PATH}`);
    console.log(`  Tamano:  ${sizeKB} KB`);
    console.log(`  Paginas: ${pageNumber}`);
    console.log("====================================================\n");
  });

  stream.on("error", (err) => {
    console.error("Error al escribir el PDF:", err);
    process.exit(1);
  });
}

generate();
