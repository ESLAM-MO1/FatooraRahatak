import api from "./api";

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
}

export async function login(data: LoginData) {
  const response = await api.post("/auth/login", data);
  const { accessToken, refreshToken, userType, fullName, email } = response.data.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userType", userType);
  localStorage.setItem("fullName", fullName);
  localStorage.setItem("email", email);

  return response.data.data;
}

export async function register(data: RegisterData) {
  const response = await api.post("/auth/register", data);
  const { accessToken, refreshToken, userType, fullName, email } = response.data.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userType", userType);
  localStorage.setItem("fullName", fullName);
  localStorage.setItem("email", email);

  return response.data.data;
}

export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userType");
  localStorage.removeItem("fullName");
  localStorage.removeItem("email");
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
export async function googleAuth(idToken: string) {
  const response = await api.post("/auth/google", { idToken });
  const { accessToken, refreshToken, userType, fullName, email } = response.data.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("userType", userType);
  localStorage.setItem("fullName", fullName);
  localStorage.setItem("email", email);

  return response.data.data;
}