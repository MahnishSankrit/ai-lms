import { resend } from "./resend";

export async function sendVerificationEmail(
    email: string,
    token: string
) {

    const verificationLink =
        `${process.env.URL}/verify-email?token=${token}`;

    await resend.emails.send({

        from: "onboarding@resend.dev",

        to: email,

        subject: "Verify your email",

        html: `
      <h1>Verify Email</h1>

      <a href="${verificationLink}">
        Click here to verify
      </a>
    `,
    });
}