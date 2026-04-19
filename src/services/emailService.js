import nodemailer from "nodemailer";

let transporter = null;
let smtpConfigErrorShown = false;

function getSmtpTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    if (!smtpConfigErrorShown) {
      smtpConfigErrorShown = true;
      console.warn("Alertas por correo deshabilitadas: faltan SMTP_HOST, SMTP_USER o SMTP_PASS");
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

export const sendEmail = async ({ to, subject, html, text }) => {
  const smtpTransporter = getSmtpTransporter();
  if (!smtpTransporter) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const from = process.env.SMTP_FROM || "ChambaHub <no-reply@chambahub.local>";

  await smtpTransporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });

  return { sent: true };
};
