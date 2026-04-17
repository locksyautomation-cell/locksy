"use client";

import { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type { User, Dealership } from "@/lib/types";

export default function DealerProfilePage() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Dealership>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setUser(userData as User);

      const { data: dealershipData } = await supabase
        .from("dealerships")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      setDealership(dealershipData as Dealership);
      setEditForm(dealershipData as Dealership);
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  async function handleSave() {
    if (!dealership) return;
    setSaving(true);

    await supabase
      .from("dealerships")
      .update({
        name: editForm.name,
        company_name: editForm.company_name,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        postal_code: editForm.postal_code,
      })
      .eq("id", dealership.id);

    setDealership({ ...dealership, ...editForm } as Dealership);
    setEditing(false);
    setSaving(false);
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
      <h1 className="heading text-2xl text-navy mb-6">MI PERFIL</h1>

      <Card className="mb-6">
        <h2 className="heading text-lg text-navy mb-4">
          INFORMACIÓN DEL CONCESIONARIO
        </h2>
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={editing ? editForm.name || "" : dealership?.name || ""}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, name: e.target.value }))
            }
            disabled={!editing}
          />
          <Input
            label="Empresa"
            value={
              editing
                ? editForm.company_name || ""
                : dealership?.company_name || ""
            }
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                company_name: e.target.value,
              }))
            }
            disabled={!editing}
          />
          <Input
            label="Correo electrónico"
            value={dealership?.email || ""}
            disabled
          />
          <Input
            label="Teléfono"
            value={editing ? editForm.phone || "" : dealership?.phone || ""}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            disabled={!editing}
          />
          <Input
            label="Dirección"
            value={
              editing ? editForm.address || "" : dealership?.address || ""
            }
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, address: e.target.value }))
            }
            disabled={!editing}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ciudad"
              value={editing ? editForm.city || "" : dealership?.city || ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, city: e.target.value }))
              }
              disabled={!editing}
            />
            <Input
              label="Código Postal"
              value={
                editing
                  ? editForm.postal_code || ""
                  : dealership?.postal_code || ""
              }
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  postal_code: e.target.value,
                }))
              }
              disabled={!editing}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditForm(dealership as Dealership);
                  setEditing(false);
                }}
              >
                Descartar cambios
              </Button>
              <Button
                variant="secondary"
                onClick={handleSave}
                loading={saving}
              >
                Guardar cambios
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>Editar</Button>
          )}
        </div>
      </Card>

      {/* Registration link */}
      <Card>
        <h2 className="heading text-lg text-navy mb-4">
          ENLACE DE REGISTRO
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Comparte este enlace con tus clientes para que se registren:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm font-mono break-all">
            {typeof window !== "undefined"
              ? `${window.location.origin}/register/${dealership?.slug}`
              : `/register/${dealership?.slug}`}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/register/${dealership?.slug}`
              );
            }}
          >
            Copiar
          </Button>
        </div>
      </Card>
    </div>
  );
}
