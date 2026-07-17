import api from "./api";

export function createInvitation(data: { email: string; roleId: number; salary: number }) {
  return api.post("/invitations", data);
}

export function getInvitations() {
  return api.get("/invitations");
}

export function acceptInvitation(token: string) {
  return api.post(`/invitations/accept?token=${token}`);
}
