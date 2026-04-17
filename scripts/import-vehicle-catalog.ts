/**
 * import-vehicle-catalog.ts
 *
 * Importa marcas y modelos de vehículos desde un CSV a Supabase.
 *
 * USO:
 *   npx tsx scripts/import-vehicle-catalog.ts [ruta_del_csv]
 *
 * Si no se pasa ruta, usa data/vehicle_catalog_template.csv por defecto.
 *
 * FORMATO DEL CSV (encabezado obligatorio):
 *   vehicle_type,brand,model
 *   coches,Toyota,Corolla
 *   motos,Honda,CBR600RR
 *
 * - vehicle_type: "coches" o "motos" (obligatorio)
 * - brand: nombre de la marca (obligatorio)
 * - model: nombre del modelo (obligatorio)
 *
 * Las marcas y modelos ya existentes se omiten sin error (ON CONFLICT DO NOTHING).
 * Al final se muestra un resumen: creados / ya existían / errores.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Cargar .env.local automáticamente ───────────────────────────────────────

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

// Load from locksy/.env.local (works whether running from locksy/ or locksy/scripts/)
loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), "../.env.local"));

// ── Configuración ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "\n❌  Variables de entorno no encontradas.\n" +
    "    Asegúrate de ejecutar el script desde la carpeta locksy/:\n\n" +
    "    cd /ruta/a/locksy\n" +
    "    npx tsx scripts/import-vehicle-catalog.ts [ruta.csv]\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Parseo CSV ───────────────────────────────────────────────────────────────

interface CatalogRow {
  vehicle_type: "coches" | "motos";
  brand: string;
  model: string;
}

function parseCSV(content: string): CatalogRow[] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("El CSV está vacío o sólo tiene encabezado.");
  }

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const typeIdx = header.indexOf("vehicle_type");
  const brandIdx = header.indexOf("brand");
  const modelIdx = header.indexOf("model");

  if (typeIdx === -1 || brandIdx === -1 || modelIdx === -1) {
    throw new Error(
      `El CSV debe tener las columnas: vehicle_type, brand, model.\n` +
      `Columnas encontradas: ${header.join(", ")}`
    );
  }

  const rows: CatalogRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const vt = cols[typeIdx]?.toLowerCase();
    const brand = cols[brandIdx];
    const model = cols[modelIdx];

    if (!vt || !brand || !model) {
      errors.push(`  Línea ${i + 1}: columnas vacías — ignorada`);
      continue;
    }
    if (vt !== "coches" && vt !== "motos") {
      errors.push(`  Línea ${i + 1}: vehicle_type "${vt}" no válido (debe ser "coches" o "motos") — ignorada`);
      continue;
    }
    rows.push({ vehicle_type: vt, brand, model });
  }

  if (errors.length > 0) {
    console.warn("\n⚠️  Advertencias durante el parseo:");
    errors.forEach((e) => console.warn(e));
  }

  return rows;
}

// ── Importación ──────────────────────────────────────────────────────────────

async function importCatalog(rows: CatalogRow[]) {
  // Agrupar por (vehicle_type, brand) para minimizar roundtrips
  const brandMap = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = `${row.vehicle_type}|${row.brand}`;
    if (!brandMap.has(key)) brandMap.set(key, new Set());
    brandMap.get(key)!.add(row.model);
  }

  let brandsCreated = 0;
  let brandsExisted = 0;
  let modelsCreated = 0;
  let modelsExisted = 0;
  let errors = 0;

  for (const [key, models] of brandMap) {
    const [vehicle_type, brandName] = key.split("|");

    // Upsert brand
    const { data: brandData, error: brandErr } = await supabase
      .from("vehicle_brands")
      .upsert({ name: brandName, vehicle_type }, { onConflict: "name,vehicle_type", ignoreDuplicates: false })
      .select("id")
      .single();

    if (brandErr) {
      // Could be a duplicate (unique constraint) — try to fetch existing
      const { data: existing } = await supabase
        .from("vehicle_brands")
        .select("id")
        .eq("name", brandName)
        .eq("vehicle_type", vehicle_type)
        .single();

      if (!existing) {
        console.error(`  ❌  Marca "${brandName}" (${vehicle_type}): ${brandErr.message}`);
        errors++;
        continue;
      }
      brandsExisted++;
      const brandId = existing.id;
      await importModels(brandId, brandName, models, { modelsCreated, modelsExisted, errors });
      continue;
    }

    if (brandData) {
      brandsCreated++;
    }

    const brandId = brandData.id;

    // Insert models one by one to properly count created vs existed
    for (const modelName of models) {
      const { error: modelErr, data: modelData } = await supabase
        .from("vehicle_models")
        .insert({ brand_id: brandId, name: modelName })
        .select("id")
        .single();

      if (modelErr) {
        if (modelErr.code === "23505") {
          // unique violation → already exists
          modelsExisted++;
        } else {
          console.error(`  ❌  Modelo "${modelName}" de "${brandName}": ${modelErr.message}`);
          errors++;
        }
      } else if (modelData) {
        modelsCreated++;
      }
    }
  }

  return { brandsCreated, brandsExisted, modelsCreated, modelsExisted, errors };
}

// Helper para cuando la marca ya existía
async function importModels(
  brandId: number,
  brandName: string,
  models: Set<string>,
  counters: { modelsCreated: number; modelsExisted: number; errors: number }
) {
  for (const modelName of models) {
    const { error: modelErr, data: modelData } = await supabase
      .from("vehicle_models")
      .insert({ brand_id: brandId, name: modelName })
      .select("id")
      .single();

    if (modelErr) {
      if (modelErr.code === "23505") {
        counters.modelsExisted++;
      } else {
        console.error(`  ❌  Modelo "${modelName}" de "${brandName}": ${modelErr.message}`);
        counters.errors++;
      }
    } else if (modelData) {
      counters.modelsCreated++;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2]
    ? resolve(process.argv[2])
    : resolve("data/vehicle_catalog_template.csv");

  console.log(`\n🚗  Importando catálogo desde: ${csvPath}\n`);

  let content: string;
  try {
    content = readFileSync(csvPath, "utf-8");
  } catch {
    console.error(`❌  No se pudo leer el archivo: ${csvPath}`);
    process.exit(1);
  }

  let rows: CatalogRow[];
  try {
    rows = parseCSV(content);
  } catch (err) {
    console.error(`❌  Error al parsear el CSV: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log(`   ${rows.length} filas válidas encontradas.`);
  console.log("   Importando...\n");

  const result = await importCatalog(rows);

  console.log("─────────────────────────────────────");
  console.log(`✅  Marcas nuevas:   ${result.brandsCreated}`);
  console.log(`   Marcas ya existían: ${result.brandsExisted}`);
  console.log(`✅  Modelos nuevos:  ${result.modelsCreated}`);
  console.log(`   Modelos ya existían: ${result.modelsExisted}`);
  if (result.errors > 0) {
    console.log(`❌  Errores:         ${result.errors}`);
  }
  console.log("─────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
