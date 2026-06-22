// A small, dependency-free Bloom filter of fake-article qids the player has
// recently seen. We use it to avoid showing the same fakes game after game.
//
// It is probabilistic: false positives (treating an unseen fake as seen) are
// possible and harmless here — they just skip a card — while false negatives
// never happen. The game store resets the filter once it can no longer find
// enough unseen fakes. Implemented in-house (rather than a library) so it stays
// browser-native: no Node `Buffer`/`reflect-metadata` globals to polyfill.

const STORAGE_KEY = 'moonflower_seen_fakes_bloom';

// Sized to hold a few thousand seen fakes at ~1% false-positive rate before it
// saturates. Reset (driven by the game store) keeps the rate from climbing.
const CAPACITY = 5000;
const ERROR_RATE = 0.01;

// Optimal bit count (m) and hash count (k) for n items at false-positive rate p.
function optimalParams(n: number, p: number): { m: number; k: number } {
  const m = Math.ceil(-(n * Math.log(p)) / (Math.LN2 * Math.LN2));
  const k = Math.max(1, Math.round((m / n) * Math.LN2));
  return { m, k };
}

// FNV-1a 32-bit hash, seeded, for ASCII keys (qids look like "Q12345").
function fnv1a(key: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

interface BloomState {
  m: number;
  k: number;
  bits: string; // base64-encoded bit store
}

export class BloomFilter {
  readonly m: number;
  readonly k: number;
  private store: Uint8Array;

  constructor(m: number, k: number, store?: Uint8Array) {
    this.m = m;
    this.k = k;
    this.store = store ?? new Uint8Array(Math.ceil(m / 8));
  }

  // Kirsch–Mitzenmacher double hashing: derive k indexes from two base hashes.
  private *indexes(key: string): Generator<number> {
    const h1 = fnv1a(key, 0);
    const h2 = fnv1a(key, 0x9e3779b9);
    for (let i = 0; i < this.k; i++) {
      yield ((h1 + Math.imul(i, h2)) >>> 0) % this.m;
    }
  }

  add(key: string): void {
    for (const idx of this.indexes(key)) {
      this.store[idx >> 3] |= 1 << (idx & 7);
    }
  }

  has(key: string): boolean {
    for (const idx of this.indexes(key)) {
      if ((this.store[idx >> 3] & (1 << (idx & 7))) === 0) return false;
    }
    return true;
  }

  toJSON(): BloomState {
    return { m: this.m, k: this.k, bits: bytesToBase64(this.store) };
  }

  static fromJSON(state: BloomState): BloomFilter {
    return new BloomFilter(state.m, state.k, base64ToBytes(state.bits));
  }
}

export function createSeenFakesFilter(): BloomFilter {
  const { m, k } = optimalParams(CAPACITY, ERROR_RATE);
  return new BloomFilter(m, k);
}

// Load the persisted filter, or a fresh one if none exists / it can't be parsed.
export function loadSeenFakesFilter(): BloomFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return BloomFilter.fromJSON(JSON.parse(raw));
  } catch (e) {
    console.warn('[seenFakes] failed to load Bloom filter, starting fresh', e);
  }
  return createSeenFakesFilter();
}

export function saveSeenFakesFilter(filter: BloomFilter): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter.toJSON()));
  } catch (e) {
    console.warn('[seenFakes] failed to persist Bloom filter', e);
  }
}
