// Talks to the CST Cafe backend. Every page uses api() so the address, the login
// token and error messages are handled in one place.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const TOKEN_KEYS = {
  customer: "cst-cafe-customer-token",
  staff: "cst-cafe-staff-token",
};

export const LOGIN_PAGES = {
  customer: "/login",
  staff: "/staff/login",
};

export function getToken(role) {
  try {
    return window.localStorage.getItem(TOKEN_KEYS[role]);
  } catch {
    return null;
  }
}

export function setToken(role, token) {
  try {
    window.localStorage.setItem(TOKEN_KEYS[role], token);
  } catch {}
}

export function clearToken(role) {
  try {
    window.localStorage.removeItem(TOKEN_KEYS[role]);
  } catch {}
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// api("/menu")                                  -> public request
// api("/orders", { role: "customer" })          -> sends the customer's login token
// api("/orders", { method: "POST", body: {...}, role: "customer" })
export async function api(path, { method = "GET", body, role } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = role ? getToken(role) : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Make sure the backend is running.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    // The saved login is no longer valid (expired, or the account was removed)
    if (res.status === 401 && role && token) {
      clearToken(role);
      if (typeof window !== "undefined") window.location.href = LOGIN_PAGES[role];
    }
    throw new ApiError(res.status, data?.error || "Something went wrong. Please try again.");
  }
  return data;
}
