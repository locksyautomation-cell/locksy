"use client";

import { useEffect, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";

interface Dealership {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

const MAP_CONTAINER_STYLE = { width: "100%", height: "480px", borderRadius: "0.75rem" };
const SPAIN_CENTER = { lat: 40.4168, lng: -3.7038 };

export default function DealershipsMap() {
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [selected, setSelected] = useState<Dealership | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  useEffect(() => {
    fetch("/api/public/dealerships-map")
      .then((r) => r.json())
      .then(({ dealerships: data }) => setDealerships(data || []))
      .catch(() => {});
  }, []);

  // Fit map to all markers once both are ready
  useEffect(() => {
    if (!map || dealerships.length === 0) return;
    if (dealerships.length === 1) {
      map.setCenter({ lat: dealerships[0].lat, lng: dealerships[0].lng });
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    dealerships.forEach((d) => bounds.extend({ lat: d.lat, lng: d.lng }));
    map.fitBounds(bounds, 60);
  }, [map, dealerships]);

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[480px] rounded-xl border border-border bg-muted/30">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={SPAIN_CENTER}
      zoom={6}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
    >
      {dealerships.map((d) => (
        <Marker
          key={d.id}
          position={{ lat: d.lat, lng: d.lng }}
          onClick={() => setSelected(d)}
        />
      ))}

      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div style={{ fontFamily: "sans-serif", maxWidth: "220px", padding: "4px 0" }}>
            <p style={{ fontWeight: 700, fontSize: "14px", color: "#0a1628", marginBottom: "4px" }}>
              {selected.name}
            </p>
            {selected.address && selected.city && (
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
                {selected.address}, {selected.city}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#1a73e8" }}
              >
                📍 Abrir en Google Maps
              </a>
              <a
                href={`https://maps.apple.com/?q=${selected.lat},${selected.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#1a73e8" }}
              >
                🗺️ Abrir en Apple Maps
              </a>
              <a
                href={`/register/${selected.slug}`}
                style={{
                  marginTop: "4px",
                  display: "inline-block",
                  backgroundColor: "#0a1628",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Registrarme en este taller
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
