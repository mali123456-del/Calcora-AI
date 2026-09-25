import { app, BrowserWindow, shell } from 'electron'
import { getDesktopRuntimeEnvironment } from './runtimeConfig'

Object.assign(process.env, getDesktopRuntimeEnvironment())

async function startBackend(){await import('../dist/server.cjs');for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:3000/api/health');if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,250))}throw new Error('Calcora backend did not become ready.')}
async function createWindow(){await startBackend();const win=new BrowserWindow({width:1440,height:920,minWidth:1024,minHeight:700,backgroundColor:'#0b1020',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});await win.loadURL('http://127.0.0.1:3000');win.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return{action:'deny'}})}
app.whenReady().then(createWindow).catch(e=>{console.error(e);app.quit()});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})