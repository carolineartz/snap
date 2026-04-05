export function SnapViewer() {
  const params = new URLSearchParams(window.location.search);
  const imgSrc = params.get('img');

  const handleDoubleClick = () => {
    window.snappy.snap.close();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: snap window drag target
    <div
      className="h-screen w-screen overflow-hidden"
      onDoubleClick={handleDoubleClick}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt="Screenshot"
          className="pointer-events-none block h-full w-full"
          draggable={false}
        />
      )}
    </div>
  );
}
