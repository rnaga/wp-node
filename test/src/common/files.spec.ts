import { updateEnvFile, copyFile } from "@rnaga/wp-node/common/files";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
fs.readFileSync = jest.fn();
fs.writeFileSync = jest.fn();
fs.cpFileSync = jest.fn();
fs.cpSync = jest.fn();

describe("updateEnvFile", () => {
  const originalEnvContent = "API_KEY=12345\nDB_HOST=localhost";
  const distDir = "./config";
  const environment = "test";

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    jest.clearAllMocks();
  });

  it("should update existing env variables and add new ones", () => {
    fs.readFileSync.mockReturnValue(originalEnvContent);
    const spyWrite = jest.spyOn(fs, "writeFileSync");

    updateEnvFile(
      { API_KEY: "67890", NEW_KEY: "value" },
      { environment, distDir }
    );

    expect(spyWrite).toHaveBeenCalledWith(
      `${distDir}/.env.${environment}`,
      "# API_KEY=12345\nDB_HOST=localhost\nAPI_KEY=67890\nNEW_KEY=value",
      "utf-8"
    );
  });

  it("should add a new variable when it does not exist in the file", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValue(originalEnvContent);
    const spyWrite = jest.spyOn(fs, "writeFileSync");

    updateEnvFile({ NEW_KEY: "value" }, { environment, distDir });

    expect(spyWrite).toHaveBeenCalledWith(
      `${distDir}/.env.${environment}`,
      "API_KEY=12345\nDB_HOST=localhost\nNEW_KEY=value",
      "utf-8"
    );
  });
});

describe("copyFile function", () => {
  const sourcePath = "path/to/source/file.txt";
  const destinationPath = "path/to/destination/file.txt";

  afterEach(() => {
    jest.clearAllMocks(); // Clears the state of all mocks
  });

  it("should copy the file successfully", () => {
    // Mock the implementation of fs.copyFile to call the callback without an error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fs.cpFileSync.mockImplementation();

    const result = copyFile(sourcePath, destinationPath);
    expect(result).toBe(true);
  });
});
