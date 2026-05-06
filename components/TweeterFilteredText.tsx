'use client';

import { Fragment, useMemo, useState, type CSSProperties } from 'react';
import { buildTextFilterSegments, getTextFilterSummary, textFilterReasonLabel, type TextFilterReason, type TextFilterRule } from '@/lib/content-filter';

type TweeterFilteredTextProps = {
  text: string;
  rules?: TextFilterRule[];
};

type TweeterFilterNoticeProps = {
  text: string;
  compact?: boolean;
  rules?: TextFilterRule[];
};

function MaskedWord({ text, reason }: { text: string; reason: TextFilterReason }) {
  const [revealed, setRevealed] = useState(false);
  const [peekActive, setPeekActive] = useState(false);
  const [peekPosition, setPeekPosition] = useState({ x: '50%', y: '50%' });
  const reasonLabel = textFilterReasonLabel(reason);

  if (revealed) {
    return (
      <button
        type="button"
        className="tweeter-filter-word is-revealed"
        onClick={() => setRevealed(false)}
        aria-label="Filtered word revealed. Click to hide it again."
      >
        {text}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="tweeter-filter-word"
      aria-label={`Hidden word obscured for ${reasonLabel}. Hover to peek or click to reveal.`}
      onClick={() => setRevealed(true)}
      onMouseEnter={() => setPeekActive(true)}
      onMouseLeave={() => setPeekActive(false)}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = `${Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))}%`;
        const y = `${Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))}%`;
        setPeekPosition({ x, y });
      }}
    >
      <span className="tweeter-filter-word__sizer" aria-hidden="true">{text}</span>
      <span className="tweeter-filter-word__glow" aria-hidden="true" />
      <span className="tweeter-filter-word__blurred" aria-hidden="true">{text}</span>
      {peekActive ? (
        <span
          className="tweeter-filter-word__peek"
          aria-hidden="true"
          style={{ '--peek-x': peekPosition.x, '--peek-y': peekPosition.y } as CSSProperties}
        >
          {text}
        </span>
      ) : null}
      <span className="tweeter-filter-word__sparkle tweeter-filter-word__sparkle--one" aria-hidden="true">✦</span>
      <span className="tweeter-filter-word__sparkle tweeter-filter-word__sparkle--two" aria-hidden="true">✦</span>
      <span className="tweeter-filter-word__sparkle tweeter-filter-word__sparkle--three" aria-hidden="true">✧</span>
      <span className="tweeter-filter-word__sparkle tweeter-filter-word__sparkle--four" aria-hidden="true">✦</span>
    </button>
  );
}

function renderToken(token: string, tokenIndex: number, rules?: TextFilterRule[]) {
  const match = token.match(/^(["'([{]*)(.*?)([.,!?;:)\]}"']*)$/s);
  const leading = match?.[1] ?? '';
  const core = match?.[2] ?? token;
  const trailing = match?.[3] ?? '';

  if (!core) return <Fragment key={`empty-${tokenIndex}`}>{token}</Fragment>;

  if (/^https?:\/\//i.test(core)) {
    return (
      <Fragment key={`token-${tokenIndex}`}>
        {leading}
        <a className="tweeter-link" href={core} rel="noreferrer" target="_blank">{core}</a>
        {trailing}
      </Fragment>
    );
  }

  const prefix = core.startsWith('#') || core.startsWith('@') ? core.slice(0, 1) : '';
  const bare = prefix ? core.slice(1) : core;
  const segments = buildTextFilterSegments(bare, rules);
  const styledClass = prefix === '#' ? 'tweeter-hashtag' : prefix === '@' ? 'tweeter-mention' : '';

  return (
    <Fragment key={`token-${tokenIndex}`}>
      {leading}
      {prefix ? <span className={styledClass}>{prefix}</span> : null}
      {segments.map((segment, segmentIndex) => {
        if (segment.type === 'masked') {
          const maskedNode = <MaskedWord key={`masked-${tokenIndex}-${segmentIndex}`} reason={segment.reason} text={segment.text} />;
          return styledClass ? <span className={styledClass} key={`styled-masked-${tokenIndex}-${segmentIndex}`}>{maskedNode}</span> : maskedNode;
        }
        if (!segment.text) return null;
        const textNode = <span key={`text-${tokenIndex}-${segmentIndex}`}>{segment.text}</span>;
        return styledClass ? <span className={styledClass} key={`styled-text-${tokenIndex}-${segmentIndex}`}>{textNode}</span> : textNode;
      })}
      {trailing}
    </Fragment>
  );
}

export function TweeterFilteredText({ text, rules }: TweeterFilteredTextProps) {
  const lines = useMemo(() => String(text ?? '').split('\n'), [text]);
  return (
    <>
      {lines.map((line, lineIndex) => {
        const tokens = line.split(/(\s+)/);
        return (
          <Fragment key={`line-${lineIndex}`}>
            {tokens.map((token, tokenIndex) => {
              if (!token) return null;
              if (/^\s+$/s.test(token)) return <Fragment key={`space-${lineIndex}-${tokenIndex}`}>{token}</Fragment>;
              return renderToken(token, lineIndex * 1000 + tokenIndex, rules);
            })}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </Fragment>
        );
      })}
    </>
  );
}

export function TweeterFilterNotice({ text, compact = false, rules }: TweeterFilterNoticeProps) {
  const summary = useMemo(() => getTextFilterSummary(text, rules), [text, rules]);
  if (!summary.containsFilteredText) return null;

  return (
    <div className={`tweeter-filter-notice${compact ? ' is-compact' : ''}`}>
      <span className="tweeter-filter-notice__label">✦ Obscured for {summary.reasonLabel}</span>
      <span className="tweeter-filter-notice__count">{summary.maskedWordCount} hidden term{summary.maskedWordCount === 1 ? '' : 's'}</span>
    </div>
  );
}
