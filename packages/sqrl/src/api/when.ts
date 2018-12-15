export interface FiredRule {
  name: string;
  reason: string | null;
}
export interface WhenCause {
  firedRules: FiredRule[];
}
