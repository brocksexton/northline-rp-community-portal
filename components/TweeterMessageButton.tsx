'use client';

import { useState, type FormEvent } from 'react';

type Props = {
  targetSteamId: string;
  targetName: string;
  signedIn: boolean;
  className?: string;
};

export function TweeterMessageButton({ targetSteamId, targetName, signedIn, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function start() {
    if (!signedIn) {
      window.location.href = `/api/auth/steam?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setOpen(true);
    setState('idle');
    setMessage('');
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setMessage('');
    try {
      const response = await fetch('/api/tweeter/social/messages', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toSteamId: targetSteamId, body }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || 'Could not send that message.');
      }
      setBody('');
      setState('sent');
      setMessage('Sent. You can keep chatting from Messages.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Could not send that message.');
    }
  }

  return (
    <>
      <button type="button" className={`tweeter-message-button ${className}`.trim()} onClick={start}>
        <i className="fa-regular fa-envelope" aria-hidden="true" /> <span>Message</span>
      </button>
      {open ? (
        <div className="tweeter-dm-overlay" role="dialog" aria-modal="true" aria-label={`Message ${targetName}`}>
          <div className="tweeter-dm-modal">
            <header>
              <div>
                <small>Direct message</small>
                <h2>{targetName}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close message composer"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </header>
            <form onSubmit={send}>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="Write a quick message…" autoFocus />
              <div className="tweeter-dm-modal-actions">
                <span className={state === 'error' ? 'error' : state === 'sent' ? 'success' : ''}>{message || `${body.length}/1000`}</span>
                <a href={`/tweeter/messages?with=${encodeURIComponent(targetSteamId)}`}>Open Messages</a>
                <button type="submit" disabled={state === 'sending' || !body.trim()}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
