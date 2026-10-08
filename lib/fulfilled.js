import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "fulfilled.json");

function readIds() {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function wasFulfilled(paymentId) {
  return readIds().includes(paymentId);
}

export function markFulfilled(paymentId) {
  try {
    const ids = readIds();
    if (!ids.includes(paymentId)) ids.push(paymentId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(ids));
  } catch (error) {
    console.error("Could not save fulfilled payment id:", error.message);
  }
}
