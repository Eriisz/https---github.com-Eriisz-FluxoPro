
import { firebaseConfig } from "@/firebase/config";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// This function should only be used in server-side code (Server Actions, route handlers).
export function getserverFirestore() {
    const apps = getApps();
    const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
}
