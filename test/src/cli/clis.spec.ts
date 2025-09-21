import { Clis } from "@rnaga/wp-node-cli/clis";
import { Command } from "commander";

test("should call clazz.getCommand when it exists", () => {
  // Mock class with getCommand static method
  const mockGetCommand = jest.fn((program: Command) => {
    program
      .option("-t --testOption", "A test option")
      .description("A test command");
    return program;
  });

  const mockClazz = {
    getCommand: mockGetCommand,
  };

  // Call the private method using array notation to access it
  const result = (Clis as any).getCommand(
    "1.0.0",
    "Test description",
    mockClazz
  );

  // Verify that clazz.getCommand was called
  expect(mockGetCommand).toHaveBeenCalledTimes(1);
  expect(mockGetCommand).toHaveBeenCalledWith(expect.any(Command));
  expect(result).toBeInstanceOf(Command);
});

test("should add default options when clazz.getCommand does not exist", () => {
  // Mock class without getCommand method
  const mockClazz = {};

  // Call the private method
  const result = (Clis as any).getCommand(
    "1.0.0",
    "Test description",
    mockClazz
  );

  // Verify that the command has the default options
  expect(result).toBeInstanceOf(Command);
  // Ensure the default option is present and has "--configJson" in long
  const configJsonOption = result.options.find(
    (opt: any) => opt.long === "--configJson"
  );
  expect(configJsonOption).toBeDefined();
  expect(configJsonOption.long).toBe("--configJson");
});

test("should check typeof clazz.getCommand === 'function' correctly", () => {
  // Test with function
  const mockClazzWithFunction = {
    getCommand: jest.fn(),
  };

  // Test with non-function
  const mockClazzWithNonFunction = {
    getCommand: "not a function",
  };

  // Test with missing property
  const mockClazzWithoutGetCommand = {};

  // All should work without throwing errors
  expect(() =>
    (Clis as any).getCommand("1.0.0", "Test", mockClazzWithNonFunction)
  ).not.toThrow();
  expect(() =>
    (Clis as any).getCommand("1.0.0", "Test", mockClazzWithoutGetCommand)
  ).not.toThrow();

  // This should throw an error
  expect(() =>
    (Clis as any).getCommand("1.0.0", "Test", mockClazzWithFunction)
  ).toThrow();

  // Only the function should be called
  expect(mockClazzWithFunction.getCommand).toHaveBeenCalled();
});
