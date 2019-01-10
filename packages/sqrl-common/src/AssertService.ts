export interface AssertService {
  compare(
    manipulator: any,
    left: any,
    operator: string,
    right: any,
    arrow: string
  ): void;

  ok(manipulator: any, value: any, arrow: string): void;
}
