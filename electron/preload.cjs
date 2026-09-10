// The only surface the page gets. Nothing else from Node crosses this line —
// the page renders a menu for the public, and a totem in a mall is a machine
// strangers touch all day.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fayzShell', {
  /** True only inside the shell, so the web build can pick its adapter. */
  isShell: true,
  /** ESC/POS bytes straight to the spooler. Returns {ok, message?}. */
  printRaw: (bytes) => ipcRenderer.invoke('fayz:print-raw', Array.from(bytes)),
  printerName: () => ipcRenderer.invoke('fayz:printer-name'),
  /** Quits the shell if the PIN matches. Verified in main, not here. */
  requestExit: (pin) => ipcRenderer.invoke('fayz:request-exit', pin),
})
