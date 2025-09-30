import type * as types from "../../types";
import * as defaults from "../../defaults";
import * as val from "../../validators";

//type DefineWPConfig = types.DeepPartial<Exclude<types.Config, "database">>;

export const defineWPConfig = (
  config: Required<{
    staticAssetsPath: types.Config["staticAssetsPath"];
    database: types.DatabaseConfig;
  }> &
    Partial<{
      postTypeObject: types.PostTypeObject;
      postStatusObject: types.PostStatusObject;
      taxonomies: types.TaxonomyRecord;
    }> &
    Partial<{
      logLevel: types.LogLevel;
    }> &
    types.JSONWPConfig
  //DefineWPConfig
): types.Config => {
  const postTypes = [
    ...defaults.postTypes,
    ...Object.keys(config.postTypeObject ?? {}),
  ];
  const postTypeObject = {
    ...defaults.postTypeObject,
    ...config.postTypeObject,
  };

  const postStatuses = [
    ...defaults.postStatuses,
    ...Object.keys(config.postStatusObject ?? {}),
  ];
  const postStatusObject = {
    ...defaults.postStatusObject,
    ...config.postStatusObject,
  };

  const taxonomyNames = [
    ...defaults.taxonomyNames,
    ...Object.keys(config.taxonomies ?? {}),
  ];
  const taxonomies = { ...defaults.taxonomies, ...config.taxonomies };

  return val.config.config.parse({
    constants: {
      ALLOW_UNFILTERED_UPLOADS: false,
      DISALLOW_FILE_EDIT: true,
      DISALLOW_UNFILTERED_HTML: true,
      TRASHED_SUFFIX_TO_POST_NAME_FOR_POST: "__trashed",
      LINK_USE_SSL: true,
      WP_LOG_LEVEL: config.logLevel ?? "info",
      ...config.constants,
    },
    extensions: {
      misc: defaults.miscExtensions,
      audio: defaults.audioExtensions,
      video: defaults.videoExtensions,
      ...config.extensions,
    },
    options: {
      // wp_protect_special_option
      protected: ["alloptions", "notoptions"],
      defaults: defaults.defaultOptionKeys,
      ...config.options,
    },
    multisite: {
      enabled: false,
      defaultBlogId: 0,
      defaultSiteId: 0,
      defaultSitemetaKeys: defaults.defaultSitemetaKeys,
      subdirectoryReservedNames: defaults.subdirectoryReservedNames,
      ...config.multisite,
    },
    tablePrefix: "wp_",
    posts: {
      typeNames: postTypes,
      types: postTypeObject,
      statusNames: postStatuses,
      statuses: postStatusObject,
    },
    taxonomy: {
      names: taxonomyNames,
      settings: taxonomies,
    },
    roles: defaults.roles,
    database: config.database,
    staticAssetsPath: config.staticAssetsPath,
  });
};
