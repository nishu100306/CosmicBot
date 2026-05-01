// Worker thread that handles log message formatting, buffering, and Discord delivery requests.
// Receives log messages from the main thread, batches them, and posts back ready-to-send strings.
// Main thread is responsible for the actual Discord channel.send (the Discord client lives there).
//
// Messages from main:
//   { type: 'log', args: [...], isError: bool }
//   { type: 'flush' }       // force immediate flush
//   { type: 'shutdown' }
//
// Messages to main:
//   { type: 'send', message: string }   // ready to send to Discord
//
// Main thread should already be writing to stdout via originalLog/originalError before posting here.

const { parentPort } = require('node:worker_threads');

const MAX_BUFFER = 500;
const TRIM_TO = 250;
const FLUSH_INTERVAL_MS = 1000;
const DISCORD_LIMIT = 1900;

let buffer = [];
let flushTimeout = null;

function safeStringify(arg) {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.stack || arg.message || String(arg);
    if (arg === null || arg === undefined) return String(arg);
    try {
        return JSON.stringify(arg, null, 2);
    } catch (err) {
        return String(arg);
    }
}

function format(args, isError) {
    const text = args.map(safeStringify).join(' ');
    return isError ? `[ERROR] ${text}` : text;
}

function scheduleFlush() {
    if (flushTimeout) return;
    flushTimeout = setTimeout(flushNow, FLUSH_INTERVAL_MS);
}

function flushNow() {
    flushTimeout = null;
    if (buffer.length === 0) return;
    const message = buffer.join('\n').slice(0, DISCORD_LIMIT);
    buffer = [];
    parentPort.postMessage({ type: 'send', message });
}

parentPort.on('message', (msg) => {
    if (!msg) return;

    if (msg.type === 'log') {
        const text = format(msg.args || [], msg.isError);
        if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-TRIM_TO);
        buffer.push(text);
        scheduleFlush();
    } else if (msg.type === 'flush') {
        if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
        }
        flushNow();
    } else if (msg.type === 'shutdown') {
        if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
        }
        flushNow();
        process.exit(0);
    }
});
