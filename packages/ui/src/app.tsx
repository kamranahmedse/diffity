import { useSearchParams } from './hooks/use-search-params.js';
import { useInfo } from './hooks/use-info.js';
import { Dashboard } from './components/dashboard.js';
import { DiffPage } from './components/diff-page.js';

export function App() {
  const { ref, navigate, goHome } = useSearchParams();
  const { data: info } = useInfo(ref ?? undefined);

  const isReview = !!info?.review;

  if (!ref && !isReview) {
    return <Dashboard onNavigate={navigate} />;
  }

  return (
    <DiffPage
      refParam={ref ?? info?.review ?? undefined}
      onGoHome={goHome}
      isReview={isReview}
    />
  );
}
