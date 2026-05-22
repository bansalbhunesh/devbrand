import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  const channel = vscode.window.createOutputChannel("DevBrand");
  const diagnosticCollection = vscode.languages.createDiagnosticCollection("devbrand");

  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.text = "$(lightbulb) DevBrand";
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Command to trigger manually
  const analyzeCommand = vscode.commands.registerCommand(
    "devbrand.analyzeCode",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await runAnalysis(editor.document, statusBar, diagnosticCollection, channel);
      }
    }
  );
  context.subscriptions.push(analyzeCommand);

  // Auto-analyze on save
  vscode.workspace.onDidSaveTextDocument(async (doc) => {
    const config = vscode.workspace.getConfiguration("devbrand");
    const autoAnalyze = config.get<boolean>("autoAnalyzeOnSave", true);

    if (autoAnalyze && (doc.languageId === "typescript" || doc.languageId === "typescriptreact" || doc.languageId === "javascript")) {
      await runAnalysis(doc, statusBar, diagnosticCollection, channel);
    }
  });
}

async function runAnalysis(
  doc: vscode.TextDocument,
  statusBar: vscode.StatusBarItem,
  diagnostics: vscode.DiagnosticCollection,
  channel: vscode.OutputChannel
) {
  const config = vscode.workspace.getConfiguration("devbrand");
  const apiKey = config.get<string>("apiKey");

  if (!apiKey) {
    vscode.window.showWarningMessage("DevBrand API Key is missing. Please configure it in settings.");
    return;
  }

  statusBar.text = "$(loading~spin) DevBrand: Analyzing...";
  channel.appendLine(`Analyzing ${doc.fileName}...`);

  try {
    const response = await fetch("https://devbrand.app/api/v1/analyze/file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        filename: doc.fileName,
        content: doc.getText(),
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json() as any;

    // Update Status Bar
    statusBar.text = `$(pulse) Ego Score: ${data.egoScore}/100`;

    // Render Diagnostics
    const diags = data.issues.map((issue: any) => {
      const range = new vscode.Range(
        issue.line - 1, 0, issue.line - 1, 100
      );
      const diagnostic = new vscode.Diagnostic(
        range,
        issue.description,
        vscode.DiagnosticSeverity.Warning
      );
      diagnostic.source = "devbrand";
      return diagnostic;
    });

    diagnostics.set(doc.uri, diags);
    channel.appendLine(`Analysis complete. Found ${diags.length} issues.`);

  } catch (error: any) {
    channel.appendLine(`Error during analysis: ${error.message}`);
    statusBar.text = "$(error) DevBrand: Failed";
    setTimeout(() => {
      statusBar.text = "$(lightbulb) DevBrand";
    }, 5000);
  }
}

export function deactivate() {}
