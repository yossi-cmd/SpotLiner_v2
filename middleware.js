import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function middleware(request) {
  if (request.method === "OPTIONS" && request.nextUrl.pathname.startsWith("/api")) {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }
  const res = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api")) {
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  }
  return res;
}
