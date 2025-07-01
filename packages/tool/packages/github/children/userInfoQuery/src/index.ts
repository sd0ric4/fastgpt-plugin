import { z } from 'zod';
import { Octokit } from '@octokit/rest';

export const InputType = z.object({
  username: z.string(),
  token: z.string().optional()
});

export const OutputType = z.object({
  userInfo: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
    html_url: z.string(),
    name: z.string().nullable(),
    company: z.string().nullable(),
    blog: z.string().nullable(),
    location: z.string().nullable(),
    email: z.string().nullable(),
    bio: z.string().nullable(),
    public_repos: z.number(),
    followers: z.number(),
    following: z.number(),
    created_at: z.string(),
    updated_at: z.string()
  }),
  repos: z.array(
    z.object({
      name: z.string(),
      full_name: z.string(),
      html_url: z.string(),
      description: z.string().nullable(),
      stargazers_count: z.number(),
      forks_count: z.number(),
      language: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
      pushed_at: z.string()
    })
  )
});

export async function tool(props: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  const { username, token } = props;
  const octokit = new Octokit(token ? { auth: token } : {});

  const { data: userInfo } = await octokit.users.getByUsername({ username });

  const { data: repos } = await octokit.repos.listForUser({ username, per_page: 100 });

  const mappedRepos = Array.isArray(repos)
    ? repos.map((repo) => ({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description ?? null,
        stargazers_count: repo.stargazers_count ?? 0,
        forks_count: repo.forks_count ?? 0,
        language: repo.language ?? null,
        created_at: repo.created_at ?? '',
        updated_at: repo.updated_at ?? '',
        pushed_at: repo.pushed_at ?? ''
      }))
    : [];

  return {
    userInfo,
    repos: mappedRepos
  };
}
