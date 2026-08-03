import withAuth from "next-auth/middleware";

// withAuth doesn't read our app's authOptions automatically, so we have to
// tell it here too where the real login page lives -- otherwise it sends
// logged-out users to NextAuth's plain built-in sign-in page instead.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

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