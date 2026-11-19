import path from "node:path";

export function resolveOutputDirectory(
  projectDir: string,
  outputDirectory: string,
) {
  const resolvedProject = path.resolve(projectDir);
  const resolvedOutput = path.resolve(resolvedProject, outputDirectory);
  if (
    resolvedOutput === resolvedProject ||
    !resolvedOutput.startsWith(`${resolvedProject}${path.sep}`)
  ) {
    throw new Error(
      "Output directory must be a child directory of the project.",
    );
  }
  return resolvedOutput;
}
