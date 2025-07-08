export const asyncConstructor = <T>(target: any, fn: () => Promise<any>) => {
  return fn().then(() => target) as unknown as T;
};
