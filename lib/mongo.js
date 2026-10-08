import dns from "node:dns";
import { MongoClient } from "mongodb";

// This machine's DNS resolver refuses MongoDB SRV lookups (querySrv ECONNREFUSED).
// Public DNS can resolve Atlas, so the driver uses that for cluster discovery only.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const globalForMongo = globalThis;

function databaseUri() {
  const raw = (process.env.MONGODB_URI || "").trim();
  if (!raw) {
    throw new Error("MONGODB_URI .env.local me set nahi hai.");
  }

  const parsed = new URL(raw);
  if (!parsed.pathname || parsed.pathname === "/") {
    parsed.pathname = "/presets-pack";
  }
  if (!parsed.searchParams.has("retryWrites")) parsed.searchParams.set("retryWrites", "true");
  if (!parsed.searchParams.has("w")) parsed.searchParams.set("w", "majority");
  return parsed.toString();
}

export async function getMongoClient() {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(databaseUri(), {
      // One Next.js process (this dev server, or a single host later).
      // Checkout and admin are short queries, not a high-traffic API,
      // and Atlas shared clusters cap total connections.
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 5000,
    });
    globalForMongo._mongoClient = client;
    globalForMongo._mongoClientPromise = client.connect().catch((error) => {
      globalForMongo._mongoClient = undefined;
      globalForMongo._mongoClientPromise = undefined;
      throw error;
    });
  }

  return globalForMongo._mongoClientPromise;
}

export function resetMongoClient() {
  const client = globalForMongo._mongoClient;
  globalForMongo._mongoClient = undefined;
  globalForMongo._mongoClientPromise = undefined;
  if (client) client.close().catch(() => {});
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db();
}
