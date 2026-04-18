import path from 'node:path';
import { nativeImage } from 'electron';
import log from 'electron-log';

export function createTrayIcon(): Electron.NativeImage {
  const projectRoot = path.resolve(__dirname, '..');
  const iconPath = path.join(projectRoot, 'assets', 'tray-icon.png');

  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    log.warn(`Tray icon not found at ${iconPath}, using fallback`);
    const size = 22;
    const canvas = Buffer.alloc(size * size * 4, 0);

    for (let y = 4; y < 18; y++) {
      for (let x = 3; x < 19; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx + 3] = 200;
      }
    }
    for (let y = 8; y < 14; y++) {
      for (let x = 7; x < 15; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx + 3] = 0;
      }
    }

    icon = nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size,
    });
  }

  icon.setTemplateImage(true);
  return icon;
}
