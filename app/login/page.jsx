"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { login } from "@/lib/api";
import styles from "./Auth.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err) {
      setError(err.message || "התחברות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>ספוטליינר</h1>
        <p className={styles.subtitle}>התחבר לחשבון שלך</p>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
            autoComplete="email"
            placeholder="אימייל"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
            autoComplete="current-password"
            placeholder="סיסמה"
          />
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "מתחבר..." : "התחבר"}
          </button>
        </form>
        <p className={styles.footer}>
          אין לך חשבון? <Link href="/register">הירשם</Link>
        </p>
      </div>
    </div>
  );
}
