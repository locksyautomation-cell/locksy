import PDFDocument from "pdfkit";

export interface RepairOrderData {
  // Dealership
  dealershipName: string;
  dealershipNif: string | null;
  dealershipAddress: string | null;
  dealershipLogoBuffer: Buffer | null;
  // Appointment
  locator: string;
  keyCode: string;
  scheduledDate: string; // "DD/MM/YYYY"
  scheduledTime: string;
  // Client
  clientName: string;
  clientNif: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  // Vehicle
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleChassis: string | null;
  // Repairs
  description: string | null;
  observations: string | null;
  // Mileage entered by client at signing
  vehicleKm: number | null;
  // Signature timestamps (shown as acceptance marks in the PDF)
  pickupSignedAt: string | null;
  returnSignedAt: string | null;
}

const NAVY = "#1a2e4a";
const ORANGE = "#e07b3a";
const GRAY = "#888888";
const LIGHT_GRAY = "#cccccc";
const BLACK = "#1a1a1a";
const WHITE = "#ffffff";
const TABLE_BG = "#f0f3f7";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 60;
const MR = 60;
const CW = PAGE_W - ML - MR; // 475.28

export function generateRepairOrderPDF(data: RepairOrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: ML, bottom: ML, left: ML, right: MR },
      info: {
        Title: `Orden de Reparación ${data.locator}`,
        Author: data.dealershipName,
        Subject: "Orden de Reparación",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── CABECERA ────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 88).fillColor(NAVY).fill();
    doc.rect(0, 88, PAGE_W, 5).fillColor(ORANGE).fill();

    // Logo o nombre del concesionario
    if (data.dealershipLogoBuffer) {
      try {
        doc.image(data.dealershipLogoBuffer, ML, 18, { fit: [140, 52], align: "center", valign: "center" });
      } catch {
        doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE).text(data.dealershipName, ML, 28, { width: CW / 2 });
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE).text(data.dealershipName, ML, 28, { width: CW / 2 });
    }

    // "ORDEN DE REPARACIÓN" en cabecera
    doc.font("Helvetica-Bold").fontSize(16).fillColor(WHITE)
      .text("ORDEN DE REPARACIÓN", ML + CW / 2, 20, { width: CW / 2, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(ORANGE)
      .text(data.locator, ML + CW / 2, 42, { width: CW / 2, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#aabbcc")
      .text(`${data.scheduledDate}  ·  ${data.scheduledTime}`, ML + CW / 2, 58, { width: CW / 2, align: "right" });

    // ── DATOS CONCESIONARIO Y CLIENTE (dos columnas) ──────────────────────
    let y = 110;
    const colW = CW / 2 - 15;
    const rx = ML + CW / 2;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("CONCESIONARIO", ML, y);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("CLIENTE", rx, y);

    y += 12;
    doc.moveTo(ML, y).lineTo(ML + colW, y).strokeColor(ORANGE).lineWidth(0.6).stroke();
    doc.moveTo(rx, y).lineTo(rx + colW, y).strokeColor(ORANGE).lineWidth(0.6).stroke();
    y += 8;

    // Columna izquierda: concesionario
    let ly = y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text(data.dealershipName, ML, ly, { width: colW });
    ly += 14;
    if (data.dealershipNif) {
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(`NIF/CIF: ${data.dealershipNif}`, ML, ly, { width: colW });
      ly += 12;
    }
    if (data.dealershipAddress) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.dealershipAddress, ML, ly, { width: colW });
      ly += 12;
    }

    // Columna derecha: cliente
    let ry2 = y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text(data.clientName, rx, ry2, { width: colW });
    ry2 += 14;
    if (data.clientNif) {
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(`NIF: ${data.clientNif}`, rx, ry2, { width: colW });
      ry2 += 12;
    }
    if (data.clientPhone) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.clientPhone, rx, ry2, { width: colW });
      ry2 += 12;
    }
    if (data.clientEmail) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.clientEmail, rx, ry2, { width: colW });
      ry2 += 12;
    }
    if (data.clientAddress) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.clientAddress, rx, ry2, { width: colW });
      ry2 += 12;
    }

    y = Math.max(ly, ry2) + 20;

    // ── DATOS DEL VEHÍCULO ────────────────────────────────────────────────
    doc.rect(ML, y, CW, 22).fillColor(TABLE_BG).fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY)
      .text("VEHÍCULO", ML + 8, y + 7);
    y += 22;

    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 10;

    const vehicleText = [
      `${data.vehicleBrand} ${data.vehicleModel}`.trim(),
      data.vehiclePlate ? `Matrícula: ${data.vehiclePlate}` : null,
      data.vehicleChassis ? `Bastidor: ${data.vehicleChassis}` : null,
      data.vehicleKm != null ? `Km: ${data.vehicleKm.toLocaleString("es-ES")}` : null,
    ].filter(Boolean).join("   ·   ");

    doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(vehicleText, ML + 8, y, { width: CW - 16 });
    y += 28;

    // ── REPARACIONES A REALIZAR ──────────────────────────────────────────
    doc.rect(ML, y, CW, 22).fillColor(TABLE_BG).fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY)
      .text("REPARACIONES A REALIZAR", ML + 8, y + 7);
    y += 22;

    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 10;

    const repairText = [data.description, data.observations].filter(Boolean).join("\n\n");
    if (repairText) {
      doc.font("Helvetica").fontSize(10).fillColor(BLACK).text(repairText, ML + 8, y, { width: CW - 16 });
      y = doc.y + 20;
    } else {
      doc.font("Helvetica").fontSize(10).fillColor(GRAY).text("—", ML + 8, y, { width: CW - 16 });
      y += 28;
    }

    // ── CÓDIGO DE LLAVES ─────────────────────────────────────────────────
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    y += 12;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY)
      .text("Código de llaves: ", ML + 8, y, { continued: true });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(ORANGE)
      .text(data.keyCode, { lineBreak: false });
    y += 28;

    // ── BLOQUES DE FIRMA ─────────────────────────────────────────────────
    // Ensure we have room for the signature blocks (at least 130pt)
    const footerY = PAGE_H - ML - 30;
    const sigBlockH = 110;
    if (y + sigBlockH > footerY - 10) {
      doc.addPage();
      y = ML;
    }

    const sigColW = CW / 2 - 10;
    const sigRx = ML + CW / 2 + 10;

    const formatSigDate = (iso: string) =>
      new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

    // Left block: key pickup
    const pickupBorder = data.pickupSignedAt ? "#16a34a" : LIGHT_GRAY;
    doc.rect(ML, y, sigColW, sigBlockH).strokeColor(pickupBorder).lineWidth(data.pickupSignedAt ? 1 : 0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE)
      .text("FIRMA — ENTREGA DE LLAVES", ML + 8, y + 8, { width: sigColW - 16 });
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text("El cliente autoriza las reparaciones indicadas.", ML + 8, y + 22, { width: sigColW - 16 });
    if (data.pickupSignedAt) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#16a34a")
        .text(`✓ Aceptado`, ML + 8, y + 44, { width: sigColW - 16 });
      doc.font("Helvetica").fontSize(8).fillColor("#16a34a")
        .text(formatSigDate(data.pickupSignedAt), ML + 8, y + 58, { width: sigColW - 16 });
    } else {
      doc.moveTo(ML + 10, y + sigBlockH - 28)
        .lineTo(ML + sigColW - 10, y + sigBlockH - 28)
        .strokeColor(LIGHT_GRAY).lineWidth(0.8).stroke();
      doc.font("Helvetica").fontSize(7).fillColor(GRAY)
        .text("Firma y fecha", ML + 10, y + sigBlockH - 18, { width: sigColW - 20 });
    }

    // Right block: key return
    const returnBorder = data.returnSignedAt ? "#16a34a" : LIGHT_GRAY;
    doc.rect(sigRx, y, sigColW, sigBlockH).strokeColor(returnBorder).lineWidth(data.returnSignedAt ? 1 : 0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE)
      .text("FIRMA — RECOGIDA DEL VEHÍCULO", sigRx + 8, y + 8, { width: sigColW - 16 });
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text("El cliente acepta el trabajo realizado.", sigRx + 8, y + 22, { width: sigColW - 16 });
    if (data.returnSignedAt) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#16a34a")
        .text(`✓ Aceptado`, sigRx + 8, y + 44, { width: sigColW - 16 });
      doc.font("Helvetica").fontSize(8).fillColor("#16a34a")
        .text(formatSigDate(data.returnSignedAt), sigRx + 8, y + 58, { width: sigColW - 16 });
    } else {
      doc.moveTo(sigRx + 10, y + sigBlockH - 28)
        .lineTo(sigRx + sigColW - 10, y + sigBlockH - 28)
        .strokeColor(LIGHT_GRAY).lineWidth(0.8).stroke();
      doc.font("Helvetica").fontSize(7).fillColor(GRAY)
        .text("Firma y fecha", sigRx + 10, y + sigBlockH - 18, { width: sigColW - 20 });
    }

    // ── FOOTER ────────────────────────────────────────────────────────────
    doc.moveTo(ML, footerY).lineTo(ML + CW, footerY).strokeColor(LIGHT_GRAY).lineWidth(0.4).stroke();
    doc.font("Helvetica").fontSize(9).fillColor(GRAY)
      .text("locksy.app", ML, footerY + 8, { width: CW, align: "center" });

    doc.end();
  });
}
