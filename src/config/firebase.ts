import admin from "firebase-admin";
import fs from "fs";
import path from "path";

/**
 * Prefer FIREBASE_SERVICE_ACCOUNT JSON env (Railway/production).
 * Fall back to local serviceAccount.json for development.
 */
function getFirebaseCredential() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv) {
    const parsed = JSON.parse(fromEnv);
    return admin.credential.cert(parsed);
  }

  const localPath = path.resolve(__dirname, "serviceAccount.json");
  if (fs.existsSync(localPath)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(localPath);
    return admin.credential.cert(serviceAccount);
  }

  throw new Error(
    "Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT env or add src/config/serviceAccount.json"
  );
}

admin.initializeApp({
  credential: getFirebaseCredential(),
});

const messaging = admin.messaging();

export { messaging, admin };
