import dns from "node:dns";
import nodemailer from "nodemailer";

// Render has no outbound IPv6; make Node try IPv4 addresses first.
dns.setDefaultResultOrder("ipv4first");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export function getEmailConfigStatus() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, BREVO_API_KEY } = process.env;

  if (BREVO_API_KEY?.trim()) {
    const from = MAIL_FROM?.trim() || "";
    return {
      configured: Boolean(from),
      missing: from ? [] : ["MAIL_FROM"],
      transport: "brevo-api",
      host: "api.brevo.com",
      port: 443,
      secure: true,
      user: "",
      from
    };
  }

  const missing = [
    ["SMTP_HOST", SMTP_HOST],
    ["SMTP_USER", SMTP_USER],
    ["SMTP_PASS", SMTP_PASS]
  ]
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);
  const port = parseSmtpPort(SMTP_PORT);

  return {
    configured: missing.length === 0,
    missing,
    transport: "smtp",
    host: SMTP_HOST?.trim() || "",
    port,
    secure: port === 465,
    user: SMTP_USER?.trim() || "",
    from: MAIL_FROM?.trim() || ""
  };
}

export function describeEmailError(error) {
  return {
    message: error?.message,
    code: error?.code,
    command: error?.command,
    responseCode: error?.responseCode,
    response: error?.response
  };
}

export async function sendConfirmationEmail(rsvp) {
  return sendEmail({
    to: rsvp.email,
    subject: "Confirmation RSVP - Stella & Geovanni",
    html: buildConfirmationTemplate(rsvp),
    logContext: `Confirmation email skipped for ${rsvp.email}.`
  });
}

export async function sendTestEmail(to) {
  const sentAt = new Date().toISOString();

  return sendEmail({
    to,
    subject: "SMTP test - Stella & Geovanni",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;">
        <h1>SMTP test</h1>
        <p>This email confirms that the wedding backend can send email via SMTP.</p>
        <p><strong>Sent at:</strong> ${escapeHtml(sentAt)}</p>
      </div>
    `,
    logContext: `SMTP test email skipped for ${to}.`
  });
}

async function sendEmail({ to, subject, html, logContext }) {
  const { SMTP_PASS, SMTP_TIMEOUT_MS } = process.env;
  const config = getEmailConfigStatus();

  if (!config.configured) {
    console.info(`SMTP is not configured. Missing ${config.missing.join(", ")}. ${logContext}`);
    return { skipped: true, missing: config.missing };
  }

  const timeout = Number(SMTP_TIMEOUT_MS || 12000);

  if (config.transport === "brevo-api") {
    await sendViaBrevoApi({ to, subject, html, from: config.from, timeout });
    return { skipped: false };
  }

  const smtpPassword = SMTP_PASS.replace(/\s/g, "");
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    auth: {
      user: config.user,
      pass: smtpPassword
    },
    tls: { minVersion: "TLSv1.2" }
  });

  await transporter.sendMail({
    from: config.from || `Stella & Geovanni <${config.user}>`,
    to,
    subject,
    html
  });

  return { skipped: false };
}

// Render's free tier blocks outbound SMTP ports, so this HTTP transport is used
// there instead of nodemailer when BREVO_API_KEY is set.
async function sendViaBrevoApi({ to, subject, html, from, timeout }) {
  const sender = parseAddress(from);
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeout),
    headers: {
      "api-key": process.env.BREVO_API_KEY.trim(),
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Brevo API responded ${response.status}: ${body}`);
    error.code = "BREVO_API";
    error.responseCode = response.status;
    error.response = body;
    throw error;
  }
}

function parseAddress(value) {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  return match ? { name: match[1].trim(), email: match[2].trim() } : { email: value.trim() };
}

function parseSmtpPort(value) {
  const port = Number(value || 587);
  return Number.isInteger(port) && port > 0 ? port : 587;
}

function buildConfirmationTemplate(rsvp) {
  const attendsReception = rsvp.attendance === "reception" || rsvp.attendance === "both";
  const name = escapeHtml(rsvp.fullName);

  const sectionTitleStyle =
    "font-family:Georgia,serif;font-size:18px;letter-spacing:1px;margin:0 0 12px;color:#2C2824;";
  const paragraphStyle = "margin:0 0 20px;line-height:1.7;";

  const introText = attendsReception
    ? "Voici toutes les informations pratiques pour cette belle journée :"
    : "Voici les informations pratiques pour nous rejoindre :";

  const ceremonySection = `
    <h2 style="${sectionTitleStyle}">LA CÉRÉMONIE</h2>
    <p style="${paragraphStyle}">
      <strong>Mairie de Toulouse, Le Capitole</strong><br />
      1 Place du Capitole, 31000 Toulouse<br /><br />
      Rendez-vous à 9h00 précises, un point GPS de regroupement vous sera envoyé par WhatsApp ultérieurement.<br /><br />
      Attention : aucun retard ne pourra être toléré, la cérémonie débutant à l'heure exacte. Nous vous conseillons d'arriver avec un peu d'avance, le stationnement en centre-ville pouvant être difficile (parkings Capitole ou Jean Jaurès à proximité, ou métro ligne A station Capitole).
    </p>
  `;

  const receptionSection = attendsReception
    ? `
    <h2 style="${sectionTitleStyle}">LA RÉCEPTION</h2>
    <p style="${paragraphStyle}">
      <strong>L'Entretoise</strong><br />
      6 rue Danielle Casanova, Z.A. Le Segla, 31600 Seysses<br /><br />
      Début du vin d'honneur à 16h00.<br /><br />
      Un parking privatif et gratuit est à votre disposition sur place.
    </p>
  `
    : "";

  const questionText = attendsReception
    ? "Si vous avez la moindre question (covoiturage, hébergement, allergies alimentaires…), n'hésitez pas à contacter les weddings planners."
    : "Si vous avez la moindre question, n'hésitez pas à contacter les weddings planners.";

  return `
    <div style="margin:0;padding:32px;background:#FDFBF7;color:#2C2824;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#fffaf4;border:1px solid #eadfd0;padding:32px;">
        <div style="font-family:Georgia,serif;font-size:44px;text-align:center;margin:0 0 24px;">S | G</div>
        <p style="${paragraphStyle}">Chers ${name},</p>
        <p style="${paragraphStyle}">Nous sommes très heureux de vous compter parmi nous pour célébrer notre mariage et nous vous remercions d'avoir confirmé votre présence !</p>
        <p style="${paragraphStyle}">${introText}</p>
        ${ceremonySection}
        ${receptionSection}
        <p style="${paragraphStyle}">${questionText}</p>
        <p style="${paragraphStyle}">Nous avons hâte de partager ce moment unique avec vous !</p>
        <p style="margin:0;line-height:1.7;">Avec tout notre amour,<br />Stella &amp; Geovanni</p>
      </div>
    </div>
  `;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
