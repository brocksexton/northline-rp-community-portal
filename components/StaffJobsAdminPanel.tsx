'use client';

import { useMemo, useState } from 'react';
import type { JobApplication, JobApplicationStatus, JobPosting, JobPostingStatus, JobQuestion, JobQuestionType, JobsAdminState } from '@/lib/jobs-shared';
import { postingStatusLabel, statusLabel } from '@/lib/jobs-shared';

type Props = {
  initialState: JobsAdminState;
  canManagePostings: boolean;
  canReviewApplications: boolean;
};

type JobsView = 'applications' | 'postings';

type JobPreset = {
  id: string;
  label: string;
  body: string;
  icon: string;
  accent: string;
  posting: Omit<JobPosting, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>;
};

const postingStatuses: Array<{ id: JobPostingStatus; label: string; body: string; icon: string }> = [
  { id: 'active', label: 'Active', body: 'Public and accepting applications.', icon: 'fa-solid fa-eye' },
  { id: 'hidden', label: 'Hidden', body: 'Draft mode. Staff can edit before publishing.', icon: 'fa-solid fa-eye-slash' },
  { id: 'closed', label: 'Closed', body: 'Archived from applicants, kept for staff records.', icon: 'fa-solid fa-lock' },
];

const applicationStatuses: JobApplicationStatus[] = ['submitted', 'under_review', 'approved', 'declined'];
const questionTypes: JobQuestionType[] = ['short', 'long', 'yesno', 'select', 'scale'];

