/**
 * Email Service — Brevo REST API
 *
 * Encapsula el envío de emails transaccionales usando la API de Brevo.
 * 
 * Configura las variables de entorno:
 *   BREVO_API_KEY      → Tu API Key de Brevo.com
 *   BREVO_FROM_EMAIL   → Email de origen verificado (o tu Gmail si usas Brevo SMTP relay)
 *   BREVO_FROM_NAME    → Nombre del remitente
 */
import { render } from "@react-email/render";
import VerificationEmail from "./emails/verification-email";
import ResetPasswordEmail from "./emails/reset-password-email";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

type SendEmailOptions = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
};

async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME ?? "Tu App";

  if (!apiKey || !fromEmail) {
    console.error(
      "[EmailService] Faltan variables de entorno: BREVO_API_KEY o BREVO_FROM_EMAIL",
    );
    // En local, sin Brevo, se muestra el enlace en la consola para poder probar
    if (process.env.NODE_ENV === "development") {
      console.info(`[EmailService] Correo para ${to.email} (${subject}): ${text ?? ""}`);
    }
    return;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to.email, name: to.name ?? to.email }],
        subject,
        htmlContent: html,
        textContent: text ?? "",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[EmailService] Error al enviar email a través de Brevo:", errorBody);
    }
  } catch (error) {
    console.error("[EmailService] Error inesperado en EmailService (Brevo):", error);
  }
}

// ─── Templates de Email ──────────────────────────────────────────────────────

export async function sendVerificationEmail({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}) {
  const companyName = process.env.BREVO_FROM_NAME ?? "Tu App";
  
  // Render the React Email component to an HTML string
  const htmlString = await render(
    <VerificationEmail companyName={companyName} name={name} url={url} />
  );

  await sendEmail({
    to: { email, name },
    subject: "Verifica tu cuenta",
    html: htmlString,
    text: `Verifica tu cuenta: ${url}`,
  });
}

export async function sendPasswordResetEmail({
  email,
  name,
  url,
}: {
  email: string;
  name: string;
  url: string;
}) {
  const companyName = process.env.BREVO_FROM_NAME ?? "Tu App";
  
  // Render the React Email component to an HTML string
  const htmlString = await render(
    <ResetPasswordEmail companyName={companyName} name={name} url={url} />
  );

  await sendEmail({
    to: { email, name },
    subject: "Recupera tu contraseña",
    html: htmlString,
    text: `Restablece tu contraseña: ${url}`,
  });
}
