import bcrypt from "bcryptjs";
import { getDb, resetMongoClient } from "./mongo";
import { isValidEmail } from "./config";

let storeCache = null;
let storeCacheAt = 0;
let mongoPauseUntil = 0;

let ready = null;

function envPrice() {
  const raw = Number(process.env.PRODUCT_PRICE_INR || 299);
  if (!Number.isFinite(raw) || raw < 1) return 299;
  return Math.round(raw);
}

function envDefaults() {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  const live = keyId.startsWith("rzp_live_");

  return {
    activeMode: live ? "live" : "test",
    testKeyId: live ? "" : keyId,
    testKeySecret: live ? "" : keySecret,
    testWebhookSecret: live ? "" : webhookSecret,
    liveKeyId: live ? keyId : "",
    liveKeySecret: live ? keySecret : "",
    liveWebhookSecret: live ? webhookSecret : "",
    publicSiteUrl: "",
    productName: (process.env.PRODUCT_NAME || "3000+ Presets Pack").trim(),
    priceInr: envPrice(),
    driveLink: (process.env.GOOGLE_DRIVE_LINK || "").trim(),
    smtpHost: (process.env.SMTP_HOST || "smtp.gmail.com").trim(),
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: (process.env.SMTP_USER || "").trim(),
    smtpPass: process.env.SMTP_PASS || "",
    emailFrom: (process.env.EMAIL_FROM || "").trim(),
  };
}

function prefer(value, fallback) {
  if (typeof value === "number") return value > 0 ? value : fallback;
  const text = String(value ?? "").trim();
  return text || fallback;
}

function mergeSettings(doc) {
  const env = envDefaults();
  if (!doc) return env;
  return {
    activeMode: doc.activeMode === "live" ? "live" : "test",
    testKeyId: prefer(doc.testKeyId, env.testKeyId),
    testKeySecret: prefer(doc.testKeySecret, env.testKeySecret),
    testWebhookSecret: prefer(doc.testWebhookSecret, env.testWebhookSecret),
    liveKeyId: prefer(doc.liveKeyId, env.liveKeyId),
    liveKeySecret: prefer(doc.liveKeySecret, env.liveKeySecret),
    liveWebhookSecret: prefer(doc.liveWebhookSecret, env.liveWebhookSecret),
    publicSiteUrl: String(doc.publicSiteUrl || "").trim(),
    productName: prefer(doc.productName, env.productName),
    priceInr: prefer(Number(doc.priceInr), env.priceInr),
    driveLink: prefer(doc.driveLink, env.driveLink),
    smtpHost: prefer(doc.smtpHost, env.smtpHost),
    smtpPort: Number(doc.smtpPort || env.smtpPort || 587),
    smtpUser: prefer(doc.smtpUser, env.smtpUser),
    smtpPass: prefer(doc.smtpPass, env.smtpPass),
    emailFrom: prefer(doc.emailFrom, env.emailFrom),
  };
}

