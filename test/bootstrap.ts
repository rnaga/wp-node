import Application from "@rnaga/wp-node/application";
import * as helpers from "./helpers";

jest.setTimeout(30000);
jest.mock<any>("fs");

Application.configs = helpers.getBaseAppConfig();

afterAll(() => {
  Application.terminate();
});
