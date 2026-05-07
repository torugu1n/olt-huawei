import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const checkSetup = () => api.get("/auth/setup");
export const setupAdmin = (data: object) => api.post("/auth/setup", data);

export const login = (username: string, password: string) =>
  api.post("/auth/login", { username, password });

export const getMe = () => api.get("/auth/me");
export const listUsers = () => api.get("/auth/users");
export const createUser = (data: object) => api.post("/auth/users", data);
export const deleteUser = (id: number) => api.delete(`/auth/users/${id}`);
export const toggleUser = (id: number) => api.put(`/auth/users/${id}/toggle`);
export const changePassword = (data: object) => api.post("/auth/change-password", data);
export const getSettings = () => api.get("/settings");
export const updateSettings = (data: object) => api.put("/settings", data);

// ── OLT ───────────────────────────────────────────────────────────────────────
export const getOltStatus = () => api.get("/olt/status");
export const getDashboardSummary = () => api.get("/olt/dashboard-summary");
export const getOltVersion = () => api.get("/olt/version");
export const getBoards = () => api.get("/olt/boards");
export const getAlarms = () => api.get("/olt/alarms");
export const getAutofind = () => api.get("/olt/autofind");
export const getOltLogs = (params?: object) => api.get("/olt/logs", { params });
export const getProvisionTemplate = (port: number, slot = 1) =>
  api.get("/olt/provision-template", { params: { port, slot } });
export const getProvisionTemplates = (slot = 1) =>
  api.get("/olt/provision-templates", { params: { slot } });
export const getOnts = (slot?: number, port?: number) => {
  const params: Record<string, number> = {};
  if (slot !== undefined) params.slot = slot;
  if (port !== undefined) params.port = port;
  return api.get("/olt/onts", { params });
};
export const getOnt = (slot: number, port: number, ontId: number) =>
  api.get(`/olt/onts/${slot}/${port}/${ontId}`);
export const provisionOnt = (data: object) => api.post("/olt/provision", data);
export const deleteOnt = (slot: number, port: number, ontId: number) =>
  api.delete(`/olt/onts/${slot}/${port}/${ontId}`);
export const rebootOnt = (slot: number, port: number, ontId: number) =>
  api.post(`/olt/onts/${slot}/${port}/${ontId}/reboot`);
export const addServicePort = (data: object) => api.post("/olt/service-port", data);
export const deleteServicePort = (index: number) => api.delete(`/olt/service-port/${index}`);
export const getOntWan = (slot: number, port: number, ontId: number) =>
  api.get(`/olt/onts/${slot}/${port}/${ontId}/wan`);
export const getOntOptical = (slot: number, port: number, ontId: number) =>
  api.get(`/olt/onts/${slot}/${port}/${ontId}/optical`);
export const getTemplateCatalog = () => api.get("/olt/template-catalog");
export const createTemplateCatalogItem = (data: object) => api.post("/olt/template-catalog", data);
export const updateTemplateCatalogItem = (id: number, data: object) => api.put(`/olt/template-catalog/${id}`, data);
export const deleteTemplateCatalogItem = (id: number) => api.delete(`/olt/template-catalog/${id}`);
export const getTemplateBindings = () => api.get("/olt/template-bindings");
export const createTemplateBinding = (data: object) => api.post("/olt/template-bindings", data);
export const updateTemplateBinding = (id: number, data: object) => api.put(`/olt/template-bindings/${id}`, data);
export const deleteTemplateBinding = (id: number) => api.delete(`/olt/template-bindings/${id}`);

// ── Audit ─────────────────────────────────────────────────────────────────────
export const getAuditLogs = (params?: object) => api.get("/audit/logs", { params });
