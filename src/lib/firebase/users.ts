"use client";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { db, auth } from "./client";

/** How the user wants to receive urgent alerts. "both" sends WhatsApp + SMS. */
export type AlertChannel = "whatsapp" | "sms" | "both";

/**
 * The user profile stored at users/{uid}. Auth (Firebase) owns the credential;
 * this document owns the contact details we need to reach the observer —
 * notably `phone` (E.164) and `channel` for roof-closure alerts.
 */
export type UserProfile = {
  firstName: string;
  lastName: string;
  country: string; // ISO 3166-1 alpha-2
  email: string;
  phone: string; // E.164, e.g. +15125550123
  alertsOptIn: boolean;
  channel: AlertChannel;
};

/** A profile is "complete" once we can actually reach the user for alerts. */
export function isProfileComplete(p: Partial<UserProfile> | null | undefined): boolean {
  return Boolean(p && p.firstName && p.lastName && p.country && p.phone);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/** Create or merge the signed-in user's profile document at users/{uid}. */
export async function saveUserProfile(data: Partial<UserProfile>): Promise<void> {
  if (!db) throw new Error("Firebase is not configured");
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  await setDoc(
    doc(db, "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google. On first sign-in we seed the profile with the name and
 * email from the Google account; country + phone are still missing, so callers
 * should route to /complete-profile when `isProfileComplete` is false.
 */
export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error("Firebase is not configured");
  const { user } = await signInWithPopup(auth, googleProvider);
  const existing = await getUserProfile(user.uid);
  if (!existing) {
    const [firstName = "", ...rest] = (user.displayName ?? "").trim().split(/\s+/);
    await saveUserProfile({ firstName, lastName: rest.join(" "), email: user.email ?? "" });
  }
  return user;
}
