import { isValidEmail } from "./config";
import { sendDownloadEmail } from "./email";
import { claimPurchase, finishPurchase, getPurchaseByOrder, getStore } from "./store";

export async function fulfillPayment({ paymentId, orderId, name, email, mode, method, contact }) {
  const store = await getStore();
  const purchase = await getPurchaseByOrder(orderId);
  const amountPaise = purchase?.amountPaise || store.pricePaise;
  const amountInr = purchase?.amountInr || store.priceInr;
  const resolvedMode = mode || purchase?.mode || store.activeMode;

  const claim = await claimPurchase({
    orderId,
    paymentId,
    name,
    email,
    mode: resolvedMode,
    method,
    contact,
    amountPaise,
    amountInr,
    productName: purchase?.productName || store.productName,
  });

  if (!claim.shouldSend) {
    return {
      ok: true,
      emailSent: Boolean(claim.alreadySent),
      alreadySent: Boolean(claim.alreadySent),
      emailError: claim.alreadySent ? null : claim.emailError || null,
      driveLink: store.driveLink || null,
      email,
    };
  }

  let emailSent = false;
  let emailError = null;

  try {
    if (!isValidEmail(email)) {
      emailError = "EMAIL_MISSING";
    } else if (!store.driveLink) {
      emailError = "DRIVE_LINK_MISSING";
    } else {
      await sendDownloadEmail({
        name,
        email,
        driveLink: store.driveLink,
        productName: store.productName,
        amountInr,
        smtp: {
          host: store.smtpHost,
          port: store.smtpPort,
          user: store.smtpUser,
          pass: store.smtpPass,
          from: store.emailFrom,
        },
      });
      emailSent = true;
    }
  } catch (error) {
    console.error("Download email failed:", error.code || error.message);
    emailError = error.code || "EMAIL_FAILED";
  } finally {
    await finishPurchase({ orderId, emailSent, emailError });
  }

  return {
    ok: true,
    emailSent,
    emailError,
    driveLink: store.driveLink || null,
    email,
  };
}
