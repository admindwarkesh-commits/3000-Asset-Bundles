"use client";

import { useEffect, useState } from "react";

const empty = {
  activeMode: "test",
  testKeyId: "",
  testKeySecret: "",
  testWebhookSecret: "",
  liveKeyId: "",
  liveKeySecret: "",
  liveWebhookSecret: "",
  publicSiteUrl: "",
  productName: "3000+ Presets Pack",
  priceInr: 299,
  driveLink: "",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  emailFrom: "",
};

function webhookUrl(publicSiteUrl) {
  const saved = String(publicSiteUrl || "").trim().replace(/\/$/, "");
  if (saved) return `${saved}/api/razorpay-webhook`;
  if (typeof window !== "undefined") return `${window.location.origin}/api/razorpay-webhook`;
  return "/api/razorpay-webhook";
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    if (!copied) throw new Error("copy failed");
  }
}

export default function SettingsForm() {
  const [form, setForm] = useState(empty);
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (response) => {
        const body = await response.json();
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) throw new Error(body.error || "Settings load nahi hui.");
        setFlags(body);
        setForm((current) => ({
          ...current,
          ...body,
          testKeySecret: "",
          testWebhookSecret: "",
          liveKeySecret: "",
          liveWebhookSecret: "",
          smtpPass: "",
        }));
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function onCopy(label, value) {
    try {
      await copyText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Copy nahi hua. URL ko select karke manually copy karo.");
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Save nahi hua.");
      setFlags(body);
      setForm((current) => ({
        ...current,
        ...body,
        testKeySecret: "",
        testWebhookSecret: "",
        liveKeySecret: "",
        liveWebhookSecret: "",
        smtpPass: "",
      }));
      setMessage("Save ho gaya. Website ab isi mode ki keys use karegi.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Password change nahi hua.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password change ho gaya.");
  }

  const url = webhookUrl(form.publicSiteUrl);
  const localUrl = typeof window !== "undefined" ? `${window.location.origin}/api/razorpay-webhook` : "";

  if (loading) return <p className="admin-copy">Loading settings...</p>;

  return (
    <div className="settings-form">
    <form onSubmit={onSubmit}>
      <section className="admin-card">
        <h1>Payment setup</h1>
        <p className="admin-copy">
          Jo mode select hoga, Buy Now usi Razorpay account se paisa lega. Test aur Live dono yahin save hote hain.
        </p>
        <div className="mode-switch">
          <button
            type="button"
            className={form.activeMode === "test" ? "active" : ""}
            onClick={() => setField("activeMode", "test")}
          >
            Test
          </button>
          <button
            type="button"
            className={form.activeMode === "live" ? "active" : ""}
            onClick={() => setField("activeMode", "live")}
          >
            Live
          </button>
        </div>
        <p className="admin-copy">
          {form.activeMode === "live"
            ? "Live mode: customers ka real payment katega."
            : "Test mode: real payment nahi katega."}
        </p>
      </section>

      <section className="admin-card">
        <h2>Webhook</h2>
        <p className="admin-copy">
          Razorpay → Account & Settings → Webhooks → Add New Webhook. Neeche wali URL copy karke wahan paste karo.
          Event sirf <b>payment.captured</b> select karo. Test aur Live dashboard me alag webhook banta hai, URL same rahegi.
        </p>
        <label htmlFor="public-url">Website URL</label>
        <input
          id="public-url"
          placeholder="https://yourdomain.com"
          value={form.publicSiteUrl}
          onChange={(event) => setField("publicSiteUrl", event.target.value)}
        />
        <p className="admin-copy">Khali chhodo to isi browser wali site ki URL copy hogi.</p>
        <label>Webhook URL</label>
        <div className="copy-row">
          <input readOnly value={url} />
          <button type="button" onClick={() => onCopy("url", url)}>
            {copied === "url" ? "Copied" : "Copy"}
          </button>
        </div>
        {url.includes("localhost") ? (
          <p className="admin-warn">Razorpay localhost accept nahi karta. Site live hone ke baad domain yahan likh ke URL copy karo.</p>
        ) : null}
        {localUrl && localUrl !== url ? <p className="admin-copy">Is browser ki URL: {localUrl}</p> : null}
        <label>Event name</label>
        <div className="copy-row">
          <input readOnly value="payment.captured" />
          <button type="button" onClick={() => onCopy("event", "payment.captured")}>
            {copied === "event" ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <div className="key-grid">
        <KeyCard
          title="Test keys"
          hint="Razorpay Test Mode → API Keys. Key ID rzp_test_ se start hoti hai."
          keyPlaceholder="rzp_test_..."
          keyId={form.testKeyId}
          onKeyId={(value) => setField("testKeyId", value)}
          secretSet={flags.testSecretSet}
          secret={form.testKeySecret}
          onSecret={(value) => setField("testKeySecret", value)}
          webhookSet={flags.testWebhookSet}
          webhook={form.testWebhookSecret}
          onWebhook={(value) => setField("testWebhookSecret", value)}
        />
        <KeyCard
          title="Live keys"
          hint="Razorpay Live Mode → API Keys. Key ID rzp_live_ se start hoti hai."
          keyPlaceholder="rzp_live_..."
          keyId={form.liveKeyId}
          onKeyId={(value) => setField("liveKeyId", value)}
          secretSet={flags.liveSecretSet}
          secret={form.liveKeySecret}
          onSecret={(value) => setField("liveKeySecret", value)}
          webhookSet={flags.liveWebhookSet}
          webhook={form.liveWebhookSecret}
          onWebhook={(value) => setField("liveWebhookSecret", value)}
        />
      </div>

      <section className="admin-card">
        <h2>Download and email</h2>
        <label htmlFor="product-name">Product name</label>
        <input id="product-name" value={form.productName} onChange={(event) => setField("productName", event.target.value)} />
        <label htmlFor="price">Price (INR)</label>
        <input
          id="price"
          inputMode="numeric"
          value={form.priceInr}
          onChange={(event) => setField("priceInr", event.target.value)}
        />
        <label htmlFor="drive">Google Drive link</label>
        <input
          id="drive"
          placeholder="https://drive.google.com/..."
          value={form.driveLink}
          onChange={(event) => setField("driveLink", event.target.value)}
        />
        <label htmlFor="smtp-host">SMTP host</label>
        <input id="smtp-host" value={form.smtpHost} onChange={(event) => setField("smtpHost", event.target.value)} />
        <label htmlFor="smtp-port">SMTP port</label>
        <input id="smtp-port" inputMode="numeric" value={form.smtpPort} onChange={(event) => setField("smtpPort", event.target.value)} />
        <label htmlFor="smtp-user">SMTP email</label>
        <input id="smtp-user" value={form.smtpUser} onChange={(event) => setField("smtpUser", event.target.value)} />
        <label htmlFor="smtp-pass">SMTP password {flags.smtpPassSet ? "(saved)" : ""}</label>
        <input
          id="smtp-pass"
          type="password"
          placeholder={flags.smtpPassSet ? "Blank chhodo to purana password rahega" : "Gmail app password"}
          value={form.smtpPass}
          onChange={(event) => setField("smtpPass", event.target.value)}
        />
        <label htmlFor="email-from">From name</label>
        <input
          id="email-from"
          placeholder="Presets Pack <you@gmail.com>"
          value={form.emailFrom}
          onChange={(event) => setField("emailFrom", event.target.value)}
        />
      </section>

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-ok">{message}</p> : null}
      <button className="admin-primary" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save settings"}
      </button>
    </form>

      <section className="admin-card password-card">
        <h2>Admin password</h2>
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <button className="admin-ghost" type="button" onClick={changePassword}>
          Change password
        </button>
      </section>
    </div>
  );
}

function KeyCard({ title, hint, keyPlaceholder, keyId, onKeyId, secretSet, secret, onSecret, webhookSet, webhook, onWebhook }) {
  return (
    <section className="admin-card">
      <h2>{title}</h2>
      <p className="admin-copy">{hint}</p>
      <label>Key ID</label>
      <input value={keyId} onChange={(event) => onKeyId(event.target.value)} placeholder={keyPlaceholder} autoComplete="off" />
      <label>Key Secret {secretSet ? "(saved)" : ""}</label>
      <input
        type="password"
        value={secret}
        onChange={(event) => onSecret(event.target.value)}
        placeholder={secretSet ? "Blank chhodo to purana secret rahega" : "Paste key secret"}
        autoComplete="off"
      />
      <label>Webhook secret {webhookSet ? "(saved)" : ""}</label>
      <input
        type="password"
        value={webhook}
        onChange={(event) => onWebhook(event.target.value)}
        placeholder={webhookSet ? "Blank chhodo to purana secret rahega" : "Razorpay webhook secret paste karo"}
        autoComplete="off"
      />
    </section>
  );
}
