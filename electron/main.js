const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

let mainWindow;
let serverProcess;

const PORT = 3456;

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

function getAppRoot() {
  if (app.isPackaged) {
    // In packaged app, resources are in the app.asar or unpacked directory
    return path.join(process.resourcesPath, "app");
  }
  // In development, use the project root
  return path.join(__dirname, "..");
}

async function startNextServer(port) {
  const appRoot = getAppRoot();
  const standaloneDir = path.join(appRoot, ".next", "standalone");
  const serverPath = path.join(standaloneDir, "server.js");

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "localhost",
    NODE_ENV: "production",
  };

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: standaloneDir,
    env,
    stdio: "pipe",
  });

  serverProcess.stdout.on("data", (data) => {
    console.log(`[Next.js] ${data}`);
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`[Next.js] ${data}`);
  });

  serverProcess.on("error", (err) => {
    console.error("Failed to start Next.js server:", err);
  });

  // Wait for the server to be ready
  await waitForServer(port);
}

function waitForServer(port, retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      if (remaining <= 0) {
        reject(new Error("Server did not start in time"));
        return;
      }
      const req = net.createConnection({ port, host: "localhost" }, () => {
        req.end();
        resolve();
      });
      req.on("error", () => {
        setTimeout(() => check(remaining - 1), 500);
      });
    };
    check(retries);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: "ClawSetup",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const port = await findAvailablePort(PORT);

  try {
    await startNextServer(port);
    createWindow(port);
  } catch (err) {
    console.error("Failed to start application:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
