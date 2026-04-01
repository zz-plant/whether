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
  export function spyOn<T extends object, K extends keyof T>(
    target: T,
    method: K,
  ): MockFunction;
  export const mock: {
    restore(): void;
    clearAllMocks(): void;
  };
}
