"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, UserPlus, X } from "lucide-react";
import { MAX_TRAVELERS, type WorkspaceInvite } from "./types";

interface InviteTravelerDialogProps {
  workspaceId: string;
  accessToken: string;
  currentCount: number;
  onClose: () => void;
  onInvited: () => Promise<void> | void;
}

export function InviteTravelerDialog(props: InviteTravelerDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteUrl = useMemo(() => invite ? `${window.location.origin}/w/${props.workspaceId}?invite=${encodeURIComponent(invite.inviteToken)}` : "", [invite, props.workspaceId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null); setCopied(false);
    try {
      const response = await fetch(`/api/workspaces/${props.workspaceId}/invites`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${props.accessToken}` },
        body: JSON.stringify({ name, email: email || undefined }),
      });
      const payload = (await response.json()) as WorkspaceInvite & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create the invite");
      setInvite(payload);
      await props.onInvited();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the invite");
    } finally { setBusy(false); }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  }

  const isFull = props.currentCount >= MAX_TRAVELERS;
  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <section className="cg-collab-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <button type="button" className="cg-icon-btn" onClick={props.onClose} aria-label="Close"><X size={18} /></button>
        <div className="cg-eyebrow"><UserPlus size={14} /> {props.currentCount} of {MAX_TRAVELERS} travelers</div>
        <h2 id="invite-title">Invite one traveler.</h2>
        {!invite ? (
          <>
            <p className="cg-dialog-lead">Each person gets a private link and controls only their own priorities. You remain the organizer.</p>
            <form className="cg-form" onSubmit={submit}>
              <label>Traveler name<input required maxLength={60} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maya" /></label>
              <label>Email <span>(optional label only)</span><input type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maya@example.com" /></label>
              <p className="cg-field-note"><Mail size={14} /> CommonGround creates the secure link; it does not send email yet.</p>
              {error && <div className="cg-form-error" role="alert">{error}</div>}
              <button type="submit" className="cg-btn cg-btn--primary cg-btn--wide" disabled={busy || isFull}>{isFull ? "Workspace is full" : busy ? "Creating invite…" : "Create invite link"}</button>
            </form>
          </>
        ) : (
          <div className="cg-invite-success">
            <span className="cg-success-icon"><Check size={22} /></span>
            <h3>{invite.travelerName} has a seat.</h3>
            <p>Send this link directly to them. It opens only their traveler profile.</p>
            <div className="cg-share-link"><input readOnly value={inviteUrl} aria-label="Private invite link" /><button type="button" className="cg-btn" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy"}</button></div>
            <button type="button" className="cg-btn cg-btn--quiet cg-btn--wide" onClick={() => { setInvite(null); setName(""); setEmail(""); }}>Invite another traveler</button>
          </div>
        )}
      </section>
    </div>
  );
}
