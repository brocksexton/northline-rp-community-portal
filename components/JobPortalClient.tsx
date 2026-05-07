'use client';

import { useMemo, useState } from 'react';
import type { JobApplication, JobApplicationStatus, JobApplicationStep, JobPosting, JobQuestion, PublicJobsState } from '@/lib/jobs-shared';
import { stepsForPosting, statusLabel } from '@/lib/jobs-shared';

type JobPortalView = 'hub' | 'open' | 'applications';

type Props = {
  initialState: PublicJobsState;
  signedIn: boolean;
  initialView?: JobPortalView;
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not viewed yet';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Unknown';
}

function sentenceStatus(value: string) {
  return statusLabel(value as JobApplicationStatus).toLowerCase();
}

function isUnread(application: JobApplication) {
  if (!application.applicantViewedAt) return application.notes.length > 0 || application.status !== 'submitted';
  const viewed = new Date(application.applicantViewedAt).getTime();
  const latest = Math.max(
    new Date(application.updatedAt).getTime(),
    ...application.notes.map((note) => new Date(note.createdAt).getTime()),
  );
  return Number.isFinite(latest) && latest > viewed;
}

function toneForStatus(status: string) {
  if (status === 'approved') return 'approved';
  if (status === 'declined') return 'declined';
  if (status === 'under_review') return 'review';
  return 'submitted';
}

function postingCopy(count: number) {
  if (count === 0) return 'No open postings right now';
  if (count === 1) return '1 posting available';
  return `${count} postings available`;
}

