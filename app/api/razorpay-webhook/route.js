import crypto from "crypto";
import { isValidEmail } from "../../../lib/config";
import { fulfillPayment } from "../../../lib/fulfill";
import { getPurchaseByOrder, getStore } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue));
  const right = Buffer.from(String(rightValue));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function signatureFor(secret, raw) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  if (!signature) {
    return Response.json({ error: "Webhook signature missing." }, { status: 400 });
  }

  let store;
  try {
    store = await getStore();
  } catch (error) {
    console.error("MongoDB unavailable:", error.message);
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }

  const candidates = [
    { mode: "test", secret: store.testWebhookSecret },
    { mode: "live", secret: store.liveWebhookSecret },
  ].filter((item) => item.secret);

  const matched = candidates.find((item) => safeEqual(signatureFor(item.secret, raw), signature));
  if (!matched) {
    return Response.json({ error: "Invalid webhook signature. Admin me webhook secret check karo." }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid webhook body." }, { status: 400 });
  }

  if (event.event !== "payment.captured") {
    return Response.json({ ok: true, ignored: true });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment?.order_id) {
    return Response.json({ error: "Payment payload missing." }, { status: 400 });
  }

  const purchase = await getPurchaseByOrder(payment.order_id);
  const expectedAmount = purchase?.amountPaise || store.pricePaise;
  if (Number(payment.amount) !== expectedAmount || payment.currency !== "INR") {
    return Response.json({ error: "Amount mismatch." }, { status: 400 });
  }

  const notes = payment.notes && !Array.isArray(payment.notes) ? payment.notes : {};
  const email = String(notes.email || payment.email || purchase?.email || "").trim().toLowerCase();
  const name = String(notes.name || purchase?.name || "Customer").trim();

  const result = await fulfillPayment({
    paymentId: payment.id,
    orderId: payment.order_id,
    name: name.slice(0, 80),
    email,
    mode: matched.mode,
    method: payment.method || "",
    contact: payment.contact || "",
  });

  if (!isValidEmail(email)) {
    return Response.json({ ok: true, emailSent: false, emailError: "EMAIL_MISSING" });
  }

  return Response.json(result);
}
