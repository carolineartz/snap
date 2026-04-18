import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import log from 'electron-log';
import { duplicateSnap, getSnap } from './database';
import { reopenSnapWindow } from './snap-window';

export function deleteSnapFiles(filePath: string, thumbPath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  } catch (err) {
    log.warn('Failed to delete snap files:', err);
  }
}

/**
 * Find the .icns icon file inside a macOS .app bundle.
 * Tries common names first, falls back to scanning Resources/.
 */
export function findIcnsPath(appPath: string): string | null {
  const resourcesDir = path.join(appPath, 'Contents', 'Resources');

  // Try AppIcon.icns (common convention)
  const appIcon = path.join(resourcesDir, 'AppIcon.icns');
  if (fs.existsSync(appIcon)) return appIcon;

  // Try {AppName}.icns
  const appName = path.basename(appPath, '.app');
  const namedIcon = path.join(resourcesDir, `${appName}.icns`);
  if (fs.existsSync(namedIcon)) return namedIcon;

  // Fall back to first .icns file in Resources
  try {
    const icnsFile = fs
      .readdirSync(resourcesDir)
      .find((file) => file.endsWith('.icns'));
    if (icnsFile) return path.join(resourcesDir, icnsFile);
  } catch {
    // Resources dir might not exist
  }

  return null;
}

export function handleDuplicate(snapId: string): void {
  const snap = getSnap(snapId);
  if (!snap) return;

  const newId = crypto.randomUUID();
  const ext = path.extname(snap.filePath);
  const dir = path.dirname(snap.filePath);
  const thumbDir = path.dirname(snap.thumbPath);
  const newFilePath = path.join(dir, `${newId}${ext}`);
  const newThumbPath = path.join(thumbDir, `${newId}${ext}`);

  fs.copyFileSync(snap.filePath, newFilePath);
  fs.copyFileSync(snap.thumbPath, newThumbPath);
  duplicateSnap(snapId, newId, newFilePath, newThumbPath);

  const newSnap = getSnap(newId);
  if (newSnap) {
    reopenSnapWindow(newSnap);
  }
}