function Field({
  question,
  value,
  disabled,
  onChange,
}: {
  question: JobQuestion;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  if (question.type === 'yesno') {
    return (
      <fieldset className="job-field job-yesno-field">
        <legend>
          {question.label}
          {question.required ? <span>*</span> : null}
        </legend>
        <small>{question.help}</small>
        <div>
          {['Yes', 'No'].map((option) => (
            <button
              className={value === option ? 'selected' : ''}
              disabled={disabled}
              key={option}
              type="button"
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === 'select') {
    return (
      <label className="job-field">
        <span>
          {question.label}
          {question.required ? <em>*</em> : null}
        </span>
        <small>{question.help}</small>
        <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose one…</option>
          {(question.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (question.type === 'scale') {
    return (
      <label className="job-field">
        <span>
          {question.label}
          {question.required ? <em>*</em> : null}
        </span>
        <small>{question.help}</small>
        <input disabled={disabled} max="10" min="1" type="range" value={value || '5'} onChange={(event) => onChange(event.target.value)} />
        <strong className="job-range-value">{value || '5'} / 10</strong>
      </label>
    );
  }

  if (question.type === 'short') {
    return (
      <label className="job-field">
        <span>
          {question.label}
          {question.required ? <em>*</em> : null}
        </span>
        <small>{question.help}</small>
        <input disabled={disabled} maxLength={240} value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  return (
    <label className="job-field wide">
      <span>
        {question.label}
        {question.required ? <em>*</em> : null}
      </span>
      <small>{question.help}</small>
      <textarea disabled={disabled} maxLength={4000} rows={5} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function JobUpdateBanner({ count, onReview }: { count: number; onReview: () => void }) {
  if (!count) return null;
  return (
    <section className="jobs-update-banner" role="status">
      <div className="jobs-update-icon"><i className="fa-solid fa-bell" aria-hidden="true" /></div>
      <div>
        <strong>{count === 1 ? 'You have a staff application update.' : `You have ${count} staff application updates.`}</strong>
        <p>Staff changed a status or left an applicant-visible note. Review it when you are ready.</p>
      </div>
      <button className="button button-primary" type="button" onClick={onReview}>Review updates</button>
    </section>
  );
}

function SubmittedApplication({ application, posting, unread, onMarkViewed }: { application: JobApplication; posting?: JobPosting; unread?: boolean; onMarkViewed?: () => void }) {
  const answerLookup = new Map(application.answers.map((answer) => [answer.questionId, answer]));
  const questions = posting
    ? stepsForPosting(posting).flatMap((step) => step.questions)
    : application.answers.map((answer) => ({ id: answer.questionId, label: answer.label } as JobQuestion));

  return (
    <article className={`job-application-card job-application-detail-card tone-${toneForStatus(application.status)} ${unread ? 'has-update' : ''}`}>
      <div className="job-application-topline">
        <div>
          <span className="kicker">Application record</span>
          <h3>{application.jobTitle}</h3>
          <p>{unread ? 'New applicant-visible activity is waiting below.' : 'Your submitted answers and review history are saved here.'}</p>
        </div>
        <span className="job-status-pill">{statusLabel(application.status)}</span>
      </div>

      <dl className="job-app-meta">
        <div><dt>Submitted</dt><dd>{formatDate(application.createdAt)}</dd></div>
        <div><dt>Last update</dt><dd>{formatDate(application.updatedAt)}</dd></div>
        <div><dt>Viewed</dt><dd>{formatDate(application.applicantViewedAt)}</dd></div>
      </dl>

      {application.notes.length ? (
        <section className="job-note-stream">
          <h4>Staff notes and updates</h4>
          {application.notes.map((note) => (
            <article key={note.id}>
              <span>{note.authorRole} · {formatDate(note.createdAt)}</span>
              <p>{note.body}</p>
            </article>
          ))}
        </section>
      ) : (
        <section className="jobs-empty-note"><strong>No applicant-visible notes yet.</strong><p>When staff post an update, it will appear here.</p></section>
      )}

      <details className="job-answer-review">
        <summary>View submitted answers</summary>
        <div>
          {questions.map((question) => {
            const answer = answerLookup.get(question.id);
            return answer?.value ? (
              <section key={question.id}>
                <strong>{answer.label}</strong>
                <p>{answer.value}</p>
              </section>
            ) : null;
          })}
        </div>
      </details>

      {unread && onMarkViewed ? (
        <button className="button button-soft" type="button" onClick={onMarkViewed}>
          <i className="fa-solid fa-check" aria-hidden="true" /> Mark update as seen
        </button>
      ) : null}
    </article>
  );
}

function ApplicationWizard({
  posting,
  signedIn,
  onSubmitted,
}: {
  posting: JobPosting;
  signedIn: boolean;
  onSubmitted: (state: PublicJobsState) => void;
}) {
  const steps = useMemo(() => stepsForPosting(posting), [posting]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const completedRequired = steps.flatMap((item) => item.questions).filter((question) => !question.required || answers[question.id]?.trim()).length;
  const totalQuestions = steps.flatMap((item) => item.questions).length;

  function missingForStep(target: JobApplicationStep) {
    return target.questions.filter((question) => question.required && !answers[question.id]?.trim());
  }

  function next() {
    const missing = missingForStep(step);
    if (missing.length) {
      setMessage(`Please complete: ${missing.map((question) => question.label).slice(0, 2).join(', ')}.`);
      return;
    }
    setMessage('');
    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  async function submit() {
    const missing = steps.flatMap(missingForStep);
    if (missing.length) {
      setMessage(`Please complete: ${missing.map((question) => question.label).slice(0, 3).join(', ')}.`);
      setStepIndex(Math.max(0, steps.findIndex((item) => missingForStep(item).length > 0)));
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/jobs/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postingId: posting.id, answers }),
      });
      const payload = await response.json();
      if (payload.state) onSubmitted(payload.state);
      setMessage(payload.ok ? 'Application submitted. Your application record is ready in My Applications.' : payload.message ?? 'Could not submit application.');
    } catch {
      setMessage('Could not reach the applications API.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="job-wizard-card jobs-mini-wizard">
      <div className="job-wizard-progress" aria-label={`Application progress ${progress}%`}><span style={{ width: `${progress}%` }} /></div>

      <div className="jobs-wizard-stage">
        <aside className="jobs-wizard-timeline" aria-label="Application steps">
          {steps.map((item, index) => (
            <button
              className={`${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'complete' : ''}`}
              disabled={submitting}
              key={item.id}
              type="button"
              onClick={() => index <= stepIndex ? setStepIndex(index) : undefined}
            >
              <span>{index + 1}</span>
              <strong>{item.eyebrow}</strong>
            </button>
          ))}
        </aside>

        <section className="job-wizard-slide" key={step.id}>
          <span className="job-step-chip">{step.eyebrow} · step {stepIndex + 1} of {steps.length}</span>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
          <div className="jobs-wizard-mini-stats">
            <span>{completedRequired}/{totalQuestions} prompts touched</span>
            <span>{progress}% complete</span>
          </div>
          <div className="job-form-grid">
            {step.questions.map((question) => (
              <Field
                disabled={submitting}
                key={question.id}
                question={question}
                value={answers[question.id] ?? ''}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="job-wizard-actions">
        <button className="button button-soft" disabled={submitting || stepIndex === 0} type="button" onClick={() => { setMessage(''); setStepIndex((current) => Math.max(0, current - 1)); }}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
        </button>

        {stepIndex < steps.length - 1 ? (
          <button className="button button-primary" disabled={submitting} type="button" onClick={next}>Continue <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
        ) : signedIn ? (
          <button className="button button-primary" disabled={submitting} type="button" onClick={submit}><i className="fa-solid fa-paper-plane" aria-hidden="true" /> {submitting ? 'Submitting…' : 'Submit application'}</button>
        ) : (
          <a className="button button-primary" href={`/api/auth/steam?returnTo=/jobs/open?apply=${encodeURIComponent(posting.id)}`}><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in to submit</a>
        )}
        {message ? <span className="job-form-message">{message}</span> : null}
      </div>
    </article>
  );
}

function PostingDetail({ posting, signedIn, application, onSubmitted }: { posting: JobPosting; signedIn: boolean; application?: JobApplication | null; onSubmitted: (state: PublicJobsState) => void }) {
  return (
    <section className="jobs-mini-detail-panel">
      <article className="job-posting-brief jobs-mini-posting-brief" style={{ ['--job-accent' as string]: posting.accent }}>
        <div className="job-posting-topline"><span><i className={posting.icon} aria-hidden="true" /> {posting.department}</span><small>{posting.commitment}</small></div>
        <h2>{posting.title}</h2>
        <p>{posting.description}</p>
        <div className="job-micro-stats"><span>{posting.summary}</span><span>{posting.questions.length ? `${posting.questions.length} position-specific question${posting.questions.length === 1 ? '' : 's'}` : 'Standard application flow'}</span></div>
        <div className="job-posting-columns">
          <section><h3>What staff expect</h3>{posting.expectations.map((item) => <p key={item}><i className="fa-solid fa-check" aria-hidden="true" /> {item}</p>)}</section>
          <section><h3>Strong applicants show</h3>{posting.qualities.map((item) => <p key={item}><i className="fa-solid fa-star" aria-hidden="true" /> {item}</p>)}</section>
        </div>
      </article>

      {application ? (
        <SubmittedApplication application={application} posting={posting} unread={isUnread(application)} />
      ) : (
        <ApplicationWizard posting={posting} signedIn={signedIn} onSubmitted={onSubmitted} />
      )}
    </section>
  );
}

export function JobPortalClient({ initialState, signedIn, initialView = 'hub' }: Props) {
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<JobPortalView>(initialView);
  const [selectedId, setSelectedId] = useState(initialState.postings[0]?.id ?? '');
  const [selectedApplicationId, setSelectedApplicationId] = useState(initialState.applications[0]?.id ?? '');
  const selected = useMemo(() => state.postings.find((posting) => posting.id === selectedId) ?? state.postings[0] ?? null, [state.postings, selectedId]);
  const selectedApplication = useMemo(() => state.applications.find((application) => application.id === selectedApplicationId) ?? state.applications[0] ?? null, [state.applications, selectedApplicationId]);
  const unreadApplications = state.applications.filter(isUnread);
  const unreadCount = unreadApplications.length;
  const existingForSelected = selected ? state.applications.find((application) => application.jobPostingId === selected.id && ['submitted', 'under_review', 'approved'].includes(application.status)) : null;

  async function markViewed(applicationId: string) {
    try {
      const response = await fetch(`/api/jobs/applications/${encodeURIComponent(applicationId)}/viewed`, { method: 'POST' });
      const payload = await response.json();
      if (payload.state) setState(payload.state);
    } catch {
      // no-op for passive read markers
    }
  }

  function openView(next: JobPortalView) {
    setView(next);
    if (next === 'applications' && !selectedApplicationId && state.applications[0]) setSelectedApplicationId(state.applications[0].id);
  }

  return (
    <div className={`jobs-mini-app jobs-view-${view}`}>
      <JobUpdateBanner count={unreadCount} onReview={() => openView('applications')} />

      <section className="jobs-mini-hero">
        <div>
          <span className="eyebrow"><i /> Northline RP staff applications</span>
          <h1>{view === 'hub' ? 'Choose your staff application path.' : view === 'open' ? 'Open staff postings.' : 'My staff applications.'}</h1>
          <p>{view === 'hub' ? 'A focused mini-app for open postings, guided applications, submitted answers, statuses, and staff notes.' : view === 'open' ? 'Browse active roles, compare expectations, and start an application without staring at a giant form.' : 'Track every application you have submitted, read staff-visible updates, and review your answers.'}</p>
        </div>
        <aside>
          <strong>{postingCopy(state.postings.length)}</strong>
          <span>{signedIn ? `${state.applications.length} submitted application${state.applications.length === 1 ? '' : 's'}` : 'Sign in to submit and track applications'}</span>
        </aside>
      </section>

      <nav className="jobs-mini-nav" aria-label="Staff application views">
        <a className={view === 'hub' ? 'active' : ''} href="/jobs" onClick={(event) => { event.preventDefault(); openView('hub'); }}><i className="fa-solid fa-compass" aria-hidden="true" /> Hub</a>
        <a className={view === 'open' ? 'active' : ''} href="/jobs/open" onClick={(event) => { event.preventDefault(); openView('open'); }}><i className="fa-solid fa-briefcase" aria-hidden="true" /> Open postings <b>{state.postings.length}</b></a>
        <a className={view === 'applications' ? 'active' : ''} href="/jobs/applications" onClick={(event) => { event.preventDefault(); openView('applications'); }}><i className="fa-solid fa-inbox" aria-hidden="true" /> My applications {unreadCount ? <b>{unreadCount}</b> : null}</a>
      </nav>

      {view === 'hub' ? (
        <section className="jobs-mini-hub-grid">
          <article className="jobs-mini-choice-card primary">
            <span className="jobs-mini-choice-icon"><i className="fa-solid fa-briefcase" aria-hidden="true" /></span>
            <span className="kicker">Open postings</span>
            <h2>{postingCopy(state.postings.length)}</h2>
            <p>See every active role, preview expectations, and launch the guided application experience.</p>
            <button className="button button-primary" type="button" onClick={() => openView('open')}>View open postings</button>
          </article>
          <article className={`jobs-mini-choice-card ${unreadCount ? 'needs-attention' : ''}`}>
            <span className="jobs-mini-choice-icon"><i className="fa-solid fa-inbox" aria-hidden="true" /></span>
            <span className="kicker">My applications</span>
            <h2>{signedIn ? `${state.applications.length} submitted` : 'Sign in required'}</h2>
            <p>{unreadCount ? `${unreadCount} update${unreadCount === 1 ? '' : 's'} waiting from staff.` : signedIn ? 'Review statuses, staff notes, and your submitted answers whenever you want.' : 'Use Steam sign-in to submit applications and track updates.'}</p>
            {signedIn ? <button className="button button-soft" type="button" onClick={() => openView('applications')}>Open my applications</button> : <a className="button button-primary" href="/api/auth/steam?returnTo=/jobs/applications"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>}
          </article>
        </section>
      ) : null}

      {view === 'open' ? (
        <section className="jobs-mini-open-layout">
          <aside className="jobs-mini-posting-list">
            <div className="section-heading compact"><span className="kicker">Available roles</span><h2>{postingCopy(state.postings.length)}</h2></div>
            {state.postings.length ? state.postings.map((posting) => (
              <button className={selected?.id === posting.id ? 'selected' : ''} key={posting.id} type="button" onClick={() => setSelectedId(posting.id)}>
                <i className={posting.icon} aria-hidden="true" />
                <span><strong>{posting.title}</strong><small>{posting.department} · {posting.commitment}</small></span>
              </button>
            )) : <p className="muted-inline-note">No staff postings are currently open.</p>}
          </aside>
          {selected ? <PostingDetail posting={selected} signedIn={signedIn} application={existingForSelected} onSubmitted={setState} /> : null}
        </section>
      ) : null}

      {view === 'applications' ? (
        <section className="jobs-mini-applications-layout">
          {!signedIn ? (
            <article className="jobs-mini-signin-card"><span className="jobs-mini-choice-icon"><i className="fa-brands fa-steam" aria-hidden="true" /></span><h2>Sign in to view applications.</h2><p>Your submitted applications, statuses, and staff notes are tied to your Steam account.</p><a className="button button-primary" href="/api/auth/steam?returnTo=/jobs/applications">Sign in with Steam</a></article>
          ) : state.applications.length ? (
            <>
              <aside className="jobs-mini-application-list">
                <div className="section-heading compact"><span className="kicker">Submitted</span><h2>{state.applications.length} application{state.applications.length === 1 ? '' : 's'}</h2></div>
                {state.applications.map((application) => {
                  const unread = isUnread(application);
                  return (
                    <button className={`${selectedApplication?.id === application.id ? 'selected' : ''} ${unread ? 'unread' : ''}`} key={application.id} type="button" onClick={() => setSelectedApplicationId(application.id)}>
                      <span><strong>{application.jobTitle}</strong><small>{sentenceStatus(application.status)} · updated {formatDate(application.updatedAt)}</small></span>
                      {unread ? <b>Update</b> : null}
                    </button>
                  );
                })}
              </aside>
              <section className="jobs-mini-application-detail">
                {selectedApplication ? <SubmittedApplication application={selectedApplication} posting={state.postings.find((item) => item.id === selectedApplication.jobPostingId)} unread={isUnread(selectedApplication)} onMarkViewed={() => markViewed(selectedApplication.id)} /> : null}
              </section>
            </>
          ) : (
            <article className="jobs-mini-signin-card"><span className="jobs-mini-choice-icon"><i className="fa-solid fa-inbox" aria-hidden="true" /></span><h2>No applications yet.</h2><p>Open postings are ready when you are. Pick a role and the portal will walk you through the process step-by-step.</p><button className="button button-primary" type="button" onClick={() => openView('open')}>Browse open postings</button></article>
          )}
        </section>
      ) : null}
    </div>
  );
}
