import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "../../../../lib/auth";
import { listPurchases } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const jar = await cookies();
  if (!verifySession(jar.get(ADMIN_COOKIE)?.value)) {
    return Response.json({ error: "Login required." }, { status: 401 });
  }

  const filter = new URL(request.url).searchParams.get("filter") || "paid";
  try {
    const data = await listPurchases(filter);
    return Response.json(data);
  } catch (error) {
    console.error("Purchases read failed:", error.message);
    return Response.json({ error: "Purchases load nahi hui. MongoDB check karo." }, { status: 503 });
  }
}
