import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron-log', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  nativeImage: {
    createFromBuffer: vi.fn((buffer: Buffer) => ({
      isEmpty: () => buffer.length === 0,
      getSize: () => ({ width: 800, height: 600 }),
      resize: () => ({ toPNG: () => Buffer.from('thumb') }),
    })),
  },
}));
vi.mock('../database', () => ({ getSnap: vi.fn(), updateSnap: vi.fn() }));
vi.mock('../snap-window', () => ({ reopenSnapWindow: vi.fn() }));

import { ipcMain } from 'electron';
import { EVENTS } from '../../shared/events';
import { getSnap, updateSnap } from '../database';
import { annotatedPathFor, exportPathFor } from '../utils';
import { registerAnnotationHandlers } from './annotations';

type Handler = (event: unknown, snapId: string, dataUrl: string) => void;

const PNG_BYTES = Buffer.from('composite-png');
const DATA_URL = `data:image/png;base64,${PNG_BYTES.toString('base64')}`;

let dir: string;
let snap: {
  id: string;
  filePath: string;
  thumbPath: string;
  annotations: string | null;
};
let saveComposite: Handler;
const notifyTrayUpdated = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-annotations-'));
  snap = {
    id: 'snap-1',
    filePath: path.join(dir, 'snap-1.png'),
    thumbPath: path.join(dir, 'thumbs', 'snap-1.png'),
    annotations: '[{"id":"a","tool":"rect"}]',
  };
  fs.mkdirSync(path.dirname(snap.thumbPath), { recursive: true });
  fs.writeFileSync(snap.filePath, 'original');
  vi.mocked(getSnap).mockImplementation(() => snap as never);

  registerAnnotationHandlers(notifyTrayUpdated);
  const registration = vi
    .mocked(ipcMain.handle)
    .mock.calls.find(([channel]) => channel === EVENTS.SNAP_SAVE_COMPOSITE);
  saveComposite = registration?.[1] as Handler;
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('SNAP_SAVE_COMPOSITE', () => {
  it('keeps the flattened PNG as the export file while the snap has annotations', () => {
    saveComposite(null, snap.id, DATA_URL);

    expect(fs.readFileSync(annotatedPathFor(snap))).toEqual(PNG_BYTES);
    expect(exportPathFor(snap)).toBe(annotatedPathFor(snap));
    expect(fs.readFileSync(snap.thumbPath, 'utf8')).toBe('thumb');
    expect(updateSnap).toHaveBeenCalledWith(snap.id, {
      thumbnailUpdatedAt: expect.any(String),
    });
    expect(notifyTrayUpdated).toHaveBeenCalled();
  });

  it('exports the bare capture again once the annotations are cleared', () => {
    saveComposite(null, snap.id, DATA_URL);
    snap.annotations = '[]';

    saveComposite(null, snap.id, DATA_URL);

    expect(fs.existsSync(annotatedPathFor(snap))).toBe(false);
    expect(exportPathFor(snap)).toBe(snap.filePath);
  });

  it('ignores an undecodable composite', () => {
    saveComposite(null, snap.id, 'data:image/png;base64,');

    expect(fs.existsSync(annotatedPathFor(snap))).toBe(false);
    expect(updateSnap).not.toHaveBeenCalled();
  });
});
