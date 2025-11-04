import type { NextApiResponse } from "next";
import { createHmac, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import type { GalleryUser, GalleryUserRole } from "./types";
import {
  buildCloudinaryImageUrl,
  extractPublicIdFromUrl,
  normalizeAvatarPublicId,
} from "./cloudinaryHelpers";

const SESSION_COOKIE_NAME = "galleryAuth";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
};

const getSecret = () => {
  const secret = process.env.USER_PIN_SECRET;
  if (!secret) {
    throw new Error("USER_PIN_SECRET environment variable is not configured");
  }
  return secret;
};

const createSignature = (userId: string) => {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(userId);
  return hmac.digest("hex");
};

// ✅ FIXED HERE
const safeCompare = (a: string, b: string) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  // ✅ Convert to Uint8Array to satisfy ArrayBufferView type
  const aView = new Uint8Array(aBuffer);
  const bView = new Uint8Array(bBuffer);

  return timingSafeEqual(aView, bView);
};

const serializeCookie = (name: string, value: string, options: CookieOptions = {}) => {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  if (options.httpOnly) {
    segments.push("HttpOnly");
  }

  if (options.secure) {
    segments.push("Secure");
  }

  if (options.path) {
    segments.push(`Path=${options.path}`);
  }

  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite}`);
  }

  return segments.join("; ");
};

const resolveRole = (role: any): GalleryUserRole => (role === "admin" ? "admin" : "member");

const normalizeString = (value: any) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

export const mapUserDocument = (doc: any): GalleryUser => {
  const rawAvatarUrl = normalizeString(doc.avatarUrl);
  const rawAvatarPublicId = normalizeString(doc.avatarPublicId);
  const derivedPublicId =
    normalizeAvatarPublicId(rawAvatarPublicId) ||
    normalizeAvatarPublicId(extractPublicIdFromUrl(rawAvatarUrl));
  const resolvedAvatarUrl = rawAvatarUrl || buildCloudinaryImageUrl(derivedPublicId);

  return {
    id: doc._id.toString(),
    displayName: doc.displayName,
    folder: doc.folder,
    avatarPublicId: derivedPublicId || undefined,
    avatarUrl: resolvedAvatarUrl,
    pinHint: doc.pinHint ?? undefined,
    role: resolveRole(doc.role),
  };
};

export const signUserSession = (userId: string) => `${userId}.${createSignature(userId)}`;

export const createSessionCookie = (userId: string) =>
  serializeCookie(SESSION_COOKIE_NAME, signUserSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

export const clearSessionCookie = () =>
  serializeCookie(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

const parseSessionCookie = (cookieValue?: string): string | null => {
  if (!cookieValue) return null;

  const [userId, signature] = cookieValue.split(".");
  if (!userId || !signature) return null;

  try {
    const expectedSignature = createSignature(userId);
    if (!safeCompare(signature, expectedSignature)) {
      return null;
    }
    return userId;
  } catch (error) {
    console.error("Failed to validate session cookie", error);
    return null;
  }
};

type CookieRequest = {
  cookies?: Partial<Record<string, string>>;
};

export const getAuthenticatedUser = async (
  req: CookieRequest,
): Promise<GalleryUser | null> => {
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
  const userId = parseSessionCookie(sessionCookie);

  if (!userId) {
    return null;
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "img-detail");
    const collection = db.collection("galleryUsers");

    const userDoc = await collection.findOne({ _id: new ObjectId(userId) });
    if (!userDoc) {
      return null;
    }

    return mapUserDocument(userDoc);
  } catch (error) {
    console.error("Failed to resolve authenticated user", error);
    return null;
  }
};

export const ensureAuthenticatedUser = async (
  req: CookieRequest,
  res: NextApiResponse,
): Promise<GalleryUser> => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return user;
};

export const mapUserDocs = (docs: any[]): GalleryUser[] => docs.map(mapUserDocument);

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE };
