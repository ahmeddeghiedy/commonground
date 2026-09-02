#!/usr/bin/env node

const APP_URL = (process.env.COMMONGROUND_TEST_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function request(path, init = {}) {
  const response = await fetch(`${APP_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const created = await request("/api/workspaces", {
  method: "POST",
  body: JSON.stringify({
    name: "WebMCP verification trip",
    destination: "Barcelona",
    nights: 4,
    checkIn: "2026-11-12",
    organizerName: "Test Organizer",
    travelerLimit: 7,
  }),
});

const workspaceId = created.workspace?.id;
const ownerToken = created.ownerToken;
assert(workspaceId && ownerToken, "Workspace creation did not return an id and owner token");
assert(created.workspace.travelerLimit === 7, "Traveler capacity was not stored");

const authorization = { authorization: `Bearer ${ownerToken}` };
const initial = await request(`/api/workspaces/${workspaceId}/invites`, { headers: authorization });
assert(Array.isArray(initial.invitations) && initial.invitations.length === 0, "New workspace should not have invitations");

const invited = await request(`/api/workspaces/${workspaceId}/invites`, {
  method: "POST",
  headers: authorization,
  body: JSON.stringify({ name: "Invited Traveler", email: "traveler@example.com" }),
});
assert(invited.travelerId && invited.inviteToken, "Invitation creation did not return a scoped token");

const listed = await request(`/api/workspaces/${workspaceId}/invites`, { headers: authorization });
assert(listed.invitations.length === 1, "Invitation was not listed");
assert(listed.invitations[0].status === "invited", "Invitation status should begin as invited");

const travelerView = await request(`/api/workspaces/${workspaceId}`, {
  headers: { authorization: `Bearer ${invited.inviteToken}` },
});
assert(travelerView.role === "traveler", "Scoped invitation did not grant traveler access");
assert(travelerView.currentTravelerId === invited.travelerId, "Invitation was not scoped to its traveler");

const revoked = await request(`/api/workspaces/${workspaceId}/invites`, {
  method: "DELETE",
  headers: authorization,
  body: JSON.stringify({ travelerId: invited.travelerId }),
});
assert(revoked.success, "Invitation revocation was not acknowledged");

const finalInvites = await request(`/api/workspaces/${workspaceId}/invites`, { headers: authorization });
assert(finalInvites.invitations.length === 0, "Revoked invitation remained visible");

const finalWorkspace = await request(`/api/workspaces/${workspaceId}`, { headers: authorization });
assert(finalWorkspace.state.travelers.length === 1, "Revoked traveler remained in workspace state");

const revokedResponse = await fetch(`${APP_URL}/api/workspaces/${workspaceId}`, {
  headers: { authorization: `Bearer ${invited.inviteToken}` },
});
assert(revokedResponse.status === 403, "Revoked invitation token still grants access");

process.stdout.write(`${JSON.stringify({
  success: true,
  url: APP_URL,
  workspaceCreated: true,
  travelerLimitVerified: 7,
  invitationCreated: true,
  invitationListed: true,
  travelerScopeVerified: true,
  invitationRevoked: true,
  revokedAccessDenied: true,
}, null, 2)}\n`);
