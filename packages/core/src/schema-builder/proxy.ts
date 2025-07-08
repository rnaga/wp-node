type FluentProxy = {
  [key: string]: (...args: any[]) => FluentProxy;
};

type Calls = Array<{ method: any; args: any[] }>;

export const createFluentProxy = (): [FluentProxy, Calls] => {
  const calls: Calls = [];

  const handler: ProxyHandler<FluentProxy> = {
    get: (target, prop, receiver) => {
      if (typeof prop === "string") {
        return (...args: any[]) => {
          calls.push({ method: prop, args });
          return receiver;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  };

  return [new Proxy({} as FluentProxy, handler), calls];
};
