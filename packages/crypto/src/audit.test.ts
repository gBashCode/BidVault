import { describe, it, expect } from 'vitest';
import { AuditChain } from './audit.js';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

describe('AuditChain', () => {
  it('first append uses genesis hash', () => {
    const chain = new AuditChain();
    const result = chain.append('TEST_EVENT', { value: 42 });

    const expectedGenesisBytes = keccak_256(utf8ToBytes('SEALEDBID_GENESIS'));
    const expectedGenesis = '0x' + bytesToHex(expectedGenesisBytes);

    expect(result.prevHash).toBe(expectedGenesis);
  });

  it('second append uses hash from first', () => {
    const chain = new AuditChain();
    const r1 = chain.append('EVENT_ONE', { val: 1 });
    const r2 = chain.append('EVENT_TWO', { val: 2 });

    expect(r2.prevHash).toBe(r1.eventHash);
  });

  it('verifyChain returns true for valid chain', () => {
    const chain = new AuditChain();
    const r1 = chain.append('EVENT_ONE', { val: 1 });
    const r2 = chain.append('EVENT_TWO', { val: 2 });
    const r3 = chain.append('EVENT_THREE', { val: 3 });

    const events = [
      { prevHash: r1.prevHash, eventType: 'EVENT_ONE', payload: { val: 1 }, eventHash: r1.eventHash },
      { prevHash: r2.prevHash, eventType: 'EVENT_TWO', payload: { val: 2 }, eventHash: r2.eventHash },
      { prevHash: r3.prevHash, eventType: 'EVENT_THREE', payload: { val: 3 }, eventHash: r3.eventHash },
    ];

    expect(chain.verifyChain(events)).toBe(true);
  });

  it('verifyChain returns false if any eventHash is mutated', () => {
    const chain = new AuditChain();
    const r1 = chain.append('EVENT_ONE', { val: 1 });
    const r2 = chain.append('EVENT_TWO', { val: 2 });

    const events = [
      { prevHash: r1.prevHash, eventType: 'EVENT_ONE', payload: { val: 1 }, eventHash: r1.eventHash },
      { prevHash: r2.prevHash, eventType: 'EVENT_TWO', payload: { val: 2 }, eventHash: '0x' + 'a'.repeat(64) }, // Mutated hash
    ];

    expect(chain.verifyChain(events)).toBe(false);
  });

  it('verifyChain returns false if prevHash link is broken', () => {
    const chain = new AuditChain();
    const r1 = chain.append('EVENT_ONE', { val: 1 });
    const r2 = chain.append('EVENT_TWO', { val: 2 });

    const events = [
      { prevHash: r1.prevHash, eventType: 'EVENT_ONE', payload: { val: 1 }, eventHash: r1.eventHash },
      { prevHash: '0x' + 'b'.repeat(64), eventType: 'EVENT_TWO', payload: { val: 2 }, eventHash: r2.eventHash }, // Broken link
    ];

    expect(chain.verifyChain(events)).toBe(false);
  });

  it('verifyChain handles empty or invalid inputs', () => {
    const chain = new AuditChain();
    expect(chain.verifyChain([])).toBe(true);
    expect(chain.verifyChain(null as any)).toBe(false);
  });

  it('constructor accepts a custom lastHash', () => {
    const customHash = '0x' + '9'.repeat(64);
    const chain = new AuditChain(customHash);
    const result = chain.append('TEST_EVENT', { value: 42 });
    expect(result.prevHash).toBe(customHash);
  });

  it('verifyChain returns false if prevHash link is broken but event hashes are internally valid', () => {
    const chain1 = new AuditChain();
    const r1 = chain1.append('EVENT_ONE', { val: 1 });

    const chain2 = new AuditChain(); // starts fresh, different chain
    const r2 = chain2.append('EVENT_TWO', { val: 2 }); // internally valid hash but starts from genesis, not from r1.eventHash

    const events = [
      { prevHash: r1.prevHash, eventType: 'EVENT_ONE', payload: { val: 1 }, eventHash: r1.eventHash },
      { prevHash: r2.prevHash, eventType: 'EVENT_TWO', payload: { val: 2 }, eventHash: r2.eventHash },
    ];

    // Each event hash is internally 100% correct, but they are not linked together since events[1].prevHash !== events[0].eventHash.
    expect(chain1.verifyChain(events)).toBe(false);
  });
});
