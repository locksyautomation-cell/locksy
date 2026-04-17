import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: process.env.RESEND_TEST_TO || "locksyautomation@gmail.com",
    subject: "Test LOCKSY",
    html: "<p>Test email from LOCKSY</p>",
  });

  console.log("[test-email] result:", JSON.stringify(result));
  return NextResponse.json(result);
}
