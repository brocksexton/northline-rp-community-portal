'use client';

import { useMemo, useState } from 'react';
import type { JobApplication, JobApplicationStep, JobPosting, JobQuestion, PublicJobsState } from '@/lib/jobs-shared';
import { stepsForPosting, statusLabel } from '@/lib/jobs-shared';

type Props = { initialState: PublicJobsState; signedIn: boolean };

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not viewed yet';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';
}

function isUnread(application: JobApplication) {
  if (!application.applicantViewedAt) return application.notes.length > 0 || application.status !== 'submitted';
  const viewed = new Date(application.applicantViewedAt).getTime();
  const latest = Math.max(new Date(application.updatedAt).getTime(), ...application.notes.map((note) => new Date(note.createdAt).getTime()));
  return Number.isFinite(latest) && latest > viewed;
}

function toneForStatus(status: string) {
  if (status === 'approved') return 'approved';
  if (status === 'declined') return 'declined';
  if (status === 'under_review') return 'review';
  return 'submitted';
}

function Field({ question, value, disabled, onChange }: { question: JobQuestion; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  if (question.type === 'yesno') return (
    <fieldset className="job-yesno-field"><legend>{question.label}{question.required ? <span>*</span> : null}</legend><small>{question.help}</small><div>{['Yes', 'No'].map((option) => <button className={value === option ? 'selected' : ''} disabled={disabled} key={option} type="button" onClick={() => onChange(option)}>{option}</button>)}</div></fieldset>
  );
  if (question.type === 'select') return (
    <label className="job-field"><span>{question.label}{question.required ? <em>*</em> : null}</span><small>{question.help}</small><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose one…</option>{(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
  );
  if (question.type === 'scale') return (
    <label className="job-field"><span>{question.label}{question.required ? <em>*</em> : null}</span><small>{question.help}</small><input disabled={disabled} min="1" max="10" type="range" value={value || '5'} onChange={(event) => onChange(event.target.value)} /><strong className="job-range-value">{value || '5'} / 10</strong></label>
  );
  if (question.type === 'short') return (
    <label className="job-field"><span>{question.label}{question.required ? <em>*</em> : null}</span><small>{question.help}</small><input disabled={disabled} value={value} maxLength={240} onChange={(event) => onChange(event.target.value)} /></label>
  );
  return (
    <label className="job-field wide"><span>{question.label}{question.required ? <em>*</em> : null}</span><small>{question.help}</small><textarea disabled={disabled} value={value} rows={5} maxLength={4000} onChange={(event) => onChange(event.target.value)} /></label>
  );
}

function SubmittedApplication({ application, posting }: { application: JobApplication; posting?: JobPosting }) {
  const answerLookup = new Map(application.answers.map((answer) => [answer.questionId, answer]));
  const questions = posting ? stepsForPosting(posting).flatMap((step) => step.questions) : application.answers.map((answer) => ({ id: answer.questionId, label: answer.label } as JobQuestion));
  return (
    <article className={`job-application-card tone-${toneForStatus(application.status)}`}>
      <div className="job-application-topline"><div><span className="kicker">Your application</span><h3>{application.jobTitle}</h3></div><span className="job-status-pill">{statusLabel(application.status)}</span></div>
      <dl className="job-app-meta"><div><dt>Submitted</dt><dd>{formatDate(application.createdAt)}</dd></div><div><dt>Last update</dt><dd>{formatDate(application.updatedAt)}</dd></div></dl>
      {application.notes.length ? <section className="job-note-stream"><h4>Staff updates</h4>{application.notes.map((note) => <article key={note.id}><span>{note.authorRole} · {formatDate(note.createdAt)}</span><p>{note.body}</p></article>)}</section> : null}
      <details className="job-answer-review"><summary>View submitted answers</summary><div>{questions.map((question) => { const answer = answerLookup.get(question.id); return answer?.value ? <section key={question.id}><strong>{answer.label}</strong><p>{answer.value}</p></section> : null; })}</div></details>
    </article>
  );
}

function ApplicationWizard({ posting, signedIn, onSubmitted }: { posting: JobPosting; signedIn: boolean; onSubmitted: (state: PublicJobsState) => void }) {
  const steps = useMemo(() => stepsForPosting(posting), [posting]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  function missingForStep(target: JobApplicationStep) { return target.questions.filter((question) => question.required && !answers[question.id]?.trim()); }
  function next() { const missing = missingForStep(step); if (missing.length) { setMessage(`Please complete: ${missing.map((q) => q.label).slice(0, 2).join(', ')}.`); return; } setMessage(''); setStepIndex((current) => Math.min(steps.length - 1, current + 1)); }
  async function submit() {
    const missing = steps.flatMap(missingForStep);
    if (missing.length) { setMessage(`Please complete: ${missing.map((q) => q.label).slice(0, 3).join(', ')}.`); setStepIndex(Math.max(0, steps.findIndex((item) => missingForStep(item).length > 0))); return; }
    setSubmitting(true); setMessage('');
    try { const response = await fetch('/api/jobs/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postingId: posting.id, answers }) }); const payload = await response.json(); if (payload.state) onSubmitted(payload.state); setMessage(payload.ok ? 'Application submitted. You can review it below.' : payload.message ?? 'Could not submit application.'); } catch { setMessage('Could not reach the applications API.'); } finally { setSubmitting(false); }
  }
  return (
    <article className="job-wizard-card"><div className="job-wizard-progress" aria-label={`Application progress ${progress}%`}><span style={{ width: `${progress}%` }} /></div><div className="job-wizard-slide" key={step.id}><span className="job-step-chip">{step.eyebrow} · {stepIndex + 1}/{steps.length}</span><h3>{step.title}</h3><p>{step.description}</p><div className="job-form-grid">{step.questions.map((question) => <Field disabled={submitting} key={question.id} question={question} value={answers[question.id] ?? ''} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />)}</div></div><div className="job-wizard-actions"><button className="button button-soft" disabled={submitting || stepIndex === 0} type="button" onClick={() => { setMessage(''); setStepIndex((current) => Math.max(0, current - 1)); }}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back</button>{stepIndex < steps.length - 1 ? <button className="button button-primary" disabled={submitting} type="button" onClick={next}>Continue <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button> : signedIn ? <button className="button button-primary" disabled={submitting} type="button" onClick={submit}><i className="fa-solid fa-paper-plane" aria-hidden="true" /> {submitting ? 'Submitting…' : 'Submit application'}</button> : <a className="button button-primary" href={`/api/auth/steam?returnTo=/jobs?apply=${encodeURIComponent(posting.id)}`}><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in to submit</a>}{message ? <span className="job-form-message">{message}</span> : null}</div></article>
  );
}

export function JobPortalClient({ initialState, signedIn }: Props) {
  const [state, setState] = useState(initialState);
  const [selectedId, setSelectedId] = useState(initialState.postings[0]?.id ?? '');
  const selected = useMemo(() => state.postings.find((posting) => posting.id === selectedId) ?? state.postings[0] ?? null, [state.postings, selectedId]);
  const existingForSelected = selected ? state.applications.find((application) => application.jobPostingId === selected.id && ['submitted', 'under_review', 'approved'].includes(application.status)) : null;
  const unreadCount = state.applications.filter(isUnread).length;
  async function markViewed(applicationId: string) { try { const response = await fetch(`/api/jobs/applications/${encodeURIComponent(applicationId)}/viewed`, { method: 'POST' }); const payload = await response.json(); if (payload.state) setState(payload.state); } catch {} }
  return (
    <div className="jobs-portal-shell"><section className="jobs-hero-card"><div><span className="eyebrow"><i /> Northline RP staff portal</span><h1>Apply for the roles that keep the city running.</h1><p>Browse open staff postings, step through a guided application, and track staff updates from the same portal after you submit.</p><div className="jobs-hero-actions"><a className="button button-primary" href="#open-postings"><i className="fa-solid fa-briefcase" aria-hidden="true" /> View postings</a><a className="button button-soft" href="#my-applications"><i className="fa-solid fa-inbox" aria-hidden="true" /> My applications{unreadCount ? ` · ${unreadCount} update${unreadCount === 1 ? '' : 's'}` : ''}</a></div></div><aside><span>Open postings</span><strong>{state.postings.length}</strong><small>{signedIn ? 'Your application history is available below.' : 'Sign in with Steam before submitting.'}</small></aside></section>
      <section className="jobs-posting-layout" id="open-postings"><aside className="jobs-posting-list" aria-label="Job postings"><div className="section-heading compact"><span className="kicker">Available roles</span><h2>Choose a posting</h2></div>{state.postings.length ? state.postings.map((posting) => <button className={selected?.id === posting.id ? 'selected' : ''} key={posting.id} type="button" onClick={() => setSelectedId(posting.id)}><i className={posting.icon} aria-hidden="true" /><span><strong>{posting.title}</strong><small>{posting.department} · {posting.commitment}</small></span></button>) : <p className="muted-inline-note">No staff postings are currently open.</p>}</aside>{selected ? <section className="jobs-detail-panel"><article className="job-posting-brief" style={{ ['--job-accent' as string]: selected.accent }}><div className="job-posting-topline"><span><i className={selected.icon} aria-hidden="true" /> {selected.department}</span><small>{selected.commitment}</small></div><h2>{selected.title}</h2><p>{selected.description}</p><div className="job-posting-columns"><section><h3>What staff expect</h3>{selected.expectations.map((item) => <p key={item}><i className="fa-solid fa-check" aria-hidden="true" /> {item}</p>)}</section><section><h3>Strong applicants show</h3>{selected.qualities.map((item) => <p key={item}><i className="fa-solid fa-star" aria-hidden="true" /> {item}</p>)}</section></div></article>{existingForSelected ? <SubmittedApplication application={existingForSelected} posting={selected} /> : <ApplicationWizard posting={selected} signedIn={signedIn} onSubmitted={setState} />}</section> : null}</section>
      <section className="my-applications-panel" id="my-applications"><div className="section-heading inline"><div><span className="kicker">Applicant view</span><h2>My submitted applications</h2><p>Staff-visible changes appear here with applicant-facing notes. New updates are highlighted until you open them.</p></div>{!signedIn ? <a className="button button-primary" href="/api/auth/steam?returnTo=/jobs"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in</a> : null}</div>{signedIn && state.applications.length ? <div className="job-application-grid">{state.applications.map((application) => { const posting = state.postings.find((item) => item.id === application.jobPostingId); return <div className={isUnread(application) ? 'job-unread-wrap' : ''} key={application.id} onMouseEnter={() => markViewed(application.id)} onFocus={() => markViewed(application.id)}>{isUnread(application) ? <span className="job-update-badge">New update</span> : null}<SubmittedApplication application={application} posting={posting} /></div>; })}</div> : <article className="empty-card jobs-empty-card"><strong>{signedIn ? 'No applications yet.' : 'Sign in to track applications.'}</strong><p>{signedIn ? 'Pick an open posting above and complete the guided application.' : 'Your submitted answers, review status, and staff notes will appear here.'}</p></article>}</section></div>
  );
}
