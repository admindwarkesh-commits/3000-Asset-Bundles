"use client";

import { useEffect, useState } from "react";

const filters = [
  { id: "paid", label: "Paid" },
  { id: "test", label: "Test" },
  { id: "live", label: "Live" },
  { id: "all", label: "All" },
];

function when(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function emailLabel(purchase) {
  if (purchase.emailSent) return "Email sent";
  if (purchase.status !== "paid") return "Not paid yet";
  if (purchase.emailError === "EMAIL_NOT_CONFIGURED") return "Email setup missing";
  if (purchase.emailError === "DRIVE_LINK_MISSING") return "Drive link missing";
  if (purchase.emailError === "EMAIL_MISSING") return "Email missing";
  if (purchase.emailError === "BAD_DRIVE_LINK") return "Drive link invalid";
  if (purchase.emailError) return "Email failed";
  return "Email pending";
}

export default function PurchasesPanel() {
  const [filter, setFilter] = useState("paid");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/admin/purchases?filter=${filter}`)
      .then(async (response) => {
        const body = await response.json();
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) throw new Error(body.error || "Load nahi hua.");
        if (!ignore) {
          setData(body);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [filter]);

  const stats = data?.stats;

  return (
    <section>
      <div className="stat-grid">
        <article>
          <span>Logon ne kharida</span>
          <strong>{stats ? stats.buyers : "—"}</strong>
        </article>
        <article>
          <span>Paid orders</span>
          <strong>{stats ? stats.payments : "—"}</strong>
        </article>
        <article>
          <span>Total</span>
          <strong>{stats ? `₹${Number(stats.revenue).toLocaleString("en-IN")}` : "—"}</strong>
        </article>
        <article>
          <span>Pending</span>
          <strong>{stats ? stats.pending : "—"}</strong>
        </article>
      </div>

      <div className="filter-row">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "active" : ""}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {loading ? <p className="admin-copy">Loading purchases...</p> : null}

      {!loading && data?.purchases?.length === 0 ? (
        <div className="admin-card empty-card">
          <h2>Abhi koi purchase nahi</h2>
          <p className="admin-copy">
            Jab koi Buy Now karke payment karega, naam, email, amount, payment ID aur email status yahan dikhega.
          </p>
        </div>
      ) : null}

      <div className="purchase-list">
        {data?.purchases?.map((purchase) => (
          <article className="purchase-card" key={purchase.id}>
            <header>
              <div>
                <h2>{purchase.name || "Customer"}</h2>
                <p>{purchase.email || "No email"}</p>
              </div>
              <div className="purchase-amount">
                <strong>₹{Number(purchase.amountInr).toLocaleString("en-IN")}</strong>
                <span className={`badge ${purchase.status === "paid" ? "paid" : "pending"}`}>
                  {purchase.status === "paid" ? "Paid" : "Pending"}
                </span>
              </div>
            </header>
            <dl>
              <div>
                <dt>Mode</dt>
                <dd>{purchase.mode === "live" ? "Live" : "Test"}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{purchase.method || "—"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{purchase.contact || "—"}</dd>
              </div>
              <div>
                <dt>Email status</dt>
                <dd>{emailLabel(purchase)}</dd>
              </div>
              <div>
                <dt>Payment ID</dt>
                <dd>{purchase.paymentId || "—"}</dd>
              </div>
              <div>
                <dt>Order ID</dt>
                <dd>{purchase.orderId || "—"}</dd>
              </div>
              <div>
                <dt>Product</dt>
                <dd>{purchase.productName || "—"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{when(purchase.createdAt)}</dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>{when(purchase.paidAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
