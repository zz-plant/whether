declare module "bun:test" {
  type TestCallback = () => void | Promise<void>;
  type MockCall = unknown[];
  type MockFunction = {
    mock: {
      calls: MockCall[];
    };
    mockImplementation(implementation: (...args: any[]) => any): MockFunction;
  };

  export function describe(name: string, callback: TestCallback): void;
  export function it(name: string, callback: TestCallback): void;
  export function beforeEach(callback: TestCallback): void;
  export function afterEach(callback: TestCallback): void;
  export function afterAll(callback: TestCallback): void;
  export function spyOn<T extends object, K extends keyof T>(
    target: T,
    method: K,
  ): MockFunction;
  /** Fixes the clock `new Date()` and `Date.now()` read; with no argument, restores the real one. */
  export function setSystemTime(time?: Date | number): void;
  export const mock: {
    restore(): void;
    clearAllMocks(): void;
  };
}
