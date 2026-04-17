"use client";

import { useState, useEffect } from "react";
import Select from "@/components/ui/Select";

interface Brand { id: number; name: string; }
interface Model { id: number; name: string; }

interface VehicleSelectProps {
  brand: string;
  model: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  vehicleType?: string;
}

export default function VehicleSelect({
  brand,
  model,
  onBrandChange,
  onModelChange,
  disabled,
  vehicleType,
}: VehicleSelectProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    const url = vehicleType
      ? `/api/vehicles/brands?vehicle_type=${vehicleType}`
      : "/api/vehicles/brands";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []))
      .catch(() => {})
      .finally(() => setLoadingBrands(false));
  }, [vehicleType]);

  // Cargar modelos cuando cambia la marca — busca por nombre para cubrir ambos catálogos
  useEffect(() => {
    if (!brand) { setModels([]); return; }
    setLoadingModels(true);
    const params = new URLSearchParams({ brand_name: brand });
    if (vehicleType) params.set("vehicle_type", vehicleType);
    fetch(`/api/vehicles/models?${params}`)
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => {})
      .finally(() => setLoadingModels(false));
  }, [brand, vehicleType]);

  function handleBrandChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onBrandChange(e.target.value);
    onModelChange(""); // resetear modelo al cambiar marca
  }

  // Deduplicar por nombre (seguridad extra por si el API devuelve duplicados)
  const uniqueBrands = [...new Map(brands.map((b) => [b.name, b])).values()];
  const brandOptions = uniqueBrands.map((b) => ({ value: b.name, label: b.name }));
  // Si el valor actual no está en el catálogo, añadirlo para no perderlo
  if (brand && !uniqueBrands.find((b) => b.name === brand)) {
    brandOptions.unshift({ value: brand, label: brand });
  }

  const modelOptions = models.map((m) => ({ value: m.name, label: m.name }));
  if (model && !models.find((m) => m.name === model)) {
    modelOptions.unshift({ value: model, label: model });
  }

  return (
    <>
      <Select
        label="Marca"
        value={brand}
        onChange={handleBrandChange}
        options={brandOptions}
        placeholder={loadingBrands ? "Cargando marcas…" : "Selecciona una marca"}
        disabled={disabled || loadingBrands}
      />
      <Select
        label="Modelo"
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        options={modelOptions}
        placeholder={
          !brand
            ? "Selecciona primero una marca"
            : loadingModels
            ? "Cargando modelos…"
            : "Selecciona un modelo"
        }
        disabled={disabled || !brand || loadingModels}
      />
    </>
  );
}
