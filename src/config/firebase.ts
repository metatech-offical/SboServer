import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert("./src/config/serviceAccount.json"),
});

const messaging = admin.messaging();

export { messaging, admin };