async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      const db = await getDb();
      await db.collection("admins").createIndex({ email: 1 }, { unique: true });
      await db.collection("purchases").createIndex({ orderId: 1 }, { unique: true });
      await db.collection("purchases").createIndex({ paymentId: 1 }, { unique: true, sparse: true });
      await db.collection("purchases").createIndex({ createdAt: -1 });
      await db.collection("purchases").createIndex({ status: 1, createdAt: -1 });
      await ensureAdmin(db);
      await db.collection("settings").updateOne(
        { _id: "store" },
        { $setOnInsert: { _id: "store", activeMode: "test", createdAt: new Date() } },
        { upsert: true }
      );
      return db;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function ensureAdmin(db) {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !isValidEmail(email) || password.length < 8) return;

  const existing = await db.collection("admins").findOne({ email });
  if (existing) return;

  try {
    await db.collection("admins").insertOne({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date(),
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

export async function getStore() {
  const db = await ensureReady();
  const doc = await db.collection("settings").findOne({ _id: "store" });
  const settings = mergeSettings(doc);
  return {
    ...settings,
    pricePaise: settings.priceInr * 100,
  };
}

function withPaise(settings) {
  return { ...settings, pricePaise: settings.priceInr * 100 };
}

export async function getStoreOrDefaults() {
  const now = Date.now();
  if (storeCache && now - storeCacheAt < 20000) return storeCache;
  if (now < mongoPauseUntil) return storeCache || withPaise(envDefaults());

  try {
    const store = await getStore();
    storeCache = store;
    storeCacheAt = Date.now();
    return store;
  } catch (error) {
    console.error("MongoDB settings unavailable:", error.message);
    resetMongoClient();
    ready = null;
    mongoPauseUntil = Date.now() + 15000;
    return storeCache || withPaise(envDefaults());
  }
}

export function keysForMode(settings, mode) {
  const live = mode === "live";
  const keyId = live ? settings.liveKeyId : settings.testKeyId;
  const keySecret = live ? settings.liveKeySecret : settings.testKeySecret;
  const webhookSecret = live ? settings.liveWebhookSecret : settings.testWebhookSecret;
  return {
    mode: live ? "live" : "test",
    keyId: String(keyId || "").trim(),
    keySecret: String(keySecret || "").trim(),
    webhookSecret: String(webhookSecret || "").trim(),
    configured: Boolean(String(keyId || "").trim() && String(keySecret || "").trim()),
  };
}

export async function getRawSettings() {
  const db = await ensureReady();
  const doc = await db.collection("settings").findOne({ _id: "store" });
  return doc || { _id: "store", activeMode: "test" };
}

export function toPublicSettings(doc) {
  return {
    activeMode: doc.activeMode === "live" ? "live" : "test",
    testKeyId: doc.testKeyId || "",
    liveKeyId: doc.liveKeyId || "",
    testSecretSet: Boolean(doc.testKeySecret),
    liveSecretSet: Boolean(doc.liveKeySecret),
    testWebhookSet: Boolean(doc.testWebhookSecret),
    liveWebhookSet: Boolean(doc.liveWebhookSecret),
    publicSiteUrl: doc.publicSiteUrl || "",
    productName: doc.productName || "3000+ Presets Pack",
    priceInr: Number(doc.priceInr || 299),
    driveLink: doc.driveLink || "",
    smtpHost: doc.smtpHost || "smtp.gmail.com",
    smtpPort: Number(doc.smtpPort || 587),
    smtpUser: doc.smtpUser || "",
    smtpPassSet: Boolean(doc.smtpPass),
    emailFrom: doc.emailFrom || "",
  };
}

function keepSecret(incoming, existing) {
  const value = String(incoming ?? "").trim();
  return value || existing || "";
}

function normalizeSiteUrl(value) {
  const raw = String(value || "").trim().replace(/\/$/, "");
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Website URL sahi nahi hai.");
    }
    return url.origin;
  } catch (error) {
    if (error.message === "Website URL sahi nahi hai.") throw error;
    throw new Error("Website URL sahi nahi hai.");
  }
}

export async function saveSettings(input) {
  const current = await getRawSettings();
  const activeMode = input.activeMode === "live" ? "live" : "test";
  const priceInr = Math.round(Number(input.priceInr));
  if (!Number.isFinite(priceInr) || priceInr < 1) {
    throw new Error("Price kam se kam ₹1 hona chahiye.");
  }

  const testKeyId = String(input.testKeyId || "").trim();
  const liveKeyId = String(input.liveKeyId || "").trim();
  if (testKeyId && !testKeyId.startsWith("rzp_")) {
    throw new Error("Test Key ID rzp_ se start honi chahiye.");
  }
  if (liveKeyId && !liveKeyId.startsWith("rzp_")) {
    throw new Error("Live Key ID rzp_ se start honi chahiye.");
  }

  const productName = String(input.productName || "").trim();
  if (productName.length < 2) throw new Error("Product name likho.");

  const driveLink = String(input.driveLink || "").trim();
  if (driveLink) {
    try {
      const url = new URL(driveLink);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("bad protocol");
      }
    } catch {
      throw new Error("Google Drive link sahi URL nahi hai.");
    }
  }

  const smtpPort = Number(input.smtpPort || 587);
  if (!Number.isFinite(smtpPort) || smtpPort < 1) {
    throw new Error("SMTP port sahi nahi hai.");
  }

  const next = {
    activeMode,
    testKeyId,
    liveKeyId,
    testKeySecret: keepSecret(input.testKeySecret, current.testKeySecret),
    liveKeySecret: keepSecret(input.liveKeySecret, current.liveKeySecret),
    testWebhookSecret: keepSecret(input.testWebhookSecret, current.testWebhookSecret),
    liveWebhookSecret: keepSecret(input.liveWebhookSecret, current.liveWebhookSecret),
    publicSiteUrl: normalizeSiteUrl(input.publicSiteUrl),
    productName,
    priceInr,
    driveLink,
    smtpHost: String(input.smtpHost || "smtp.gmail.com").trim(),
    smtpPort,
    smtpUser: String(input.smtpUser || "").trim(),
    smtpPass: keepSecret(input.smtpPass, current.smtpPass),
    emailFrom: String(input.emailFrom || "").trim(),
    updatedAt: new Date(),
  };

  const db = await ensureReady();
  await db.collection("settings").updateOne({ _id: "store" }, { $set: next }, { upsert: true });
  storeCache = null;
  storeCacheAt = 0;
  return toPublicSettings(next);
}

