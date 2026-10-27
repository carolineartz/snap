import { clipboard, nativeImage } from 'electron';
import log from 'electron-log';

/** Put an image file on the clipboard. Returns false if it could not be read. */
export function copyImageFileToClipboard(filePath: string): boolean {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    log.warn(`Could not read image for clipboard: ${filePath}`);
    return false;
  }
  clipboard.writeImage(image);
  log.info(`Snap copied to clipboard: ${filePath}`);
  return true;
}
