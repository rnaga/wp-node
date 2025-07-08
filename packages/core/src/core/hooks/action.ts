import { EventEmitter } from "events";

import type * as types from "../../types";

const eventPrefix = "__action_hook_";

export class Action<TActions = types.hooks.Actions> extends EventEmitter {
  constructor() {
    super();
  }

  getEventName(name: string | number | symbol) {
    return `${eventPrefix}${String(name)}`;
  }

  addCommand<P>(
    command: types.hooks.CommandAction<P>,
    listener: (args: P) => void
  ) {
    return this.add(command.id as any, listener as any);
  }

  add<T extends keyof TActions>(
    name: T,
    listener: TActions[T] extends (...args: any) => any ? TActions[T] : never,
    options?: { once?: boolean }
  ) {
    const { once = false } = options ?? {};
    if (once) {
      this.once(this.getEventName(name), listener);
    } else {
      this.on(this.getEventName(name), listener);
    }

    return () => {
      this.remove(name, listener);
    };
  }

  addCommandOnce<P>(
    command: types.hooks.CommandAction<P>,
    listener: (args: P) => void
  ) {
    return this.addOnce(command.id as any, listener as any);
  }

  addOnce<T extends keyof TActions>(
    name: T,
    listener: TActions[T] extends (...args: any) => any ? TActions[T] : never
  ) {
    this.once(this.getEventName(name), listener);
  }

  doCommand<P>(
    command: types.hooks.CommandAction<P>,
    ...args: Parameters<(args: P) => void>
  ) {
    return this.do(command.id as any, ...(args as any));
  }

  do<T extends keyof TActions>(
    name: T,
    ...args: Parameters<
      TActions[T] extends (...args: any) => any ? TActions[T] : never
    >
  ) {
    this.emit(this.getEventName(name), ...(args as any));
  }

  remove<T extends keyof TActions>(
    name: T,
    listener: TActions[T] extends (...args: any) => any ? TActions[T] : never
  ) {
    this.removeListener(this.getEventName(name), listener);
  }
}
