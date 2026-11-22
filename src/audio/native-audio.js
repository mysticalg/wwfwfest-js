export class NativeAudio {
  async load() {
    const base = new URL('../../assets/audio/', import.meta.url);
    const [manifest, samples] = await Promise.all([
      fetch(new URL('effects.json', base)), fetch(new URL('samples.bin', base)),
    ]);
    if (!manifest.ok || !samples.ok) throw new Error('Original sound assets could not be loaded.');
    this.manifest = await manifest.json();
    this.samples = await samples.arrayBuffer();
  }

  async enable() {
    if (this.initializing) return this.initializing;
    if (this.context) { await this.context.resume(); return; }
    this.initializing = this.initialize();
    try { await this.initializing; }
    finally { this.initializing = null; }
  }

  async initialize() {
    const context = new AudioContext();
    try {
      await context.audioWorklet.addModule(new URL('./effects-worklet.js', import.meta.url));
      this.node = new AudioWorkletNode(context, 'wwfwfest-effects', {
        numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1],
        processorOptions: {manifest: this.manifest, samples: this.samples},
      });
      this.node.onprocessorerror = () => {
        this.node = null;
        this.context = null;
        void context.close();
        this.onError?.('The native sound processor stopped. Enable audio to retry.');
      };
      this.node.connect(context.destination);
      await context.resume();
      this.context = context;
    } catch (error) {
      this.node?.disconnect();
      this.node = null;
      await context.close();
      throw error;
    }
  }

  command(command) {
    if (!this.node) return false;
    this.node.port.postMessage({op: 'command', command});
    return true;
  }

  stop() { this.node?.port.postMessage({op: 'stop'}); }
  pause(value) { this.node?.port.postMessage({op: 'pause', value}); }
  mute(value) { this.node?.port.postMessage({op: 'mute', value}); }
}
