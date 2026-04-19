import PDFDocument from "pdfkit";

export interface RepairInvoiceData {
  // Emisor (concesionario)
  dealerName: string;
  dealerNif: string | null;
  dealerAddress: string | null;
  dealerEmail: string | null;
  dealerLogoBuffer?: Buffer | null;
  // Destinatario (cliente)
  clientName: string;
  clientNif: string | null;
  clientAddress: string | null;
  clientEmail: string | null;
  // Vehículo
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  // Factura
  invoiceNumber: string;
  date: Date;
  // Contenido
  observations: string | null;
  recommendations: string | null;
  // Importe total con IVA
  totalAmount: number;
  // Líneas de presupuesto aceptado (opcional)
  budgetLines?: { description: string; quantity: number; unit_price: number }[] | null;
}

const NAVY = "#1a2e4a";
const ORANGE = "#e07b3a";
const GRAY = "#888888";
const LIGHT_GRAY = "#cccccc";
const BLACK = "#1a1a1a";
const WHITE = "#ffffff";
const TABLE_BG = "#f0f3f7";

const PAGE_W = 595.28;
const ML = 60;
const MR = 60;
const CW = PAGE_W - ML - MR;

export function generateRepairInvoicePDF(data: RepairInvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: ML, bottom: ML, left: ML, right: MR },
      info: {
        Title: `Factura ${data.invoiceNumber}`,
        Author: data.dealerName,
        Subject: "Factura de reparación",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const base = data.totalAmount / 1.21;
    const iva = data.totalAmount - base;

    // ── CABECERA ───────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 88).fillColor(NAVY).fill();
    doc.rect(0, 88, PAGE_W, 5).fillColor(ORANGE).fill();

    if (data.dealerLogoBuffer) {
      try {
        doc.image(data.dealerLogoBuffer, ML, 18, { fit: [140, 52], align: "center", valign: "center" });
      } catch {
        doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE).text(data.dealerName, ML, 28, { width: CW / 2 });
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE).text(data.dealerName, ML, 28, { width: CW / 2 });
    }

    doc.font("Helvetica-Bold").fontSize(22).fillColor(WHITE)
      .text("FACTURA", ML + CW / 2, 30, { width: CW / 2, align: "right" });

    // ── NÚMERO Y FECHA ─────────────────────────────────────────────────────
    const labelW = 90;
    const y1 = 110;
    const y2 = 126;

    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY)
      .text("Nº FACTURA:", ML, y1, { width: labelW, lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK)
      .text(data.invoiceNumber, ML + labelW, y1, { width: CW - labelW, lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY)
      .text("FECHA:", ML, y2, { width: labelW, lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK)
      .text(data.date.toLocaleDateString("es-ES"), ML + labelW, y2, { width: CW - labelW, lineBreak: false });

    // ── PARTES ─────────────────────────────────────────────────────────────
    let y = y2 + 30;
    const colW = CW / 2 - 15;
    const rx = ML + CW / 2;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("EMISOR", ML, y);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("FACTURADO A", rx, y);
    y += 12;

    doc.moveTo(ML, y).lineTo(ML + colW, y).strokeColor(ORANGE).lineWidth(0.6).stroke();
    doc.moveTo(rx, y).lineTo(rx + colW, y).strokeColor(ORANGE).lineWidth(0.6).stroke();
    y += 8;

    let ly = y;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(data.dealerName, ML, ly, { width: colW });
    ly += 15;
    if (data.dealerNif) {
      doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(`NIF/CIF: ${data.dealerNif}`, ML, ly, { width: colW });
      ly += 13;
    }
    if (data.dealerAddress) {
      doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(data.dealerAddress, ML, ly, { width: colW });
      ly += 13;
    }
    if (data.dealerEmail) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.dealerEmail, ML, ly, { width: colW });
      ly += 13;
    }

    let ry2 = y;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(data.clientName, rx, ry2, { width: colW });
    ry2 += 15;
    if (data.clientNif) {
      doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(`NIF/DNI: ${data.clientNif}`, rx, ry2, { width: colW });
      ry2 += 13;
    }
    if (data.clientAddress) {
      doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(data.clientAddress, rx, ry2, { width: colW });
      ry2 += 13;
    }
    if (data.clientEmail) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.clientEmail, rx, ry2, { width: colW });
      ry2 += 13;
    }

    y = Math.max(ly, ry2) + 20;

    // ── VEHÍCULO ───────────────────────────────────────────────────────────
    doc.rect(ML, y, CW, 20).fillColor(TABLE_BG).fill();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text("VEHÍCULO", ML + 8, y + 6);
    y += 20;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 10;

    const vLabel = [data.vehicleBrand, data.vehicleModel].filter(Boolean).join(" ");
    doc.font("Helvetica").fontSize(10).fillColor(BLACK)
      .text(`${vLabel}  ·  Matrícula: ${data.vehiclePlate}`, ML + 8, y, { width: CW - 16 });
    y += 24;

    // ── TRABAJOS REALIZADOS ────────────────────────────────────────────────
    doc.rect(ML, y, CW, 20).fillColor(TABLE_BG).fill();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text("TRABAJOS REALIZADOS", ML + 8, y + 6);
    y += 20;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 10;

    if (data.budgetLines && data.budgetLines.length > 0) {
      // Line items table header
      doc.rect(ML, y, CW, 18).fillColor(NAVY).fill();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("CONCEPTO", ML + 8, y + 5, { width: 220 });
      doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("CANT.", ML + 238, y + 5, { width: 40, align: "right" });
      doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("P.U. (IVA inc.)", ML + 288, y + 5, { width: 70, align: "right" });
      doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("SUBTOTAL", ML + 368, y + 5, { width: CW - 368, align: "right" });
      y += 18;

      data.budgetLines.forEach((line, i) => {
        const subtotal = line.quantity * line.unit_price;
        if (i % 2 === 0) doc.rect(ML, y, CW, 18).fillColor("#f8f9fb").fill();
        doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(line.description, ML + 8, y + 4, { width: 220 });
        doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(String(line.quantity), ML + 238, y + 4, { width: 40, align: "right" });
        doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(`${line.unit_price.toFixed(2)} €`, ML + 288, y + 4, { width: 70, align: "right" });
        doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text(`${subtotal.toFixed(2)} €`, ML + 368, y + 4, { width: CW - 368, align: "right" });
        y += 18;
      });
      y += 8;
    }

    // Observaciones — siempre visibles si existen
    if (data.observations?.trim()) {
      if (data.budgetLines && data.budgetLines.length > 0) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY).text("OBSERVACIONES", ML + 8, y);
        y += 12;
      }
      const obsText = data.observations.trim();
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(obsText, ML + 8, y, { width: CW - 16 });
      y += doc.heightOfString(obsText, { width: CW - 16 }) + 12;
    } else if (!data.budgetLines || data.budgetLines.length === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("Sin observaciones registradas.", ML + 8, y, { width: CW - 16 });
      y += 20;
    }

    // ── RECOMENDACIONES ────────────────────────────────────────────────────
    if (data.recommendations?.trim()) {
      doc.rect(ML, y, CW, 20).fillColor(TABLE_BG).fill();
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text("RECOMENDACIONES", ML + 8, y + 6);
      y += 20;
      doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
      y += 10;

      doc.font("Helvetica").fontSize(10).fillColor(BLACK)
        .text(data.recommendations.trim(), ML + 8, y, { width: CW - 16 });
      y += doc.heightOfString(data.recommendations.trim(), { width: CW - 16 }) + 20;
    }

    // ── TOTALES ────────────────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 14;

    const labelX = ML + CW - 200;
    const amtX = ML + CW - 88;
    const amtW = 80;

    doc.font("Helvetica").fontSize(10).fillColor(GRAY)
      .text("Base imponible:", labelX, y, { width: 112, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK)
      .text(`${base.toFixed(2)} €`, amtX, y, { width: amtW, align: "right" });
    y += 16;

    doc.font("Helvetica").fontSize(10).fillColor(GRAY)
      .text("IVA 21%:", labelX, y, { width: 112, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK)
      .text(`${iva.toFixed(2)} €`, amtX, y, { width: amtW, align: "right" });
    y += 20;

    const boxX = labelX - 8;
    const boxW = ML + CW - boxX;
    doc.rect(boxX, y - 4, boxW, 28).fillColor(NAVY).fill();
    doc.font("Helvetica-Bold").fontSize(12).fillColor(WHITE)
      .text("TOTAL:", labelX, y + 4, { width: 112, align: "right" });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(WHITE)
      .text(`${data.totalAmount.toFixed(2)} €`, amtX, y + 4, { width: amtW, align: "right" });
    y += 44;

    doc.font("Helvetica").fontSize(8).fillColor(GRAY).text(
      "Operación sujeta a IVA según el artículo 75 de la Ley 37/1992 del Impuesto sobre el Valor Añadido.",
      ML, y, { width: CW, align: "center" }
    );

    // ── FOOTER ─────────────────────────────────────────────────────────────
    const footerY = 841.89 - ML - 30;
    doc.moveTo(ML, footerY).lineTo(ML + CW, footerY).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    doc.font("Helvetica").fontSize(9).fillColor(GRAY)
      .text("locksy.app", ML, footerY + 8, { width: CW, align: "center" });

    doc.end();
  });
}
