declare module 'vitest' {
  export const describe: (name: string, fn: () => any) => void;
  export const it: (name: string, fn: () => any) => void;
  export const expect: any;
  export const beforeEach: any;
  export const afterEach: any;
  export const vi: any;
}
