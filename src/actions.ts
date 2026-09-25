import { saveProject } from './db';
import type { DropGroup } from './drop';
import { ingestFiles } from './media';
import { setStatus } from './status';
import type { Project } from './types';
import { uid } from './util';

export async function createProject(title = ''): Promise<Project> {
  const p: Project = {
    id: uid(),
    title,
    description: '',
    client: '',
    tags: [],
    layout: 'masonry',
    coverId: null,
    order: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveProject(p);
  return p;
}

export async function upload(files: File[], projectId: string) {
  if (!files.length) return;
  setStatus(`Adding ${files.length} file${files.length > 1 ? 's' : ''}…`);
  await ingestFiles(files, projectId, (d, t) => setStatus(`Adding ${d} of ${t}…`));
  setStatus(`Added ${files.length} file${files.length > 1 ? 's' : ''}`, 2500);
}

/** Every dropped folder becomes its own project; loose files become one project. */
export async function projectsFromGroups(groups: DropGroup[]): Promise<Project[]> {
  const made: Project[] = [];
  for (const g of groups) {
    const p = await createProject(g.name ?? '');
    made.push(p);
    await upload(g.files, p.id);
  }
  return made;
}
