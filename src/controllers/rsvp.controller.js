import { stringify } from "csv-stringify/sync";
import { describeEmailError, sendConfirmationEmail } from "../services/email.service.js";
import { getRsvpStats, listRsvps, submitRsvp } from "../services/rsvp.service.js";
import { listGuests } from "../services/guest.service.js";

export async function postRsvp(req, res) {
  const required = ["fullName", "email", "attendance"];
  const missing = required.filter((field) => !req.body[field]);

  if (missing.length) {
    return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
  }

  const rsvp = await submitRsvp(req.app, req.body);
  let confirmationEmail;

  try {
    const emailResult = await sendConfirmationEmail(rsvp);
    confirmationEmail = emailResult.skipped ? "skipped" : "sent";
  } catch (error) {
    confirmationEmail = "failed";
    console.error(`Confirmation email failed for ${rsvp.email}:`, describeEmailError(error));
  }

  res.status(201).json({ ok: true, rsvp, confirmationEmail });
}

export async function getDashboard(req, res) {
  const [stats, guests, rsvps] = await Promise.all([getRsvpStats(req.app), listGuests(req.app), listRsvps(req.app)]);
  res.json({ stats, guests, rsvps });
}

export async function exportRsvps(req, res) {
  const rsvps = await listRsvps(req.app);
  const csv = stringify(
    rsvps.map((rsvp) => ({
      fullName: rsvp.fullName,
      email: rsvp.email,
      phone: rsvp.phone,
      attendance: rsvp.attendance,
      dietaryRequirements: rsvp.dietaryRequirements,
      message: rsvp.message,
      confirmedAt: rsvp.updatedAt || rsvp.createdAt
    })),
    { header: true }
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"rsvp-export.csv\"");
  res.send(csv);
}
