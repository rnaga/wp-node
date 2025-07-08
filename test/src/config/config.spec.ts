import { taxonomyConfig } from "@rnaga/wp-node-cli/configs/taxonomy.config";
import { postTypeConfig } from "@rnaga/wp-node-cli/configs/post-type.config";
import { postStatusConfig } from "@rnaga/wp-node-cli/configs/post-status.config";

jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock("enquirer", () => ({
  prompt: jest.fn(),
}));

// Helper to reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

test("taxonomy", async () => {
  const taxonomyInput = {
    name: "test_taxonomy",
    hierarchical: true,
    directory: "wp-config/taxonomies",
  };

  const { tsContent, jsonContent } = await taxonomyConfig().generate(
    taxonomyInput
  );

  expect(tsContent).toBeDefined();
  expect(jsonContent).toBeDefined();
});

test("postTypeObject", async () => {
  const postTypeObjectInput = {
    name: "test_post_type",
    directory: "wp-config/post-types",
  };

  const { tsContent, jsonContent } = await postTypeConfig().generate(
    postTypeObjectInput
  );

  expect(tsContent).toBeDefined();
  expect(jsonContent).toBeDefined();
});

test("postStatusObject", async () => {
  const postStatusObjectInput = {
    name: "test_post_status",
    directory: "wp-config/post-types",
  };

  const { tsContent, jsonContent } = await postStatusConfig().generate(
    postStatusObjectInput
  );

  expect(tsContent).toBeDefined();
  expect(jsonContent).toBeDefined();
});
