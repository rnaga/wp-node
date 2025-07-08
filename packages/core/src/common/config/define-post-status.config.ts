import type * as types from "../../types";
import { readJsonFiles } from "../files";

export const definePostStatus = (
  args: Partial<Record<string, types.ConfigPostStatusObject>>
) => {
  let postStatusObject: types.PostStatusObject = {};

  for (const [name, settings] of Object.entries(args)) {
    postStatusObject = {
      ...postStatusObject,
      [name]: {
        label: name,
        public: settings?.public ?? true,
        private: settings?.private ?? false,
        internal: settings?.internal ?? true,
        _builtin: false,
      },
    };
  }

  return postStatusObject;
};

export const definePostStatusFromDirectory = (directory: string) => {
  const json =
    readJsonFiles<Record<types.PostStatus, types.ConfigPostStatusObject>>(
      directory
    );
  return json ? definePostStatus(json) : undefined;
};
