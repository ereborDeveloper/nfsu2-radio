import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCue, parseTextTracklist, cueAt, cleanCues } from '../src/tracklist.ts';
import { nowLine, onAir, parseStations } from '../src/schedule.ts';

const TEXT = '﻿00:00 Alpha - First\r\n04:30 Beta - Second\r\nnot a line\r\n1:02:03 Gamma - Third - Remix\r\n00:10 Only a title\r\n';

test('a text track list is read with minutes, hours and a missing artist', () => {
  assert.deepEqual(parseTextTracklist(TEXT), [
    { at: 0, artist: 'Alpha', title: 'First' },
    { at: 270, artist: 'Beta', title: 'Second' },
    { at: 3723, artist: 'Gamma', title: 'Third - Remix' },
    { at: 10, artist: '', title: 'Only a title' },
  ]);
});

const CUE = `PERFORMER "Mixer"
TITLE "The mix"
FILE "mix.mp3" MP3
  TRACK 01 AUDIO
    TITLE "One"
    PERFORMER "Alpha"
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    TITLE "Two"
    INDEX 00 05:59:00
    INDEX 01 06:00:37
`;

test('a cue sheet gives the start of every track, frames are 1/75 s, a track without a performer takes the sheet performer', () => {
  const cues = parseCue(CUE);
  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0], { at: 0, artist: 'Alpha', title: 'One' });
  assert.equal(cues[1].artist, 'Mixer');
  assert.ok(Math.abs(cues[1].at - (360 + 37 / 75)) < 1e-9);
});

test('cues outside the file or without a title are dropped, the rest is sorted', () => {
  const cues = cleanCues([{ at: 50, artist: '', title: 'late' }, { at: 5, artist: '', title: 'b' }, { at: 1, artist: '', title: '' }, { at: 0, artist: '', title: 'a' }, { at: -1, artist: '', title: 'x' }], 40);
  assert.deepEqual(cues.map(c => c.title), ['a', 'b']);
});

const cues = [{ at: 0, artist: 'A', title: 'one' }, { at: 4, artist: 'B', title: 'two' }, { at: 8, artist: '', title: 'three' }];

test('the current track of a mix is the last one that has started', () => {
  assert.equal(cueAt(cues, 0).title, 'one');
  assert.equal(cueAt(cues, 3.99).title, 'one');
  assert.equal(cueAt(cues, 4).title, 'two');
  assert.equal(cueAt(cues, 100).title, 'three');
  assert.equal(cueAt(undefined, 3), null);
  assert.equal(cueAt([{ at: 5, artist: '', title: 'x' }], 2), null);
});

const mix = { type: 'play', id: 'm', name: 'Mixes', epoch: 0, tracks: [
  { artist: 'DJ', title: 'Night mix', url: 'night.mp3', duration: 12, basis: 'own', tracklist: cues },
  { artist: 'Solo', title: 'Single', url: 'single.mp3', duration: 10, basis: 'own' },
] };

test('the line shows the track of the mix by time, and the plain track for a file without a list', () => {
  assert.equal(nowLine(mix, onAir(mix, 1000)), 'Mixes: A - one (Night mix)');
  assert.equal(nowLine(mix, onAir(mix, 5000)), 'Mixes: B - two (Night mix)');
  assert.equal(nowLine(mix, onAir(mix, 9000)), 'Mixes: three (Night mix)');
  assert.equal(nowLine(mix, onAir(mix, 13000)), 'Mixes: Solo - Single');
  assert.equal(nowLine(mix, onAir(mix, 22000 + 5000)), 'Mixes: B - two (Night mix)');
  assert.equal(nowLine(mix, null), 'Mixes: waiting for the sound');
});

test('a track list in stations.json is kept sorted and cleaned', () => {
  const json = { stations: [{ id: 'm', name: 'M', epoch: 0, tracks: [
    { artist: 'DJ', title: 'T', url: 't.mp3', duration: 20, basis: 'own', tracklist: [{ at: 9, title: 'b' }, { at: 0, title: 'a', artist: 'X' }, { at: 99, title: 'late' }, 'junk'] },
  ] }] };
  const t = parseStations(json).stations[0].tracks[0];
  assert.deepEqual(t.tracklist, [{ at: 0, artist: 'X', title: 'a' }, { at: 9, artist: '', title: 'b' }]);
});
