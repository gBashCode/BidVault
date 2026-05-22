import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { makeCanonical } from './commitment.js';

export class AuditChain {
  private prevHash: string;

  constructor(lastHash?: string) {
    if (lastHash) {
      this.prevHash = lastHash;
    } else {
      const genesisBytes = keccak_256(utf8ToBytes('SEALEDBID_GENESIS'));
      this.prevHash = '0x' + bytesToHex(genesisBytes);
    }
  }

  /**
   * Appends a new event to the audit chain, producing a hash linked to the previous state.
   */
  append(eventType: string, payload: object): { eventHash: string; prevHash: string } {
    const currentPrev = this.prevHash;
    const canonicalPayload = JSON.stringify(makeCanonical(payload));
    const dataToHash = currentPrev + eventType + canonicalPayload;

    const hashBytes = keccak_256(utf8ToBytes(dataToHash));
    const eventHash = '0x' + bytesToHex(hashBytes);

    this.prevHash = eventHash;

    return {
      eventHash,
      prevHash: currentPrev,
    };
  }

  /**
   * Verifies the cryptographic integrity of a sequence of chain events.
   */
  verifyChain(
    events: Array<{
      prevHash: string;
      eventType: string;
      payload: object;
      eventHash: string;
    }>
  ): boolean {
    if (!Array.isArray(events)) {
      return false;
    }
    if (events.length === 0) {
      return true;
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Recompute and verify eventHash
      const canonicalPayload = JSON.stringify(makeCanonical(event.payload));
      const dataToHash = event.prevHash + event.eventType + canonicalPayload;
      const expectedHash = '0x' + bytesToHex(keccak_256(utf8ToBytes(dataToHash)));

      if (event.eventHash !== expectedHash) {
        return false;
      }

      // Check the cryptographic link between consecutive events
      if (i > 0) {
        if (event.prevHash !== events[i - 1].eventHash) {
          return false;
        }
      }
    }

    return true;
  }
}
