"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { register } from "@/lib/api";
import styles from "../login/Auth.module.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(email, password, displayName);
      setAuth(data.user, data.token);
      router.push("/");
    } catch (err) {
      setError(err.message || "הרשמה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>ספוטליינר</h1>
        <p className={styles.subtitle}>צור חשבון חדש</p>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={styles.input}
            autoComplete="name"
            placeholder="שם לתצוגה"
          />
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
            minLength={6}
            autoComplete="new-password"
            placeholder="סיסמה (לפחות 6 תווים)"
          />
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "נרשם..." : "הירשם"}
          </button>
        </form>
        <p className={styles.footer}>
          כבר יש לך חשבון? <Link href="/login">התחבר</Link>
        </p>
      </div>
    </div>
  );
}
