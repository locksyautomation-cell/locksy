"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { Dealership } from "@/lib/types";

export default function AdminDealershipsPage() {
  const supabase = createClient();

  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    dealer_email: "",
    dealer_password: "",
  });

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("dealerships")
        .select("*")
        .order("created_at", { ascending: false });

      setDealerships((data as Dealership[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleCreate() {
    setSaving(true);

    try {
      // Create dealer user via admin API
      const res = await fetch("/api/admin/create-dealership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug: generateSlug(form.name),
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setForm({
          name: "",
          company_name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          postal_code: "",
          dealer_email: "",
          dealer_password: "",
        });
        // Refresh
        window.location.reload();
      }
    } catch {
      alert("Error al crear el concesionario.");
    }

    setSaving(false);
  }

  async function toggleActive(dealership: Dealership) {
    await supabase
      .from("dealerships")
      .update({ active: !dealership.active })
      .eq("id", dealership.id);

    setDealerships((prev) =>
      prev.map((d) =>
        d.id === dealership.id ? { ...d, active: !d.active } : d
      )
    );
  }

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
        <h1 className="heading text-2xl text-navy">CONCESIONARIOS</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          Crear Concesionario
        </Button>
      </div>

      {dealerships.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No hay concesionarios registrados.
        </p>
      ) : (
        <div className="space-y-4">
          {dealerships.map((d) => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{d.name}</h3>
                    <Badge variant={d.active ? "success" : "error"}>
                      {d.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {d.email} | {d.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Slug: {d.slug}
                  </p>
                </div>
                <Button
                  variant={d.active ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => toggleActive(d)}
                >
                  {d.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="CREAR CONCESIONARIO"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Datos del concesionario
          </h3>
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />
          <Input
            label="Empresa"
            value={form.company_name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, company_name: e.target.value }))
            }
          />
          <Input
            label="Email del concesionario"
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            required
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, address: e.target.value }))
            }
          />

          <hr className="border-border" />
          <h3 className="text-sm font-semibold text-muted-foreground">
            Cuenta del dealer
          </h3>
          <Input
            label="Email de acceso"
            type="email"
            value={form.dealer_email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dealer_email: e.target.value }))
            }
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={form.dealer_password}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dealer_password: e.target.value }))
            }
            required
          />

          <div className="flex gap-4 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleCreate}
              loading={saving}
              disabled={!form.name || !form.email || !form.dealer_email}
            >
              Crear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
