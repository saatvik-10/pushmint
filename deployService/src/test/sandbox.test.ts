import { describe, expect, test } from "bun:test";
import type { Sandbox } from "e2b";
import { runSandboxBuild } from "../sandbox";

function createMockSandbox(
  options: {
    missingScript?: boolean;
    failedBuild?: boolean;
    symlink?: boolean;
  } = {},
) {
  const commands: string[] = [];
  let killed = false;
  const sandbox = {
    commands: {
      run: async (command: string) => {
        commands.push(command);
        const exitCode =
          options.failedBuild && command.includes("bun run") ? 1 : 0;
        return { exitCode, stdout: undefined, stderr: undefined };
      },
    },
    files: {
      read: async (filePath: string, opts?: { format?: string }) => {
        if (filePath.endsWith("/package.json")) {
          return JSON.stringify({
            scripts: options.missingScript ? {} : { build: "vite build" },
          });
        }
        if (opts?.format === "bytes")
          return new TextEncoder().encode("<html></html>");
        throw new Error(`File not found: ${filePath}`);
      },
      list: async (directory: string) => {
        if (directory.endsWith("/dist")) {
          return [
            {
              path: `${directory}/index.html`,
              type: options.symlink ? "symlink" : "file",
              size: 13n,
            },
          ];
        }
        return [];
      },
    },
    kill: async () => {
      killed = true;
    },
  } as unknown as Sandbox;

  return { sandbox, commands, wasKilled: () => killed };
}

const deployment = {
  id: "deployment-1",
  repoUrl: "https://github.com/example/site",
  buildScript: "build",
  outputDirectory: "dist",
};

describe("runSandboxBuild", () => {
  test("runs the repository build in E2B and uploads output, then kills the sandbox", async () => {
    const mock = createMockSandbox();
    let uploadedId = "";
    const logs: string[] = [];

    await runSandboxBuild(
      deployment,
      (message) => {
        logs.push(message);
      },
      {
        createSandbox: async () => mock.sandbox,
        upload: async (id, directory) => {
          uploadedId = id;
          expect(await Bun.file(`${directory}/index.html`).text()).toBe(
            "<html></html>",
          );
        },
      },
    );

    expect(
      mock.commands.some((command) => command.includes("git clone --depth=1")),
    ).toBe(true);
    expect(
      mock.commands.some((command) => command.includes("bun install")),
    ).toBe(true);
    expect(mock.commands.some((command) => command.includes("bun run"))).toBe(
      true,
    );
    expect(uploadedId).toBe(deployment.id);
    expect(mock.wasKilled()).toBe(true);
    expect(logs).toContain("✦ Build sandbox stopped.");
  });

  test("does not upload when the build fails and still kills the sandbox", async () => {
    const mock = createMockSandbox({ failedBuild: true });
    let uploaded = false;

    await expect(
      runSandboxBuild(deployment, () => undefined, {
        createSandbox: async () => mock.sandbox,
        upload: async () => {
          uploaded = true;
        },
      }),
    ).rejects.toThrow("build failed");

    expect(uploaded).toBe(false);
    expect(mock.wasKilled()).toBe(true);
  });

  test("rejects symbolic links in build output and cleans up the sandbox", async () => {
    const mock = createMockSandbox({ symlink: true });

    await expect(
      runSandboxBuild(deployment, () => undefined, {
        createSandbox: async () => mock.sandbox,
        upload: async () => undefined,
      }),
    ).rejects.toThrow("symbolic links");
    expect(mock.wasKilled()).toBe(true);
  });

  test("checks that the requested build script exists before installing dependencies", async () => {
    const mock = createMockSandbox({ missingScript: true });

    await expect(
      runSandboxBuild(deployment, () => undefined, {
        createSandbox: async () => mock.sandbox,
        upload: async () => undefined,
      }),
    ).rejects.toThrow("no 'build' script");
    expect(
      mock.commands.some((command) => command.includes("bun install")),
    ).toBe(false);
    expect(mock.wasKilled()).toBe(true);
  });
});
