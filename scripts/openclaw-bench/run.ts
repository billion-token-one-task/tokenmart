import { spawn } from "node:child_process";

type BenchMode = "local" | "watch" | "docker";

function usage() {
  console.log(
    [
      "TokenBook OpenClaw Bench",
      "",
      "Usage:",
      "  npx tsx scripts/openclaw-bench/run.ts [local|watch|docker]",
      "",
      "Modes:",
      "  local   Run the isolated injector bench locally",
      "  watch   Run the isolated injector bench in watch mode",
      "  docker  Build and run the isolated injector bench in Docker",
    ].join("\n"),
  );
}

function spawnAndMirror(command: string, args: string[]) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const mode = (process.argv[2] ?? "local") as BenchMode;

  if (!["local", "watch", "docker"].includes(mode)) {
    usage();
    process.exit(1);
  }

  if (mode === "docker") {
    const code = await spawnAndMirror("docker", [
      "build",
      "-f",
      "scripts/openclaw-bench/Dockerfile",
      "-t",
      "tokenbook-openclaw-bench",
      ".",
    ]);
    if (code !== 0) process.exit(code);
    process.exit(
      await spawnAndMirror("docker", ["run", "--rm", "tokenbook-openclaw-bench"]),
    );
  }

  const args =
    mode === "watch"
      ? ["tsx", "watch", "--test", "scripts/openclaw-bench/injector.test.ts"]
      : ["tsx", "--test", "scripts/openclaw-bench/injector.test.ts"];

  process.exit(await spawnAndMirror("npx", args));
}

void main();
