export const AUTH_COOKIE = "cadmiones_session";
export const AUTH_TOKEN = "cadmiones_admin_session_v1";
export const AUTH_USER = "admin";
export const AUTH_PASSWORD = "alucer123";

export function isAuthenticated(value: string | undefined) {
  return value === AUTH_TOKEN;
}
