import PDFDocument from "pdfkit";

export interface BudgetLine {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface BudgetPDFData {
  dealershipName: string;
  dealershipNif: string | null;
  dealershipAddress: string | null;
  dealershipLogoBuffer: Buffer | null;
  locator: string;
  scheduledDate: string;
  clientName: string;
  clientNif: string | null;
  clientPhone: string | null;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleChassis: string | null;
  description: string | null;
  lines: BudgetLine[];
  ivaPercent: number;
  validityDays: number;
  // Firma digital del cliente (presente solo si ya fue aceptado)
  signedAt?: string | null;
  signedIp?: string | null;
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

function euro(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function generateBudgetPDF(data: BudgetPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: ML, bottom: ML, left: ML, right: MR },
      info: {
        Title: `Presupuesto ${data.locator}`,
        Author: data.dealershipName,
        Subject: "Presupuesto de reparación",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── CABECERA ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 88).fillColor(NAVY).fill();
    doc.rect(0, 88, PAGE_W, 5).fillColor(ORANGE).fill();

    if (data.dealershipLogoBuffer) {
      try {
        doc.image(data.dealershipLogoBuffer, ML, 18, { fit: [140, 52], align: "center", valign: "center" });
      } catch {
        doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE).text(data.dealershipName, ML, 28, { width: CW / 2 });
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(18).fillColor(WHITE).text(data.dealershipName, ML, 28, { width: CW / 2 });
    }

    doc.font("Helvetica-Bold").fontSize(16).fillColor(WHITE)
      .text("PRESUPUESTO", ML + CW / 2, 20, { width: CW / 2, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(ORANGE)
      .text(data.locator, ML + CW / 2, 42, { width: CW / 2, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#aabbcc")
      .text(data.scheduledDate, ML + CW / 2, 58, { width: CW / 2, align: "right" });

    // ── DATOS CONCESIONARIO Y CLIENTE ──────────────────────────────────────
    let y = 110;
    const colW = CW / 2 - 15;
    const rx = ML + CW / 2;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("TALLER", ML, y);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("CLIENTE", rx, y);
    y += 12;
    doc.moveTo(ML, y).lineTo(ML + colW, y).strokeColor(ORANGE).lineWidth(0.6).stroke();
    doc.moveTo(rx, y).lineTo(rx + colW, y).strokeColor(ORANGE).lineWidth(0.6).stroke();
    y += 8;

    let ly = y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text(data.dealershipName, ML, ly, { width: colW });
    ly += 14;
    if (data.dealershipNif) {
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(`NIF/CIF: ${data.dealershipNif}`, ML, ly, { width: colW }); ly += 12;
    }
    if (data.dealershipAddress) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.dealershipAddress, ML, ly, { width: colW }); ly += 12;
    }

    let ry2 = y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY).text(data.clientName, rx, ry2, { width: colW });
    ry2 += 14;
    if (data.clientNif) {
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(`NIF/DNI: ${data.clientNif}`, rx, ry2, { width: colW }); ry2 += 12;
    }
    if (data.clientPhone) {
      doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(data.clientPhone, rx, ry2, { width: colW }); ry2 += 12;
    }

    y = Math.max(ly, ry2) + 20;

    // ── DATOS DEL VEHÍCULO ──────────────────────────────────────────────────
    doc.rect(ML, y, CW, 22).fillColor(TABLE_BG).fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("VEHÍCULO", ML + 10, y + 7);
    y += 22;

    const vCols = CW / 4;
    const vehicleData = [
      { label: "MARCA", value: data.vehicleBrand },
      { label: "MODELO", value: data.vehicleModel },
      { label: "MATRÍCULA", value: data.vehiclePlate },
      { label: "BASTIDOR", value: data.vehicleChassis || "—" },
    ];
    vehicleData.forEach((item, i) => {
      const x = ML + i * vCols;
      doc.font("Helvetica").fontSize(8).fillColor(GRAY).text(item.label, x, y, { width: vCols });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK).text(item.value, x, y + 11, { width: vCols });
    });
    y += 36;

    // ── DESCRIPCIÓN DE LA AVERÍA ────────────────────────────────────────────
    if (data.description) {
      doc.rect(ML, y, CW, 22).fillColor(TABLE_BG).fill();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE).text("DESCRIPCIÓN DE LA AVERÍA", ML + 10, y + 7);
      y += 30;
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(data.description, ML, y, { width: CW });
      y += doc.heightOfString(data.description, { width: CW }) + 16;
    }

