import fs from 'node:fs';
import { ipcMain, nativeImage } from 'electron';
import log from 'electron-log';
import { THUMBNAIL_SIZE } from '../../shared/constants';
import { EVENTS } from '../../shared/events';
import { getSnap, updateSnap } from '../database';

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

  ipcMain.handle(
    EVENTS.SNAP_REGENERATE_THUMBNAIL,
    (_event, snapId: string, dataUrl: string) => {
      const snap = getSnap(snapId);
      if (!snap) return;

      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const image = nativeImage.createFromBuffer(buffer);
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
      log.info(`Thumbnail regenerated for snap ${snapId}`);
      notifyTrayUpdated();
    },
  );
}
