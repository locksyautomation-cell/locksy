import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRepairOrderForAppointment } from "@/lib/utils/repair-order-service";

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Use Madrid (Europe/Madrid) time for date/time comparison since appointment
  // times are stored in local Spanish time.
  const now = new Date();

  // Format current and +15min timestamps as "YYYY-MM-DD HH:MM" in Madrid time
  // using sv-SE locale which produces ISO-like strings.
  const toMadrid = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Europe/Madrid" });
  const nowMadrid = toMadrid(now);                                           // "2024-01-15 10:00:00"
  const futureMadrid = toMadrid(new Date(now.getTime() + 15 * 60 * 1000)); // "2024-01-15 10:15:00"

  const nowDate = nowMadrid.slice(0, 10);       // "2024-01-15"
  const futureDate = futureMadrid.slice(0, 10);

  const datesToCheck = nowDate === futureDate ? [nowDate] : [nowDate, futureDate];

  // Fetch active appointments for today that have no repair order yet
  const { data: candidates } = await adminClient
    .from("appointments")
    .select("id, scheduled_date, scheduled_time, dealership_id")
    .in("scheduled_date", datesToCheck)
    .is("repair_order_url", null)
    .not("status", "eq", "finalizada")
    .not("status", "eq", "rechazada");

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Filter to appointments within the next 15 minutes (in Madrid time)
  const nowDT = nowMadrid.slice(0, 16);    // "2024-01-15 10:00"
  const futureDT = futureMadrid.slice(0, 16); // "2024-01-15 10:15"

  const toProcess = candidates.filter((apt) => {
    if (!apt.scheduled_time) return false;
    const aptDT = `${apt.scheduled_date} ${String(apt.scheduled_time).slice(0, 5)}`;
    return aptDT >= nowDT && aptDT <= futureDT;
  });

  // Generate repair orders sequentially (keep load manageable)
  let processed = 0;
  for (const apt of toProcess) {
    const result = await generateRepairOrderForAppointment(apt.id, adminClient);
    if (!("error" in result)) processed++;
  }

  return NextResponse.json({ processed, checked: candidates.length });
}
