import "dotenv/config";
import { Sandbox } from "e2b";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { uploadDirectory } from "./aws";
import { enforceArtifactLimits, resolveArtifactPath } from "./artifacts";

type Deployment = {
  id: string;
  repoUrl: string;
  buildScript: string;
  outputDirectory: string;
  projectDirectory: string;
};
type Log = (message: string) => void | Promise<void>;
type SandboxClient = Pick<Sandbox, "commands" | "files" | "kill">;
type SandboxFactory = (options: {
  timeoutMs: number;
  metadata: Record<string, string>;
}) => Promise<SandboxClient>;
type ArtifactUploader = (
  deploymentId: string,
  directory: string,
) => Promise<void>;

const configuredBuildTimeout = Number(process.env.BUILD_TIMEOUT_MS ?? 300_000);
const BUILD_TIMEOUT_MS =
  Number.isFinite(configuredBuildTimeout) && configuredBuildTimeout > 0
    ? configuredBuildTimeout
    : 300_000;
const SANDBOX_TIMEOUT_MS = Math.min(BUILD_TIMEOUT_MS * 3 + 120_000, 3_300_000);
const SOURCE_DIR = "/home/user/source";

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function assertSuccessful(exitCode: number, stage: string) {
  if (exitCode !== 0)
    throw new Error(
      `${stage} failed in the build sandbox (exit code ${exitCode}).`,
    );
}

async function runCommand(
  sandbox: SandboxClient,
  command: string,
  stage: string,
  onLog: Log,
) {
  const result = await sandbox.commands.run(command, {
    timeoutMs: BUILD_TIMEOUT_MS,
    retainOutput: false,
    envs: { CI: "true", NODE_ENV: "production" },
    onStdout: (data) => onLog(`[${stage}] ${data.trimEnd()}`),
    onStderr: (data) => onLog(`[${stage}] ${data.trimEnd()}`),
  });
  assertSuccessful(result.exitCode, stage);
}

async function collectFiles(
  sandbox: SandboxClient,
  outputDir: string,
  localDir: string,
  onLog: Log,
) {
  let count = 0;
  let totalBytes = 0;
  let hasIndex = false;

  const visit = async (directory: string): Promise<void> => {
    const entries = await sandbox.files.list(directory);
    for (const entry of entries) {
      if (entry.type === "dir") {
        await visit(entry.path);
        continue;
      }
      if (entry.type === "symlink" || entry.symlinkTarget) {
        throw new Error("Build output cannot contain symbolic links.");
      }
      if (entry.type !== "file") continue;

      const relativePath = resolveArtifactPath(outputDir, entry.path);
      count += 1;
      const size = Number(entry.size);
      totalBytes += size;
      enforceArtifactLimits(count, size, totalBytes);
      hasIndex ||= relativePath === "index.html";

      const destination = path.resolve(localDir, ...relativePath.split("/"));
      const relativeDestination = path.relative(localDir, destination);
      if (
        !relativeDestination ||
        relativeDestination.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativeDestination)
      ) {
        throw new Error("Build output contains an invalid file path.");
      }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      const content = await sandbox.files.read(entry.path, { format: "bytes" });
      enforceArtifactLimits(
        count,
        content.byteLength,
        totalBytes - size + content.byteLength,
      );
      totalBytes += content.byteLength - size;
      await fs.writeFile(destination, content);
    }
  };

  await visit(outputDir);
  if (!count) throw new Error("Build output directory is empty.");
  if (!hasIndex)
    throw new Error("Build output must contain an index.html file.");
  await onLog(
    `✦ Retrieved ${count} build files (${(totalBytes / (1024 * 1024)).toFixed(1)} MB).`,
  );
}

async function ensureBun(sandbox: SandboxClient, onLog: Log) {
  await runCommand(
    sandbox,
    'if ! command -v bun >/dev/null 2>&1; then curl -fsSL https://bun.sh/install | bash; fi; export PATH="$HOME/.bun/bin:$PATH"; bun --version',
    "setup",
    onLog,
  );
}

async function ensureCompatibleNode(sandbox: SandboxClient, onLog: Log) {
  await runCommand(
    sandbox,
    `set -eu
if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major === 20 && minor >= 19) || (major >= 22 && (major > 22 || minor >= 12)) ? 0 : 1)'; then
  NODE_VERSION="$(curl -fsSL https://nodejs.org/dist/index.tab | awk '$1 ~ /^v22\\.[0-9]+\\.[0-9]+$/ { print $1; exit }')"
  test -n "$NODE_VERSION"
  case "$(uname -m)" in
    x86_64) NODE_ARCH=x64 ;;
    aarch64|arm64) NODE_ARCH=arm64 ;;
    *) echo "Unsupported architecture for the Node.js runtime." >&2; exit 1 ;;
  esac
  mkdir -p "$HOME/.pushmint-node"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz" | tar -xJ -C "$HOME/.pushmint-node" --strip-components=1
fi
export PATH="$HOME/.pushmint-node/bin:$PATH"
node --version`,
    "setup",
    onLog,
  );
}

