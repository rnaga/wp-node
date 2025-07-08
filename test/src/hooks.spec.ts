/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-namespace */
import Application from "@rnaga/wp-node/application";
import { Context } from "@rnaga/wp-node/core/context";
import { action, filter, hook } from "@rnaga/wp-node/decorators/hooks";
import { HooksCommand } from "@rnaga/wp-node/core/hooks/hooks-command";
import {
  createActionCommand,
  createFilterCommand,
} from "@rnaga/wp-node/common/hooks-command";

export interface CustomActions {
  custom_actions: () => Promise<void>;
}

const customActions = action<CustomActions>;

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module "@rnaga/wp-node/types/hooks/filters.d" {
  export interface Filters {
    custom: (n: number) => Promise<number>;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module "@rnaga/wp-node/types/hooks/actions.d" {
  export interface Actions {
    custom: () => void;
    custom_command: (n: number) => void;
  }
}

export interface CustomFilters {
  custom_filter: (n: number) => Promise<number>;
}

const customFilter = filter<CustomFilters>;

@hook("empty")
class EmptyHook {}

@hook("multi")
class TestHookEnv {
  @customFilter("custom_filter")
  async hookCustomFilter(n: number) {
    return n + 10;
  }

  @filter("custom")
  async hookCustomFiler(n: number) {
    return n + 10;
  }
}

@hook("single")
class TestHook {
  @action("core_init")
  hookInit(context: Context) {
    context.hooks.action.do("custom");
  }

  @customActions("custom_actions")
  async hookCustom() {
    console.log("__custom__");
  }

  @filter("custom")
  async hookCustomFiler(n: number) {
    return n + 10;
  }

  @filter("custom", 0)
  async hookCustomFiler2(n: number) {
    return n + 10;
  }
}

Application.registerHooks([EmptyHook, TestHook]);
Application.registerHooks([TestHookEnv], "multi");

test("hooks", async () => {
  await Application.getContext("multi");
  const context = await Application.getContext("multi");

  let result = await context.hooks.filter.asyncApply("custom", 10);
  expect(result).toBe(40);

  const contextSingle = await Application.getContext("single");

  result = await contextSingle.hooks.filter.asyncApply("custom", 10);
  expect(result).toBe(30);
});

test("hooks filter command", async () => {
  const filterCommand = HooksCommand.createFilter<
    string,
    { o1: number; o2: string }
  >();
  const context = await Application.getContext("multi");

  // Add filter command
  context.hooks.filter.addCommand(filterCommand, (args0, args1) => {
    const s = args0;
    const { o1, o2 } = args1;
    return `${s} ${o1 + 10} ${o2}`;
  });

  const s = "test";

  const filterAsyncCommand = createFilterCommand<
    Promise<string>,
    { o1: number; o2: string }
  >();

  context.hooks.filter.addCommand(filterAsyncCommand, async (args0, args1) => {
    const s = args0;
    const { o1, o2 } = args1;
    return `${s} ${o1 + 20} ${o2}`;
  });

  // Apply async filter command
  let result = await context.hooks.filter.asyncCommandApply(
    filterAsyncCommand,
    s,
    {
      o1: 10,
      o2: "test",
    }
  );

  expect(result).toBe("test 30 test");

  // Add filter command
  result = context.hooks.filter.applyCommand(filterCommand, s, {
    o1: 20,
    o2: "test",
  });

  expect(result).toBe("test 30 test");

  // Using utility function
  const filterCommand2 = createFilterCommand<number>();

  // Add filter command
  context.hooks.filter.addCommand(filterCommand2, (n) => {
    return n + 100;
  });

  const result2 = context.hooks.filter.applyCommand(filterCommand2, 10);

  expect(result2).toBe(110);

  // Test named filter
  const filterCommand3 = HooksCommand.createNamedFilter("custom");

  const result3 = await context.hooks.filter.asyncCommandApply(
    filterCommand3,
    10
  );
  expect(result3).toBe(40);
});

test("hooks action command", async () => {
  const actionCommand = HooksCommand.createAction<number>();
  const context = await Application.getContext("single");

  let n = 0;
  // Add action command
  context.hooks.action.addCommand(actionCommand, (m) => {
    n += m;
  });

  context.hooks.action.doCommand(actionCommand, 10);

  expect(n).toBe(10);

  // Test addOnce
  n = 0;

  const actionCommand2 = HooksCommand.createAction<number>();

  context.hooks.action.addCommandOnce(actionCommand2, (m) => {
    n += m;
  });

  context.hooks.action.doCommand(actionCommand2, 10);
  context.hooks.action.doCommand(actionCommand2, 10);

  expect(n).toBe(10);

  // test utility function
  const actionCommand3 = createActionCommand<number>();

  n = 0;
  context.hooks.action.addCommand(actionCommand3, (m) => {
    n += m;
    console.log("action");
  });

  context.hooks.action.doCommand(actionCommand3, 10);

  expect(n).toBe(10);

  // test named action
  const actionCommand4 = HooksCommand.createNamedAction("custom_command");
  context.hooks.action.addCommand(actionCommand4, (m) => {
    expect(m[0]).toBe(123);
  });

  context.hooks.action.doCommand(actionCommand4, [123]);
});
