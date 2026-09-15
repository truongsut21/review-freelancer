// One-off: remove the test RSVP rows submitted before upsert-by-email was introduced.
// Usage: node scripts/delete-test-rsvps.mjs
import "dotenv/config";
import mongoose from "mongoose";
import { RSVP } from "../src/models/RSVP.js";

const emails = ["giaphung2k1@gmail.com", "dotruong0704@gmail.com"];

await mongoose.connect(process.env.MONGODB_URI);
const rows = await RSVP.find({ email: { $in: emails } }).lean();
console.log(`Found ${rows.length} record(s):`);
rows.forEach((r) => console.log(` - ${r.fullName} <${r.email}> ${r.attendance} ${r.updatedAt?.toISOString()}`));
const { deletedCount } = await RSVP.deleteMany({ email: { $in: emails } });
console.log(`Deleted ${deletedCount}. Remaining RSVPs: ${await RSVP.countDocuments()}`);
await mongoose.disconnect();
