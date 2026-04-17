"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

interface ClientRow {
  id: string;
  client_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nif_cif: string | null;
  created_at: string;
  dealer_names: string[];
  is_manual: boolean;
}

export default function AdminClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [deleteClient, setDeleteClient] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/get-clients");
      const data = await res.json();
      setClients((data.clients as ClientRow[]) || []);
    } catch {
      setClients([]);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteClient) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const body = deleteClient.is_manual
        ? { contact_id: deleteClient.id }
        : { user_id: deleteClient.id };

      const res = await fetch("/api/admin/delete-client", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Error al eliminar cliente.");
      } else {
        setDeleteClient(null);
        fetchClients();
      }
    } catch {
      setDeleteError("Error de conexión.");
    }
    setDeleting(false);
  }

  const q = search.toLowerCase().trim();
  const filtered = q
    ? clients.filter(
        (c) =>
          `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.nif_cif || "").toLowerCase().includes(q) ||
          (c.dealer_names || []).some((n) => n.toLowerCase().includes(q))
      )
    : clients;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h1 className="heading text-2xl text-navy flex-1">CLIENTES</h1>
        <input
          type="text"
          placeholder="Buscar por nombre, email, teléfono, NIF o concesionario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border px-4 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 w-80"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          {search ? "No se encontraron resultados." : "No hay clientes registrados."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">NIF / CIF</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alta</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/clientes/${c.id}?type=${c.is_manual ? "manual" : "registered"}`)}
                >
                  <td className="px-5 py-4 font-medium text-foreground">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground">
                    <div>{c.email || "—"}</div>
                    {c.phone && <div className="text-muted-foreground text-xs">{c.phone}</div>}
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground">{c.nif_cif || "—"}</td>
                  <td className="px-5 py-4">
                    {c.is_manual ? (
                      <Badge variant="default">Manual</Badge>
                    ) : (
                      <Badge variant="success">Cuenta activa</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { setDeleteClient(c); setDeleteError(""); }}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky bottom count */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-border shadow-sm">
        <div className="py-3 px-8 lg:px-12 text-sm text-muted-foreground text-right">
          {clients.length} {clients.length === 1 ? "cliente registrado" : "clientes registrados"}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteClient}
        onClose={() => setDeleteClient(null)}
        title="ELIMINAR CLIENTE"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            ¿Estás seguro de que quieres eliminar a{" "}
            <strong>{deleteClient?.first_name} {deleteClient?.last_name}</strong>?{" "}
            {deleteClient?.is_manual
              ? "Este contacto fue creado manualmente. Se eliminarán también sus vehículos y citas asociadas."
              : "Esta acción eliminará su cuenta de usuario y no se puede deshacer."}
          </p>
          {deleteError && <p className="text-sm text-error">{deleteError}</p>}
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setDeleteClient(null)}>
              Cancelar
            </Button>
            <Button variant="danger" fullWidth onClick={handleDelete} loading={deleting}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
