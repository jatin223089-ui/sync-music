/**
 * NTP-inspired clock offset calculator.
 * Measures the offset between the client clock and the server clock
 * by averaging multiple round-trip measurements.
 */
export class NTPSync {
  constructor(socket, sampleCount = 5, requestTimeoutMs = 2000) {
    this.socket = socket;
    this.sampleCount = sampleCount;
    this.requestTimeoutMs = requestTimeoutMs;
    this.offset = 0;
    /** Median RTT from the last successful sync (ms), for diagnostics UI */
    this.lastMedianRtt = 0;
    this.synced = false;
  }

  async sync(options = {}) {
    const { signal } = options;
    const samples = [];

    for (let i = 0; i < this.sampleCount; i++) {
      if (signal?.aborted) {
        throw new Error('NTP sync aborted');
      }
      const sample = await this._measure(options);
      samples.push(sample);
      await sleep(100, signal);
    }

    // Discard outliers (highest RTT) and average the rest
    samples.sort((a, b) => a.rtt - b.rtt);
    const trimmed = samples.slice(0, Math.ceil(this.sampleCount * 0.8));
    this.offset = trimmed.reduce((sum, s) => sum + s.offset, 0) / trimmed.length;
    this.lastMedianRtt = trimmed.reduce((sum, s) => sum + s.rtt, 0) / trimmed.length;
    this.synced = true;
    return this.offset;
  }

  _measure(options = {}) {
    const { signal, timeoutMs = this.requestTimeoutMs } = options;
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('NTP sync aborted'));
        return;
      }

      const clientSendTime = Date.now();
      const onResponse = ({ clientSendTime, serverReceiveTime, serverSendTime }) => {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
        const clientReceiveTime = Date.now();
        const rtt = clientReceiveTime - clientSendTime;
        const offset = (serverReceiveTime + serverSendTime - clientSendTime - clientReceiveTime) / 2;
        resolve({ offset, rtt });
      };
      const onAbort = () => {
        clearTimeout(timeoutId);
        this.socket.off('ntp:response', onResponse);
        reject(new Error('NTP sync aborted'));
      };
      const timeoutId = setTimeout(() => {
        this.socket.off('ntp:response', onResponse);
        if (signal) signal.removeEventListener('abort', onAbort);
        reject(new Error('NTP sync timeout'));
      }, timeoutMs);

      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      this.socket.emit('ntp:request', { clientSendTime });
      this.socket.once('ntp:response', onResponse);
    });
  }

  /**
   * Convert a server timestamp to local time.
   */
  toLocalTime(serverTime) {
    return serverTime - this.offset;
  }

  /**
   * Get the estimated current server time.
   */
  serverNow() {
    return Date.now() + this.offset;
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('NTP sync aborted'));
      return;
    }
    const timeoutId = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new Error('NTP sync aborted'));
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}
