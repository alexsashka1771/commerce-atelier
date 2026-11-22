import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
if (existsSync(".env.local")) {
  console.error(
    ".env.local already exists; edit environment variables directly.",
  );
  process.exit(1);
}
const password =
  process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
writeFileSync(
  ".env.local",
  `DATABASE_PATH=./data/atelier.sqlite\nAPP_URL=http://localhost:3102\nADMIN_EMAIL=${process.env.ADMIN_EMAIL || "admin@atelier.local"}\nADMIN_PASSWORD_HASH=${hash}\nSTRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\n`,
  { mode: 0o600 },
);
console.log(
  "Created ignored .env.local. Admin email: " +
    (process.env.ADMIN_EMAIL || "admin@atelier.local"),
);
if (!process.env.ADMIN_PASSWORD)
  console.log("Your generated password (shown once): " + password);
console.log(
  "Store this password in your password manager. Restart the server after setup.",
);
