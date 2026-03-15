import { useSearchParams } from './hooks/use-search-params';
import { DiffPage } from './components/diff-page';

export function App() {
  const { ref } = useSearchParams();

  return (
    <DiffPage refParam={ref ?? 'work'} />
  );
}
