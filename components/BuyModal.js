"use client";

import { useEffect, useId, useRef, useState } from "react";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function successCopy(result) {
  if (result.emailSent) {
    return `Download link ${result.email} par bhej di gayi hai. Inbox aur spam dono check kar lena.`;
  }
  if (result.emailError === "EMAIL_NOT_CONFIGURED") {
    return "Payment ho gaya. Email abhi set nahi hai, isliye Drive link neeche de diya hai. .env.local me SMTP details daaloge to email bhi jayegi.";
  }
  if (result.emailError === "DRIVE_LINK_MISSING") {
    return "Payment ho gaya. Google Drive link .env.local me GOOGLE_DRIVE_LINK par abhi set nahi hai.";
  }
  if (result.emailError === "BAD_DRIVE_LINK") {
    return "Payment ho gaya. Drive link URL sahi nahi hai. .env.local me GOOGLE_DRIVE_LINK check karo.";
  }
  return "Payment ho gaya, lekin email nahi ja payi. Neeche wala link save kar lo.";
}

export default function BuyModal({ price, productName, onClose }) {
  const titleId = useId();
  const nameRef = useRef(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nameRef.current?.focus();

    function onKey(event) {
      if (event.key === "Escape" && !loading) onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [loading, onClose]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      setError("Apna naam likho.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Sahi email address likho.");
      return;
    }

    setLoading(true);
    try {
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(order.error || "Order nahi ban paya.");
      }

      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        throw new Error("Razorpay checkout load nahi hua. Internet check karo.");
      }

      const outcome = await new Promise((resolve, reject) => {
        let settled = false;
        let failureMessage = "";

        function finish(callback, value) {
          if (settled) return;
          settled = true;
          callback(value);
        }

        const checkout = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: productName,
          description: "Instant download — presets pack",
          order_id: order.orderId,
          prefill: { name: cleanName, email: cleanEmail },
          theme: { color: "#1d4ed8" },
          handler: async (response) => {
            try {
              const verifyResponse = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  name: cleanName,
                  email: cleanEmail,
                }),
              });
              const data = await verifyResponse.json();
              if (!verifyResponse.ok) {
                finish(reject, new Error(data.error || "Payment verify nahi hua."));
                return;
              }
              setResult(data);
              finish(resolve, "paid");
            } catch (verifyError) {
              finish(reject, verifyError);
            }
          },
          modal: {
            ondismiss: () => {
              if (failureMessage) {
                finish(reject, new Error(failureMessage));
                return;
              }
              finish(resolve, "dismissed");
            },
          },
        });

        checkout.on("payment.failed", (response) => {
          failureMessage = response?.error?.description || "Payment fail ho gaya.";
        });
        checkout.open();
      });

      if (outcome === "dismissed") {
        setError("Payment cancel ho gaya. Dobara try kar sakte ho.");
      }
    } catch (submitError) {
      setError(submitError.message || "Kuch galat ho gaya.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) onClose();
    }}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button className="close" type="button" onClick={onClose} disabled={loading} aria-label="Close">
          ×
        </button>

        {result ? (
          <div className="success">
            <div className="success-mark" aria-hidden="true">✓</div>
            <h2 id={titleId}>Payment successful</h2>
            <p>{successCopy(result)}</p>
            {result.driveLink ? (
              <a className="buy" href={result.driveLink} target="_blank" rel="noreferrer">
                Open Google Drive
              </a>
            ) : null}
            <button className="ghost" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <p className="sheet-kicker">Secure checkout</p>
            <h2 id={titleId}>Naam aur email daalo</h2>
            <p className="sheet-copy">
              Payment ke baad <b>{productName}</b> ki Google Drive link isi email par aa jayegi.
            </p>

            <label htmlFor="buyer-name">Name</label>
            <input
              ref={nameRef}
              id="buyer-name"
              name="name"
              autoComplete="name"
              placeholder="Rahul Sharma"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />

            <label htmlFor="buyer-email">Email</label>
            <input
              id="buyer-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="rahul@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={120}
              required
            />

            {error ? <p className="form-error">{error}</p> : null}

            <button className="buy buy-full" type="submit" disabled={loading}>
              {loading ? "Opening payment..." : `Pay ₹${price.toLocaleString("en-IN")}`}
            </button>
            <p className="fine-print">Razorpay se safe payment. Card, UPI, netbanking.</p>
          </form>
        )}
      </section>
    </div>
  );
}
