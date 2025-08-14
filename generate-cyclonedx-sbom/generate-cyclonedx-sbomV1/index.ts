// index.ts
// Azure DevOps Task: GenerateSbom (CycloneDX via dotnet global tool)

const tl = require("azure-pipelines-task-lib/task");
const path = require("path");
const fs = require("fs");

function ensureDir(dir: string | undefined | null): void {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Best-effort: add dotnet global tools dir to PATH (Windows/*nix/macOS)
function prependDotnetToolsToPath(): void {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (!home) {
    tl.debug("No HOME/USERPROFILE detected; skipping dotnet tools PATH prepend.");
    return;
  }
  const toolsDir = path.join(home, ".dotnet", "tools");
  if (fs.existsSync(toolsDir)) {
    tl.debug(`Prepending to PATH: ${toolsDir}`);
    tl.prependPath(toolsDir);
  } else {
    tl.debug(`Dotnet tools dir not found at ${toolsDir}; relying on agent PATH.`);
  }
}

async function installOrUpdateCycloneDx(version?: string): Promise<void> {
  const verb = "update";
  const args = ["tool", verb, "--global", "CycloneDX"];
  if (version && version.trim()) args.push("--version", version.trim());

  try {
    await tl.exec("dotnet", args, { failOnStdErr: false });
  } catch (e: any) {
    tl.warning(`dotnet tool ${verb} failed (${e?.message || e}); trying install...`);
    const installArgs = ["tool", "install", "--global", "CycloneDX"];
    if (version && version.trim()) installArgs.push("--version", version.trim());
    await tl.exec("dotnet", installArgs, { failOnStdErr: false });
  }
}

function resolveCycloneDxBinary(): string {
  // Global tool shim may appear as either casing depending on host
  const candidates = ["dotnet-CycloneDX", "dotnet-cyclonedx"];
  for (const c of candidates) {
    const found = tl.which(c, false);
    if (found) {
      tl.debug(`Found CycloneDX shim: ${found}`);
      return found;
    }
  }
  // Fallback to name and let PATH resolve it
  return "dotnet-CycloneDX";
}

function sanitizeFileName(name: string): string {
  // Keep it simple: strip path separators & trim
  return name.replace(/[\\\/]+/g, "").trim();
}

function buildArgsFromInputs(): string[] {
  const args: string[] = [];

  const solutionFilePath = tl.getPathInput("solutionFilePath", true, false)!;
  const outputDirectory = tl.getPathInput("outputDirectory", true, false)!;
  const rawFilename = tl.getInput("filename", true) || "bom.json";
  const filename = sanitizeFileName(rawFilename);

  const outputFormat = tl.getInput("outputFormat", true) || "json"; // json | xml | unsafeJson
  const disablePackageRestore = tl.getBoolInput("disablePackageRestore", false);
  const setVersion = tl.getInput("setVersion", false);
  const setType = tl.getInput("setType", false);

  const excludeDevDependencies = tl.getBoolInput("excludeDevDependencies", false);
  const excludeTestProjects = tl.getBoolInput("excludeTestProjects", false);
  const excludeFilterList = tl.getInput("excludeFilterList", false);

  const enableGithubLicenses = tl.getBoolInput("enableGithubLicenses", false);
  const githubUsername = tl.getInput("githubUsername", false);
  const githubToken = tl.getInput("githubToken", false);

  // Ensure output dir exists
  ensureDir(outputDirectory);

  // Base positional arg: solution or directory
  args.push(solutionFilePath);

  // Output controls
  args.push("--output", outputDirectory);
  args.push("--filename", filename);

  // Format mapping
  switch (outputFormat) {
    case "json":
      args.push("--json");
      break;
    case "xml":
      args.push("--xml");
      break;
    case "unsafeJson":
      // If your CLI expects a different switch for 'unsafe', adjust here.
      args.push("--json", "--unsafe");
      break;
    default:
      tl.warning(`Unknown outputFormat '${outputFormat}', defaulting to --json`);
      args.push("--json");
      break;
  }

  if (disablePackageRestore) args.push("--disable-package-restore");
  if (setVersion && setVersion.trim()) args.push("--set-version", setVersion.trim());
  if (setType && setType.trim()) args.push("--set-type", setType.trim());

  if (excludeDevDependencies) args.push("--exclude-dev");
  if (excludeTestProjects) args.push("--exclude-test-projects");

  if (excludeFilterList && excludeFilterList.trim()) {
    // Expecting "name1@version1,name2@version2" with optional whitespace
    const cleaned = excludeFilterList.replace(/\s+/g, "");
    if (cleaned) args.push("--exclude", cleaned);
  }

  if (enableGithubLicenses) {
    if (!githubUsername || !githubToken) {
      throw new Error(
        "GitHub license resolution enabled but 'githubUsername' or 'githubToken' is missing."
      );
    }
    // Adjust flag names as per cyclonedx-dotnet docs if needed
    args.push("--github-username", githubUsername);
    args.push("--github-token", githubToken);
  }

  tl.debug(`Final CycloneDX args: ${JSON.stringify(args)}`);
  return args;
}

async function run(): Promise<void> {
  try {
    // Optional: pin via env var if you want (e.g., CYCLONEDX_DOTNET_VERSION=3.0.8)
    const cyclonedxVersion = process.env.CYCLONEDX_DOTNET_VERSION;

    prependDotnetToolsToPath();
    await installOrUpdateCycloneDx(cyclonedxVersion);

    const cyclonedxBin = resolveCycloneDxBinary();
    const args = buildArgsFromInputs();

    const code = await tl.exec(cyclonedxBin, args, { failOnStdErr: false });
    if (code !== 0) {
      throw new Error(`CycloneDX exited with code ${code}`);
    }

    tl.setResult(tl.TaskResult.Succeeded, "SBOM generated successfully.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tl.error(msg);
    tl.setResult(tl.TaskResult.Failed, msg);
  }
}

run();
