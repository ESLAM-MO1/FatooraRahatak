import api from "./api";
import { clearPermissions } from "./permissions";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  invitationToken?: string;
  referralCode?: string;
}

function saveSession(data: any) {
  const { accessToken, refreshToken, userType, staffRole, fullName, email, userId } = data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userType", userType);
  if (staffRole) localStorage.setItem("staffRole", staffRole);
  else localStorage.removeItem("staffRole");
  localStorage.setItem("fullName", fullName);
  localStorage.setItem("email", email);
  if (userId) localStorage.setItem("userId", String(userId));
}

export async function login(data: LoginData) {
  const response = await api.post("/auth/login", data);
  const result = response.data.data;
  if (result.requiresOtp) return result;
  saveSession(result);
  return result;
}

export async function googleAuth(idToken: string) {
  const response = await api.post("/auth/google", { idToken });
  const result = response.data.data;
  if (result.requiresOtp) return result;
  saveSession(result);
  return result;
}

export async function verifyLoginOtp(email: string, code: string) {
  const response = await api.post("/auth/login-verify", { email, code });
  const result = response.data.data;
  saveSession(result);
  return result;
}

export async function resendLoginOtp(email: string) {
  await api.post("/auth/login-resend", { email });
}

export async function register(data: RegisterData) {
  const response = await api.post("/auth/register", data);
  const { accessToken, refreshToken, userType, fullName, email, userId } = response.data.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userType", userType);
  localStorage.setItem("fullName", fullName);
  localStorage.setItem("email", email);
  if (userId) localStorage.setItem("userId", String(userId));

  return response.data.data;
}

export function logout() {
  const userId = localStorage.getItem("userId");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userType");
  localStorage.removeItem("staffRole");
  localStorage.removeItem("fullName");
  localStorage.removeItem("email");
  localStorage.removeItem("userId");
  localStorage.removeItem("profileImage");
  if (userId) localStorage.removeItem(`profileImage_${userId}`);
  clearPermissions();
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

export function getUserType(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userType");
}

export function getStaffRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("staffRole");
}
