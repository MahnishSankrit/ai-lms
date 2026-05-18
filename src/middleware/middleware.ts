import { NextResponse, NextRequest } from "next/server";

export { default } from "next-auth/middleware";
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/admin/:path*",
  ],
};