import { ErrorShell } from '@/components/ErrorShell';

export default function NotFound() {
  return <ErrorShell title="That page is off the map." message="The page does not exist, moved, or is not available on the public Northline site." />;
}
