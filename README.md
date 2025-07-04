# fastgpt-tools

FastGPT 系统工具服务

## 架构说明

### 技术栈

- TypeScript
- Bun
- express
- ts-rest
- vitest

### 目录结构

- `dev` 调试工具时可以使用的 Web 工具
- `runtime` 工具的运行时
- `scripts` 脚本
- `test` 测试配置
- `tools` 系统工具目录

系统工具可以分为两种：
1. 系统工具 `tool`
2. 工具集，工具集内包括功能相似的多个工具 `toolset`

## 部署

### 编译
1. `bun i`
2. `bun run build`

编译后在 `runtime/dist` 目录下可以直接运行（默认为 node 运行时）

#### 使用 docker 编译
在 tools 目录下执行 `docker build -t fastgpt-tools .` 即可构建镜像
构建完成后，可以使用 `docker run -p 3010:3000 fastgpt-tools` 启动容器

### 部署

使用 docker 部署后，使用 tools.json 配置文件动态挂载系统工具。

```bash
docker run -p 3010:3000 -v /path/to/tools.json:/app/tools.json fastgpt-tools
```

tools.json 格式见 `tools.template.json`。

> 每次修改 json 后需要重启容器才能生效。

## 贡献指南

### 贡献社区插件

1. 安装依赖: `bun i`
2. 创建新的工具/工具集
  1. 工具 `bun run new <name>`
  2. 工具集 `bun run new --toolset <name>`
3. `cd tools/<name>`
4. 修改配置文件 `config.ts`
5. 在 `src` 目录下实现工具逻辑
6. 编写测试样例 (Vitest) 并通过测试
7. 提交代码并发起 PR 到 labring/FastGPT

### 私有化插件（热插拔）

按照上述步骤开发完毕后，执行 `bun run build` 将构建执行工具构建。
1. 将 bundle 好的 js 文件上传到对象存储。
2. 在 tools.json 中配置工具的 url
3. 参考 **部署** 中的步骤进行部署。需要注意的是每次文件变动都需要重启服务以刷新 flushId
