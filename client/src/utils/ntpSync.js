/**
 * NTP-inspired clock offset calculator.
 * Measures the offset between the client clock and the server clock
 * by averaging multiple round-trip measurements.
 */
export class NTPSync {
  constructor(socket, sampleCount = 5) {
    this.socket = socket;
    this.sampleCount = sampleCount;
    this.offset = 0;
    this.synced = false;
  }

  async sync() {
    const samples = [];

    for (let i = 0; i < this.sampleCount; i++) {
      const sample = await this._measure();
      samples.push(sample);
      await sleep(100);
    }

    // Discard outliers (highest RTT) and average the rest
    samples.sort((a, b) => a.rtt - b.rtt);
    const trimmed = samples.slice(0, Math.ceil(this.sampleCount * 0.8));
    this.offset = trimmed.reduce((sum, s) => sum + s.offset, 0) / trimmed.length;
    this.synced = true;
    console.log(`[NTP] Clock offset: ${this.offset.toFixed(2)}ms`);
    return this.offset;
  }

  _measure() {
    return new Promise((resolve) => {
      const clientSendTime = Date.now();
      this.socket.emit('ntp:request', { clientSendTime });
      this.socket.once('ntp:response', ({ clientSendTime, serverReceiveTime, serverSendTime }) => {
        const clientReceiveTime = Date.now();
        const rtt = clientReceiveTime - clientSendTime;
        const offset = (serverReceiveTime + serverSendTime - clientSendTime - clientReceiveTime) / 2;
        resolve({ offset, rtt });
      });
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
