import * as fs from "fs";
import * as path from "path";

export const mkdir = (directory: string) => {
  // Ensure the directory exists
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

export const fileExists = (directory: string) => {
  return fs.existsSync(directory);
};

export const readFile = (filePath: string): string | undefined => {
  return !fileExists(filePath) ? undefined : fs.readFileSync(filePath, "utf8");
};

export const copyFile = (
  sourcePath: string,
  destinationPath: string,
  options?: fs.CopySyncOptions
) => {
  if (options?.recursive) {
    fs.cpSync(sourcePath, destinationPath, options);
  } else {
    fs.copyFileSync(sourcePath, destinationPath);
  }
  return true;
};

export const updateEnvFile = (
  envs: Record<string, any>,
  options: { environment?: string; distDir?: string }
) => {
  const { environment, distDir = "." } = options;
  const envPath = `${distDir}/.env${environment ? `.${environment}` : ""}`;

  try {
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, "", "utf-8");
    }

    // Read the current env file content
    const currentContent = fs.readFileSync(envPath, "utf-8");
    const lines = currentContent.split("\n");
    const existingKeys = new Set<string>();

    // Build a map of existing keys
    lines.forEach((line) => {
      const match = line.match(/^\s*([^#][^=]*?)\s*=/);
      if (match) {
        existingKeys.add(match[1].trim());
      }
    });

    let updatedContent = currentContent;

    // Loop through new envs and update the file content
    for (const [key, value] of Object.entries(envs)) {
      const envString = `${key}=${value}`;

      if (existingKeys.has(key)) {
        // Comment out existing key
        updatedContent = updatedContent.replace(
          new RegExp(`^\\s*(${key}\\s*=\\s*[^\\n]*)`, "gm"),
          `# $1`
        );
      }

      // Add new key-value pair
      updatedContent += `\n${envString}`;
    }

    // Write the updated content back to the file
    fs.writeFileSync(envPath, updatedContent, "utf-8");

    console.log(`Environment variables in ${envPath} updated successfully.`);
  } catch (err) {
    console.error("Failed to update environment variables:", err);
  }
};

export const readJsonFile = <
  T extends Record<string, any> = Record<string, any>
>(
  filePath: string
): T | undefined => {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(data);
    return json;
  } catch (e) {
    return undefined;
  }
};

export const readJsonFiles = <
  T extends Record<string, any> = Record<string, any>
>(
  directoryPath: string
): T | undefined => {
  let mergedData: T | undefined = undefined;

  // Read directory and process each file
  try {
    fs.readdirSync(directoryPath).forEach((file) => {
      if (path.extname(file) === ".json") {
        // Construct full file path
        const filePath = path.join(directoryPath, file);

        // Read and parse JSON file
        try {
          // const data = fs.readFileSync(filePath, "utf8");
          // const json = JSON.parse(data);
          const json = readJsonFile<any>(filePath);

          // Merge jsonData into mergedData
          mergedData = { ...mergedData, ...json };
        } catch (error) {
          console.info(`Error reading or parsing ${file}:`, error);
        }
      }
    });
  } catch (e) {
    console.info(`No JSON files found in ${directoryPath}`);
  }

  return mergedData;
};

export const writeFile = (filePath: string, content: string) => {
  fs.writeFileSync(filePath, content);
  console.log(`${filePath} created successfully.`);
};

// Write ts declaration file
export const writeDFile = (
  directoryPrefix: string,
  filename: string,
  content: string
) => {
  fs.writeFileSync(`${directoryPrefix}${filename}`, `export {}\n${content}`);

  // Update index.d.ts if the code `export ${filename}` is not present in index.d.ts
  const indexFile = `${directoryPrefix}/index.d.ts`;

  const targetExport = `export * from "./${filename.slice(0, -5)}";`;
  const indexContent = fs.existsSync(indexFile)
    ? fs.readFileSync(indexFile, "utf-8")
    : "";
  if (!indexContent.includes(targetExport)) {
    fs.writeFileSync(indexFile, `${indexContent}\n${targetExport}`);
  }

  console.log(`${directoryPrefix}${filename} created successfully.`);
};