function withBuildRuntimes(command: string) {
  return `export PATH="$HOME/.pushmint-node/bin:$HOME/.bun/bin:$PATH" && ${command}`;
}

export async function runSandboxBuild(
  deployment: Deployment,
  onLog: Log,
  dependencies: {
    createSandbox?: SandboxFactory;
    upload?: ArtifactUploader;
  } = {},
) {
  if (!process.env.E2B_API_KEY && !dependencies.createSandbox) {
    throw new Error("E2B_API_KEY is required to run isolated builds.");
  }

  const createSandbox: SandboxFactory =
    dependencies.createSandbox ?? ((options) => Sandbox.create(options));
  const upload = dependencies.upload ?? uploadDirectory;
  let sandbox: SandboxClient | undefined;
  let workspace: string | undefined;

  try {
    await onLog("✦ Starting an isolated E2B build sandbox...");
    sandbox = await createSandbox({
      timeoutMs: SANDBOX_TIMEOUT_MS,
      metadata: { deploymentId: deployment.id },
    });
    await ensureBun(sandbox, onLog);
    await ensureCompatibleNode(sandbox, onLog);

    await onLog("✦ Cloning repository inside the sandbox...");
    await runCommand(
      sandbox,
      `git clone --depth=1 -- ${shellQuote(deployment.repoUrl)} ${shellQuote(SOURCE_DIR)}`,
      "clone",
      onLog,
    );

    const projectDir = path.posix.resolve(
      SOURCE_DIR,
      deployment.projectDirectory,
    );
    if (projectDir !== SOURCE_DIR && !projectDir.startsWith(`${SOURCE_DIR}/`)) {
      throw new Error(
        "Project directory must be inside the cloned repository.",
      );
    }

    const packageJson = JSON.parse(
      await sandbox.files.read(`${projectDir}/package.json`),
    ) as {
      scripts?: Record<string, string>;
    };
    if (!packageJson.scripts?.[deployment.buildScript]) {
      throw new Error(
        `package.json has no '${deployment.buildScript}' script in ${deployment.projectDirectory === "." ? "the repository root" : `project directory '${deployment.projectDirectory}'`}.`,
      );
    }

    const outputDir = path.posix.resolve(
      projectDir,
      deployment.outputDirectory,
    );
    if (outputDir === projectDir || !outputDir.startsWith(`${projectDir}/`)) {
      throw new Error(
        "Output directory must be a child directory of the project.",
      );
    }

    const sourceEntries = await sandbox.files.list(SOURCE_DIR);
    const projectEntries =
      projectDir === SOURCE_DIR
        ? sourceEntries
        : await sandbox.files.list(projectDir);
    const hasRootLockfile = sourceEntries.some(
      (entry) =>
        entry.type === "file" &&
        (entry.name === "bun.lock" || entry.name === "bun.lockb"),
    );
    const hasProjectLockfile = projectEntries.some(
      (entry) =>
        entry.type === "file" &&
        (entry.name === "bun.lock" || entry.name === "bun.lockb"),
    );
    const installDir = hasRootLockfile ? SOURCE_DIR : projectDir;
    const hasLockfile = hasRootLockfile || hasProjectLockfile;
    await onLog("✦ Installing dependencies with Bun in the sandbox...");
    await runCommand(
      sandbox,
      `cd ${shellQuote(installDir)} && ${withBuildRuntimes(`bun install${hasLockfile ? " --frozen-lockfile" : ""}`)}`,
      "install",
      onLog,
    );

    await onLog(
      `✦ Running bun run ${deployment.buildScript} in the sandbox...`,
    );
    await runCommand(
      sandbox,
      `cd ${shellQuote(projectDir)} && ${withBuildRuntimes(`bun run ${shellQuote(deployment.buildScript)}`)}`,
      "build",
      onLog,
    );

    workspace = await fs.mkdtemp(path.join(os.tmpdir(), "pushmint-artifacts-"));
    await collectFiles(sandbox, outputDir, workspace, onLog);
    await onLog("✦ Uploading build output to object storage...");
    await upload(deployment.id, workspace);
  } finally {
    if (workspace) await fs.rm(workspace, { recursive: true, force: true });
    if (sandbox) {
      try {
        await sandbox.kill();
        await onLog("✦ Build sandbox stopped.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await onLog(`Could not stop build sandbox cleanly: ${message}`);
      }
    }
  }
}
