import { resend } from "./resend";

export async function sendVerificationEmail(
    email: string,
    token: string
) {
    const verificationLink =
        `${process.env.URL}/verify-email?token=${token}`;

    const { data, error } = await resend.emails.send({
        from: "AI LMS <noreply@mahnish.me>",
        to: email,
        subject: "Verify your email",
        html: `
      <h1>Verify Email</h1>
      <p>Please verify your email address.</p>

      <a href="${verificationLink}">
        Click here to verify
      </a>
    `,
    });

    if (error) {
        console.error("Verification email error:", error);
        throw new Error("Failed to send verification email");
    }

    return data;
}

export async function sendPasswordResetEmail(
    email: string,
    token: string
) {
    const resetLink =
        `${process.env.URL}/reset-password?token=${token}`;

    const { data, error } = await resend.emails.send({
        from: "AI LMS <noreply@mahnish.me>",
        to: email,
        subject: "Reset your password",
        html: `
      <h1>Reset your password</h1>
      <p>Click the button below to reset your password.</p>

      <a href="${resetLink}">
        Click here to set a new password
      </a>
    `,
    });

    if (error) {
        console.error("Password reset email error:", error);
        throw new Error("Failed to send password reset email");
    }

    return data;
}

export async function sendTeacherInviteEmail(
    email: string,
    token: string
) {
    const inviteLink =
        `${process.env.URL}/teacher-invite/accept?token=${token}`;

    const { data, error } = await resend.emails.send({
        from: "AI LMS <noreply@mahnish.me>",
        to: email,
        subject: "You've been invited to teach on AI LMS",
        html: `
      <h1>Teacher invitation</h1>

      <p>
        An admin has invited you to join AI LMS as a teacher.
      </p>

      <a href="${inviteLink}">
        Click here to set up your account
      </a>
    `,
    });

    if (error) {
        console.error("Teacher invitation error:", error);
        throw new Error("Failed to send teacher invitation email");
    }

    return data;
}