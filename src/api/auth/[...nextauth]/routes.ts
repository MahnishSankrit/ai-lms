import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth";

const handler = NextAuth(authOptions); // it is important to export the handler as default export, otherwise next-auth will not work because it will not be able to find the handler

export default handler;