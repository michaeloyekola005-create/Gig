import { useEffect, useState } from 'react';
import { Sidebar, TopBar } from './components/Chrome';
import { Dialog } from './components/Dialog';
import { FolderView } from './components/FolderView';
import { RecentView, SearchView } from './components/Views';
import { useRoute } from './hooks';
import { useStatus } from './status';
import { ROOT } from './types';

export function App() {
  const route = useRoute();
  const status = useStatus();
  const [query, setQuery] = useState('');
  const folderId = route[0] === 'f' && route[1] ? route[1] : ROOT;
  const key = route.join('/');

  useEffect(() => {
    setQuery('');
    window.scrollTo(0, 0);
  }, [key]);

  let view: React.ReactNode;
  if (query.trim()) view = <SearchView query={query} />;
  else if (route[0] === 'recent') view = <RecentView />;
  else view = <FolderView key={folderId} id={folderId} />;

  return (
    <div className="app">
      <Sidebar route={route} folderId={folderId} />
      <main className="main">
        <TopBar query={query} onQuery={setQuery} folderId={folderId} />
        <div className="panel">{view}</div>
      </main>
      <Dialog />
      <div className={`toast ${status ? 'on' : ''}`} role="status">
        {status}
      </div>
    </div>
  );
}
