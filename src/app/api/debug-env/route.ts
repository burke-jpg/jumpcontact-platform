import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gc = process.env.GOOGLE_CREDENTIALS;
  const gse = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const gpk = process.env.GOOGLE_PRIVATE_KEY;

  let parsed: Record<string, unknown> | null = null;
  let parseError: string | null = null;
  if (gc) {
    try {
      const obj = JSON.parse(gc);
      parsed = { keys: Object.keys(obj), hasClientEmail: !!obj.client_email, hasPrivateKey: !!obj.private_key };
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'parse failed';
    }
  }

  return NextResponse.json({
    hasGOOGLE_CREDENTIALS: !!gc,
    gcLength: gc?.length ?? 0,
    gcFirst50: gc?.slice(0, 50) ?? null,
    parsed,
    parseError,
    hasGOOGLE_SERVICE_ACCOUNT_EMAIL: !!gse,
    hasGOOGLE_PRIVATE_KEY: !!gpk,
  });
}
