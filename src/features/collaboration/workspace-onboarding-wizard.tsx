"use client";

import { ArrowLeft, ArrowRight, Bot, Check, ListChecks, Sparkles, UserPlus, Users, X } from "lucide-react";

const steps = [
  { label: "Invite", icon: UserPlus },
  { label: "Priorities", icon: ListChecks },
  { label: "Compare", icon: Sparkles },
  { label: "Agent", icon: Bot },
] as const;

export function WorkspaceOnboardingWizard({
  step,
  travelerCount,
  travelerLimit,
  travelerName,
  webmcpReady,
  onStepChange,
  onInvite,
  onPriorities,
  onShowBoard,
  onCopyAgentPrompt,
  onClose,
}: {
  step: number;
  travelerCount: number;
  travelerLimit: number;
  travelerName: string;
  webmcpReady: boolean;
  onStepChange: (step: number) => void;
  onInvite: () => void;
  onPriorities: () => void;
  onShowBoard: () => void;
  onCopyAgentPrompt: () => void;
  onClose: () => void;
}) {
  const current = Math.min(steps.length - 1, Math.max(0, step));
  return (
    <div className="cg-overlay cg-overlay--guide" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="cg-collab-dialog cg-onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button type="button" className="cg-icon-btn" onClick={onClose} aria-label="Close setup guide"><X size={18} /></button>
        <div className="cg-eyebrow"><Sparkles size={14} /> Workspace setup guide</div>
        <div className="cg-wizard-progress cg-wizard-progress--four" aria-label={`Step ${current + 1} of 4`}>
          {steps.map(({ label }, index) => <button type="button" key={label} onClick={() => onStepChange(index)} className={index === current ? "is-current" : index < current ? "is-done" : ""}><span>{index < current ? <Check size={12} /> : index + 1}</span><strong>{label}</strong></button>)}
        </div>

        {current === 0 && <div className="cg-onboarding-step">
          <div className="cg-wizard-icon"><UserPlus size={20} /></div>
          <h2 id="onboarding-title">Bring your travelers in.</h2>
          <p>There are currently <strong>{travelerCount} of {travelerLimit}</strong> seats in this workspace. Create one private link per traveler and share it by email, WhatsApp, your device share sheet, or copy.</p>
          <div className="cg-onboarding-callout"><Users size={18} /><span>Each link is scoped to one traveler, so everyone controls only their own decision profile.</span></div>
          <button type="button" className="cg-btn cg-btn--primary cg-btn--wide" disabled={travelerCount >= travelerLimit} onClick={onInvite}><UserPlus size={15} /> {travelerCount >= travelerLimit ? "All seats are filled" : "Invite the next traveler"}</button>
        </div>}

        {current === 1 && <div className="cg-onboarding-step">
          <div className="cg-wizard-icon"><ListChecks size={20} /></div>
          <h2 id="onboarding-title">Add {travelerName}&apos;s priorities.</h2>
          <p>Set a maximum nightly budget, then select from ready-made options such as accessibility, family rooms, cancellation, location, beach, pool, breakfast, gym, and review score.</p>
          <div className="cg-priority-preview"><span className="cg-priority cg-priority--must">Must</span><span className="cg-priority cg-priority--prefer">Prefer</span><span className="cg-priority cg-priority--flexible">Flexible</span><span className="cg-priority cg-priority--exclude">Exclude</span></div>
          <button type="button" className="cg-btn cg-btn--primary cg-btn--wide" onClick={onPriorities}><ListChecks size={15} /> Choose predefined priorities</button>
        </div>}

        {current === 2 && <div className="cg-onboarding-step">
          <div className="cg-wizard-icon"><Sparkles size={20} /></div>
          <h2 id="onboarding-title">Compare fair options.</h2>
          <p>As travelers save their priorities, CommonGround recalculates Group Consensus, Best Value, and Balanced Compromise. Must-haves are protected before preferences are balanced.</p>
          <div className="cg-onboarding-callout"><Sparkles size={18} /><span>Live or demo inventory uses the same normalized hotel model, scoring logic, and auditable explanations.</span></div>
          <button type="button" className="cg-btn cg-btn--primary cg-btn--wide" onClick={onShowBoard}>Show the decision board <ArrowRight size={15} /></button>
        </div>}

        {current === 3 && <div className="cg-onboarding-step">
          <div className="cg-wizard-icon"><Bot size={20} /></div>
          <h2 id="onboarding-title">Let your agent guide the setup.</h2>
          <p>{webmcpReady ? "WebMCP is connected. Your agent can inspect the workspace, open this guide, configure trip settings, explain conflicts, change approved priorities, and compare scenarios." : "Connect Site Tools or Chrome WebMCP, then give the agent the setup prompt. Every change remains visible and permission-aware."}</p>
          <div className={`cg-readiness ${webmcpReady ? "is-ready" : "is-warning"}`}><Bot size={18} /><div><strong>{webmcpReady ? "Agent tools connected" : "Agent tools ready to connect"}</strong><span>The agent cannot invite people silently or purchase travel; humans retain those approval steps.</span></div></div>
          <button type="button" className="cg-btn cg-btn--primary cg-btn--wide" onClick={onCopyAgentPrompt}><Bot size={15} /> Copy “set up my workspace” prompt</button>
        </div>}

        <div className="cg-wizard-actions">
          {current > 0 ? <button type="button" className="cg-btn cg-btn--quiet" onClick={() => onStepChange(current - 1)}><ArrowLeft size={15} /> Back</button> : <button type="button" className="cg-btn cg-btn--quiet" onClick={onClose}>Finish later</button>}
          {current < steps.length - 1 ? <button type="button" className="cg-btn" onClick={() => onStepChange(current + 1)}>Next step <ArrowRight size={15} /></button> : <button type="button" className="cg-btn" onClick={onClose}>Done</button>}
        </div>
      </section>
    </div>
  );
}
