import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";

import { NextAuthOptions } from "next-auth";

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

                const isPasswordCorrect = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

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
                token.role = user.role;
            }

            return token;
        },

        async session({ session, token }) {

            if (session.user) {
                session.user.role = token.role;
            }

            return session;
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
};