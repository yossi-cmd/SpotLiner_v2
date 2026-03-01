"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import Layout from "@/components/Layout";

export default function MainLayout({ children }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (token && !user) loadUser();
  }, [token, user, loadUser]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) router.replace("/login");
  }, [mounted, token, router]);

  if (!mounted) return <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>טוען...</div>;
  if (!token) return null;

  return <Layout>{children}</Layout>;
}
