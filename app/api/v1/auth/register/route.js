import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { query } from "@/lib/db";
import { signToken } from "@/lib/auth";

const SALT_ROUNDS = 10;

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password;
    const displayName = body.displayName?.trim() || null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await query("SELECT id FROM users WHERE LOWER(email) = $1", [
      email,
    ]);
    if (existing.rows.length) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      "INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, role, created_at",
      [email, passwordHash, displayName, "user"]
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id, role: user.role });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
