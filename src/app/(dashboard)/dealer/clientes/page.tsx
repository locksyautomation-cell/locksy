"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";

interface DealerContact {
  id: string;
  client_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  nif_cif: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  vehicles_added: number;
  errors: string[];
}

const CSV_COLUMNS = [
  { col: "first_name", req: true, desc: "Nombre" },
  { col: "last_name", req: false, desc: "Apellidos" },
  { col: "email", req: false, desc: "Email (se usa para evitar duplicados)" },
  { col: "phone", req: false, desc: "Teléfono (se usa para evitar duplicados)" },
  { col: "nif_cif", req: false, desc: "DNI / CIF" },
  { col: "address", req: false, desc: "Dirección completa" },
  { col: "notes", req: false, desc: "Notas internas" },
  { col: "vehicle_brand", req: false, desc: "Marca del vehículo" },
  { col: "vehicle_model", req: false, desc: "Modelo del vehículo" },
  { col: "vehicle_plate", req: false, desc: "Matrícula (obligatorio para guardar el vehículo)" },
  { col: "vehicle_chassis", req: false, desc: "Número de chasis (máx 17 caracteres)" },
  { col: "vehicle_registration_date", req: false, desc: "Fecha de matriculación (YYYY-MM-DD)" },
];

const CSV_EXAMPLE =
  `first_name,last_name,email,phone,nif_cif,address,notes,vehicle_brand,vehicle_model,vehicle_plate,vehicle_chassis,vehicle_registration_date
Juan,Garcia Lopez,juan@email.com,612345678,12345678A,"Calle Mayor 1, Madrid",Cliente VIP,Toyota,Corolla,1234ABC,VIN12345678901234,2020-03-15
Maria,Sanchez,maria@email.com,698765432,87654321B,,Descuento habitual,Seat,Ibiza,5678XYZ,,2022-06-01
Pedro,Ruiz Gomez,pedro@email.com,611222333,33445566C,"Avenida del Mar 5, Valencia",,Ford,Focus,9012DEF,,2021-07-20`;

// ── Client-side CSV parser ──────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): { rows: Record<string, string>[]; error?: string } {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "El archivo está vacío o no tiene filas de datos." };
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  if (!headers.includes("first_name")) {
    return { rows: [], error: "No se encontró la columna 'first_name'. Revisa que la primera fila sea la cabecera." };
  }
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    rows.push(row);
  }
  return { rows };
}

