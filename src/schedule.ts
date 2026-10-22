import type { Basis, Cue, LinkStation, OnAir, PlayStation, Station, StationsFile, Track } from './types.ts';
import { cleanCues, cueAt } from './tracklist.ts';

const BASES: Basis[] = ['own', 'cc-by', 'permission'];

export function loopLength(s: PlayStation): number {
  return s.tracks.reduce((a, t) => a + t.duration, 0);
}

export function onAir(s: PlayStation, nowMs: number): OnAir | null {
  const total = loopLength(s);
  if (!s.tracks.length || !(total > 0)) return null;
  const t = ((((nowMs - s.epoch) / 1000) % total) + total) % total;
  let at = 0;
  for (let i = 0; i < s.tracks.length; i++) {
    const d = s.tracks[i].duration;
    if (t < at + d) return { index: i, offset: t - at, track: s.tracks[i] };
    at += d;
  }
  return { index: 0, offset: 0, track: s.tracks[0] };
}

export function nowLine(s: Station, a: OnAir | null): string {
  if (s.type === 'link') return s.name;
  if (!a) return `${s.name}: waiting for the sound`;
  const cue = cueAt(a.track.tracklist, a.offset);
  if (!cue) return `${s.name}: ${a.track.artist} - ${a.track.title}`;
  const who = cue.artist ? `${cue.artist} - ${cue.title}` : cue.title;
  return `${s.name}: ${who} (${a.track.title})`;
}

export function clockOffset(dateHeader: string | null, sentMs: number, receivedMs: number): number {
  const d = dateHeader ? Date.parse(dateHeader) : NaN;
  if (!Number.isFinite(d)) return 0;
  return d + 500 - (sentMs + receivedMs) / 2;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function parseCues(v: unknown, duration: number): Cue[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const raw = v.map((c: any): Cue => ({ at: Number(c?.at), artist: str(c?.artist) ?? '', title: str(c?.title) ?? '' }));
  const cues = cleanCues(raw, duration);
  return cues.length ? cues : undefined;
}

function parseTrack(v: any, where: string, problems: string[]): Track | null {
  const bad = (why: string) => { problems.push(`${where}: ${why}`); return null; };
  if (!v || typeof v !== 'object') return bad('not an object');
  const artist = str(v.artist), title = str(v.title), url = str(v.url);
  if (!artist || !title || !url) return bad('artist, title and url are needed');
  if (typeof v.duration !== 'number' || !(v.duration > 0) || !Number.isFinite(v.duration)) return bad('duration must be a number of seconds above 0');
  if (!BASES.includes(v.basis)) return bad(`basis must be one of ${BASES.join(', ')}`);
  const license = str(v.license), source = str(v.source);
  if (v.basis === 'cc-by' && (!license || !/^https?:\/\//.test(license))) return bad('cc-by needs license: the address of the licence');
  if (v.basis === 'cc-by' && !source) return bad('cc-by needs source: where the track comes from');
  if (v.basis === 'permission' && !source) return bad('permission needs source: who allowed it, and where');
  const t: Track = { artist, title, url, duration: v.duration, basis: v.basis };
  if (license) t.license = license;
  if (source) t.source = source;
  const tracklist = parseCues(v.tracklist, v.duration);
  if (tracklist) t.tracklist = tracklist;
  return t;
}

function parseLink(s: any, id: string, name: string, where: string, problems: string[]): LinkStation | null {
  const url = str(s.url);
  if (!url || !/^https?:\/\//i.test(url)) {
    problems.push(`${where}: a link station needs url: an http or https address`);
    return null;
  }
  return { type: 'link', id, name, url };
}

function parsePlay(s: any, id: string, name: string, where: string, problems: string[]): PlayStation | null {
  const epoch = typeof s.epoch === 'string' ? Date.parse(s.epoch) : typeof s.epoch === 'number' ? s.epoch : NaN;
  if (!Number.isFinite(epoch)) { problems.push(`${where}: epoch (a date) is needed`); return null; }
  const list: unknown[] = Array.isArray(s.tracks) ? s.tracks : [];
  const tracks = list.map((t, k) => parseTrack(t, `${id} track ${k + 1}`, problems)).filter((t): t is Track => !!t);
  if (!tracks.length) { problems.push(`${id}: no usable tracks`); return null; }
  return { type: 'play', id, name, epoch, tracks };
}

export function parseStations(json: unknown): StationsFile {
  const problems: string[] = [];
  const list = (json as any)?.stations;
  if (!Array.isArray(list)) return { stations: [], problems: ['stations.json has no "stations" list'] };
  const stations: Station[] = [];
  const seen = new Set<string>();
  list.forEach((s: any, i: number) => {
    const where = `station ${i + 1}`;
    const id = str(s?.id), name = str(s?.name);
    if (!id || !name) { problems.push(`${where}: id and name are needed`); return; }
    if (seen.has(id)) { problems.push(`${where}: id "${id}" is used twice`); return; }
    const st = s.type === 'link' ? parseLink(s, id, name, where, problems) : parsePlay(s, id, name, where, problems);
    if (!st) return;
    seen.add(id);
    stations.push(st);
  });
  return { stations, problems };
}
