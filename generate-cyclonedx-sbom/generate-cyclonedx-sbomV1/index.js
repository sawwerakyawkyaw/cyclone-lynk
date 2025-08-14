// index.ts
// Azure DevOps Task: GenerateSbom (CycloneDX via dotnet global tool)
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var tl = require("azure-pipelines-task-lib/task");
var path = require("path");
var fs = require("fs");
function ensureDir(dir) {
    if (!dir)
        return;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
// Best-effort: add dotnet global tools dir to PATH (Windows/*nix/macOS)
function prependDotnetToolsToPath() {
    var home = process.env.HOME || process.env.USERPROFILE || "";
    if (!home) {
        tl.debug("No HOME/USERPROFILE detected; skipping dotnet tools PATH prepend.");
        return;
    }
    var toolsDir = path.join(home, ".dotnet", "tools");
    if (fs.existsSync(toolsDir)) {
        tl.debug("Prepending to PATH: ".concat(toolsDir));
        tl.prependPath(toolsDir);
    }
    else {
        tl.debug("Dotnet tools dir not found at ".concat(toolsDir, "; relying on agent PATH."));
    }
}
function installOrUpdateCycloneDx(version) {
    return __awaiter(this, void 0, void 0, function () {
        var verb, args, e_1, installArgs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    verb = "update";
                    args = ["tool", verb, "--global", "CycloneDX"];
                    if (version && version.trim())
                        args.push("--version", version.trim());
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 5]);
                    return [4 /*yield*/, tl.exec("dotnet", args, { failOnStdErr: false })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    e_1 = _a.sent();
                    tl.warning("dotnet tool ".concat(verb, " failed (").concat((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1, "); trying install..."));
                    installArgs = ["tool", "install", "--global", "CycloneDX"];
                    if (version && version.trim())
                        installArgs.push("--version", version.trim());
                    return [4 /*yield*/, tl.exec("dotnet", installArgs, { failOnStdErr: false })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function resolveCycloneDxBinary() {
    // Global tool shim may appear as either casing depending on host
    var candidates = ["dotnet-CycloneDX", "dotnet-cyclonedx"];
    for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
        var c = candidates_1[_i];
        var found = tl.which(c, false);
        if (found) {
            tl.debug("Found CycloneDX shim: ".concat(found));
            return found;
        }
    }
    // Fallback to name and let PATH resolve it
    return "dotnet-CycloneDX";
}
function sanitizeFileName(name) {
    // Keep it simple: strip path separators & trim
    return name.replace(/[\\\/]+/g, "").trim();
}
function buildArgsFromInputs() {
    var args = [];
    var solutionFilePath = tl.getPathInput("solutionFilePath", true, false);
    var outputDirectory = tl.getPathInput("outputDirectory", true, false);
    var rawFilename = tl.getInput("filename", true) || "bom.json";
    var filename = sanitizeFileName(rawFilename);
    var outputFormat = tl.getInput("outputFormat", true) || "json"; // json | xml | unsafeJson
    var disablePackageRestore = tl.getBoolInput("disablePackageRestore", false);
    var setVersion = tl.getInput("setVersion", false);
    var setType = tl.getInput("setType", false);
    var excludeDevDependencies = tl.getBoolInput("excludeDevDependencies", false);
    var excludeTestProjects = tl.getBoolInput("excludeTestProjects", false);
    var excludeFilterList = tl.getInput("excludeFilterList", false);
    var enableGithubLicenses = tl.getBoolInput("enableGithubLicenses", false);
    var githubUsername = tl.getInput("githubUsername", false);
    var githubToken = tl.getInput("githubToken", false);
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
            tl.warning("Unknown outputFormat '".concat(outputFormat, "', defaulting to --json"));
            args.push("--json");
            break;
    }
    if (disablePackageRestore)
        args.push("--disable-package-restore");
    if (setVersion && setVersion.trim())
        args.push("--set-version", setVersion.trim());
    if (setType && setType.trim())
        args.push("--set-type", setType.trim());
    if (excludeDevDependencies)
        args.push("--exclude-dev");
    if (excludeTestProjects)
        args.push("--exclude-test-projects");
    if (excludeFilterList && excludeFilterList.trim()) {
        // Expecting "name1@version1,name2@version2" with optional whitespace
        var cleaned = excludeFilterList.replace(/\s+/g, "");
        if (cleaned)
            args.push("--exclude", cleaned);
    }
    if (enableGithubLicenses) {
        if (!githubUsername || !githubToken) {
            throw new Error("GitHub license resolution enabled but 'githubUsername' or 'githubToken' is missing.");
        }
        // Adjust flag names as per cyclonedx-dotnet docs if needed
        args.push("--github-username", githubUsername);
        args.push("--github-token", githubToken);
    }
    tl.debug("Final CycloneDX args: ".concat(JSON.stringify(args)));
    return args;
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var cyclonedxVersion, cyclonedxBin, args, code, err_1, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    cyclonedxVersion = process.env.CYCLONEDX_DOTNET_VERSION;
                    prependDotnetToolsToPath();
                    return [4 /*yield*/, installOrUpdateCycloneDx(cyclonedxVersion)];
                case 1:
                    _a.sent();
                    cyclonedxBin = resolveCycloneDxBinary();
                    args = buildArgsFromInputs();
                    return [4 /*yield*/, tl.exec(cyclonedxBin, args, { failOnStdErr: false })];
                case 2:
                    code = _a.sent();
                    if (code !== 0) {
                        throw new Error("CycloneDX exited with code ".concat(code));
                    }
                    tl.setResult(tl.TaskResult.Succeeded, "SBOM generated successfully.");
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    msg = err_1 instanceof Error ? err_1.message : String(err_1);
                    tl.error(msg);
                    tl.setResult(tl.TaskResult.Failed, msg);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
run();
