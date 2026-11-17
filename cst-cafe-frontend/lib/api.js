
// -----------------------------------------------------------------------------
// CST Cafe API Configuration
// Handles API requests, authentication tokens and uploaded image URLs.
// -----------------------------------------------------------------------------

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

// Backend address without "/api".
export const SERVER_URL = API_URL.replace(/\/api$/i, "");

// -----------------------------------------------------------------------------
// Authentication token storage
// -----------------------------------------------------------------------------

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

// Get authentication token.
export function getToken(role) {
  try {
    if (typeof window === "undefined") return null;

    const key = TOKEN_KEYS[role];

    if (!key) return null;

    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Save authentication token.
export function setToken(role, token) {
  try {
    if (typeof window === "undefined") return;

    const key = TOKEN_KEYS[role];

    if (!key) return;

    window.localStorage.setItem(key, token);
  } catch (err) {
    console.error("Unable to save authentication token:", err);
  }
}

// Remove authentication token.
export function clearToken(role) {
  try {
    if (typeof window === "undefined") return;

    const key = TOKEN_KEYS[role];

    if (!key) return;

    window.localStorage.removeItem(key);
  } catch (err) {
    console.error("Unable to clear authentication token:", err);
  }
}

// -----------------------------------------------------------------------------
// Image URL handling
// -----------------------------------------------------------------------------

// Converts uploaded image paths into complete backend URLs.
export function imageSrc(imagePath) {
  if (!imagePath) return "";

  // Already a complete URL.
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  // Convert relative upload paths into complete URLs.
  const normalizedPath = imagePath.startsWith("/")
    ? imagePath
    : `/${imagePath}`;

  return `${SERVER_URL}${normalizedPath}`;
}

// -----------------------------------------------------------------------------
// API Error
// -----------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// -----------------------------------------------------------------------------
// Central API request function
// -----------------------------------------------------------------------------

export async function api(
  endpoint,
  {
    method = "GET",
    body,
    role,
  } = {}
) {
  const headers = {};

  const isForm =
    typeof FormData !== "undefined" &&
    body instanceof FormData;

  // JSON requests.
  // Do not manually set Content-Type for FormData.
  if (body !== undefined && !isForm) {
    headers["Content-Type"] = "application/json";
  }

  // Attach authentication token when a role is supplied.
  const token = role ? getToken(role) : null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Ensure endpoint starts with "/".
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  let response;

  try {
    response = await fetch(
      `${API_URL}${normalizedEndpoint}`,
      {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : isForm
              ? body
              : JSON.stringify(body),
      }
    );
  } catch (err) {
    console.error("API connection error:", err);

    throw new ApiError(
      0,
      "Cannot reach the server. Make sure the backend is running."
    );
  }

  // Read response safely.
  let data = null;

  try {
    const responseText = await response.text();

    if (responseText) {
      data = JSON.parse(responseText);
    }
  } catch {
    throw new ApiError(
      response.status,
      "The server returned an invalid response."
    );
  }

  // Handle unsuccessful responses.
  if (!response.ok) {
    if (
      response.status === 401 &&
      role &&
      token
    ) {
      clearToken(role);

      if (typeof window !== "undefined") {
        window.location.href = LOGIN_PAGES[role];
      }
    }

    throw new ApiError(
      response.status,
      data?.error ||
        data?.message ||
        "Something went wrong. Please try again."
    );
  }

  return data;
}
