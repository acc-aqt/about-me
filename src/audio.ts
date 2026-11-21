// Original chiptune loop and shutter click, synthesised with the Web Audio API so no audio files are shipped.

const STEP_SECONDS = 0.2;
const LOOKAHEAD_SECONDS = 0.3;
const SCHEDULER_INTERVAL_MS = 50;
const MASTER_VOLUME = 0.25;

// One MIDI note per eighth-note step; null is a rest.
const MELODY: (number | null)[] = [
  72, null, 76, 79, 77, 76, 74, null,
  71, null, 74, 77, 76, 74, 72, null,
  69, 72, 76, null, 74, 72, 71, 72,
  74, null, 71, 67, 69, 71, 72, null,
];
// One MIDI note per two steps.
const BASS: number[] = [48, 48, 55, 55, 43, 43, 50, 50, 45, 45, 52, 52, 41, 43, 48, 48];

export type Audio = {
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  playShutter(): void;
};

function frequency(midiNote: number) {
  return 440 * 2 ** ((midiNote - 69) / 12);
}

function playTone(
  context: AudioContext,
  output: AudioNode,
  type: OscillatorType,
  midiNote: number,
  start: number,
  duration: number,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency(midiNote);
  envelope.gain.setValueAtTime(volume, start);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playClick(context: AudioContext, output: AudioNode, noise: AudioBuffer, start: number, volume: number) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = noise;
  filter.type = "highpass";
  filter.frequency.value = 1800;
  envelope.gain.setValueAtTime(volume, start);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.04);
  source.connect(filter).connect(envelope).connect(output);
  source.start(start);
  source.stop(start + 0.05);
}

function createNoise(context: AudioContext) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.05), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

function createEngine() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(context.destination);
  return { context, master, noise: createNoise(context) };
}

export function createAudio(): Audio {
  let muted = true;
  let engine: ReturnType<typeof createEngine> | null = null;
  let scheduler: number | undefined;
  let step = 0;
  let nextStepTime = 0;

  function scheduleMusic() {
    if (!engine) return;
    const { context, master } = engine;
    while (nextStepTime < context.currentTime + LOOKAHEAD_SECONDS) {
      const note = MELODY[step % MELODY.length];
      if (note !== null) playTone(context, master, "square", note, nextStepTime, STEP_SECONDS * 0.9, 0.12);
      if (step % 2 === 0) {
        playTone(context, master, "triangle", BASS[(step / 2) % BASS.length], nextStepTime, STEP_SECONDS * 1.8, 0.3);
      }
      step = (step + 1) % MELODY.length;
      nextStepTime += STEP_SECONDS;
    }
  }

  function startMusic() {
    engine ??= createEngine();
    void engine.context.resume();
    step = 0;
    nextStepTime = engine.context.currentTime + 0.05;
    scheduleMusic();
    scheduler = window.setInterval(scheduleMusic, SCHEDULER_INTERVAL_MS);
  }

  function stopMusic() {
    window.clearInterval(scheduler);
    scheduler = undefined;
    void engine?.context.suspend();
  }

  return {
    isMuted: () => muted,
    setMuted(value) {
      if (value === muted) return;
      muted = value;
      if (muted) stopMusic();
      else startMusic();
    },
    playShutter() {
      if (muted || !engine) return;
      const { context, master, noise } = engine;
      const now = context.currentTime;
      playClick(context, master, noise, now, 0.9);
      playClick(context, master, noise, now + 0.07, 0.6);
    },
  };
}
