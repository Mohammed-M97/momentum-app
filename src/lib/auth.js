const TOKEN_KEY = "momentum_token";
const DEMO_KEY = "momentum_demo_expires";

export function saveDemo(expiresAt) {
  localStorage.setItem(DEMO_KEY, expiresAt);
}

export function hasActiveDemo() {
  const expires = localStorage.getItem(DEMO_KEY);
  return getToken() !== null && expires && new Date(expires) > new Date();
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DEMO_KEY);
}

export function isLoggedIn() {
  return getToken() !== null;
}

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

export const notifyUnauthorized = () => {
  if (unauthorizedHandler) unauthorizedHandler();
};