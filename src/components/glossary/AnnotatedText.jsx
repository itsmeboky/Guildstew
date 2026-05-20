// Renders a string with inline [[slug]] / [[slug|label]] markers as a
// mix of plain text and <Term> elements.
//
// Lets tip data files stay as plain strings instead of JSX — authors
// just sprinkle [[trained]] or [[religion|Religion]] into the prose
// and the renderer handles the rest.
//
// Marker syntax:
//   [[slug]]            → <Term slug="slug" />
//   [[slug|label]]      → <Term slug="slug">label</Term>

import { Fragment } from 'react';
import Term from './Term';

const MARKER = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export function parseAnnotated(text) {
  if (!text || typeof text !== 'string') return text;
  const out = [];
  let last = 0;
  let m;
  let key = 0;
  while ((m = MARKER.exec(text)) !== null) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    const [, slug, label] = m;
    out.push(
      <Term key={`t-${key++}`} slug={slug}>
        {label}
      </Term>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  return out;
}

export default function AnnotatedText({ text, as: As = Fragment, ...rest }) {
  const parsed = parseAnnotated(text);
  if (As === Fragment) return <>{parsed}</>;
  return <As {...rest}>{parsed}</As>;
}
