import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

const app = Fastify({ logger: true });

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required server environment variable: ${name}`);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const github = new Octokit({ auth: process.env.GITHUB_TOKEN! });

const allowedRepos = new Set(
  (process.env.DEXTERS_AI_ALLOWED_REPOS ?? 'jamiegreen294-boop/dexters-loyalty-android')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

app.get('/health', async () => ({
  ok: true,
  service: 'dexters-ai-agent-server',
  environment: 'development'
}));

app.get('/projects', async (_request, reply) => {
  const { data, error } = await supabase
    .from('projects')
    .select('id,business_id,name,slug,repository,branch,environment,status,metadata')
    .order('name');

  if (error) return reply.code(500).send({ error: error.message });
  return { projects: data ?? [] };
});

app.post<{ Body: { request: string; project_id?: string; title?: string } }>(
  '/tasks',
  async (request, reply) => {
    const body = request.body;
    if (!body?.request?.trim()) return reply.code(400).send({ error: 'request is required' });

    const { data: project, error: projectError } = body.project_id
      ? await supabase.from('projects').select('*').eq('id', body.project_id).single()
      : { data: null, error: null };

    if (projectError) return reply.code(404).send({ error: 'project not found' });
    if (project?.repository && !allowedRepos.has(project.repository)) {
      return reply.code(403).send({ error: 'repository is not authorised for this development agent' });
    }

    const { data: task, error } = await supabase
      .from('ai_tasks')
      .insert({
        project_id: body.project_id ?? null,
        title: body.title?.trim() || body.request.trim().slice(0, 120),
        request: body.request.trim(),
        status: 'queued',
        environment: 'development'
      })
      .select('id,title,request,status,environment,created_at')
      .single();

    if (error) return reply.code(500).send({ error: error.message });

    await supabase.from('ai_task_events').insert({
      task_id: task.id,
      business_id: project?.business_id ?? null,
      event_type: 'task.created',
      status: 'queued',
      message: 'Development task created; execution has not started.'
    });

    return reply.code(201).send({ task });
  }
);

app.get<{ Params: { owner: string; repo: string } }>('/github/repos/:owner/:repo', async (request, reply) => {
  const repository = `${request.params.owner}/${request.params.repo}`;
  if (!allowedRepos.has(repository)) return reply.code(403).send({ error: 'repository is not authorised' });

  const { data } = await github.repos.get({ owner: request.params.owner, repo: request.params.repo });
  return {
    repository: data.full_name,
    default_branch: data.default_branch,
    private: data.private,
    archived: data.archived
  };
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  return reply.code(500).send({ error: 'internal server error' });
});

const port = Number(process.env.PORT ?? 8787);
app.listen({ host: '127.0.0.1', port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});