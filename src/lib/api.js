import { getToken, clearToken, notifyUnauthorized } from "./auth";
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  // 1. Build headers dynamically
  const headers = {};

  // Add the Bearer token if the user is logged in
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only add Content-Type if there is actually a body payload
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    method: "GET",
    ...options,
    headers: {
      ...headers,
      ...options.headers, // Allows overriding headers if needed
    },
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  // 1. Fetch the raw response
  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    const error = new Error("Network error — could not reach the server");
    error.status = 0;
    throw error;
  }

  // 2. Check for 401 Unauthorized status first
  if (response.status === 401) {
    clearToken();
    notifyUnauthorized();
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // Not JSON at all: an HTML error page from a proxy, or a truncated
      // download. If the status was fine, that is a broken response and the
      // only thing we can report. If it was not, fall through so the check
      // below reports the real HTTP problem instead of this symptom.
       if (response.ok) {
        const error = new Error(
          "The server sent a response that could not be read",
        );
        error.status = response.status;
        throw error;
      }
    }
  }
  // 3. Check if response is NOT okay (status outside 200-299)
  if (!response.ok) {
    // Create an error and attach the HTTP status code to it
    const error = new Error(
      payload?.message ||
        response.statusText ||
        `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }

  if (payload && payload.success === false) {
    const error = new Error(payload.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return payload ? payload.data : null;
}

export const get = (path) => request(path, { method: "GET" });
export const post = (path, body) => request(path, { method: "POST", body });
export const put = (path, body) => request(path, { method: "PUT", body });
export const del = (path) => request(path, { method: "DELETE" });