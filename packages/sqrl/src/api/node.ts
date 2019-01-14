export class NodeId {
  constructor(public type: string, public key: string) {}

  getIdString(): string {
    return `${this.type}/${this.key}`;
  }
}
