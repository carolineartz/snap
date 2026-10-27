import { contextBridge, ipcRenderer } from 'electron';
import type { AnnotationTool } from '../shared/annotation-types';
import { EVENTS } from '../shared/events';
import type {
  Settings,
  SettingsPatch,
  SettingsUpdateResult,
} from '../shared/settings';
import type { TagWithUsageCount } from '../shared/tag-colors';

interface MenuOpenParams {
  screenX: number;
  screenY: number;
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  hasShadow: boolean;
  hasAnnotations: boolean;
}

interface MenuActionPayload {
  type:
    | 'setTool'
    | 'setColor'
    | 'setStroke'
    | 'copy'
    | 'toggleShadow'
    | 'close'
    | 'delete'
    | 'duplicate'
    | 'revert';
  value?: unknown;
}

const snapAPI = {
  app: {
    quit: () => ipcRenderer.send(EVENTS.APP_QUIT),
    version: () => ipcRenderer.invoke(EVENTS.APP_VERSION) as Promise<string>,
    hideWindow: () => ipcRenderer.send(EVENTS.WINDOW_HIDE),
  },
  capture: {
    /** Open the crosshair now (0) or after a countdown of `delaySeconds`. */
    start: (delaySeconds: number) =>
      ipcRenderer.send(EVENTS.CAPTURE_START, delaySeconds),
    cancel: () => ipcRenderer.send(EVENTS.CAPTURE_CANCEL),
    onCountdown: (callback: (secondsLeft: number | null) => void) => {
      ipcRenderer.on(
        EVENTS.CAPTURE_COUNTDOWN,
        (_e, secondsLeft: number | null) => callback(secondsLeft),
      );
    },
  },
  viewer: {
    close: () => ipcRenderer.send(EVENTS.SNAP_CLOSE),
    move: (dx: number, dy: number) =>
      ipcRenderer.send(EVENTS.SNAP_MOVE, dx, dy),
    setOpacity: (opacity: number) =>
      ipcRenderer.send(EVENTS.SNAP_SET_OPACITY, opacity),
    copy: (filePath: string) => ipcRenderer.send(EVENTS.SNAP_COPY, filePath),
    copyComposite: (dataUrl: string) =>
      ipcRenderer.send(EVENTS.SNAP_COPY_COMPOSITE, dataUrl),
    toggleShadow: () => ipcRenderer.send(EVENTS.SNAP_TOGGLE_SHADOW),
    readImage: (filePath: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_READ_IMAGE, filePath) as Promise<string>,

    // Annotations
    saveAnnotations: (snapId: string, json: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_SAVE_ANNOTATIONS, snapId, json),
    getAnnotations: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_GET_ANNOTATIONS, snapId) as Promise<
        string | null
      >,
    duplicate: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_DUPLICATE, snapId),
    regenerateThumbnail: (snapId: string, dataUrl: string) =>
      ipcRenderer.invoke(EVENTS.SNAP_REGENERATE_THUMBNAIL, snapId, dataUrl),

    // Context menu popup
    openMenu: (params: MenuOpenParams) =>
      ipcRenderer.send(EVENTS.MENU_OPEN, params),
    onMenuAction: (callback: (payload: MenuActionPayload) => void) => {
      ipcRenderer.on(EVENTS.MENU_ACTION, (_e, payload: MenuActionPayload) =>
        callback(payload),
      );
    },
  },
  menu: {
    dismiss: () => ipcRenderer.send(EVENTS.MENU_DISMISS),
    action: (type: MenuActionPayload['type'], value?: unknown) =>
      ipcRenderer.send(EVENTS.MENU_ACTION, { type, value }),
  },
  settings: {
    get: () => ipcRenderer.invoke(EVENTS.SETTINGS_GET) as Promise<Settings>,
    update: (patch: SettingsPatch) =>
      ipcRenderer.invoke(
        EVENTS.SETTINGS_UPDATE,
        patch,
      ) as Promise<SettingsUpdateResult>,
    /** Returns an unsubscribe function. */
    onUpdated: (callback: (settings: Settings) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, settings: Settings) =>
        callback(settings);
      ipcRenderer.on(EVENTS.SETTINGS_UPDATED, listener);
      return () => {
        ipcRenderer.removeListener(EVENTS.SETTINGS_UPDATED, listener);
      };
    },
    openWindow: () => ipcRenderer.send(EVENTS.SETTINGS_OPEN),
    /** Pause global shortcuts while a new chord is being recorded. */
    suspendShortcuts: (suspended: boolean) =>
      ipcRenderer.send(EVENTS.SETTINGS_SUSPEND_SHORTCUTS, suspended),
  },
  library: {
    getSnaps: () => ipcRenderer.invoke(EVENTS.LIBRARY_GET_SNAPS),
    openSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_OPEN_SNAP, snapId),
    deleteSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_DELETE_SNAP, snapId),
    renameSnap: (snapId: string, name: string | null) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_RENAME_SNAP, snapId, name),
    reassignApp: (snapId: string, sourceApp: string | null) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_REASSIGN_APP, snapId, sourceApp),
    readThumbnail: (thumbPath: string) =>
      ipcRenderer.invoke(EVENTS.LIBRARY_READ_THUMBNAIL, thumbPath) as Promise<
        string | null
      >,
    searchByText: (query: string, threshold?: number) =>
      ipcRenderer.invoke(
        EVENTS.LIBRARY_SEARCH_BY_TEXT,
        query,
        threshold,
      ) as Promise<{ snapId: string; score: number }[]>,
    onSnapsUpdated: (callback: () => void) => {
      ipcRenderer.on(EVENTS.SNAPS_UPDATED, callback);
    },
    openBrowserWindow: () => ipcRenderer.send(EVENTS.BROWSER_OPEN),
    /** Start a native file drag for these snaps; call from `dragstart`. */
    startDrag: (snapIds: string[]) =>
      ipcRenderer.send(EVENTS.LIBRARY_START_DRAG, snapIds),
    addTag: (snapId: string, tag: string) =>
      ipcRenderer.invoke(EVENTS.TAG_ADD, snapId, tag),
    removeTag: (snapId: string, tag: string) =>
      ipcRenderer.invoke(EVENTS.TAG_REMOVE, snapId, tag),
    getTagsForSnap: (snapId: string) =>
      ipcRenderer.invoke(EVENTS.TAG_GET_FOR_SNAP, snapId) as Promise<string[]>,
    getAllTags: () =>
      ipcRenderer.invoke(EVENTS.TAG_GET_ALL) as Promise<TagWithUsageCount[]>,
    getAppIcon: (appName: string) =>
      ipcRenderer.invoke(EVENTS.GET_APP_ICON, appName) as Promise<
        string | null
      >,
  },
};

contextBridge.exposeInMainWorld('snap', snapAPI);

export type SnapAPI = typeof snapAPI;
