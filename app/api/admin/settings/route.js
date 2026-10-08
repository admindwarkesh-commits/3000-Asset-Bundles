import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "../../../../lib/auth";
import { getRawSettings, saveSettings, toPublicSettings } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function session() {
  const jar = await cookies();
  return verifySession(jar.get(ADMIN_COOKIE)?.value);
}

export async function GET() {
  if (!(await session())) {
    return Response.json({ error: "Login required." }, { status: 401 });
  }

  try {
    const doc = await getRawSettings();
    return Response.json(toPublicSettings(doc));
  } catch (error) {
    console.error("Settings read failed:", error.message);
    return Response.json({ error: "Settings load nahi hui. MongoDB check karo." }, { status: 503 });
  }
}

export async function POST(request) {
  if (!(await session())) {
    return Response.json({ error: "Login required." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const saved = await saveSettings(body);
    return Response.json(saved);
  } catch (error) {
    const message = error.message || "Settings save nahi hui.";
    const status = /URL|Price|Key|name|port|Drive/i.test(message) ? 400 : 500;
    if (status === 500) console.error("Settings save failed:", message);
    return Response.json({ error: message }, { status });
  }
}
