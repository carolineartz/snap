import { useCallback, useState } from 'react';
import { TIMED_CAPTURE_DEFAULT_DELAY_SECONDS } from '../../../shared/constants';
import {
  SHORTCUT_ACTION_LABELS,
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  type ShortcutErrors,
} from '../../../shared/settings';
import { useSettings } from '../../hooks/useSettings';
import { ShortcutRecorder } from './ShortcutRecorder';

const SHORTCUT_HINTS: Partial<Record<ShortcutAction, string>> = {
  timedCapture: `${TIMED_CAPTURE_DEFAULT_DELAY_SECONDS}s countdown; press again to cancel`,
};

export function SettingsApp() {
  const settings = useSettings();
  const [errors, setErrors] = useState<ShortcutErrors>({});

  const handleShortcutChange = useCallback(
    async (action: ShortcutAction, accelerator: string | null) => {
      const result = await window.snap.settings.update({
        shortcuts: { [action]: accelerator },
      });
      setErrors(result.errors);
    },
    [],
  );

  const handleCopyOnCaptureChange = useCallback((copyOnCapture: boolean) => {
    window.snap.settings.update({ copyOnCapture });
  }, []);

  const handleRecordingChange = useCallback((recording: boolean) => {
    window.snap.settings.suspendShortcuts(recording);
  }, []);

  return (
    <div className="flex h-screen flex-col gap-6 overflow-y-auto bg-[#f5f5f7] px-6 py-5 text-[13px] text-neutral-800 dark:bg-[#1e1e1e] dark:text-neutral-100">
      <Section title="Shortcuts">
        {SHORTCUT_ACTIONS.map((action) => (
          <Row
            key={action}
            label={SHORTCUT_ACTION_LABELS[action]}
            hint={SHORTCUT_HINTS[action]}
          >
            <ShortcutRecorder
              label={`${SHORTCUT_ACTION_LABELS[action]} shortcut`}
              value={settings.shortcuts[action]}
              error={errors[action]}
              onChange={(accelerator) =>
                handleShortcutChange(action, accelerator)
              }
              onRecordingChange={handleRecordingChange}
            />
          </Row>
        ))}
        <p className="pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          Click a shortcut, then press the new keys. Esc cancels; Delete removes
          it.
        </p>
      </Section>

      <Section title="Capture">
        <label className="flex cursor-default items-center justify-between gap-4 py-1">
          <span className="flex flex-col">
            <span>Copy new snaps to the clipboard</span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Every capture is ready to paste right away.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.copyOnCapture}
            onChange={(e) => handleCopyOnCaptureChange(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-blue-500"
          />
        </label>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-black/[0.06] rounded-xl bg-white px-4 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:divide-white/[0.06] dark:bg-neutral-800/80 dark:ring-white/[0.06]">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex flex-col">
        <span>{label}</span>
        {hint && (
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {hint}
          </span>
        )}
      </span>
      {children}
    </div>
  );
}
