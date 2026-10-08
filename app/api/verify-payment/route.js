import crypto from "crypto";
import Razorpay from "razorpay";
import { isValidEmail } from "../../../lib/config";
import { fulfillPayment } from "../../../lib/fulfill";
import { getPurchaseByOrder, getStore, keysForMode } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(leftValue, rightValue) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  if (!orderId || !paymentId || !signature) {
    return Response.json({ error: "Payment details missing." }, { status: 400 });
  }
  if (name.length < 2 || !isValidEmail(email)) {
    return Response.json({ error: "Name aur email zaroori hain." }, { status: 400 });
  }

  try {
    const store = await getStore();
    const purchase = await getPurchaseByOrder(orderId);
    const keys = keysForMode(store, purchase?.mode || store.activeMode);
    if (!keys.configured) {
      return Response.json({ error: "Razorpay keys configured nahi hain." }, { status: 503 });
    }

    const expected = crypto.createHmac("sha256", keys.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    if (!safeEqual(expected, signature)) {
      return Response.json({ error: "Payment verification fail. Signature match nahi hui." }, { status: 400 });
    }

    const razorpay = new Razorpay({ key_id: keys.keyId, key_secret: keys.keySecret });
    const payment = await razorpay.payments.fetch(paymentId);
    const expectedAmount = purchase?.amountPaise || store.pricePaise;

    if (payment.order_id !== orderId) {
      return Response.json({ error: "Order match nahi hua." }, { status: 400 });
    }
    if (!["captured", "authorized"].includes(payment.status)) {
      return Response.json({ error: "Payment abhi complete nahi hua." }, { status: 400 });
    }
    if (Number(payment.amount) !== expectedAmount || payment.currency !== "INR") {
      return Response.json({ error: "Payment amount match nahi hua." }, { status: 400 });
    }

    const result = await fulfillPayment({
      paymentId,
      orderId,
      name,
      email,
      mode: keys.mode,
      method: payment.method || "",
      contact: payment.contact || "",
    });
    return Response.json(result);
  } catch (error) {
    console.error("Payment verify failed:", error?.error?.description || error.message);
    const message = error?.error?.description || "Payment verify nahi ho paya.";
    return Response.json({ error: message }, { status: 500 });
  }
}
