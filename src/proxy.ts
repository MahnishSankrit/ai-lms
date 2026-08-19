// import withAuth from "next-auth/middleware";

// withAuth doesn't read our app's authOptions automatically, so we have to
// tell it here too where the real login page lives -- otherwise it sends
// logged-out users to NextAuth's plain built-in sign-in page instead.
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    console.log("Middleware token:", req.nextauth.token);
  },
  {
    pages: {
      signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};