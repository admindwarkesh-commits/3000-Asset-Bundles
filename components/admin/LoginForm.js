"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login fail.");
      router.replace("/admin");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page login-wrap">
      <form className="admin-card" onSubmit={onSubmit}>
        <p className="admin-kicker">Presets admin</p>
        <h1>Login</h1>
        <p className="admin-copy">Yahan se Test / Live Razorpay, webhook, aur purchases manage honge.</p>
        <label htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="admin-error">{error}</p> : null}
        <button className="admin-primary" type="submit" disabled={loading}>
          {loading ? "Checking..." : "Login"}
        </button>
        <Link className="admin-back" href="/">
          Store par wapas
        </Link>
      </form>
    </main>
  );
}
