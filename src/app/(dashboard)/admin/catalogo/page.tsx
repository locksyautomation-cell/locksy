"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";

interface VehicleModel {
  id: number;
  name: string;
}

interface VehicleBrand {
  id: number;
  name: string;
  vehicle_models: VehicleModel[];
}

type VehicleType = "motos" | "coches";

const TYPE_LABELS: Record<VehicleType, string> = {
  motos: "🏍️ Motos",
  coches: "🚗 Coches",
};

function CatalogPanel({ vehicleType }: { vehicleType: VehicleType }) {
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<VehicleBrand | null>(null);
  const [search, setSearch] = useState("");

  const [newBrandName, setNewBrandName] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);
  const [brandError, setBrandError] = useState("");

  const [newModelName, setNewModelName] = useState("");
  const [addingModel, setAddingModel] = useState(false);
  const [modelError, setModelError] = useState("");

  const [deletingBrand, setDeletingBrand] = useState<number | null>(null);
  const [deletingModel, setDeletingModel] = useState<number | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/get-vehicle-catalog?vehicle_type=${vehicleType}`);
      const data = await res.json();
      const list: VehicleBrand[] = (data.brands ?? []).map((b: VehicleBrand) => ({
        ...b,
        vehicle_models: (b.vehicle_models ?? []).sort((a: VehicleModel, b: VehicleModel) =>
          a.name.localeCompare(b.name)
        ),
      }));
      setBrands(list);
      setSelectedBrand((prev) => {
        if (!prev) return null;
        return list.find((b) => b.id === prev.id) ?? null;
      });
    } catch {
      setBrands([]);
    }
    setLoading(false);
  }, [vehicleType]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  async function handleAddBrand() {
    if (!newBrandName.trim()) return;
    setAddingBrand(true);
    setBrandError("");
    try {
      const res = await fetch("/api/admin/create-vehicle-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName.trim(), vehicle_type: vehicleType }),
      });
      const data = await res.json();
      if (!res.ok) { setBrandError(data.error ?? "Error al añadir marca."); }
      else { setNewBrandName(""); await fetchCatalog(); }
    } catch { setBrandError("Error de conexión."); }
    setAddingBrand(false);
  }

  async function handleDeleteBrand(id: number) {
    setDeletingBrand(id);
    try {
      await fetch("/api/admin/delete-vehicle-brand", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (selectedBrand?.id === id) setSelectedBrand(null);
      await fetchCatalog();
    } catch {}
    setDeletingBrand(null);
  }

  async function handleAddModel() {
    if (!selectedBrand || !newModelName.trim()) return;
    setAddingModel(true);
    setModelError("");
    try {
      const res = await fetch("/api/admin/create-vehicle-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: selectedBrand.id, name: newModelName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setModelError(data.error ?? "Error al añadir modelo."); }
      else { setNewModelName(""); await fetchCatalog(); }
    } catch { setModelError("Error de conexión."); }
    setAddingModel(false);
  }

  async function handleDeleteModel(id: number) {
    setDeletingModel(id);
    try {
      await fetch("/api/admin/delete-vehicle-model", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchCatalog();
    } catch {}
    setDeletingModel(null);
  }

  const filteredBrands = search.trim()
    ? brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : brands;

  const filteredModels = selectedBrand
    ? search.trim()
      ? selectedBrand.vehicle_models.filter((m) =>
          m.name.toLowerCase().includes(search.toLowerCase())
        )
      : selectedBrand.vehicle_models
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-7 w-7 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Panel izquierdo: Marcas ── */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="heading text-sm text-navy">MARCAS</h2>
          <span className="text-xs text-muted-foreground">{brands.length} marcas</span>
        </div>

        {/* Añadir marca */}
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva marca..."
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
            <Button variant="secondary" size="sm" onClick={handleAddBrand} loading={addingBrand} disabled={!newBrandName.trim()}>
              Añadir
            </Button>
          </div>
          {brandError && <p className="text-xs text-error mt-1">{brandError}</p>}
        </div>

        {/* Lista de marcas */}
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {filteredBrands.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "No se encontraron marcas." : "No hay marcas registradas."}
            </p>
          ) : (
            filteredBrands.map((brand) => (
              <div
                key={brand.id}
                onClick={() => { setSelectedBrand(brand); setModelError(""); setNewModelName(""); }}
                className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors ${
                  selectedBrand?.id === brand.id
                    ? "bg-navy/5 border-l-2 border-navy"
                    : "hover:bg-muted/50"
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-foreground">{brand.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {brand.vehicle_models.length} modelos
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id); }}
                  disabled={deletingBrand === brand.id}
                  className="text-muted-foreground hover:text-error transition-colors disabled:opacity-50 p-1"
                  title="Eliminar marca y todos sus modelos"
                >
                  {deletingBrand === brand.id ? (
                    <div className="h-4 w-4 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Panel derecho: Modelos ── */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="heading text-sm text-navy">
            {selectedBrand ? `MODELOS — ${selectedBrand.name.toUpperCase()}` : "MODELOS"}
          </h2>
          {selectedBrand && (
            <span className="text-xs text-muted-foreground">
              {selectedBrand.vehicle_models.length} modelos
            </span>
          )}
        </div>

        {!selectedBrand ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <svg className="h-10 w-10 text-muted-foreground/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <p className="text-sm text-muted-foreground">Selecciona una marca para ver y gestionar sus modelos</p>
          </div>
        ) : (
          <>
            {/* Añadir modelo */}
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nuevo modelo..."
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddModel()}
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
                <Button variant="secondary" size="sm" onClick={handleAddModel} loading={addingModel} disabled={!newModelName.trim()}>
                  Añadir
                </Button>
              </div>
              {modelError && <p className="text-xs text-error mt-1">{modelError}</p>}
            </div>

            {/* Lista de modelos */}
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {filteredModels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? "No se encontraron modelos." : "No hay modelos para esta marca."}
                </p>
              ) : (
                filteredModels.map((model) => (
                  <div key={model.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/30 transition-colors">
                    <span className="text-sm text-foreground">{model.name}</span>
                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      disabled={deletingModel === model.id}
                      className="text-muted-foreground hover:text-error transition-colors disabled:opacity-50 p-1"
                      title="Eliminar modelo"
                    >
                      {deletingModel === model.id ? (
                        <div className="h-3.5 w-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminCatalogoPage() {
  const [activeType, setActiveType] = useState<VehicleType>("motos");
  const [search, setSearch] = useState("");

  function handleTypeChange(type: VehicleType) {
    setActiveType(type);
    setSearch("");
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h1 className="heading text-2xl text-navy flex-1">CATÁLOGO DE VEHÍCULOS</h1>
        <input
          type="text"
          placeholder="Buscar marca o modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border px-4 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 w-64"
        />
      </div>

      {/* Tipo de vehículo tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden text-sm mb-6 w-fit">
        {(["motos", "coches"] as VehicleType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-6 py-2.5 font-medium transition-colors border-r last:border-r-0 border-border ${
              activeType === type
                ? "bg-navy text-white"
                : "bg-white text-foreground hover:bg-muted"
            }`}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Panel del tipo activo — key forces remount on type change, resetting all inner state */}
      <CatalogPanel key={activeType} vehicleType={activeType} />
    </div>
  );
}
