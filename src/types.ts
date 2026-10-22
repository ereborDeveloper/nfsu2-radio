export interface RadioOutput {
  context(): AudioContext | null;
  onContextChange(cb: (c: AudioContext) => void): () => void;
  masterVolume(): number;
}

export interface MenuItem {
  set(text: string): void;
  remove(): void;
}

export interface RadioHost {
  overlayRoot: HTMLElement;
  stationsUrl?: string;
  menu?: { add(text: string, activate: () => string): MenuItem };
}

export interface RadioHandle {
  unmount(): void;
}

export type Basis = 'own' | 'cc-by' | 'permission';

export interface Cue {
  at: number;
  artist: string;
  title: string;
}

export interface Track {
  artist: string;
  title: string;
  url: string;
  duration: number;
  basis: Basis;
  license?: string;
  source?: string;
  tracklist?: Cue[];
}

export interface PlayStation {
  type: 'play';
  id: string;
  name: string;
  epoch: number;
  tracks: Track[];
}

export interface LinkStation {
  type: 'link';
  id: string;
  name: string;
  url: string;
}

export type Station = PlayStation | LinkStation;

export interface StationsFile {
  stations: Station[];
  problems: string[];
}

export interface OnAir {
  index: number;
  offset: number;
  track: Track;
}
