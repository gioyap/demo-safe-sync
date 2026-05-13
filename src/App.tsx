import { useEffect, useMemo, useState } from "react";
import "./App.css";

type ProviderKey = "gdrive" | "mega" | "onedrive";
type RunStatus = "idle" | "running" | "success";
type ToastTone = "success" | "info";

type Remote = {
  id: number;
  name: string;
  provider: ProviderKey;
  usedFor: ProviderKey | null;
};

type FolderConfig = {
  gdriveClientWorking: string;
  megaClientCanonical: string;
  onedriveCritical: string;
  gdriveConsolidated: string;
};

type SafeCommand = {
  id: string;
  label: string;
  description: string;
  source: string;
  destination: string;
  isRealRun: boolean;
};

type ToastState = {
  id: number;
  title: string;
  message: string;
  tone: ToastTone;
} | null;

type LogEntry = {
  id: number;
  title: string;
  timestamp: string;
  summary: string;
  technicalDetails: string;
};

const PROVIDERS: Array<{ key: ProviderKey; label: string; note: string }> = [
  {
    key: "gdrive",
    label: "Google Drive",
    note: "Client working folders and consolidated delivery storage.",
  },
  {
    key: "mega",
    label: "MEGA",
    note: "Canonical client archive destination.",
  },
  {
    key: "onedrive",
    label: "OneDrive",
    note: "Critical file source library.",
  },
];

const DEFAULT_FOLDERS: FolderConfig = {
  gdriveClientWorking: "Client-Working-Folder",
  megaClientCanonical: "Client-Canonical-Folder",
  onedriveCritical: "Critical-Files",
  gdriveConsolidated: "Consolidated-Files",
};

const DEFAULT_REMOTES: Remote[] = [
  { id: 1, name: "client-gdrive", provider: "gdrive", usedFor: "gdrive" },
  { id: 2, name: "client-mega", provider: "mega", usedFor: "mega" },
  { id: 3, name: "client-onedrive", provider: "onedrive", usedFor: "onedrive" },
];

function providerLabel(provider: ProviderKey) {
  return PROVIDERS.find((item) => item.key === provider)?.label ?? provider;
}

function buildCommands(folders: FolderConfig): SafeCommand[] {
  return [
    {
      id: "dry-gdrive-mega",
      label: "Dry Run: Google Drive to MEGA",
      description: "Preview files that would move from the client working folder into the canonical MEGA folder.",
      source: `client-gdrive:${folders.gdriveClientWorking}`,
      destination: `client-mega:${folders.megaClientCanonical}`,
      isRealRun: false,
    },
    {
      id: "run-gdrive-mega",
      label: "Run Update: Google Drive to MEGA",
      description: "Simulate the approved live copy after the preview has been reviewed.",
      source: `client-gdrive:${folders.gdriveClientWorking}`,
      destination: `client-mega:${folders.megaClientCanonical}`,
      isRealRun: true,
    },
    {
      id: "dry-onedrive-gdrive",
      label: "Dry Run: OneDrive to Google Drive",
      description: "Preview critical files that would be copied into the consolidated Google Drive folder.",
      source: `client-onedrive:${folders.onedriveCritical}`,
      destination: `client-gdrive:${folders.gdriveConsolidated}`,
      isRealRun: false,
    },
    {
      id: "run-onedrive-gdrive",
      label: "Run Update: OneDrive to Google Drive",
      description: "Simulate the final approved copy for the critical file migration workflow.",
      source: `client-onedrive:${folders.onedriveCritical}`,
      destination: `client-gdrive:${folders.gdriveConsolidated}`,
      isRealRun: true,
    },
  ];
}

