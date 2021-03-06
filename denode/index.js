'use strict'

const Path = require('path')
const Electron = require('electron')
const STDIN = []
let win

Electron.app.on('ready', function() {
  let name, opts
  try {
    let pinfo = require(Path.join(process.cwd(), 'package.json'))
    name = pinfo.name
    opts = pinfo.electronOpts
  } catch (_) { }
  name = name || 'DeNode'

  Electron.protocol.interceptFileProtocol('file', function(request, callback) {
    if (request.url === `file:///app-${name}`) {
      callback(Path.join(__dirname, 'index.html'))
    } else {
      callback(request.url)
    }
  })

  win = new Electron.BrowserWindow(opts || { width: 800, height: 600, title: 'DeNode' });
  win.loadURL(`file:///app-${name}`)
  win.on('closed', function() {
    Electron.app.quit()
  })
  win.webContents.openDevTools({ detach: true })
  win.webContents.once('devtools-opened', function() {
    setImmediate(function() {
      win.hide()
      win.webContents.once('devtools-closed', function() {
        setImmediate(function() {
          win.close()
        })
      })
    })
  })

  win.webContents.on('dom-ready', function() {
    win.webContents.send('setup', JSON.stringify({
      stdoutIsTTY: process.stdout.isTTY,
      stderrIsTTY: process.stderr.isTTY,
      request: process.argv[2] || ''
    }))

    for (let i = 0, length = STDIN.length; i < length; ++i) {
      win.webContents.send('stdin', STDIN[i])
    }
  })
})

Electron.ipcMain.on('stdout', function(_, data) {
  process.stdout.write(data)
})
Electron.ipcMain.on('stderr', function(_, data) {
  process.stderr.write(data)
})
process.stdin.on('data', function(chunk) {
  const stringish = chunk.toString()
  if (win) {
    win.webContents.send('stdin', stringish)
  }
  STDIN.push(stringish)
})
process.stdin.resume()
