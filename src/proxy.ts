// import withAuth from "next-auth/middleware";

// withAuth doesn't read our app's authOptions automatically, so we have to
// tell it here too where the real login page lives -- otherwise it sends
// logged-out users to NextAuth's plain built-in sign-in page instead.



import { withAuth } from "next-auth/middleware";

// No custom function: it only logged every request's path and full JWT,
// which floods the logs (one line per sidebar prefetch) and leaks tokens.
export default withAuth(
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