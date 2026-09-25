import { useEffect } from 'react';
import { useRoute } from './hooks';
import { useStatus } from './status';
import { Library } from './components/Library';
import { ProjectPage } from './components/ProjectPage';

export function App() {
  const route = useRoute();
  const status = useStatus();

  useEffect(() => window.scrollTo(0, 0), [route.join('/')]);

  let page: React.ReactNode;
  if (route[0] === 'p' && route[1]) page = <ProjectPage key={route[1]} id={route[1]} present={route[2] === 'present'} />;
  else page = <Library />;

  return (
    <>
      {page}
      <div className={`toast ${status ? 'on' : ''}`} role="status">
        {status}
      </div>
    </>
  );
}
