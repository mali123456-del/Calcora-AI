// electron/main.ts
var import_electron = require("electron");

// electron/runtimeConfig.ts
function getDesktopRuntimeEnvironment(env = process.env) {
  return {
    ...env,
    NODE_ENV: "production",
    CALCORA_DESKTOP: "1"
  };
}

// electron/main.ts
Object.assign(process.env, getDesktopRuntimeEnvironment());
async function startBackend() {
  const backendModule = "../dist/server.cjs";
  await import(backendModule);
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch("http://127.0.0.1:3000/api/health");
      if (r.ok) return;
    } catch {
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Calcora backend did not become ready.");
}
async function createWindow() {
  await startBackend();
  const win = new import_electron.BrowserWindow({ width: 1440, height: 920, minWidth: 1024, minHeight: 700, backgroundColor: "#0b1020", webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  await win.loadURL("http://127.0.0.1:3000");
  win.webContents.setWindowOpenHandler(({ url }) => {
    import_electron.shell.openExternal(url);
    return { action: "deny" };
  });
}
import_electron.app.whenReady().then(createWindow).catch((e) => {
  console.error(e);
  import_electron.app.quit();
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") import_electron.app.quit();
});
