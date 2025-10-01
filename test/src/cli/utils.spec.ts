import * as fs from "fs";

// Mock enquirer's AutoComplete
jest.mock("enquirer/lib/prompts/autocomplete", () => {
  return jest.fn().mockImplementation(function (this: any, config: any) {
    this.name = config.name;
    this.message = config.message;
    this.input = "";
    this.cursor = 0;
    this.focused = null;
    this.choices = config.choices;
    this.render = jest.fn().mockResolvedValue(undefined);
    this.submit = jest.fn();
    this.run = (global as any).__mockAutoCompleteRun || jest.fn();
    return this;
  });
});

import { promptForFilePath } from "@rnaga/wp-node-cli/utils";

test("promptForFilePath returns valid file path with extension option", async () => {
  const validPath = "/mock/valid/file.crt";

  jest.spyOn(fs, "existsSync").mockReturnValue(true);
  jest
    .spyOn(fs, "readdirSync")
    .mockReturnValue(["file.crt", "file.txt"] as any);
  jest
    .spyOn(fs, "statSync")
    .mockReturnValue({ isDirectory: () => false } as any);

  const mockRun = jest.fn().mockResolvedValue(validPath);
  (global as any).__mockAutoCompleteRun = mockRun;

  const result = await promptForFilePath("testField", "Select a file", true, {
    extensions: [".crt", ".pem"],
  });

  expect(result).toBe(validPath);
  expect(mockRun).toHaveBeenCalled();
});

test("promptForFilePath returns empty string when not required", async () => {
  jest.spyOn(fs, "existsSync").mockReturnValue(true);

  const mockRun = jest.fn().mockResolvedValue("");
  (global as any).__mockAutoCompleteRun = mockRun;

  const result = await promptForFilePath("testField", "Select a file", false);

  expect(result).toBe("");
  expect(mockRun).toHaveBeenCalled();
});
