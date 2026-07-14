#!/usr/bin/env node
import childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { syncBuiltinESMExports } from "node:module";

const originalExec = childProcess.exec;

function createNoopChildProcess() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = null;
  child.kill = () => true;
  child.pid = 0;
  return child;
}

childProcess.exec = function patchedExec(command, options, callback) {
  const normalized = String(command || "").trim().toLowerCase();
  if (process.platform === "win32" && normalized === "net use") {
    const done = typeof options === "function" ? options : callback;
    const child = createNoopChildProcess();
    queueMicrotask(() => {
      done?.(null, "", "");
      child.emit("exit", 0, null);
      child.emit("close", 0, null);
    });
    return child;
  }
  return originalExec.apply(this, arguments);
};

syncBuiltinESMExports();
await import(new URL("../node_modules/vite/bin/vite.js", import.meta.url));