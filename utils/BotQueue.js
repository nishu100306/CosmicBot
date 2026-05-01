// Per-bot serial operation queue with priority, timeouts, and standardized result envelopes.
//
// Every operation goes through enqueue(opName, fn, {timeoutMs, priority}).
// fn is called with the bot instance. Only one fn runs at a time per queue.
// Higher priority ops jump ahead of lower priority ops, but never preempt the in-flight op.
//
// Returns: { ok: true, value, durationMs, opName, botId }
//        | { ok: false, error: <Error|string>, durationMs, opName, botId, reason: 'timeout'|'rejected'|'queueFull' }

const PRIORITY = Object.freeze({ HIGH: 0, NORMAL: 1, LOW: 2 });
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_QUEUE_LENGTH = 100;

class BotQueue {
    constructor(botId, getBot, { maxQueueLength = DEFAULT_MAX_QUEUE_LENGTH } = {}) {
        this.botId = botId;
        this.getBot = getBot; // function returning the current bot instance (or null)
        this.queue = [];
        this.processing = false;
        this.maxQueueLength = maxQueueLength;
        this.currentOp = null;
        this.stats = { enqueued: 0, completed: 0, timedOut: 0, rejected: 0, queueFull: 0 };
    }

    get depth() {
        return this.queue.length + (this.currentOp ? 1 : 0);
    }

    enqueue(opName, fn, { timeoutMs = DEFAULT_TIMEOUT_MS, priority = PRIORITY.NORMAL } = {}) {
        return new Promise((resolve) => {
            if (this.queue.length >= this.maxQueueLength) {
                this.stats.queueFull++;
                resolve({
                    ok: false,
                    error: `BotQueue[${this.botId}] full (${this.queue.length}/${this.maxQueueLength})`,
                    durationMs: 0,
                    opName,
                    botId: this.botId,
                    reason: 'queueFull'
                });
                return;
            }

            const op = { opName, fn, timeoutMs, priority, resolve, enqueuedAt: Date.now() };
            this.stats.enqueued++;

            // Insert by priority (lower number = higher priority), then FIFO within priority
            let inserted = false;
            for (let i = 0; i < this.queue.length; i++) {
                if (this.queue[i].priority > priority) {
                    this.queue.splice(i, 0, op);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) this.queue.push(op);

            this._process();
        });
    }

    async _process() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const op = this.queue.shift();
            this.currentOp = op;
            const start = Date.now();

            const bot = this.getBot();
            if (!bot) {
                this.stats.rejected++;
                op.resolve({
                    ok: false,
                    error: 'Bot not available',
                    durationMs: Date.now() - start,
                    opName: op.opName,
                    botId: this.botId,
                    reason: 'rejected'
                });
                this.currentOp = null;
                continue;
            }

            let timeoutHandle = null;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new Error(`Op '${op.opName}' timed out after ${op.timeoutMs}ms`));
                }, op.timeoutMs);
            });

            try {
                const value = await Promise.race([
                    Promise.resolve().then(() => op.fn(bot)),
                    timeoutPromise
                ]);
                clearTimeout(timeoutHandle);
                this.stats.completed++;
                op.resolve({
                    ok: true,
                    value,
                    durationMs: Date.now() - start,
                    opName: op.opName,
                    botId: this.botId
                });
            } catch (err) {
                clearTimeout(timeoutHandle);
                const isTimeout = err && err.message && err.message.includes('timed out');
                if (isTimeout) this.stats.timedOut++;
                op.resolve({
                    ok: false,
                    error: err,
                    durationMs: Date.now() - start,
                    opName: op.opName,
                    botId: this.botId,
                    reason: isTimeout ? 'timeout' : 'rejected'
                });
            } finally {
                this.currentOp = null;
            }
        }

        this.processing = false;
    }

    /**
     * Drain the queue, rejecting all pending ops. Call when stopping a bot.
     */
    drain(reason = 'queue drained') {
        const drained = this.queue.splice(0, this.queue.length);
        for (const op of drained) {
            op.resolve({
                ok: false,
                error: reason,
                durationMs: 0,
                opName: op.opName,
                botId: this.botId,
                reason: 'rejected'
            });
        }
    }
}

module.exports = BotQueue;
module.exports.PRIORITY = PRIORITY;
