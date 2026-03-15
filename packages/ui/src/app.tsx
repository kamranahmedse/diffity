import { useSearchParams } from './hooks/use-search-params.js';
import { DiffPage } from './components/diff-page.js';

export function App() {
  const { ref } = useSearchParams();

  return (
    <DiffPage refParam={ref ?? 'work'} />
  );
}