const JOB_PRESETS: JobPreset[] = [
  {
    id: 'moderator',
    label: 'Moderator',
    body: 'Player reports, rule clarity, scene support, and day-to-day community safety.',
    icon: 'fa-solid fa-shield-halved',
    accent: 'linear-gradient(135deg, #38bdf8, #2563eb)',
    posting: {
      title: 'Moderator Position',
      department: 'Community Safety',
      summary: 'Help keep the servers safe, fair, and fun while supporting healthy RP scenes.',
      description: 'Moderators help players resolve conflict, answer basic questions, identify disruptive behavior, and keep roleplay moving without turning every scene into a punishment conversation.',
      commitment: '4-8 hours per week preferred. Activity during peak city hours is especially useful.',
      icon: 'fa-solid fa-shield-halved',
      accent: 'linear-gradient(135deg, #38bdf8, #2563eb)',
      status: 'hidden',
      expectations: ['Stay calm during heated reports and scene disputes.', 'Document decisions clearly so leadership can audit actions later.', 'Teach first when possible, escalate when necessary, and avoid favoritism.'],
      qualities: ['Patient communicator', 'Fair under pressure', 'Good roleplay judgement', 'Comfortable reading logs'],
      questions: [
        { id: 'mod_priority', label: 'What should a moderator prioritize during a chaotic scene?', help: 'Explain what you secure first and why.', type: 'long', required: true },
        { id: 'mod_bias', label: 'How would you avoid bias when friends are involved?', help: 'Be specific about recusal, evidence, and communication.', type: 'long', required: true },
      ],
    },
  },
  {
    id: 'developer',
    label: 'Developer',
    body: 'Tools, bug fixes, web/game integration, workflow automation, and technical improvements.',
    icon: 'fa-solid fa-code',
    accent: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
    posting: {
      title: 'Developer Position',
      department: 'Development',
      summary: 'Help build, debug, and improve the Northline RP experience across web tools and server systems.',
      description: 'Developers support the community by improving systems, investigating bugs, building tools, and working with leadership to ship changes that are stable and useful.',
      commitment: 'Flexible, project-based availability. Clear communication matters more than raw hours.',
      icon: 'fa-solid fa-code',
      accent: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
      status: 'hidden',
      expectations: ['Communicate technical tradeoffs clearly.', 'Test changes before asking staff to rely on them.', 'Keep sensitive server, player, and staff data private.'],
      qualities: ['Careful debugger', 'Security-aware', 'Comfortable documenting work', 'Reliable follow-through'],
      questions: [
        { id: 'dev_stack', label: 'What languages, frameworks, or S&box/Garry\'s Mod tooling are you comfortable with?', help: 'List practical experience, not buzzwords.', type: 'long', required: true },
        { id: 'dev_example', label: 'Describe a project or fix you shipped that you are proud of.', help: 'Tell us the problem, your approach, and the result.', type: 'long', required: true },
      ],
    },
  },
  {
    id: 'discord-moderator',
    label: 'Discord Moderator',
    body: 'Discord reports, onboarding help, channel hygiene, and escalation support.',
    icon: 'fa-brands fa-discord',
    accent: 'linear-gradient(135deg, #5865f2, #0ea5e9)',
    posting: {
      title: 'Discord Moderator Position',
      department: 'Community Discord',
      summary: 'Help keep Discord readable, welcoming, and safe for players before and after they are in-city.',
      description: 'Discord moderators help answer questions, watch reports, keep channels organized, and escalate issues when conversations need staff attention.',
      commitment: 'Daily check-ins preferred. Peak Discord availability is especially helpful.',
      icon: 'fa-brands fa-discord',
      accent: 'linear-gradient(135deg, #5865f2, #0ea5e9)',
      status: 'hidden',
      expectations: ['Respond calmly and avoid public arguments.', 'Move issues to tickets or staff channels when needed.', 'Keep moderation consistent with server expectations.'],
      qualities: ['Welcoming tone', 'Good escalation instincts', 'Organized', 'Consistent presence'],
      questions: [
        { id: 'discord_conflict', label: 'How would you handle a heated public Discord argument?', help: 'Walk through your moderation and escalation process.', type: 'long', required: true },
        { id: 'discord_tools', label: 'What Discord moderation tools or workflows have you used before?', help: 'Mention tickets, slowmode, automod, logs, or community processes.', type: 'long', required: false },
      ],
    },
  },
  {
    id: 'event-team',
    label: 'Event Team',
    body: 'In-city events, light story hooks, community nights, and player engagement.',
    icon: 'fa-solid fa-calendar-star',
    accent: 'linear-gradient(135deg, #f97316, #f43f5e)',
    posting: {
      title: 'Event Team Position',
      department: 'Community Events',
      summary: 'Help plan and run events that make the city feel active without overwhelming normal RP.',
      description: 'Event team members propose, coordinate, and help run small-to-medium RP moments, community nights, and staff-supported activities.',
      commitment: 'Project-based availability. Weekend or evening availability is helpful.',
      icon: 'fa-solid fa-calendar-star',
      accent: 'linear-gradient(135deg, #f97316, #f43f5e)',
      status: 'hidden',
      expectations: ['Plan events that include multiple types of players.', 'Avoid derailing normal RP without warning.', 'Coordinate with staff before introducing high-impact situations.'],
      qualities: ['Creative', 'Organized', 'Player-focused', 'Calm when plans change'],
      questions: [
        { id: 'event_pitch', label: 'Pitch one event you would like to run for Northline.', help: 'Include the player hook, rough length, and how staff would support it.', type: 'long', required: true },
        { id: 'event_balance', label: 'How would you keep an event fun without forcing everyone to participate?', help: 'Explain how you handle opt-in RP and pacing.', type: 'long', required: true },
      ],
    },
  },
  {
    id: 'support-helper',
    label: 'Support Helper',
    body: 'New player onboarding, basic questions, bug routing, and friendly first-contact help.',
    icon: 'fa-solid fa-hands-helping',
    accent: 'linear-gradient(135deg, #22c55e, #0ea5e9)',
    posting: {
      title: 'Support Helper Position',
      department: 'Player Support',
      summary: 'Help new and returning players find answers, report issues, and get settled without confusion.',
      description: 'Support helpers are approachable community members who answer basic questions, point players toward the right guides, and help staff triage common support needs.',
      commitment: '2-5 hours per week preferred. Friendly consistency is the goal.',
      icon: 'fa-solid fa-hands-helping',
      accent: 'linear-gradient(135deg, #22c55e, #0ea5e9)',
      status: 'hidden',
      expectations: ['Answer common questions without guessing wildly.', 'Know when to escalate instead of improvising policy.', 'Represent the community with patience.'],
      qualities: ['Friendly', 'Patient', 'Clear communicator', 'Good at finding answers'],
      questions: [
        { id: 'support_style', label: 'How do you help someone who is frustrated but confused?', help: 'Describe your tone and process.', type: 'long', required: true },
        { id: 'support_limits', label: 'When should a helper escalate to staff instead of handling it alone?', help: 'Give examples.', type: 'long', required: true },
      ],
    },
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';
}

function slugify(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return slug || fallback;
}

function splitLines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join('\n');
}

