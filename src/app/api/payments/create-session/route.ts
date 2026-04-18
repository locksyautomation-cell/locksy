import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { appointment_id } = await request.json();

    const adminClient = createAdminClient();
    const { data: appointment } = await adminClient
      .from("appointments")
      .select("*, dealership:dealerships(name, stripe_connect_account_id)")
      .eq("id", appointment_id)
      .eq("client_id", user.id)
      .single();

    if (!appointment || !appointment.budget_amount) {
      return NextResponse.json(
        { error: "Cita no encontrada o sin importe" },
        { status: 400 }
      );
    }

    const dealership = appointment.dealership as {
      name: string;
      stripe_connect_account_id: string | null;
    };

    if (!dealership.stripe_connect_account_id) {
      return NextResponse.json(
        { error: "El concesionario aún no ha configurado su cuenta de pagos." },
        { status: 400 }
      );
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Reparación ${appointment.locator}`,
              description: `Servicio de reparación - ${dealership.name}`,
            },
            unit_amount: Math.round(appointment.budget_amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        transfer_data: {
          destination: dealership.stripe_connect_account_id,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/appointments/${appointment_id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/appointments/${appointment_id}?payment=cancelled`,
      metadata: {
        appointment_id,
        dealership_id: appointment.dealership_id,
        client_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Error al crear sesión de pago" },
      { status: 500 }
    );
  }
}
