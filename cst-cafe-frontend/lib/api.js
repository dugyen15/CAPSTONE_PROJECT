// Talks to the CST Cafe backend.
// Handles the API address, login tokens and error messages.

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Backend address without "/api".
export const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

// Separate login tokens for each account type.
const TOKEN_KEYS = {
  customer: "cst-cafe-customer-token",
  staff: "cst-cafe-staff-token",
  admin: "cst-cafe-admin-token",
};

// Login pages for each account type.
export const LOGIN_PAGES = {
  customer: "/login",
  staff: "/staff/login",
  admin: "/admin/login",
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

// Converts uploaded image paths into complete URLs.
export function imageSrc(path) {
  if (!path) return "";

  return /^https?:\/\//.test(path)
    ? path
    : SERVER_URL + path;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Central API request function.
export async function api(path, { method = "GET", body, role } = {}) {
  const headers = {};

  const isForm =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isForm) {
    headers["Content-Type"] = "application/json";
  }

  const token = role ? getToken(role) : null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;

  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isForm
            ? body
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach the server. Make sure the backend is running."
    );
  }

  let data = null;

  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    if (res.status === 401 && role && token) {
      clearToken(role);

      if (typeof window !== "undefined") {
        window.location.href = LOGIN_PAGES[role];
      }
    }

    throw new ApiError(
      res.status,
      data?.error || "Something went wrong. Please try again."
    );
  }

  return data;
}