import type * as types from "../../types";
import { readJsonFiles } from "../files";

export const definePostType = (
  args: Partial<Record<string, types.ConfigPostTypeObject>>
) => {
  let postTypeObject: types.PostTypeObject = {};

  for (const [name, settings] of Object.entries(args)) {
    postTypeObject = {
      ...postTypeObject,
      [name]: {
        capabilityType: settings?.capabilityType ?? "post",
        supports: (settings?.supports ?? [
          "title",
          "editor",
          "author",
          "thumbnail",
          "excerpt",
          "trackbacks",
          "custom-fields",
          "comments",
          "revisions",
          "post-formats",
        ]) as types.PostTypeSupports[],
        public: settings?.public ?? true,
        deleteWithUser: settings?.deleteWithUser ?? true,
        mapMetaCap: settings?.mapMetaCap ?? true,
        showInRest: settings?.showInRest ?? true,
        _builtin: false,
      },
    };
  }

  return postTypeObject;
};

export const definePostTypeFromDirectory = (directory: string) => {
  const json =
    readJsonFiles<Record<types.PostType, types.ConfigPostTypeObject>>(
      directory
    );
  return json ? definePostType(json) : undefined;
};
