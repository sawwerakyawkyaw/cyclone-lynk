import tl = require('azure-pipelines-task-lib/task');
import trm = require('azure-pipelines-task-lib/toolrunner');
import path = require('path');

async function run() {
  tl.setResourcePath(path.join(__dirname, 'task.json'));

  const sourcesDirectory: string = tl.getPathInput('sourcesDirectory', true, true)!;
  if (sourcesDirectory) {
    const allPaths: string[] = tl.find(sourcesDirectory);
    const solutionFiles: string[] = tl.match(allPaths, '**/*.sln');
    solutionFiles.forEach(file => {
      console.log(`Found solution: ${file}`);
    });
  }

  const solutionFile: string = tl.getPathInput('solutionFile', true, true)!;
  const outputDirectory: string = tl.getPathInput('outputDirectory', true, true)!;
  const filename: string = tl.getInput('filename', false) || 'bom';
  const outputFormat: string = tl.getInput('outputFormat', false) || '--json';

  const cycloneDX: trm.ToolRunner = tl.tool(tl.which('dotnet-CycloneDX', true));
  cycloneDX.arg(solutionFile);
  cycloneDX.arg('--output');
  cycloneDX.arg(outputDirectory);
  if (outputFormat) {
    cycloneDX.arg(outputFormat);
  }
  if (filename) {
    cycloneDX.arg('--filename');
    cycloneDX.arg(filename);
  }

  cycloneDX.execAsync();

}
run();