function downloadTemplate() {
  const blob = new Blob([CSV_EXAMPLE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_clientes_locksy.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function DealerClientesPage() {
  const [contacts, setContacts] = useState<DealerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchContacts(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fetch("/api/dealer/get-contacts");
      const d = await r.json();
      setContacts(d.contacts || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchContacts(); }, []);

  function openImport() {
    setSelectedFile(null);
    setImportResult(null);
    setImportError("");
    setShowFormat(false);
    setShowImport(true);
  }

  function closeImport() {
    setShowImport(false);
    if (importResult && importResult.created > 0) {
      fetchContacts(true);
    }
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      // Parse CSV client-side to avoid FormData/encoding issues
      const text = await selectedFile.text();
      const { rows, error: parseError } = parseCSV(text);

      if (parseError) {
        setImportError(parseError);
        setImporting(false);
        return;
      }

      if (rows.length === 0) {
        setImportError("El archivo no contiene filas de datos.");
        setImporting(false);
        return;
      }

      const res = await fetch("/api/dealer/import-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Error al importar.");
      } else {
        setImportResult(data);
      }
    } catch {
      setImportError("Error de conexión.");
    }
    setImporting(false);
  }

  const q = search.toLowerCase().trim();
  const filtered = q
    ? contacts.filter((c) =>
        `${c.first_name} ${c.last_name || ""}`.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.nif_cif || "").toLowerCase().includes(q)
      )
    : contacts;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading text-2xl text-navy">CLIENTES</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openImport}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar CSV
          </button>
          <button
            onClick={() => fetchContacts(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <div className="mb-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono o NIF..."
          className="max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          {search ? "No se encontraron resultados." : "No hay clientes registrados aún."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((contact) => (
            <Link key={contact.id} href={`/dealer/clientes/${contact.id}`}>
              <Card className="hover:border-navy/30 transition-colors cursor-pointer mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {contact.first_name} {contact.last_name || ""}
                      </h3>
                      {contact.client_id ? (
                        <Badge variant="success">Cuenta activa</Badge>
                      ) : (
                        <Badge variant="default">Manual</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[contact.email, contact.phone].filter(Boolean).join(" · ") || "Sin contacto"}
                    </p>
                    {contact.nif_cif && (
                      <p className="text-xs text-muted-foreground mt-0.5">{contact.nif_cif}</p>
                    )}
                  </div>
                  <svg className="h-5 w-5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Sticky bottom count */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 z-10 bg-white border-t border-border shadow-sm">
        <div className="py-3 px-8 lg:px-12 text-sm text-muted-foreground text-right">
          {contacts.length} {contacts.length === 1 ? "cliente registrado" : "clientes registrados"}
        </div>
      </div>

      {/* ── Import Modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="heading text-lg text-navy">IMPORTAR CLIENTES</h2>
              <button onClick={closeImport} className="text-muted-foreground hover:text-foreground">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Format explanation toggle */}
              <div className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setShowFormat((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ¿Qué debe incluir el CSV?
                  </span>
                  <svg className={`h-4 w-4 transition-transform ${showFormat ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showFormat && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground pt-3">
                      El archivo debe ser <strong>.csv</strong> con la primera fila como cabecera. Los separadores deben ser <strong>comas</strong>. Para campos que contengan comas, rodéalos con comillas dobles.
                    </p>

                    {/* Columns table */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-navy text-white">
                            <th className="px-3 py-2 text-left font-semibold">Columna</th>
                            <th className="px-3 py-2 text-left font-semibold">Obligatorio</th>
                            <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CSV_COLUMNS.map((c, i) => (
                            <tr key={c.col} className={i % 2 === 0 ? "bg-white" : "bg-muted/40"}>
                              <td className="px-3 py-2 font-mono text-navy">{c.col}</td>
                              <td className="px-3 py-2">
                                {c.req
                                  ? <span className="text-error font-semibold">Sí</span>
                                  : <span className="text-muted-foreground">No</span>}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{c.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p><strong className="text-foreground">Vehículos:</strong> para guardar un vehículo necesitas <span className="font-mono">vehicle_brand</span>, <span className="font-mono">vehicle_model</span> y <span className="font-mono">vehicle_plate</span>. Si un cliente tiene varios vehículos, repite su fila con distintos datos de vehículo — el sistema lo reconoce por email o teléfono y no crea duplicados.</p>
                      <p><strong className="text-foreground">Duplicados:</strong> si un cliente ya existe (mismo email o teléfono), se omite la creación del contacto pero se añade el vehículo si es nuevo.</p>
                    </div>

                    {/* Download template */}
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 text-xs text-orange hover:text-orange-dark font-medium"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar plantilla de ejemplo (.csv)
                    </button>
                  </div>
                )}
              </div>

              {/* File picker */}
              {!importResult && (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      setSelectedFile(e.target.files?.[0] ?? null);
                      setImportError("");
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-border hover:border-navy/40 transition-colors py-8 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {selectedFile ? (
                      <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="text-sm font-medium">Haz clic para seleccionar el archivo</span>
                        <span className="text-xs">Solo archivos .csv</span>
                      </>
                    )}
                  </button>

                  {importError && (
                    <p className="mt-2 text-sm text-error">{importError}</p>
                  )}
                </div>
              )}

              {/* Results */}
              {importResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
                      <p className="text-xs text-green-600 mt-0.5">Contactos nuevos</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{importResult.vehicles_added}</p>
                      <p className="text-xs text-blue-600 mt-0.5">Vehículos añadidos</p>
                    </div>
                    <div className="rounded-lg bg-muted border border-border p-3 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{importResult.skipped}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Duplicados omitidos</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="rounded-lg border border-orange/30 bg-orange/5 p-3">
                      <p className="text-xs font-semibold text-orange mb-2">
                        {importResult.errors.length} {importResult.errors.length === 1 ? "advertencia" : "advertencias"}
                      </p>
                      <ul className="space-y-1">
                        {importResult.errors.map((e, i) => (
                          <li key={i} className="text-xs text-muted-foreground">· {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={closeImport}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {importResult ? "Cerrar" : "Cancelar"}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing && (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {importing ? "Importando..." : "Importar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
