import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import log from 'electron-log';
import { duplicateSnap, getSnap, type SnapRecord } from './database';
import { reopenSnapWindow } from './snap-window';

/** Where the flattened image + annotations PNG lives; only present while the snap has annotations. */
export function annotatedPathFor(
  snap: Pick<SnapRecord, 'id' | 'filePath'>,
): string {
  return path.join(path.dirname(snap.filePath), 'annotated', `${snap.id}.png`);
}

/** The file to hand to other apps: the annotated PNG when there is one, else the capture. */
export function exportPathFor(
  snap: Pick<SnapRecord, 'id' | 'filePath'>,
): string {
  const annotated = annotatedPathFor(snap);
  return fs.existsSync(annotated) ? annotated : snap.filePath;
}

export function deleteSnapFiles(
  snap: Pick<SnapRecord, 'id' | 'filePath' | 'thumbPath'>,
): void {
  try {
    for (const file of [
      snap.filePath,
      snap.thumbPath,
      annotatedPathFor(snap),
    ]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  } catch (err) {
    log.warn('Failed to delete snap files:', err);
  }
}

/**
 * Find an installed .app bundle path by user-facing display name.
 *
 * Strategies, fastest/most-specific first:
 *   1. Launch Services exact match via `osascript "path to application"`.
 *      Works when the name exactly matches the bundle's registered
 *      display name (e.g. "Safari", "Adobe Photoshop 2026").
 *   2. Spotlight substring match via `mdfind`. Picks up partial /
 *      vendor-stripped names (e.g. "Photoshop" → "Adobe Photoshop 2026").
 *      Among multiple matches, prefer display-name prefix matches, then
 *      shorter paths (canonical installs usually live directly in
 *      `/Applications`, not nested folders).
 *
 * Returns null if no bundle matches. All shell-injection vectors closed:
 * we use execFile (no shell) and escape user input before interpolating
 * into AppleScript / Spotlight query strings.
 */
export function resolveAppPath(appName: string): string | null {
  const trimmed = appName.trim();
  if (!trimmed) return null;

  // 1. Launch Services exact match.
  // AppleScript strings need backslash-escaping for `\` and `"`.
  const escapedForAppleScript = trimmed
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  try {
    const result = execFileSync(
      'osascript',
      ['-e', `POSIX path of (path to application "${escapedForAppleScript}")`],
      { encoding: 'utf-8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (result) return result;
  } catch {
    // Not found via LS — fall through to Spotlight.
  }

  // 2. Spotlight substring match. The `cd` modifier on the comparison
  // makes it case- and diacritic-insensitive.
  const escapedForMdQuery = trimmed.replace(/"/g, '\\"');
  try {
    const query =
      `kMDItemContentType == "com.apple.application-bundle" && ` +
      `(kMDItemDisplayName == "*${escapedForMdQuery}*"cd || ` +
      `kMDItemFSName == "*${escapedForMdQuery}*"cd)`;
    const result = execFileSync('mdfind', [query], {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!result) return null;

    const candidates = result.split('\n').filter(Boolean);
    const lower = trimmed.toLowerCase();
    candidates.sort((a, b) => {
      const aBase = path.basename(a, '.app').toLowerCase();
      const bBase = path.basename(b, '.app').toLowerCase();
      const aPrefix = aBase.startsWith(lower);
      const bPrefix = bBase.startsWith(lower);
      if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
      return a.length - b.length;
    });
    return candidates[0] ?? null;
  } catch {
    return null;
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
  const annotated = annotatedPathFor(snap);
  if (fs.existsSync(annotated)) {
    const newAnnotated = annotatedPathFor({ id: newId, filePath: newFilePath });
    fs.mkdirSync(path.dirname(newAnnotated), { recursive: true });
    fs.copyFileSync(annotated, newAnnotated);
  }
  duplicateSnap(snapId, newId, newFilePath, newThumbPath);

  const newSnap = getSnap(newId);
  if (newSnap) {
    reopenSnapWindow(newSnap);
  }
}
