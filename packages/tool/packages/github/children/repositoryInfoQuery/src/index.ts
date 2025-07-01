import { z } from 'zod';
import { Octokit } from '@octokit/rest';

export const InputType = z.object({
  owner: z.string(),
  repo: z.string(),
  token: z.string().optional()
});

export const OutputType = z.object({
  info: z.object({
    full_name: z.string(),
    description: z.string().nullable(),
    stargazers_count: z.number(),
    forks_count: z.number(),
    open_issues_count: z.number(),
    language: z.string().nullable(),
    html_url: z.string(),
    topics: z.array(z.string()).optional(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string()
  }),
  readme: z.string().nullable(),
  license: z
    .object({
      key: z.string(),
      name: z.string(),
      spdx_id: z.string(),
      url: z.string().nullable()
    })
    .nullable()
});

export async function tool(props: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  const { owner, repo, token } = props;
  const octokit = new Octokit(token ? { auth: token } : {});

  // 1. 仓库基本信息
  const { data: info } = await octokit.repos.get({ owner, repo });

  // 2. README（markdown 原文）
  let readme: string | null = null;
  try {
    const { data: readmeData } = await octokit.repos.getReadme({ owner, repo });
    if (readmeData && readmeData.content) {
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    }
  } catch {
    readme = null;
  }

  // 3. license
  let license = null;
  if (info.license) {
    license = {
      key: info.license.key,
      name: info.license.name,
      spdx_id: info.license.spdx_id === null ? '' : info.license.spdx_id,
      url: info.license.url
    };
  }

  return {
    info: {
      full_name: info.full_name,
      description: info.description,
      stargazers_count: info.stargazers_count,
      forks_count: info.forks_count,
      open_issues_count: info.open_issues_count,
      language: info.language,
      html_url: info.html_url,
      topics: info.topics || [],
      created_at: info.created_at,
      updated_at: info.updated_at,
      pushed_at: info.pushed_at
    },
    readme,
    license
  };
}