function newQuestion(index: number): JobQuestion {
  return {
    id: `custom-question-${Date.now()}-${index}`,
    label: 'New position-specific question',
    help: 'Explain what information staff need from the applicant.',
    type: 'long',
    required: true,
  };
}

function newPosting(index: number): JobPosting {
  const now = new Date().toISOString();
  const title = `Staff Posting ${index + 1}`;
  return {
    id: slugify(title, `staff-posting-${index + 1}`),
    title,
    department: 'Staff Team',
    summary: 'A new staff opportunity for the Northline RP community.',
    description: 'Describe what this staff role does, who it helps, and how it improves the city.',
    commitment: '4-8 hours per week preferred.',
    icon: 'fa-solid fa-user-shield',
    accent: 'linear-gradient(135deg, #38bdf8, #2563eb)',
    status: 'hidden',
    expectations: ['Handle player concerns calmly.', 'Document important decisions.', 'Represent staff standards in public.'],
    qualities: ['Reliable', 'Fair', 'Patient', 'Good communicator'],
    questions: [newQuestion(0)],
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
  };
}

function postingFromPreset(preset: JobPreset, index: number): JobPosting {
  const now = new Date().toISOString();
  const title = preset.posting.title;
  return {
    ...preset.posting,
    id: `${slugify(title, preset.id)}-${Date.now()}`,
    title,
    icon: preset.icon,
    accent: preset.accent,
    status: 'hidden',
    questions: preset.posting.questions.map((question, questionIndex) => ({ ...question, id: `${question.id}-${Date.now()}-${questionIndex}` })),
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
  };
}

function answerValue(application: JobApplication, questionId: string) {
  return application.answers.find((answer) => answer.questionId === questionId)?.value ?? '';
}

function firstAnswer(application: JobApplication, questionIds: string[]) {
  for (const id of questionIds) {
    const value = answerValue(application, id);
    if (value) return value;
  }
  return '';
}

function toneForStatus(status: JobApplicationStatus | JobPostingStatus) {
  if (status === 'approved' || status === 'active') return 'success';
  if (status === 'declined' || status === 'closed') return 'danger';
  if (status === 'under_review') return 'warning';
  return 'neutral';
}

function applicationAge(application: JobApplication) {
  const created = new Date(application.createdAt).getTime();
  if (!Number.isFinite(created)) return 'Unknown age';
  const hours = Math.max(0, Math.round((Date.now() - created) / 36e5));
  if (hours < 24) return `${hours || 1}h old`;
  const days = Math.round(hours / 24);
  return `${days}d old`;
}

