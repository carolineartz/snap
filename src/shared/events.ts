/**
 * IPC event names, prefixed with 'snappy:' to avoid collisions.
 */
export const EVENTS = {
  // App lifecycle
  APP_QUIT: 'snappy:quit',
  APP_VERSION: 'snappy:version',

  // Window management
  WINDOW_SHOW: 'snappy:window-show',
  WINDOW_HIDE: 'snappy:window-hide',
} as const;
