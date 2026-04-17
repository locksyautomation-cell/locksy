import PDFDocument from "pdfkit";

export interface InvoiceData {
  // Emisor
  issuerName: string;
  issuerNif: string;
  issuerAddress: string;
  issuerEmail: string;
  // Destinatario
  recipientName: string;
  recipientNif: string;
  recipientAddress: string;
  recipientEmail: string;
  // Factura
  invoiceNumber: string;
  date: Date;
  concept: string;
  baseAmount: number; // base imponible en euros (sin IVA)
  ivaPercent: number; // 21
}

const NAVY = "#1a2e4a";
const ORANGE = "#e07b3a";
const GRAY = "#888888";
const LIGHT_GRAY = "#cccccc";
const BLACK = "#1a1a1a";
const WHITE = "#ffffff";
const TABLE_BG = "#f0f3f7";

const PAGE_W = 595.28;
const ML = 60; // left margin
const MR = 60; // right margin
const CW = PAGE_W - ML - MR; // 475.28

export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: ML, bottom: ML, left: ML, right: MR },
      info: {
        Title: `Factura ${data.invoiceNumber}`,
        Author: data.issuerName,
        Subject: data.concept,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const iva = data.baseAmount * (data.ivaPercent / 100);
    const total = data.baseAmount + iva;

    // ── CABECERA ───────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 88).fillColor(NAVY).fill();
    doc.rect(0, 88, PAGE_W, 5).fillColor(ORANGE).fill();

    // Marca "LOCKSY"
    doc
      .font("Helvetica-Bold")
      .fontSize(30)
      .fillColor(WHITE)
      .text("LOCKSY", ML, 24, { width: CW / 2 });

    // Texto "FACTURA" alineado a la derecha
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(WHITE)
      .text("FACTURA", ML + CW / 2, 30, { width: CW / 2, align: "right" });

    // ── NÚMERO Y FECHA ─────────────────────────────────────────────────────
    const labelW = 90;
    const y1 = 110;
    const y2 = 144; // 0.5 cm (≈14 pt) below y1 row

    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY)
       .text("Nº FACTURA:", ML, y1, { width: labelW, lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK)
       .text(data.invoiceNumber, ML + labelW, y1, { width: CW - labelW, lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY)
       .text("FECHA:", ML, y2, { width: labelW, lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK)
       .text(data.date.toLocaleDateString("es-ES"), ML + labelW, y2, { width: CW - labelW, lineBreak: false });

    // ── PARTES (dos columnas) ──────────────────────────────────────────────
    let y = y2 + 36;
    const colW = CW / 2 - 15;
    const rx = ML + CW / 2; // x inicio columna derecha

    // — Emisor —
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("EMISOR", ML, y);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("FACTURADO A", rx, y);

    y += 12;
    doc
      .moveTo(ML, y)
      .lineTo(ML + colW, y)
      .strokeColor(ORANGE)
      .lineWidth(0.6)
      .stroke();
    doc
      .moveTo(rx, y)
      .lineTo(rx + colW, y)
      .strokeColor(ORANGE)
      .lineWidth(0.6)
      .stroke();
    y += 8;

    // Columna izquierda: emisor
    let ly = y;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(data.issuerName, ML, ly, { width: colW });
    ly += 15;
    doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(`NIF/CIF: ${data.issuerNif}`, ML, ly, { width: colW });
    ly += 13;
    doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(data.issuerAddress, ML, ly, { width: colW });
    ly += 13;
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.issuerEmail, ML, ly, { width: colW });
    ly += 13;

    // Columna derecha: destinatario
    let ry2 = y;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(data.recipientName, rx, ry2, { width: colW });
    ry2 += 15;
    doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(`NIF/CIF: ${data.recipientNif}`, rx, ry2, { width: colW });
    ry2 += 13;
    doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(data.recipientAddress, rx, ry2, { width: colW });
    ry2 += 13;
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.recipientEmail, rx, ry2, { width: colW });
    ry2 += 13;

    y = Math.max(ly, ry2) + 28;

    // ── TABLA DE CONCEPTOS ─────────────────────────────────────────────────
    // Cabecera de tabla
    doc.rect(ML, y, CW, 22).fillColor(TABLE_BG).fill();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text("CONCEPTO", ML + 8, y + 6, { width: CW - 100 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text("IMPORTE", ML + CW - 88, y + 6, { width: 80, align: "right" });
    y += 22;

    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 14;

    // Fila de concepto
    doc.font("Helvetica").fontSize(11).fillColor(BLACK).text(data.concept, ML + 8, y, { width: CW - 100 });
    doc.font("Helvetica").fontSize(11).fillColor(BLACK).text(`${data.baseAmount.toFixed(2)} €`, ML + CW - 88, y, { width: 80, align: "right" });
    y += 28;

    // ── TOTALES ────────────────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 14;

    const labelX = ML + CW - 200;
    const amtX = ML + CW - 88;
    const amtW = 80;

    doc.font("Helvetica").fontSize(10).fillColor(GRAY).text("Base imponible:", labelX, y, { width: 112, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(`${data.baseAmount.toFixed(2)} €`, amtX, y, { width: amtW, align: "right" });
    y += 16;

    doc.font("Helvetica").fontSize(10).fillColor(GRAY).text(`IVA ${data.ivaPercent}%:`, labelX, y, { width: 112, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(`${iva.toFixed(2)} €`, amtX, y, { width: amtW, align: "right" });
    y += 20;

    // Caja TOTAL
    const boxX = labelX - 8;
    const boxW = ML + CW - boxX;
    doc.rect(boxX, y - 4, boxW, 28).fillColor(NAVY).fill();
    doc.font("Helvetica-Bold").fontSize(12).fillColor(WHITE).text("TOTAL:", labelX, y + 4, { width: 112, align: "right" });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(WHITE).text(`${total.toFixed(2)} €`, amtX, y + 4, { width: amtW, align: "right" });
    y += 44;

    // ── NOTA DE PIE ────────────────────────────────────────────────────────
    if (data.ivaPercent > 0) {
      doc.font("Helvetica").fontSize(8).fillColor(GRAY)
        .text(
          "Operación sujeta a IVA según el artículo 75 de la Ley 37/1992 del Impuesto sobre el Valor Añadido.",
          ML, y, { width: CW, align: "center" }
        );
    }

    // ── FOOTER — anclado dentro del área útil (bottom margin = 60pt) ────────
    // PAGE_H(841.89) - ML(60) - 30 = 751.89 → queda bien dentro del límite
    const footerY = 841.89 - ML - 30;
    doc.moveTo(ML, footerY).lineTo(ML + CW, footerY).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("locksy.app", ML, footerY + 8, { width: CW, align: "center" });

    doc.end();
  });
}
