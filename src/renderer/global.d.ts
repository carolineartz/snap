import type { SnappyAPI } from '../preload/index';

declare global {
  interface Window {
    snappy: SnappyAPI;
  }
}
