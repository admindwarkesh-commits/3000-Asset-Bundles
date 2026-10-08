import nodemailer from "nodemailer";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char];
  });
}

export async function sendDownloadEmail({ name, email, driveLink, productName, amountInr, smtp }) {
  const host = (smtp?.host || process.env.SMTP_HOST || "").trim();
  const port = Number(smtp?.port || process.env.SMTP_PORT || 587);
  const user = (smtp?.user || process.env.SMTP_USER || "").trim();
  const pass = smtp?.pass || process.env.SMTP_PASS || "";
  const from = (smtp?.from || process.env.EMAIL_FROM || user).trim();

  if (!host || !user || !pass || !from) {
    const error = new Error("SMTP details .env.local me set nahi hain.");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }

  let safeLink;
  try {
    const url = new URL(driveLink);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("bad protocol");
    }
    safeLink = url.toString();
  } catch {
    const error = new Error("GOOGLE_DRIVE_LINK sahi URL nahi hai.");
    error.code = "BAD_DRIVE_LINK";
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const safeName = escapeHtml(name);
  const safeProduct = escapeHtml(productName);
  const safeHref = escapeHtml(safeLink);

  await transporter.sendMail({
    from,
    to: email,
    subject: `Your ${productName} — download link`,
    text: [
      `Hi ${name},`,
      "",
      `Payment of ₹${amountInr} received for ${productName}.`,
      "",
      "Download your presets here:",
      safeLink,
      "",
      "Thank you.",
    ].join("\n"),
    html: `
      <div style="margin:0;padding:24px;background:#070b16;font-family:Arial,Helvetica,sans-serif;color:#f4f7ff;">
        <div style="max-width:520px;margin:0 auto;background:#10192d;border:1px solid #2a406c;border-radius:18px;padding:28px;">
          <p style="margin:0 0 8px;color:#8eb6ff;font-size:12px;letter-spacing:1.5px;">PAYMENT RECEIVED</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;">Your presets are ready</h1>
          <p style="margin:0 0 12px;color:#d5def0;font-size:16px;line-height:1.5;">Hi ${safeName},</p>
          <p style="margin:0 0 18px;color:#d5def0;font-size:16px;line-height:1.5;">
            We received <b>₹${amountInr}</b> for <b>${safeProduct}</b>.
            Your Google Drive download link is below.
          </p>
          <a href="${safeHref}" style="display:inline-block;background:#ffe14a;color:#111111;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;">
            Open Google Drive
          </a>
          <p style="margin:18px 0 0;color:#9eb0cc;font-size:13px;line-height:1.5;">
            If the button does not open, copy this link:<br />
            <a href="${safeHref}" style="color:#8eb6ff;word-break:break-all;">${safeHref}</a>
          </p>
        </div>
      </div>
    `,
  });
}
