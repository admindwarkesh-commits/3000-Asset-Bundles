import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "../../../../lib/auth";
import { findAdmin, updateAdminPassword } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const jar = await cookies();
  const session = verifySession(jar.get(ADMIN_COOKIE)?.value);
  if (!session) {
    return Response.json({ error: "Login required." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (newPassword.length < 8) {
    return Response.json({ error: "Naya password kam se kam 8 characters ka hona chahiye." }, { status: 400 });
  }

  const admin = await findAdmin(session.email);
  const valid = admin ? await bcrypt.compare(currentPassword, admin.passwordHash) : false;
  if (!valid) {
    return Response.json({ error: "Current password galat hai." }, { status: 401 });
  }

  await updateAdminPassword(session.email, await bcrypt.hash(newPassword, 10));
  return Response.json({ ok: true });
}
