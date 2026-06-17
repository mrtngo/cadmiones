import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_PASSWORD, AUTH_TOKEN, AUTH_USER } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = String(body.user ?? "").trim();
  const clave = String(body.clave ?? "");

  if (user !== AUTH_USER || clave !== AUTH_PASSWORD) {
    return NextResponse.json({ error: "Usuario o clave incorrectos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, AUTH_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
