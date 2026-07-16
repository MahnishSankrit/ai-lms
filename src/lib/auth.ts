import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";

import { NextAuthOptions } from "next-auth";

export async function verifyPassword(loginPassword: string, storedPassword: string) {
    if (storedPassword.startsWith("$2")) {
        return bcrypt.compare(loginPassword, storedPassword);
    }

    return loginPassword === storedPassword;
}

export const authOptions: NextAuthOptions = {

    adapter: PrismaAdapter(prisma),

    session: {
        strategy: "jwt",
    },

    providers: [

        CredentialsProvider({

            name: "credentials",

            credentials: {
                email: {},
                password: {},
            },

            async authorize(credentials) {

                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                });

                if (!user) {
                    throw new Error("User not found");
                }

                const isPasswordCorrect = await verifyPassword(credentials.password, user.password);

                if (!isPasswordCorrect) {
                    throw new Error("Invalid password");
                }

                return user;
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {

            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.email = user.email;
            }

            if (!token.id && token.sub) {
                token.id = token.sub;
            }

            return token;
        },

        async session({ session, token }) {

            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "student" | "teacher" | "admin";
                session.user.email = token.email as string;
            }

            return session;
        },

    },

    secret: process.env.NEXTAUTH_SECRET,
};