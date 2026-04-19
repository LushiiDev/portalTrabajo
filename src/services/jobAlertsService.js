import { supabase } from "../config/supabase.js";
import { sendEmail } from "./emailService.js";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function jobMatchesAlert(job, alert) {
  const normalizedKeyword = normalizeText(alert.keyword);
  if (!normalizedKeyword) {
    return false;
  }

  const haystack = normalizeText([
    job.title,
    job.description,
    job.location,
    job.contract_type,
    job.work_mode,
    job.experience_level,
  ].filter(Boolean).join(" "));

  if (!haystack.includes(normalizedKeyword)) {
    return false;
  }

  const alertLocation = normalizeText(alert.location);
  if (!alertLocation) {
    return true;
  }

  return normalizeText(job.location).includes(alertLocation);
}

function getJobUrl(jobId) {
  const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || "http://127.0.0.1:5500/public").replace(/\/$/, "");
  return `${frontendBaseUrl}/informacionEmpleo.html?id=${jobId}`;
}

async function getUserEmailById(userId) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    throw error;
  }

  return data?.user?.email || null;
}

export const notifyUsersForNewJob = async (job) => {
  const { data: alerts, error: alertsError } = await supabase
    .from("alerts")
    .select("id, user_id, keyword, location, notify_email")
    .eq("notify_email", true);

  if (alertsError) {
    throw alertsError;
  }

  const totalEmailAlerts = (alerts || []).length;

  const matchingAlerts = (alerts || []).filter((alert) => jobMatchesAlert(job, alert));
  if (!matchingAlerts.length) {
    return {
      totalEmailAlerts,
      matchedAlerts: 0,
      recipients: 0,
      emailsSent: 0,
    };
  }

  const uniqueUserIds = Array.from(new Set(matchingAlerts.map((alert) => alert.user_id).filter(Boolean)));
  if (!uniqueUserIds.length) {
    return {
      totalEmailAlerts,
      matchedAlerts: matchingAlerts.length,
      recipients: 0,
      emailsSent: 0,
    };
  }

  const emailByUserId = new Map();
  for (const userId of uniqueUserIds) {
    try {
      const email = await getUserEmailById(userId);
      if (email) {
        emailByUserId.set(userId, email);
      }
    } catch (error) {
      console.error("No se pudo obtener email del usuario para alerta:", userId, error.message || error);
    }
  }

  const recipients = Array.from(emailByUserId.values());
  if (!recipients.length) {
    return {
      totalEmailAlerts,
      matchedAlerts: matchingAlerts.length,
      recipients: 0,
      emailsSent: 0,
    };
  }

  const jobUrl = getJobUrl(job.id);
  const subject = `Nueva vacante para ti: ${job.title || "Oferta laboral"}`;
  const text = [
    "Hola,",
    "",
    "Se publico una vacante que coincide con una de tus alertas en ChambaHub.",
    `Puesto: ${job.title || "Oferta laboral"}`,
    `Ubicacion: ${job.location || "No especificada"}`,
    `Modalidad: ${job.work_mode || "No especificada"}`,
    "",
    `Ver oferta: ${jobUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">Nueva vacante para ti</h2>
      <p>Se publico una vacante que coincide con una de tus alertas en ChambaHub.</p>
      <ul>
        <li><strong>Puesto:</strong> ${job.title || "Oferta laboral"}</li>
        <li><strong>Ubicacion:</strong> ${job.location || "No especificada"}</li>
        <li><strong>Modalidad:</strong> ${job.work_mode || "No especificada"}</li>
      </ul>
      <p>
        <a href="${jobUrl}" style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;display:inline-block;">
          Ver oferta
        </a>
      </p>
    </div>
  `;

  let emailsSent = 0;
  await Promise.all(
    recipients.map(async (email) => {
      try {
        const result = await sendEmail({
          to: email,
          subject,
          text,
          html,
        });

        if (result.sent) {
          emailsSent += 1;
        }
      } catch (error) {
        console.error("Error enviando alerta por correo a", email, error.message || error);
      }
    }),
  );

  return {
    totalEmailAlerts,
    matchedAlerts: matchingAlerts.length,
    recipients: recipients.length,
    emailsSent,
  };
};