export function StaffJobsAdminPanel({ initialState, canManagePostings, canReviewApplications }: Props) {
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<JobsView>(() => initialState.applications.length ? 'applications' : 'postings');
  const [selectedPostingId, setSelectedPostingId] = useState(initialState.postings[0]?.id ?? '');
  const [selectedApplicationId, setSelectedApplicationId] = useState(initialState.applications[0]?.id ?? '');
  const [applicationFilter, setApplicationFilter] = useState<JobApplicationStatus | 'all'>('all');
  const [savingPostings, setSavingPostings] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewStatus, setReviewStatus] = useState<JobApplicationStatus>('under_review');
  const [applicantNote, setApplicantNote] = useState('');
  const [staffNote, setStaffNote] = useState('');

  const selectedPosting = useMemo(() => state.postings.find((posting) => posting.id === selectedPostingId) ?? state.postings[0] ?? null, [state.postings, selectedPostingId]);
  const visibleApplications = useMemo(() => state.applications.filter((application) => applicationFilter === 'all' || application.status === applicationFilter), [state.applications, applicationFilter]);
  const selectedApplication = useMemo(() => visibleApplications.find((application) => application.id === selectedApplicationId) ?? visibleApplications[0] ?? null, [visibleApplications, selectedApplicationId]);
  const selectedApplicationPosting = selectedApplication ? state.postings.find((posting) => posting.id === selectedApplication.jobPostingId) : null;

  function setPostings(postings: JobPosting[]) {
    setState((current) => ({ ...current, postings }));
  }

  function updatePosting(id: string, patch: Partial<JobPosting>) {
    setPostings(state.postings.map((posting) => posting.id === id ? { ...posting, ...patch } : posting));
  }

  function renamePosting(id: string, value: string) {
    const nextId = slugify(value, id);
    setPostings(state.postings.map((posting) => posting.id === id ? { ...posting, id: nextId } : posting));
    setSelectedPostingId(nextId);
  }

  function addPosting() {
    const created = newPosting(state.postings.length);
    setPostings([...state.postings, created]);
    setSelectedPostingId(created.id);
    setView('postings');
  }

  function addPreset(preset: JobPreset) {
    const created = postingFromPreset(preset, state.postings.length);
    setPostings([...state.postings, created]);
    setSelectedPostingId(created.id);
    setView('postings');
    setMessage(`${preset.label} preset added as hidden draft. Review it, then set it active when ready.`);
  }

  function duplicatePosting(posting: JobPosting) {
    const created = {
      ...posting,
      id: `${posting.id}-copy-${Date.now()}`,
      title: `${posting.title} Copy`,
      status: 'hidden' as JobPostingStatus,
      questions: posting.questions.map((question, index) => ({ ...question, id: `${question.id}-copy-${Date.now()}-${index}` })),
    };
    setPostings([...state.postings, created]);
    setSelectedPostingId(created.id);
  }

  function removePosting(id: string) {
    const next = state.postings.filter((posting) => posting.id !== id);
    setPostings(next);
    setSelectedPostingId(next[0]?.id ?? '');
  }

  function updateQuestion(postingId: string, questionId: string, patch: Partial<JobQuestion>) {
    setPostings(state.postings.map((posting) => posting.id === postingId
      ? { ...posting, questions: posting.questions.map((question) => question.id === questionId ? { ...question, ...patch } : question) }
      : posting));
  }

  function addQuestion(postingId: string) {
    const posting = state.postings.find((item) => item.id === postingId);
    if (posting) updatePosting(postingId, { questions: [...posting.questions, newQuestion(posting.questions.length)] });
  }

  function removeQuestion(postingId: string, questionId: string) {
    const posting = state.postings.find((item) => item.id === postingId);
    if (posting) updatePosting(postingId, { questions: posting.questions.filter((question) => question.id !== questionId) });
  }

  async function savePostings() {
    setSavingPostings(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postings: state.postings }),
      });
      const payload = await response.json();
      if (payload.state) setState(payload.state);
      setMessage(payload.ok ? 'Job postings saved.' : payload.message ?? 'Could not save job postings.');
    } catch {
      setMessage('Could not reach the staff jobs API.');
    } finally {
      setSavingPostings(false);
    }
  }

  function selectApplication(application: JobApplication) {
    setSelectedApplicationId(application.id);
    setReviewStatus(application.status === 'submitted' ? 'under_review' : application.status);
    setApplicantNote('');
    setStaffNote('');
  }

  async function saveReview() {
    if (!selectedApplication) return;
    setSavingReview(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/jobs/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ applicationId: selectedApplication.id, status: reviewStatus, applicantNote, staffNote }),
      });
      const payload = await response.json();
      if (payload.state) setState(payload.state);
      setApplicantNote('');
      setStaffNote('');
      setMessage(payload.ok ? 'Application review saved.' : payload.message ?? 'Could not save application review.');
    } catch {
      setMessage('Could not reach the application review API.');
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <article className="staff-jobs-redesign">
      <header className="jobs-console-header">
        <div>
          <span className="kicker">Staff hiring control</span>
          <h2>Applications workspace</h2>
          <p>Review applicants first, then maintain public postings from a focused builder with reusable role presets.</p>
        </div>
        <div className="jobs-console-tabs" role="tablist" aria-label="Staff jobs workspace views">
          <button className={view === 'applications' ? 'active' : ''} type="button" onClick={() => setView('applications')}>
            <i className="fa-solid fa-inbox" aria-hidden="true" /> Applications
          </button>
          <button className={view === 'postings' ? 'active' : ''} type="button" onClick={() => setView('postings')}>
            <i className="fa-solid fa-briefcase" aria-hidden="true" /> Postings
          </button>
        </div>
      </header>

      <section className="jobs-console-metrics" aria-label="Hiring metrics">
        <div><span>Total</span><strong>{state.stats.totalApplications}</strong><small>applications</small></div>
        <div><span>Needs eyes</span><strong>{state.stats.openApplications}</strong><small>submitted or under review</small></div>
        <div><span>Approved</span><strong>{state.stats.approvedApplications}</strong><small>greenlit applicants</small></div>
        <div><span>Public</span><strong>{state.stats.visiblePostings}</strong><small>active postings</small></div>
        <div><span>Drafts</span><strong>{state.stats.hiddenPostings}</strong><small>hidden or closed postings</small></div>
      </section>

      {message ? <p className="staff-jobs-message redesigned-message">{message}</p> : null}

      {view === 'applications' ? (
        <section className="jobs-review-console">
          <aside className="jobs-queue-panel">
            <div className="jobs-panel-heading">
              <div>
                <span className="kicker">Queue</span>
                <h3>Applicant queue</h3>
              </div>
              <select value={applicationFilter} onChange={(event) => { setApplicationFilter(event.target.value as JobApplicationStatus | 'all'); setSelectedApplicationId(''); }}>
                <option value="all">All statuses</option>
                {applicationStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </div>

            <div className="jobs-queue-list">
              {visibleApplications.map((application) => {
                const applicantName = firstAnswer(application, ['display_name']) || application.steamId;
                return (
                  <button className={application.id === selectedApplication?.id ? 'selected' : ''} key={application.id} type="button" onClick={() => selectApplication(application)}>
                    <span className={`status-dot-mini ${toneForStatus(application.status)}`} />
                    <div>
                      <strong>{applicantName}</strong>
                      <small>{application.jobTitle}</small>
                      <em>{applicationAge(application)} · {formatDate(application.updatedAt)}</em>
                    </div>
                    <b>{statusLabel(application.status)}</b>
                  </button>
                );
              })}
              {!visibleApplications.length ? <p className="muted-inline-note">No applications match this filter yet.</p> : null}
            </div>
          </aside>

          <section className="jobs-application-panel">
            {selectedApplication ? (
              <>
                <div className="application-review-hero">
                  <div>
                    <span className="kicker">Applicant</span>
                    <h3>{firstAnswer(selectedApplication, ['display_name']) || selectedApplication.jobTitle}</h3>
                    <p>{selectedApplication.jobTitle} · SteamID {selectedApplication.steamId}</p>
                  </div>
                  <span className={`job-status-pill tone-${selectedApplication.status}`}>{statusLabel(selectedApplication.status)}</span>
                </div>

                <dl className="application-fact-grid">
                  <div><dt>Discord</dt><dd>{firstAnswer(selectedApplication, ['discord_name']) || '—'}</dd></div>
                  <div><dt>Timezone</dt><dd>{firstAnswer(selectedApplication, ['timezone']) || '—'}</dd></div>
                  <div><dt>Submitted</dt><dd>{formatDate(selectedApplication.createdAt)}</dd></div>
                  <div><dt>Updated</dt><dd>{formatDate(selectedApplication.updatedAt)}</dd></div>
                </dl>

                <div className="application-answer-stack">
                  {selectedApplication.answers.map((answer) => (
                    <section key={answer.questionId}>
                      <strong>{answer.label}</strong>
                      <p>{answer.value || '—'}</p>
                    </section>
                  ))}
                  {selectedApplicationPosting?.questions.length ? (
                    <section className="job-custom-answer-summary">
                      <strong>Position-specific quick check</strong>
                      {selectedApplicationPosting.questions.map((question) => (
                        <p key={question.id}><b>{question.label}</b> {answerValue(selectedApplication, question.id) || '—'}</p>
                      ))}
                    </section>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="jobs-empty-review">
                <i className="fa-solid fa-inbox" aria-hidden="true" />
                <strong>No application selected</strong>
                <span>Choose an applicant from the queue to review answers and add notes.</span>
              </div>
            )}
          </section>

          <aside className="jobs-review-actions-card">
            {selectedApplication ? (
              <>
                <div className="jobs-panel-heading compact">
                  <div>
                    <span className="kicker">Decision</span>
                    <h3>Review actions</h3>
                  </div>
                </div>

                <label>
                  <span>Status</span>
                  <select disabled={!canReviewApplications || savingReview} value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as JobApplicationStatus)}>
                    {applicationStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Applicant-visible note</span>
                  <textarea disabled={!canReviewApplications || savingReview} rows={4} value={applicantNote} placeholder="Visible to the applicant. Use this for next steps, approval context, or decline feedback." onChange={(event) => setApplicantNote(event.target.value)} />
                </label>
                <label>
                  <span>Staff-only note</span>
                  <textarea disabled={!canReviewApplications || savingReview} rows={4} value={staffNote} placeholder="Internal reviewer context only." onChange={(event) => setStaffNote(event.target.value)} />
                </label>
                <button className="button button-primary" disabled={!canReviewApplications || savingReview} type="button" onClick={saveReview}>
                  <i className="fa-solid fa-check" aria-hidden="true" /> {savingReview ? 'Saving…' : 'Save review'}
                </button>
                {!canReviewApplications ? <span className="muted-inline-note">Staff review access required.</span> : null}

                {selectedApplication.notes.length ? (
                  <div className="job-note-stream admin-notes redesigned-notes">
                    <h4>Notes and applicant updates</h4>
                    {selectedApplication.notes.map((note) => (
                      <article className={note.visibility === 'staff' ? 'staff-only' : ''} key={note.id}>
                        <span>{note.visibility === 'staff' ? 'Staff-only' : 'Applicant-visible'} · {note.authorRole} · {formatDate(note.createdAt)}</span>
                        <p>{note.body}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </>
            ) : <p className="muted-inline-note">Select an application to review.</p>}
          </aside>
        </section>
      ) : (
        <section className="jobs-postings-console">
          <aside className="jobs-preset-panel">
            <div className="jobs-panel-heading">
              <div>
                <span className="kicker">Presets</span>
                <h3>Start from a role template</h3>
              </div>
              <button className="button button-soft compact" disabled={!canManagePostings || savingPostings} type="button" onClick={addPosting}>
                <i className="fa-solid fa-plus" aria-hidden="true" /> Blank
              </button>
            </div>
            <div className="job-preset-grid">
              {JOB_PRESETS.map((preset) => (
                <button disabled={!canManagePostings || savingPostings} key={preset.id} type="button" onClick={() => addPreset(preset)}>
                  <i className={preset.icon} aria-hidden="true" />
                  <strong>{preset.label}</strong>
                  <span>{preset.body}</span>
                  <em>Add hidden draft</em>
                </button>
              ))}
            </div>
          </aside>

          <section className="jobs-builder-layout">
            <aside className="posting-catalog-panel">
              <div className="jobs-panel-heading compact">
                <div>
                  <span className="kicker">Library</span>
                  <h3>Postings</h3>
                </div>
              </div>
              <div className="posting-catalog-list">
                {state.postings.map((posting) => (
                  <button className={posting.id === selectedPosting?.id ? 'selected' : ''} key={posting.id} type="button" onClick={() => setSelectedPostingId(posting.id)}>
                    <i className={posting.icon} aria-hidden="true" />
                    <span><strong>{posting.title}</strong><small>{posting.department}</small></span>
                    <b className={`posting-status-dot ${toneForStatus(posting.status)}`}>{postingStatusLabel(posting.status)}</b>
                  </button>
                ))}
              </div>
            </aside>

            {selectedPosting ? (
              <section className="posting-editor-panel">
                <div className="posting-editor-hero" style={{ ['--job-accent' as string]: selectedPosting.accent }}>
                  <div>
                    <span className="kicker">Posting editor</span>
                    <h3>{selectedPosting.title}</h3>
                    <p>{selectedPosting.summary}</p>
                  </div>
                  <div className="posting-editor-actions">
                    <button className="button button-soft compact" disabled={!canManagePostings || savingPostings} type="button" onClick={() => duplicatePosting(selectedPosting)}><i className="fa-solid fa-copy" aria-hidden="true" /> Duplicate</button>
                    <button className="button button-danger compact" disabled={!canManagePostings || savingPostings || state.postings.length <= 1} type="button" onClick={() => removePosting(selectedPosting.id)}><i className="fa-solid fa-trash" aria-hidden="true" /> Remove</button>
                  </div>
                </div>

                <div className="posting-status-row">
                  {postingStatuses.map((status) => (
                    <button className={selectedPosting.status === status.id ? 'selected' : ''} disabled={!canManagePostings || savingPostings} key={status.id} type="button" onClick={() => updatePosting(selectedPosting.id, { status: status.id })}>
                      <i className={status.icon} aria-hidden="true" />
                      <strong>{status.label}</strong>
                      <span>{status.body}</span>
                    </button>
                  ))}
                </div>

                <div className="posting-editor-grid">
                  <label><span>Posting ID</span><input disabled={!canManagePostings || savingPostings} value={selectedPosting.id} onChange={(event) => renamePosting(selectedPosting.id, event.target.value)} /></label>
                  <label><span>Title</span><input disabled={!canManagePostings || savingPostings} value={selectedPosting.title} maxLength={100} onChange={(event) => updatePosting(selectedPosting.id, { title: event.target.value })} /></label>
                  <label><span>Department</span><input disabled={!canManagePostings || savingPostings} value={selectedPosting.department} maxLength={80} onChange={(event) => updatePosting(selectedPosting.id, { department: event.target.value })} /></label>
                  <label><span>Commitment</span><input disabled={!canManagePostings || savingPostings} value={selectedPosting.commitment} maxLength={180} onChange={(event) => updatePosting(selectedPosting.id, { commitment: event.target.value })} /></label>
                  <label><span>Icon class</span><input disabled={!canManagePostings || savingPostings} value={selectedPosting.icon} maxLength={80} onChange={(event) => updatePosting(selectedPosting.id, { icon: event.target.value })} /></label>
                  <label><span>Accent CSS</span><input disabled={!canManagePostings || savingPostings} value={selectedPosting.accent} maxLength={160} onChange={(event) => updatePosting(selectedPosting.id, { accent: event.target.value })} /></label>
                  <label className="wide"><span>Summary</span><textarea disabled={!canManagePostings || savingPostings} rows={2} value={selectedPosting.summary} maxLength={220} onChange={(event) => updatePosting(selectedPosting.id, { summary: event.target.value })} /></label>
                  <label className="wide"><span>Description</span><textarea disabled={!canManagePostings || savingPostings} rows={4} value={selectedPosting.description} maxLength={1200} onChange={(event) => updatePosting(selectedPosting.id, { description: event.target.value })} /></label>
                  <label className="wide"><span>Expectations, one per line</span><textarea disabled={!canManagePostings || savingPostings} rows={4} value={joinLines(selectedPosting.expectations)} onChange={(event) => updatePosting(selectedPosting.id, { expectations: splitLines(event.target.value) })} /></label>
                  <label className="wide"><span>Applicant qualities, one per line</span><textarea disabled={!canManagePostings || savingPostings} rows={3} value={joinLines(selectedPosting.qualities)} onChange={(event) => updatePosting(selectedPosting.id, { qualities: splitLines(event.target.value) })} /></label>
                </div>

                <div className="question-builder-heading">
                  <div><span className="kicker">Custom questions</span><h4>Position-specific prompts</h4></div>
                  <button className="button button-soft compact" disabled={!canManagePostings || savingPostings} type="button" onClick={() => addQuestion(selectedPosting.id)}><i className="fa-solid fa-plus" aria-hidden="true" /> Add question</button>
                </div>
                <div className="job-question-editor-list redesigned-question-list">
                  {selectedPosting.questions.map((question) => (
                    <article key={question.id}>
                      <div className="job-question-toolbar">
                        <input disabled={!canManagePostings || savingPostings} value={question.id} onChange={(event) => updateQuestion(selectedPosting.id, question.id, { id: slugify(event.target.value, question.id) })} />
                        <select disabled={!canManagePostings || savingPostings} value={question.type} onChange={(event) => updateQuestion(selectedPosting.id, question.id, { type: event.target.value as JobQuestionType })}>{questionTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                        <label><input disabled={!canManagePostings || savingPostings} type="checkbox" checked={question.required} onChange={(event) => updateQuestion(selectedPosting.id, question.id, { required: event.target.checked })} /> Required</label>
                        <button className="button button-danger compact" disabled={!canManagePostings || savingPostings} type="button" onClick={() => removeQuestion(selectedPosting.id, question.id)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
                      </div>
                      <input disabled={!canManagePostings || savingPostings} value={question.label} maxLength={160} onChange={(event) => updateQuestion(selectedPosting.id, question.id, { label: event.target.value })} />
                      <textarea disabled={!canManagePostings || savingPostings} rows={2} value={question.help} maxLength={220} onChange={(event) => updateQuestion(selectedPosting.id, question.id, { help: event.target.value })} />
                      {question.type === 'select' ? <textarea disabled={!canManagePostings || savingPostings} rows={2} value={(question.options ?? []).join('\n')} placeholder="One select option per line" onChange={(event) => updateQuestion(selectedPosting.id, question.id, { options: splitLines(event.target.value) })} /> : null}
                    </article>
                  ))}
                  {!selectedPosting.questions.length ? <p className="muted-inline-note">This posting uses only the standard staff application steps.</p> : null}
                </div>

                <div className="posting-savebar">
                  <button className="button button-primary" disabled={!canManagePostings || savingPostings} type="button" onClick={savePostings}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {savingPostings ? 'Saving…' : 'Save postings'}</button>
                  {!canManagePostings ? <span>Website admin or AdminTools access required to edit postings.</span> : <span>Presets are added hidden by default so you can review before publishing.</span>}
                </div>
              </section>
            ) : null}
          </section>
        </section>
      )}
    </article>
  );
}
