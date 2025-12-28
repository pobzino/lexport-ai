import { NextResponse } from "next/server";
import { clearPortalSession } from "@/lib/portal-auth";

export async function POST() {
    await clearPortalSession();
    return NextResponse.redirect(new URL("/portal/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}

export async function GET() {
    await clearPortalSession();
    return NextResponse.redirect(new URL("/portal/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