    // ── TABLA DE CONCEPTOS ──────────────────────────────────────────────────
    doc.rect(ML, y, CW, 22).fillColor(NAVY).fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("CONCEPTO / DESCRIPCIÓN", ML + 8, y + 7, { width: 220 });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("CANT.", ML + 238, y + 7, { width: 40, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("P.U. (IVA inc.)", ML + 288, y + 7, { width: 70, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE).text("SUBTOTAL", ML + 368, y + 7, { width: CW - 368, align: "right" });
    y += 22;

    let baseTotal = 0;
    data.lines.forEach((line, i) => {
      const subtotal = line.quantity * line.unit_price;
      baseTotal += subtotal;
      if (i % 2 === 0) {
        doc.rect(ML, y, CW, 20).fillColor("#f8f9fb").fill();
      }
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(line.description, ML + 8, y + 5, { width: 220 });
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(String(line.quantity), ML + 238, y + 5, { width: 40, align: "right" });
      doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(euro(line.unit_price), ML + 288, y + 5, { width: 70, align: "right" });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text(euro(subtotal), ML + 368, y + 5, { width: CW - 368, align: "right" });
      y += 20;
    });

    // Separador
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke();
    y += 10;

    // ── TOTALES — precios con IVA incluido ────────────────────────────────────
    const totalWithIva = baseTotal;
    const ivaAmount = totalWithIva - totalWithIva / (1 + data.ivaPercent / 100);
    const totalsX = ML + CW / 2;
    const totalsW = CW / 2;

    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text("BASE IMPONIBLE", totalsX, y, { width: totalsW - 80 });
    doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(euro(totalWithIva - ivaAmount), totalsX + totalsW - 80, y, { width: 80, align: "right" });
    y += 14;

    doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(`IVA (${data.ivaPercent}%)`, totalsX, y, { width: totalsW - 80 });
    doc.font("Helvetica").fontSize(9).fillColor(BLACK).text(euro(ivaAmount), totalsX + totalsW - 80, y, { width: 80, align: "right" });
    y += 10;

    doc.rect(totalsX, y, totalsW, 26).fillColor(NAVY).fill();
    doc.font("Helvetica-Bold").fontSize(11).fillColor(WHITE).text("TOTAL", totalsX + 10, y + 7, { width: totalsW - 90 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(ORANGE).text(euro(totalWithIva), totalsX + 10, y + 7, { width: totalsW - 20, align: "right" });
    y += 36;

    // ── VALIDEZ ──────────────────────────────────────────────────────────────
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + data.validityDays);
    const validStr = validUntil.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text(`Este presupuesto tiene una validez de ${data.validityDays} días (hasta el ${validStr}).`, ML, y, { width: CW });
    y += 20;

    // ── GARANTÍA LEGAL ────────────────────────────────────────────────────────
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text("La reparación cuenta con garantía mínima de 3 meses o 2.000 km según el Art. 16 del RD 1457/1986.", ML, y, { width: CW });
    y += 20;

    // ── FIRMA DEL CLIENTE ────────────────────────────────────────────────────
    y += 10;
    doc.rect(ML, y, CW, 1).fillColor(LIGHT_GRAY).fill();
    y += 12;

    const sigColW = CW / 2 - 10;
    const sigRx = ML + sigColW + 20;
    const sigBlockH = 90;

    const formatSigDate = (iso: string) =>
      new Date(iso).toLocaleDateString("es-ES", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

    // Bloque izquierdo — firma del taller (siempre en blanco)
    doc.rect(ML, y, sigColW, sigBlockH).strokeColor(LIGHT_GRAY).lineWidth(0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE)
      .text("FIRMA DEL TALLER", ML + 8, y + 8, { width: sigColW - 16 });
    doc.moveTo(ML + 10, y + sigBlockH - 28)
      .lineTo(ML + sigColW - 10, y + sigBlockH - 28)
      .strokeColor(LIGHT_GRAY).lineWidth(0.8).stroke();
    doc.font("Helvetica").fontSize(7).fillColor(GRAY)
      .text("Firma y sello del taller", ML + 10, y + sigBlockH - 18, { width: sigColW - 20 });

    // Bloque derecho — conformidad del cliente
    const clientBorder = data.signedAt ? "#16a34a" : LIGHT_GRAY;
    doc.rect(sigRx, y, sigColW, sigBlockH).strokeColor(clientBorder).lineWidth(data.signedAt ? 1 : 0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ORANGE)
      .text("CONFORMIDAD DEL CLIENTE", sigRx + 8, y + 8, { width: sigColW - 16 });

    if (data.signedAt) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#16a34a")
        .text("✓ ACEPTADO DIGITALMENTE", sigRx + 8, y + 24, { width: sigColW - 16 });
      doc.font("Helvetica").fontSize(8).fillColor("#16a34a")
        .text(`Fecha: ${formatSigDate(data.signedAt)}`, sigRx + 8, y + 38, { width: sigColW - 16 });
      if (data.signedIp) {
        doc.font("Helvetica").fontSize(7).fillColor(GRAY)
          .text(`IP: ${data.signedIp}`, sigRx + 8, y + 52, { width: sigColW - 16 });
      }
      doc.font("Helvetica").fontSize(7).fillColor(GRAY)
        .text("Aceptación telemática con fuerza probatoria (Art. 3 Reglamento eIDAS).", sigRx + 8, y + 65, { width: sigColW - 16 });
    } else {
      doc.moveTo(sigRx + 10, y + sigBlockH - 28)
        .lineTo(sigRx + sigColW - 10, y + sigBlockH - 28)
        .strokeColor(LIGHT_GRAY).lineWidth(0.8).stroke();
      doc.font("Helvetica").fontSize(7).fillColor(GRAY)
        .text("Nombre, firma y fecha", sigRx + 10, y + sigBlockH - 18, { width: sigColW - 20 });
    }

    y += sigBlockH + 8;

    // ── PIE ───────────────────────────────────────────────────────────────────
    doc.rect(0, PAGE_W - 30, PAGE_W, 30);
    doc.font("Helvetica").fontSize(7).fillColor(GRAY)
      .text("Documento generado por LOCKSY · locksy-at.es", ML, 815, { width: CW, align: "center" });

    doc.end();
  });
}