export async function findAdmin(email) {
  const db = await ensureReady();
  return db.collection("admins").findOne({ email: String(email || "").trim().toLowerCase() });
}

export async function updateAdminPassword(email, passwordHash) {
  const db = await ensureReady();
  await db.collection("admins").updateOne(
    { email: email.toLowerCase() },
    { $set: { passwordHash, updatedAt: new Date() } }
  );
}

export async function recordCreatedOrder({ orderId, name, email, amountPaise, amountInr, mode, productName }) {
  const db = await ensureReady();
  await db.collection("purchases").updateOne(
    { orderId },
    {
      $setOnInsert: {
        orderId,
        name,
        email,
        amountPaise,
        amountInr,
        mode,
        productName,
        currency: "INR",
        status: "created",
        emailSent: false,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function getPurchaseByOrder(orderId) {
  if (!orderId) return null;
  const db = await ensureReady();
  return db.collection("purchases").findOne({ orderId });
}

export async function claimPurchase(details) {
  const db = await ensureReady();
  const purchases = db.collection("purchases");
  const now = new Date();
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000);

  await purchases.updateOne(
    { orderId: details.orderId },
    { $setOnInsert: { orderId: details.orderId, createdAt: now, emailSent: false, status: "created" } },
    { upsert: true }
  );

  const existing = await purchases.findOne({ orderId: details.orderId });
  if (existing?.emailSent) return { shouldSend: false, alreadySent: true };

  const locked = await purchases.updateOne(
    {
      orderId: details.orderId,
      emailSent: { $ne: true },
      $or: [{ sending: { $ne: true } }, { paidAt: { $lt: staleBefore } }],
    },
    {
      $set: {
        sending: true,
        paymentId: details.paymentId,
        name: details.name,
        email: details.email,
        mode: details.mode,
        method: details.method || "",
        contact: details.contact || "",
        amountPaise: details.amountPaise,
        amountInr: details.amountInr,
        productName: details.productName,
        status: "paid",
        currency: "INR",
        paidAt: existing?.paidAt || now,
      },
    }
  );

  if (locked.modifiedCount === 0) {
    const latest = await purchases.findOne({ orderId: details.orderId });
    return { shouldSend: false, alreadySent: Boolean(latest?.emailSent) };
  }
  return { shouldSend: true, alreadySent: false };
}

export async function finishPurchase({ orderId, emailSent, emailError }) {
  const db = await ensureReady();
  await db.collection("purchases").updateOne(
    { orderId },
    { $set: { emailSent: Boolean(emailSent), emailError: emailError || null, sending: false } }
  );
}

function serializePurchase(doc) {
  return {
    id: String(doc._id),
    orderId: doc.orderId || "",
    paymentId: doc.paymentId || "",
    name: doc.name || "",
    email: doc.email || "",
    amountInr: doc.amountInr || 0,
    mode: doc.mode === "live" ? "live" : "test",
    status: doc.status || "created",
    method: doc.method || "",
    contact: doc.contact || "",
    productName: doc.productName || "",
    emailSent: Boolean(doc.emailSent),
    emailError: doc.emailError || null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    paidAt: doc.paidAt ? new Date(doc.paidAt).toISOString() : null,
  };
}

export async function listPurchases(filter) {
  const db = await ensureReady();
  const query = {};
  if (filter === "test" || filter === "live") {
    query.status = "paid";
    query.mode = filter;
  } else if (filter === "all") {
    // every checkout attempt
  } else {
    query.status = "paid";
  }

  const [rows, paidStats, pending] = await Promise.all([
    db.collection("purchases").find(query).sort({ createdAt: -1 }).limit(300).toArray(),
    db.collection("purchases").aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, payments: { $sum: 1 }, revenue: { $sum: "$amountInr" }, buyers: { $addToSet: "$email" } } },
    ]).toArray(),
    db.collection("purchases").countDocuments({ status: "created" }),
  ]);

  const stats = paidStats[0] || { payments: 0, revenue: 0, buyers: [] };
  return {
    purchases: rows.map(serializePurchase),
    stats: {
      buyers: Array.isArray(stats.buyers) ? stats.buyers.filter(Boolean).length : 0,
      payments: stats.payments || 0,
      revenue: stats.revenue || 0,
      pending,
    },
  };
}
