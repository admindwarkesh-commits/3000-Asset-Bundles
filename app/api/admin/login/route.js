import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { adminCookieOptions, signSession } from "../../../../lib/auth";
import { isValidEmail } from "../../../../lib/config";
import { findAdmin } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map();

function tooManyAttempts(email) {
  const entry = attempts.get(email);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(email);
    return false;
  }
  return entry.count >= 8;
}

function recordFailure(email) {
  const entry = attempts.get(email);
  if (!entry || Date.now() > entry.resetAt) {
    attempts.set(email, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
    return;
  }
  entry.count += 1;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!isValidEmail(email) || !password) {
    return NextResponse.json({ error: "Email aur password likho." }, { status: 400 });
  }
  if (tooManyAttempts(email)) {
    return NextResponse.json({ error: "Bahut saari galat koshish. 15 minute baad try karo." }, { status: 429 });
  }

  try {
    const admin = await findAdmin(email);
    const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!valid) {
      recordFailure(email);
      return NextResponse.json({ error: "Email ya password galat hai." }, { status: 401 });
    }

    attempts.delete(email);
    const response = NextResponse.json({ ok: true, email: admin.email });
    response.cookies.set({
      ...adminCookieOptions(),
      value: signSession(admin.email),
    });
    return response;
  } catch (error) {
    console.error("Admin login failed:", error.message);
    return NextResponse.json(
      { error: "Login abhi nahi ho paya. MongoDB connection check karo." },
      { status: 503 }
    );
  }
}
