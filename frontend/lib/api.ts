import axios from "axios";
import { triggerUpgradePrompt } from "./upgradePrompt";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

type ApiErrorBody = {
  message?: string;
  title?: string;
  errors?: Record<string, string | string[] | { message?: string }>;
};

function extractValidationMessage(data: ApiErrorBody | undefined): string | undefined {
  if (!data) return undefined;
  if (typeof data.message === "string") return data.message;
  const errors = data.errors;
  if (errors) {
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const first = errors[firstKey];
      if (Array.isArray(first)) return first[0] ? String(first[0]) : undefined;
      if (typeof first === "string") return first;
      if (first?.message) return first.message;
    }
  }
  return typeof data.title === "string" ? data.title : undefined;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userType");
      window.location.href = "/login";
    }
    const message = extractValidationMessage(error.response?.data as ApiErrorBody | undefined);
    if (message) {
      error.response.data = { ...error.response.data, message };
    }
    const isPackage403 = error.response?.status === 403 && !!message?.includes("باقتك");
    const isPackage400 =
      error.response?.status === 400 &&
      !!message?.includes("باقتك") &&
      (message.includes("ترقية") || message.includes("تسمح بإضافة"));
    if (isPackage403 || isPackage400) {
      triggerUpgradePrompt(message as string);
      error.response.data = { ...error.response.data, message: undefined };
    }
    return Promise.reject(error);
  }
);

export default api;