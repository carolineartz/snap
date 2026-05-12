import { execFileSync } from 'node:child_process';
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
 * Read a single string key from a .plist file via plutil. Returns null if
 * the key is missing, the value is empty, or plutil fails. Uses execFile
 * (not a shell string) so paths with spaces / metacharacters can't inject.
 */
function readPlistString(plistPath: string, key: string): string | null {
  try {
    const value = execFileSync('plutil', ['-extract', key, 'raw', plistPath], {
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return value || null;
  } catch {
    return null;
  }
}

/**
 * Find the .icns icon file inside a macOS .app bundle.
 *
 * Canonical strategy: read `CFBundleIconFile` (or the newer
 * `CFBundleIconName`) from `Contents/Info.plist` — that's the value
 * Finder uses to pick the app icon, and macOS auto-appends `.icns` if
 * the value is just a basename. This is what catches apps like
 * Adobe Photoshop / Illustrator, whose icons live at e.g.
 * `Resources/PS_AppIcon.icns` rather than the conventional
 * `AppIcon.icns` or `{AppName}.icns`.
 *
 * Falls back to heuristics for apps that don't set either key (or that
 * point to an asset catalog only).
 */
export function findIcnsPath(appPath: string): string | null {
  const resourcesDir = path.join(appPath, 'Contents', 'Resources');
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');

  if (fs.existsSync(plistPath)) {
    for (const key of ['CFBundleIconFile', 'CFBundleIconName']) {
      const value = readPlistString(plistPath, key);
      if (!value) continue;
      const fileName = value.endsWith('.icns') ? value : `${value}.icns`;
      const fullPath = path.join(resourcesDir, fileName);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  }

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
