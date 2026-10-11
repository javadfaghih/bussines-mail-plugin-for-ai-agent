export const state = { uidValidity: 123n, exists: true, calls: [] };
export class ImapFlow {
  constructor() { this.mailbox = { exists: 1, uidValidity: state.uidValidity }; }
  async connect() {}
  async logout() {}
  async getMailboxLock() { return { release() {} }; }
  async fetchOne(uid, query, options) {
    state.calls.push({ uid, query, options });
    return state.exists ? { uid: Number(uid), envelope: { subject: "Fixture" }, flags: new Set(), size: 300_000 } : false;
  }
}
export function createSmtpTransport() { throw new Error("Tests must never send mail"); }
