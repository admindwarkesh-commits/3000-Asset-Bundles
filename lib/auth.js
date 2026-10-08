import crypto from "crypto";

export const ADMIN_COOKIE = "presets_admin";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function sessionSecret() {
  const secret = (process.env.ADMIN_SESSION_SECRET || "").trim();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET .env.local me set nahi hai.");
  }
  return secret;
}

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function signSession(email) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + WEEK_MS })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  let expected = "";
  try {
    expected = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  } catch {
    return null;
  }
  if (!safeEqual(expected, signature)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data?.email || !data?.exp || data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export function adminCookieOptions() {
  return {
    name: ADMIN_COOKIE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK_MS / 1000,
  };
}
