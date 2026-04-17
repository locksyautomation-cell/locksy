"use client";

import { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import VehicleSelect from "@/components/ui/VehicleSelect";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import type { User, Vehicle, Dealership } from "@/lib/types";

export default function ClientProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [activeDealership, setActiveDealership] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Vehicle modal
  const [vehicleModal, setVehicleModal] = useState(false);
  const [vehicleModalType, setVehicleModalType] = useState<"motos" | "coches">("motos");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    brand: "",
    model: "",
    plate: "",
    chassis_number: "",
    registration_date: "",
  });
  const [techFile, setTechFile] = useState<File | null>(null);
  const [uploadingTechFile, setUploadingTechFile] = useState(false);

  const [unsavedModal, setUnsavedModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const profileRes = await fetch("/api/client/get-profile");
      if (!profileRes.ok) return;
      const { user: userData, vehicles: vehicleData, dealerships: dcData } = await profileRes.json();

      setUser(userData as User);
      setEditForm(userData as User);
      setVehicles((vehicleData as Vehicle[]) || []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dealershipList = (dcData || []).map((dc: any) => dc.dealership).filter(Boolean) as Dealership[];
      setDealerships(dealershipList);
      if (dealershipList.length > 0) setActiveDealership(dealershipList[0].id);

      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);

    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        dni: editForm.dni,
        phone: editForm.phone,
        address: editForm.address,
      }),
    });

    if (res.ok) {
      setUser({ ...user, ...editForm } as User);
      setEditing(false);
    }
    setSaving(false);
  }

  function handleCancelEdit() {
    setEditForm(user as User);
    setEditing(false);
  }

  async function handleSaveVehicle() {
    setSaving(true);

    // Upload ficha técnica if provided
    let techFileUrl: string | undefined;
    if (techFile) {
      setUploadingTechFile(true);
      const fd = new FormData();
      fd.append("file", techFile);
      const uploadRes = await fetch("/api/client/vehicles/upload-tech-file", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        techFileUrl = url;
      }
      setUploadingTechFile(false);
    }

    const payload = {
      ...vehicleForm,
      vehicle_type: vehicleModalType,
      ...(techFileUrl && { tech_file_url: techFileUrl }),
    };

    if (editingVehicle) {
      const res = await fetch("/api/client/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingVehicle.id, ...payload }),
      });
      if (res.ok) {
        const { vehicle } = await res.json();
        setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? vehicle : v)));
      }
    } else {
      const res = await fetch("/api/client/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { vehicle } = await res.json();
        setVehicles((prev) => [...prev, vehicle]);
      }
    }

    setVehicleModal(false);
    setEditingVehicle(null);
    setTechFile(null);
    setVehicleForm({ brand: "", model: "", plate: "", chassis_number: "", registration_date: "" });
    setSaving(false);
  }

  async function handleDeleteVehicle(vehicleId: string) {
    if (!confirm("¿Estás seguro de que quieres eliminar este vehículo? El historial de reparaciones se mantendrá.")) return;

    await fetch("/api/client/vehicles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: vehicleId }),
    });
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
  }

  function openEditVehicle(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setVehicleModalType(vehicle.vehicle_type || "motos");
    setTechFile(null);
    setVehicleForm({
      brand: vehicle.brand,
      model: vehicle.model,
      plate: vehicle.plate,
      chassis_number: vehicle.chassis_number || "",
      registration_date: vehicle.registration_date || "",
    });
    setVehicleModal(true);
  }

  function openAddVehicle(type: "motos" | "coches") {
    setEditingVehicle(null);
    setVehicleModalType(type);
    setTechFile(null);
    setVehicleForm({ brand: "", model: "", plate: "", chassis_number: "", registration_date: "" });
    setVehicleModal(true);
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

      {/* Dealership selector */}
      {dealerships.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {dealerships.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDealership(d.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeDealership === d.id
                  ? "bg-navy text-white"
                  : "bg-muted text-foreground hover:bg-navy/10"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Profile photo */}
      <div className="flex items-center gap-4 mb-6">
        <label className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex-shrink-0 cursor-pointer group">
          {user?.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profile_photo_url} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingPhoto ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingPhoto}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploadingPhoto(true);
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/client/upload-profile-photo", { method: "POST", body: fd });
              if (res.ok) {
                const { url } = await res.json();
                setUser((prev) => prev ? { ...prev, profile_photo_url: url } : prev);
              }
              setUploadingPhoto(false);
              e.target.value = "";
            }}
          />
        </label>
        <div>
          <p className="font-medium text-foreground">{user?.first_name} {user?.last_name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Haz clic en la foto para cambiarla</p>
        </div>
      </div>

      {/* Personal info */}
      <Card className="mb-6">
        <h2 className="heading text-lg text-navy mb-4">
          INFORMACIÓN PERSONAL
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nombre / Empresa"
              value={editing ? editForm.first_name || "" : user?.first_name || ""}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  first_name: e.target.value,
                }))
              }
              disabled={!editing}
            />
            <Input
              label="Apellidos"
              value={editing ? editForm.last_name || "" : user?.last_name || ""}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  last_name: e.target.value,
                }))
              }
              disabled={!editing}
            />
          </div>
          <Input
            label="NIF / CIF"
            value={editing ? editForm.dni || "" : user?.dni || ""}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, dni: e.target.value }))
            }
            disabled={!editing}
          />
          <Input
            label="Correo electrónico"
            value={user?.email || ""}
            disabled
          />
          <Input
            label="Teléfono"
            value={editing ? editForm.phone || "" : user?.phone || ""}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            disabled={!editing}
          />
          <Input
            label="Dirección"
            value={editing ? editForm.address || "" : user?.address || ""}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                address: e.target.value,
              }))
            }
            disabled={!editing}
          />
        </div>

        <div className="mt-6 flex gap-4">
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                Descartar cambios
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveProfile}
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

      {/* Vehicles — split by type */}
      {(["motos", "coches"] as const).map((vtype) => {
        const typeVehicles = vehicles.filter((v) => v.vehicle_type === vtype);
        return (
          <div key={vtype} className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading text-lg text-navy">
                {vtype === "motos" ? "🏍️ MIS MOTOS" : "🚗 MIS COCHES"}
              </h2>
              <Button variant="secondary" size="sm" onClick={() => openAddVehicle(vtype)}>
                Añadir {vtype === "motos" ? "Moto" : "Coche"}
              </Button>
            </div>
            {typeVehicles.length === 0 ? (
              <Card>
                <p className="text-center text-muted-foreground py-4">
                  No tienes {vtype === "motos" ? "motos" : "coches"} registrados.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {typeVehicles.map((vehicle) => (
                  <Card key={vehicle.id}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {vehicle.brand} {vehicle.model}
                        </h3>
                        <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditVehicle(vehicle)}>Editar</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteVehicle(vehicle.id)}>Eliminar</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Vehicles without type */}
      {vehicles.filter((v) => !v.vehicle_type).length > 0 && (
        <div className="mb-6">
          <h2 className="heading text-lg text-navy mb-4">OTROS VEHÍCULOS</h2>
          <div className="space-y-3">
            {vehicles.filter((v) => !v.vehicle_type).map((vehicle) => (
              <Card key={vehicle.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{vehicle.brand} {vehicle.model}</h3>
                    <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
                    <p className="text-xs text-orange mt-1">Sin tipo asignado — edita para clasificarlo</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditVehicle(vehicle)}>Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteVehicle(vehicle.id)}>Eliminar</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle modal */}
      <Modal
        isOpen={vehicleModal}
        onClose={() => setVehicleModal(false)}
        title={editingVehicle ? "EDITAR VEHÍCULO" : `AÑADIR ${vehicleModalType === "motos" ? "MOTO" : "COCHE"}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <VehicleSelect
              brand={vehicleForm.brand}
              model={vehicleForm.model}
              onBrandChange={(v) => setVehicleForm((prev) => ({ ...prev, brand: v, model: "" }))}
              onModelChange={(v) => setVehicleForm((prev) => ({ ...prev, model: v }))}
              vehicleType={vehicleModalType}
            />
          </div>
          <Input
            label="Matrícula"
            value={vehicleForm.plate}
            onChange={(e) =>
              setVehicleForm((prev) => ({ ...prev, plate: e.target.value }))
            }
            required
          />
          <Input
            label="Bastidor (máx. 17 caracteres)"
            value={vehicleForm.chassis_number}
            onChange={(e) =>
              setVehicleForm((prev) => ({
                ...prev,
                chassis_number: e.target.value
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .slice(0, 17),
              }))
            }
          />
          <Input
            label="Fecha de matriculación"
            type="date"
            value={vehicleForm.registration_date}
            onChange={(e) =>
              setVehicleForm((prev) => ({
                ...prev,
                registration_date: e.target.value,
              }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Ficha técnica (PDF o imagen)
            </label>
            {editingVehicle?.tech_file_url && !techFile && (
              <a
                href={editingVehicle.tech_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange hover:underline block mb-2"
              >
                Ver ficha técnica actual
              </a>
            )}
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-navy hover:text-navy transition-colors">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {techFile ? techFile.name : "Seleccionar archivo"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setTechFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="flex gap-4 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setVehicleModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleSaveVehicle}
              loading={saving || uploadingTechFile}
              disabled={!vehicleForm.brand || !vehicleForm.model || !vehicleForm.plate}
            >
              {uploadingTechFile ? "Subiendo archivo..." : editingVehicle ? "Guardar" : "Añadir"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unsaved changes modal */}
      <Modal
        isOpen={unsavedModal}
        onClose={() => setUnsavedModal(false)}
        title="CAMBIOS SIN GUARDAR"
      >
        <p className="text-foreground mb-6">
          No ha guardado sus cambios, ¿desea salir?
        </p>
        <div className="flex gap-4">
          <Button variant="outline" fullWidth onClick={handleCancelEdit}>
            Descartar cambios
          </Button>
          <Button variant="secondary" fullWidth onClick={handleSaveProfile}>
            Guardar cambios
          </Button>
        </div>
      </Modal>
    </div>
  );
}
