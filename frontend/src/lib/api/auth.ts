/**
 * Real auth client for the NASOI Express API (nasoi-backend).
 *
 * The browser calls same-origin `/api/v1/*`; next.config rewrites it to the
 * backend (BACKEND_URL). That keeps the refresh cookie first-party.
 *
 * - Access token (15 min) lives only in this module's memory, one per role.
 * - Refresh token lives in an httpOnly cookie that JavaScript cannot read.
 */
import type { Role } from "@/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "ERROR",
    public fields?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  mobile: string | null;
}

interface TokenResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

const BASE = "/api/v1";
const tokens: Partial<Record<Role, { token: string; exp: number }>> = {};
const inflight: Partial<Record<Role, Promise<TokenResponse>>> = {};

/** Low-level call to the NASOI API. JSON bodies get a JSON content type; FormData is sent as-is. */
async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...(isForm ? {} : { "content-type": "application/json" }), "x-nasoi-client": "web", ...init.headers },
    });
  } catch {
    throw new AuthError("Unable to reach the server. Please check your internet connection.", 0, "NETWORK");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const e = body?.error;
    const msg = e?.message ?? (res.status === 413 ? "File is too large." : `Server error (${res.status}). Please try again.`);
    throw new AuthError(msg, res.status, e?.code, e?.fields);
  }
  return res;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await raw(path, init)).json() as Promise<T>;
}

function keep(r: TokenResponse) {
  tokens[r.user.role] = { token: r.accessToken, exp: Date.now() + r.expiresIn * 1000 };
  return r;
}

/** POST /api/v1/auth/login – the role comes back from the server. */
export async function login(loginId: string, password: string) {
  return keep(await request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) }));
}

/** POST /api/v1/auth/refresh – de-duplicated per role. */
export function refresh(role: Role) {
  inflight[role] ??= request<TokenResponse>("/auth/refresh", { method: "POST", body: JSON.stringify({ role }) })
    .then(keep)
    .catch((e) => {
      delete tokens[role];
      throw e;
    })
    .finally(() => delete inflight[role]);
  return inflight[role]!;
}

/** Returns a valid access token, refreshing it from the cookie when needed. */
export async function accessToken(role: Role) {
  const t = tokens[role];
  if (t && t.exp - Date.now() > 30_000) return t.token;
  return (await refresh(role)).accessToken;
}

/** Authenticated raw response (e.g. a file); retries once after a refresh if the token was rejected. */
export async function authRaw(role: Role, path: string, init: RequestInit = {}): Promise<Response> {
  const call = async () => raw(path, { ...init, headers: { ...init.headers, authorization: `Bearer ${await accessToken(role)}` } });
  try {
    return await call();
  } catch (e) {
    if (e instanceof AuthError && e.status === 401 && e.code === "TOKEN_EXPIRED") {
      delete tokens[role];
      return call();
    }
    throw e;
  }
}

/** Authenticated JSON request; retries once after a refresh if the token was rejected. */
export async function authRequest<T>(role: Role, path: string, init: RequestInit = {}): Promise<T> {
  const call = async () => request<T>(path, { ...init, headers: { ...init.headers, authorization: `Bearer ${await accessToken(role)}` } });
  try {
    return await call();
  } catch (e) {
    if (e instanceof AuthError && e.status === 401 && e.code === "TOKEN_EXPIRED") {
      delete tokens[role];
      return call();
    }
    throw e;
  }
}

/** POST /api/v1/auth/logout */
export async function logout(role: Role) {
  delete tokens[role];
  await request("/auth/logout", { method: "POST", body: JSON.stringify({ role }) }).catch(() => {});
}

/** GET /api/v1/auth/me */
export function me(role: Role) {
  return authRequest<{ user: AuthUser }>(role, "/auth/me");
}

/** POST /api/v1/auth/change-password */
export function changePassword(role: Role, currentPassword: string, newPassword: string) {
  return authRequest<{ ok: true; message: string }>(role, "/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
