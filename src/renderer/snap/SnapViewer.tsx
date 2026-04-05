import { useEffect, useRef, useState } from 'react';

interface SnapData {
  filePath: string;
}

export function SnapViewer() {
  const [snapData, setSnapData] = useState<SnapData | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    window.snappy.snap.onData((data: SnapData) => {
      setSnapData(data);
    });
  }, []);

  const handleDoubleClick = () => {
    window.snappy.snap.close();
  };

  if (!snapData) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: snap window drag target
    <div
      className="h-screen w-screen overflow-hidden"
      onDoubleClick={handleDoubleClick}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <img
        ref={imgRef}
        src={`file://${snapData.filePath}`}
        alt="Screenshot"
        className="pointer-events-none block h-full w-full"
        draggable={false}
      />
    </div>
  );
}
