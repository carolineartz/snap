import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { app, screen } from 'electron';
import log from 'electron-log';
import { SNAPS_DIR_NAME } from '../shared/constants';

export interface CaptureResult {
  filePath: string;
  cursorX: number;
  cursorY: number;
}

function getSnapsDir(): string {
  const dir = path.join(app.getPath('userData'), SNAPS_DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateSnapFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `snap-${timestamp}.png`;
}

/**
 * Triggers macOS interactive screen capture (Cmd+Shift+2 style crosshair).
 * Returns the file path and cursor position on success, null if user cancelled.
 */
export function captureScreen(): Promise<CaptureResult | null> {
  return new Promise((resolve) => {
    const filePath = path.join(getSnapsDir(), generateSnapFilename());

    // -i  = interactive (region selection)
    // -x  = no screenshot sound
    // -r  = don't add shadow to window captures
    execFile(
      'screencapture',
      ['-i', '-x', '-r', filePath],
      (error, _stdout, _stderr) => {
        if (error) {
          // Exit code 1 = user cancelled (pressed Escape)
          log.info('Screen capture cancelled by user');
          resolve(null);
          return;
        }

        // Verify the file was actually created
        if (!fs.existsSync(filePath)) {
          log.warn('Screen capture file not found after capture');
          resolve(null);
          return;
        }

        // Grab cursor position — it'll be near where the selection ended
        const cursorPoint = screen.getCursorScreenPoint();

        log.info(`Screen captured: ${filePath}`);
        resolve({
          filePath,
          cursorX: cursorPoint.x,
          cursorY: cursorPoint.y,
        });
      },
    );
  });
}
