/**
 * Test helpers that talk directly to Supabase with the service-role key.
 * Only used inside the test suite — never shipped to the browser.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Fetches the most-recent verification code stored for an email. */
export async function getVerificationCode(email: string): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/verification_codes?email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  const rows = (await res.json()) as { code: string }[];
  if (!rows.length) throw new Error(`No verification code found for ${email}`);
  return rows[0].code;
}

/** Returns a dealership slug suitable for the registration page. */
export async function getDealershipSlug(): Promise<string> {
  const slug = process.env.TEST_DEALERSHIP_SLUG;
  if (!slug) throw new Error("TEST_DEALERSHIP_SLUG env var is not set");
  return slug;
}
