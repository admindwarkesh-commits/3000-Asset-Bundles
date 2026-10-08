import Razorpay from "razorpay";
import { isValidEmail } from "../../../lib/config";
import { getStore, keysForMode, recordCreatedOrder } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  if (name.length < 2 || name.length > 80) {
    return Response.json({ error: "Naam 2 se 80 characters ka hona chahiye." }, { status: 400 });
  }
  if (!isValidEmail(email) || email.length > 120) {
    return Response.json({ error: "Sahi email address likho." }, { status: 400 });
  }

  let store;
  try {
    store = await getStore();
  } catch (error) {
    console.error("MongoDB unavailable:", error.message);
    return Response.json(
      { error: "Database connect nahi ho raha. MongoDB network access check karo." },
      { status: 503 }
    );
  }

  const keys = keysForMode(store, store.activeMode);
  if (!keys.configured) {
    return Response.json(
      {
        error: `Razorpay ${keys.mode} keys admin me set nahi hain. /admin/settings khol ke Key ID aur Secret paste karo.`,
      },
      { status: 503 }
    );
  }

  try {
    const razorpay = new Razorpay({ key_id: keys.keyId, key_secret: keys.keySecret });
    const order = await razorpay.orders.create({
      amount: store.pricePaise,
      currency: "INR",
      receipt: `pr${Date.now()}`.slice(0, 40),
      notes: {
        name: name.slice(0, 80),
        email: email.slice(0, 120),
        product: store.productName.slice(0, 80),
        mode: keys.mode,
      },
    });

    await recordCreatedOrder({
      orderId: order.id,
      name,
      email,
      amountPaise: store.pricePaise,
      amountInr: store.priceInr,
      mode: keys.mode,
      productName: store.productName,
    });

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keys.keyId,
    });
  } catch (error) {
    console.error("Razorpay order failed:", error?.error?.description || error.message);
    const message = error?.error?.description || "Order create nahi ho paya. Razorpay keys check karo.";
    return Response.json({ error: message }, { status: 500 });
  }
}