function App() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [folderDraft, setFolderDraft] = useState(DEFAULT_FOLDERS);
  const [remotes, setRemotes] = useState(DEFAULT_REMOTES);
  const [remoteProvider, setRemoteProvider] = useState<ProviderKey>("gdrive");
  const [remoteName, setRemoteName] = useState("");
  const [renameRemoteId, setRenameRemoteId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingCommand, setPendingCommand] = useState<SafeCommand | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [lastRun, setLastRun] = useState("No activity yet");
  const [summary, setSummary] = useState({
    badge: "Ready",
    headline: "Demo workspace is ready.",
    overview: "Use the controls to walk through creating remotes, editing folders, previewing changes, and running an approved update.",
    nextStep: "Start with Manage Remotes or click a dry run action.",
  });
  const [rawOutput, setRawOutput] = useState("Demo mode only. No rclone command has been executed.");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const commands = useMemo(() => buildCommands(folders), [folders]);
  const connectedCount = PROVIDERS.filter((provider) => remotes.some((remote) => remote.usedFor === provider.key)).length;
  const isBusy = status === "running";

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function showToast(title: string, message: string, tone: ToastTone = "success") {
    setToast({ id: Date.now(), title, message, tone });
  }

  function createRemote() {
    const name = remoteName.trim() || `client-${remoteProvider}-${remotes.length + 1}`;
    const nextRemote: Remote = {
      id: Date.now(),
      name,
      provider: remoteProvider,
      usedFor: remoteProvider,
    };

    setRemotes((current) => [...current, nextRemote]);
    setRemoteName("");
    setSummary({
      badge: "Remote ready",
      headline: `${name} was created for the demo.`,
      overview: "The remote now appears in the account list and is assigned to the matching workflow.",
      nextStep: "Open Edit Folders or run a preview action to continue the walkthrough.",
    });
    setRawOutput(`Demo remote created\nProvider: ${providerLabel(remoteProvider)}\nRemote name: ${name}\nStatus: successful mock setup`);
    showToast("Remote created successfully", `${name} is ready for the demo workflow.`);
  }

  function renameRemote(remote: Remote) {
    const nextName = renameDraft.trim();
    if (!nextName || nextName === remote.name) {
      setRenameRemoteId(null);
      setRenameDraft("");
      return;
    }

    setRemotes((current) => current.map((item) => (item.id === remote.id ? { ...item, name: nextName } : item)));
    setRenameRemoteId(null);
    setRenameDraft("");
    setSummary({
      badge: "Remote renamed",
      headline: `${remote.name} was renamed to ${nextName}.`,
      overview: "The mock remote list has been updated for the presentation flow.",
      nextStep: "Assign the renamed remote or continue with a dry run.",
    });
    setRawOutput(`Demo remote renamed\nOld name: ${remote.name}\nNew name: ${nextName}\nProvider: ${providerLabel(remote.provider)}\nStatus: successful mock update`);
    showToast("Remote renamed successfully", `${remote.name} is now ${nextName}.`);
  }

  function deleteRemote(remote: Remote) {
    setRemotes((current) => current.filter((item) => item.id !== remote.id));
    if (renameRemoteId === remote.id) {
      setRenameRemoteId(null);
      setRenameDraft("");
    }
    setSummary({
      badge: "Remote deleted",
      headline: `${remote.name} was removed from the demo.`,
      overview: "The assigned workflow status updates immediately, just like the production UI.",
      nextStep: "Create or assign another remote if the workflow should appear connected.",
    });
    setRawOutput(`Demo remote deleted\nRemote name: ${remote.name}\nProvider: ${providerLabel(remote.provider)}\nStatus: successful mock removal`);
    showToast("Remote deleted successfully", `${remote.name} was removed from the demo.`);
  }

  function saveFolders() {
    setFolders(folderDraft);
    setFoldersOpen(false);
    setSummary({
      badge: "Folders saved",
      headline: "Folder names were updated.",
      overview: "The approved actions now display the new source and destination paths.",
      nextStep: "Run a dry run to show the client how the preview step works.",
    });
    showToast("Folder settings saved", "The demo actions now use the updated folder names.");
  }

  function runCommand(command: SafeCommand) {
    setStatus("running");
    setActiveCommandId(command.id);
    setSummary({
      badge: "Running",
      headline: `${command.label} is in progress.`,
      overview: "The interface is simulating the command handoff and waiting for a successful result.",
      nextStep: "A success summary will appear automatically.",
    });
    setRawOutput(`Starting demo command...\n${mockCommandLine(command)}\n\nWaiting for simulated response...`);

    window.setTimeout(() => {
      const finishedAt = new Date().toLocaleString();
      const actionType = command.isRealRun ? "update" : "dry run";
      setStatus("success");
      setActiveCommandId(null);
      setLastRun(`${command.label} - ${finishedAt}`);
      setSummary({
        badge: "Success",
        headline: `${command.label} completed successfully.`,
        overview: `The demo ${actionType} finished without touching any cloud account or local file.`,
        nextStep: command.isRealRun ? "Open View Logs to show the saved activity trail." : "Run the matching update once the preview looks correct.",
      });
      const technicalDetails = [
        "Demo command completed successfully",
        mockCommandLine(command),
        "",
        "Files checked: 128",
        "Files ready: 18",
        "Conflicts found: 0",
        "Exit code: 0",
        "Mode: UI simulation only",
      ].join("\n");
      setRawOutput(technicalDetails);
      setLogs((current) => [
        {
          id: Date.now(),
          title: `${command.label} completed successfully.`,
          timestamp: finishedAt,
          summary: `Mock ${actionType} completed with no conflicts and no real file transfer.`,
          technicalDetails,
        },
        ...current,
      ]);
      showToast("Command completed successfully", `${command.label} finished in demo mode.`);
    }, 900);
  }

  function handleCommand(command: SafeCommand) {
    if (command.isRealRun) {
      setPendingCommand(command);
      return;
    }

    runCommand(command);
  }

  function mockCommandLine(command: SafeCommand) {
    return `rclone copy ${command.source} ${command.destination}${command.isRealRun ? " -v" : " --dry-run -v"}`;
  }

  return (
    <main className="app-shell">
      {toast ? (
        <div className="toast-layer">
          <div className={`toast-card toast-${toast.tone}`}>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
        </div>
      ) : null}

      <header className="topbar">
        <div>
          <p className="eyebrow">Safe Sync Demo</p>
          <h1>Safe Sync</h1>
          <p className="subtitle">
            A client-facing UI walkthrough for approved cloud copy workflows. This build simulates the experience only.
          </p>
        </div>
        <div className={`status-pill status-${status}`}>
          <span />
          {status === "running" ? "Running" : status === "success" ? "Success" : "Idle"}
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-panel">
          <span>Configured remotes</span>
          <strong>{connectedCount} of 3</strong>
          <small>Google Drive, MEGA, and OneDrive roles.</small>
        </article>
        <article className="summary-panel">
          <span>Last demo activity</span>
          <strong>{lastRun}</strong>
          <small>Shown for presentation continuity.</small>
        </article>
        <article className="summary-panel">
          <span>Mode</span>
          <strong>UI simulation</strong>
          <small>No rclone, browser auth, or file transfer is executed.</small>
        </article>
      </section>

      <section className="workspace-tools">
        <div className="workspace-tools-copy">
          <h2>Demo Controls</h2>
          <p>Create mock remotes, adjust folder names, run previews, and show a successful update flow.</p>
        </div>
        <div className="workspace-tools-actions">
          <button className="secondary-button utility-button" disabled={isBusy} onClick={() => setAccountsOpen(true)}>
            Manage Remotes
          </button>
          <button
            className="secondary-button utility-button"
            disabled={isBusy}
            onClick={() => {
              setFolderDraft(folders);
              setFoldersOpen(true);
            }}
          >
            Edit Folders
          </button>
          <button className="secondary-button utility-button" disabled={isBusy} onClick={() => setLogsOpen(true)}>
            View Logs
          </button>
        </div>
        <div className="connection-strip workspace-connection-strip">
          {PROVIDERS.map((provider) => {
            const connected = remotes.some((remote) => remote.usedFor === provider.key);
            return (
              <span className={connected ? "connected" : "not-connected"} key={provider.key}>
                {provider.label} {connected ? "connected" : "not connected"}
              </span>
            );
          })}
        </div>
      </section>

      <section className="workspace">
        <div className="command-panel">
          <div className="section-title">
            <div>
              <h2>Approved Actions</h2>
              <span>Preview first, then run the approved update.</span>
            </div>
          </div>

          <div className="command-list">
            {commands.map((command) => (
              <article className="command-card" key={command.id}>
                <div>
                  <h3>{command.label}</h3>
                  <p>{command.description}</p>
                  <code>{mockCommandLine(command)}</code>
                </div>
                <button
                  className={command.isRealRun ? "primary-button danger" : "primary-button"}
                  disabled={isBusy}
                  onClick={() => handleCommand(command)}
                >
                  {activeCommandId === command.id ? "Running..." : command.label}
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="output-panel">
          <div className="section-title">
            <div>
              <h2>Command Output</h2>
              <span>Plain-language result and technical preview.</span>
            </div>
          </div>

          <section className="readable-summary">
            <div className="summary-heading">
              <div>
                <p className="summary-caption">Result summary</p>
                <h3>{summary.headline}</h3>
              </div>
              <span className={`summary-badge tone-${summary.badge === "Success" ? "success" : "info"}`}>{summary.badge}</span>
            </div>
            <p className="summary-lead">{summary.overview}</p>
            <div className="next-step">
              <strong>Suggested next step</strong>
              <p>{summary.nextStep}</p>
            </div>
          </section>

          <details className="raw-details" open>
            <summary>Technical details</summary>
            <pre>{rawOutput}</pre>
          </details>
        </aside>
      </section>

      {accountsOpen ? (
        <div className="modal-backdrop">
          <section className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="accounts-title">
            <div className="section-title">
              <div>
                <p className="eyebrow">Account setup</p>
                <h2 id="accounts-title">Manage Remotes</h2>
              </div>
              <button className="secondary-button" disabled={isBusy} onClick={() => setAccountsOpen(false)}>
                Close
              </button>
            </div>

            <section className="remote-create-panel">
              <div>
                <h3>Create Remote</h3>
                <p>Mock a new cloud account connection and assign it to the matching workflow.</p>
              </div>
              <div className="form-grid">
                <label>
                  Provider
                  <select value={remoteProvider} disabled={isBusy} onChange={(event) => setRemoteProvider(event.currentTarget.value as ProviderKey)}>
                    {PROVIDERS.map((provider) => (
                      <option value={provider.key} key={provider.key}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Remote name
                  <input value={remoteName} placeholder="Example: client-gdrive" disabled={isBusy} onChange={(event) => setRemoteName(event.currentTarget.value)} />
                </label>
              </div>
              <div className="modal-actions">
                <button className="primary-button" disabled={isBusy} onClick={createRemote}>
                  Create Remote
                </button>
              </div>
            </section>

            <div className="assignment-grid">
              {PROVIDERS.map((provider) => {
                const assigned = remotes.find((remote) => remote.usedFor === provider.key);
                return (
                  <article className={`assignment-card ${assigned ? "assignment-assigned" : "assignment-unassigned"}`} key={provider.key}>
                    <span>{provider.label}</span>
                    <strong>{assigned?.name ?? "Not assigned"}</strong>
                    <small>{provider.note}</small>
                  </article>
                );
              })}
            </div>

            <div className="account-list">
              {remotes.map((remote) => (
                <article className="account-card remote-card" key={remote.id}>
                  <div>
                    <div className="remote-card-title">
                      {renameRemoteId === remote.id ? (
                        <input value={renameDraft} disabled={isBusy} onChange={(event) => setRenameDraft(event.currentTarget.value)} />
                      ) : (
                        <h3>{remote.name}</h3>
                      )}
                      <span className="connected">{providerLabel(remote.provider)}</span>
                    </div>
                    <p>{remote.usedFor ? `Assigned to ${providerLabel(remote.usedFor)} workflow.` : "Available for assignment."}</p>
                  </div>
                  <div className="account-actions">
                    <button
                      className="secondary-button"
                      disabled={isBusy}
                      onClick={() => {
                        setRemotes((current) =>
                          current.map((item) => ({
                            ...item,
                            usedFor: item.provider === remote.provider && item.id === remote.id ? remote.provider : item.usedFor === remote.provider ? null : item.usedFor,
                          })),
                        );
                        showToast("Remote assigned successfully", `${remote.name} is assigned to ${providerLabel(remote.provider)}.`);
                      }}
                    >
                      Use for {providerLabel(remote.provider)}
                    </button>
                    {renameRemoteId === remote.id ? (
                      <>
                        <button className="secondary-button" disabled={isBusy} onClick={() => renameRemote(remote)}>
                          Save Rename
                        </button>
                        <button
                          className="secondary-button"
                          disabled={isBusy}
                          onClick={() => {
                            setRenameRemoteId(null);
                            setRenameDraft("");
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="secondary-button"
                        disabled={isBusy}
                        onClick={() => {
                          setRenameRemoteId(remote.id);
                          setRenameDraft(remote.name);
                        }}
                      >
                        Rename
                      </button>
                    )}
                    <button className="secondary-button danger-outline" disabled={isBusy} onClick={() => deleteRemote(remote)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {foldersOpen ? (
        <div className="modal-backdrop">
          <section className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="folders-title">
            <p className="eyebrow">Folder setup</p>
            <h2 id="folders-title">Edit Folder Names</h2>
            <div className="form-grid folder-form">
              <label>
                Google Drive source folder
                <input value={folderDraft.gdriveClientWorking} disabled={isBusy} onChange={(event) => setFolderDraft({ ...folderDraft, gdriveClientWorking: event.currentTarget.value })} />
              </label>
              <label>
                MEGA destination folder
                <input value={folderDraft.megaClientCanonical} disabled={isBusy} onChange={(event) => setFolderDraft({ ...folderDraft, megaClientCanonical: event.currentTarget.value })} />
              </label>
              <label>
                OneDrive source folder
                <input value={folderDraft.onedriveCritical} disabled={isBusy} onChange={(event) => setFolderDraft({ ...folderDraft, onedriveCritical: event.currentTarget.value })} />
              </label>
              <label>
                Google Drive migration destination
                <input value={folderDraft.gdriveConsolidated} disabled={isBusy} onChange={(event) => setFolderDraft({ ...folderDraft, gdriveConsolidated: event.currentTarget.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" disabled={isBusy} onClick={() => setFoldersOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" disabled={isBusy} onClick={saveFolders}>
                Save Folder Names
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingCommand ? (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <p className="eyebrow">Confirmation required</p>
            <h2 id="confirm-title">{pendingCommand.label}</h2>
            <p>
              This demo will show a successful update from {pendingCommand.source} to {pendingCommand.destination}. No real files will move.
            </p>
            <div className="modal-actions">
              <button className="secondary-button" disabled={isBusy} onClick={() => setPendingCommand(null)}>
                Cancel
              </button>
              <button
                className="primary-button danger"
                disabled={isBusy}
                onClick={() => {
                  const command = pendingCommand;
                  setPendingCommand(null);
                  runCommand(command);
                }}
              >
                Confirm Run Update
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {logsOpen ? (
        <div className="modal-backdrop">
          <section className="modal log-modal" role="dialog" aria-modal="true" aria-labelledby="logs-title">
            <div className="section-title">
              <h2 id="logs-title">Demo Logs</h2>
              <button className="secondary-button" disabled={isBusy} onClick={() => setLogsOpen(false)}>
                Close
              </button>
            </div>
            <div className="logs-list">
              {logs.length === 0 ? (
                <div className="readable-summary empty-log-state">
                  <p className="summary-caption">Result summary</p>
                  <h3>No saved demo logs yet.</h3>
                  <p>Run a dry run or update action and the mock history will appear here.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <article className="log-card" key={log.id}>
                    <div className="log-card-header">
                      <div>
                        <h3>{log.title}</h3>
                        <p>{log.timestamp} - {log.summary}</p>
                      </div>
                      <span className="connected">success</span>
                    </div>
                    <details className="raw-details">
                      <summary>Technical details</summary>
                      <pre>{log.technicalDetails}</pre>
                    </details>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;
