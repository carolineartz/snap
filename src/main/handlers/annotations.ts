import fs from 'node:fs';
import path from 'node:path';
import { ipcMain, nativeImage } from 'electron';
import log from 'electron-log';
import { THUMBNAIL_SIZE } from '../../shared/constants';
import { EVENTS } from '../../shared/events';
import { getSnap, updateSnap } from '../database';
import { annotatedPathFor } from '../utils';

function hasAnnotations(json: string | null): boolean {
  if (!json) return false;
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function registerAnnotationHandlers(
  notifyTrayUpdated: () => void,
): void {
  ipcMain.handle(
    EVENTS.SNAP_SAVE_ANNOTATIONS,
    (_event, snapId: string, json: string) => {
      updateSnap(snapId, {
        annotations: json,
        lastModifiedAt: new Date().toISOString(),
      });
    },
  );

  ipcMain.handle(EVENTS.SNAP_GET_ANNOTATIONS, (_event, snapId: string) => {
    const snap = getSnap(snapId);
    return snap?.annotations ?? null;
  });

  // The viewer sends the image with its annotations flattened in. It
  // becomes the file other apps receive (drag-out, copy) and the thumbnail;
  // once the annotations are gone the bare capture is exported again.
  ipcMain.handle(
    EVENTS.SNAP_SAVE_COMPOSITE,
    (_event, snapId: string, dataUrl: string) => {
      const snap = getSnap(snapId);
      if (!snap) return;

      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const image = nativeImage.createFromBuffer(buffer);
      if (image.isEmpty()) {
        log.warn(`Composite for snap ${snapId} could not be decoded`);
        return;
      }

      const annotatedPath = annotatedPathFor(snap);
      if (hasAnnotations(snap.annotations)) {
        fs.mkdirSync(path.dirname(annotatedPath), { recursive: true });
        fs.writeFileSync(annotatedPath, buffer);
      } else if (fs.existsSync(annotatedPath)) {
        fs.unlinkSync(annotatedPath);
      }

      const size = image.getSize();
      let thumbWidth: number;
      let thumbHeight: number;
      if (size.width >= size.height) {
        thumbWidth = THUMBNAIL_SIZE;
        thumbHeight = Math.round((THUMBNAIL_SIZE / size.width) * size.height);
      } else {
        thumbHeight = THUMBNAIL_SIZE;
        thumbWidth = Math.round((THUMBNAIL_SIZE / size.height) * size.width);
      }
      const thumb = image.resize({ width: thumbWidth, height: thumbHeight });

      fs.writeFileSync(snap.thumbPath, thumb.toPNG());
      updateSnap(snapId, { thumbnailUpdatedAt: new Date().toISOString() });
      log.info(`Composite saved for snap ${snapId}`);
      notifyTrayUpdated();
    },
  );
}
