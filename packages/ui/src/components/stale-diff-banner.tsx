interface StaleDiffBannerProps {
  onRefresh: () => void;
}

export function StaleDiffBanner(props: StaleDiffBannerProps) {
  const { onRefresh } = props;

  return (
    <div className="sticky top-0 z-30 flex items-center justify-center gap-3 px-4 py-2 bg-accent/10 border-b border-accent/20 text-sm animate-slide-down">
      <span className="text-accent font-medium">
        Files have changed since this diff was loaded
      </span>
      <button
        onClick={onRefresh}
        className="px-3 py-1 bg-accent text-white rounded-md text-xs font-medium hover:bg-accent-hover transition-colors cursor-pointer"
      >
        Refresh diff
      </button>
    </div>
  );
}
