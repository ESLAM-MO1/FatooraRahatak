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

export async function login(data: LoginData) {
  const response = await api.post("/auth/login", data);
  const { accessToken, refreshToken, userType, staffRole, fullName, email, userId } = response.data.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userType", userType);
  if (staffRole) localStorage.setItem("staffRole", staffRole);
  else localStorage.removeItem("staffRole");
  localStorage.setItem("fullName", fullName);
  localStorage.setItem("email", email);
  if (userId) localStorage.setItem("userId", String(userId));

  return response.data.data;
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

// Only meaningful when getUserType() === "SupportStaff": one of
// "Admin" | "Support" | "Finance" | "Technical". Determines which
// platform modules the staff member can see and use.
export function getStaffRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("staffRole");
}
export async function googleAuth(idToken: string) {
  const response = await api.post("/auth/google", { idToken });
  const { accessToken, refreshToken, userType, staffRole, fullName, email, userId } = response.data.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userType", userType);
  if (staffRole) localStorage.setItem("staffRole", staffRole);
  else localStorage.removeItem("staffRole");
  localStorage.setItem("fullName", fullName);
  localStorage.setItem("email", email);
  if (userId) localStorage.setItem("userId", String(userId));

  return response.data.data;
}