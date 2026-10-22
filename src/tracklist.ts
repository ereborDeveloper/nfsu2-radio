import type { Cue } from './types.ts';

const TIME = /^\s*(?:(\d+):)?(\d{1,3}):(\d{2})(?:\.\d+)?\s+(.+?)\s*$/;
const FRAMES_PER_SECOND = 75;
const BOM = /^﻿/;

function splitName(text: string): { artist: string; title: string } {
  const i = text.indexOf(' - ');
  if (i < 0) return { artist: '', title: text.trim() };
  return { artist: text.slice(0, i).trim(), title: text.slice(i + 3).trim() };
}

export function parseTextTracklist(text: string): Cue[] {
  const cues: Cue[] = [];
  for (const line of text.replace(BOM, '').split(/\r?\n/)) {
    const m = TIME.exec(line);
    if (!m) continue;
    const at = Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    cues.push({ at, ...splitName(m[4]) });
  }
  return cues;
}

function value(line: string, key: string): string | null {
  const m = new RegExp(`^\\s*${key}\\s+(?:"([^"]*)"|(\\S.*?))\\s*$`, 'i').exec(line);
  return m ? (m[1] ?? m[2]) : null;
}

export function parseCue(text: string): Cue[] {
  const cues: Cue[] = [];
  let global = '';
  let current: Partial<Cue> | null = null;
  const flush = () => {
    if (current && current.at !== undefined && current.title) {
      cues.push({ at: current.at, artist: current.artist ?? global, title: current.title });
    }
  };
  for (const line of text.replace(BOM, '').split(/\r?\n/)) {
    if (/^\s*TRACK\s/i.test(line)) { flush(); current = {}; continue; }
    const performer = value(line, 'PERFORMER');
    const title = value(line, 'TITLE');
    if (performer !== null) { if (current) current.artist = performer; else global = performer; }
    if (title !== null && current) current.title = title;
    const idx = /^\s*INDEX\s+01\s+(\d+):(\d{2}):(\d{2})/i.exec(line);
    if (idx && current) current.at = Number(idx[1]) * 60 + Number(idx[2]) + Number(idx[3]) / FRAMES_PER_SECOND;
  }
  flush();
  return cues;
}

export function cleanCues(cues: Cue[], duration: number): Cue[] {
  return cues
    .filter(c => Number.isFinite(c.at) && c.at >= 0 && c.at < duration && !!c.title)
    .sort((a, b) => a.at - b.at);
}

export function cueAt(cues: Cue[] | undefined, offset: number): Cue | null {
  if (!cues?.length) return null;
  let found: Cue | null = null;
  for (const c of cues) {
    if (c.at <= offset) found = c;
    else break;
  }
  return found;
}
