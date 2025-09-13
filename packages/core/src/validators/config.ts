import { z } from "zod";
import * as defaults from "../defaults";
import { convertYearToString } from "../common";
import { roles } from "./roles";

export const config = z.object({
  constants: z.object({
    ALLOW_UNFILTERED_UPLOADS: z.boolean().default(false),
    DISALLOW_UNFILTERED_HTML: z.boolean().default(true),
    DISALLOW_FILE_EDIT: z.boolean().default(true),
    LINK_USE_SSL: z.boolean().default(true),
    TRASHED_SUFFIX_TO_POST_NAME_FOR_POST: z.literal("__trashed"),
    ALLOW_FILESYSTEM_OPERATIONS: z.boolean().default(false),
    WP_DEFAULT_THEME: z.string().optional().default(convertYearToString()),
    WP_DB_VERSION: z.number().optional().default(57155),
    WPLANG: z.string().optional().default("en_US"),
    EMPTY_TRASH_DAYS: z.number().optional().default(30),
    MEDIA_TRASH: z.boolean().optional().default(false),
    WP_POST_REVISIONS: z.number().optional().default(30),
    WP_LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .optional()
      .default("info"),
  }),
  useApplicationPasswords: z.boolean().default(true),
  extensions: z.object({
    misc: z.array(z.string()),
    audio: z.array(z.string()),
    video: z.array(z.string()),
  }),
  timezoneOffset: z.string().optional().default("0"), // see defaults/options.ts
  staticAssetsPath: z.string().default("/tmp/assets"),
  options: z.object({
    protected: z.array(z.string()),
    defaults: z.array(z.string()),
  }),
  multisite: z.object({
    enabled: z.boolean(),
    defaultBlogId: z.number().int(),
    defaultSiteId: z.number().int(),
    defaultSitemetaKeys: z.array(z.string()),
    subdomainInstall: z.boolean().optional().default(false),
    subdirectoryReservedNames: z.array(z.string()),
    vhost: z.enum(["no", "yes"]).optional().default("no"),
    uploadBlogsDir: z.string().optional().default("wp-content/blogs.dir"), // UPLOADBLOGSDIR
  }),
  tableCharset: z.string().optional().default("utf8mb4"),
  tableCollate: z.string().optional().default("utf8mb4_unicode_520_ci"),
  tablePrefix: z.string().default("wp_"),
  database: z.object({
    client: z.string(),
    connection: z.object({
      host: z
        .string()
        .optional()
        .refine((v) => v && v.length > 0),
      port: z.number().int(),
      user: z.string().optional(),
      charset: z.string(),
      password: z.string().optional(),
      database: z
        .string()
        .optional()
        .refine((v) => v && v.length > 0),
    }),
  }),
  posts: z.object({
    typeNames: z.union([z.enum([...defaults.postTypes]), z.array(z.string())]),
    types: z.record(
      z.union([z.enum([...defaults.postTypes]), z.string()]),
      z.object({
        capabilityType: z.union([
          z.string(),
          z.tuple([z.string(), z.string()]),
        ]),
        supports: z.array(z.string()),
        mapMetaCap: z.boolean(),
        capabilities: z.record(z.string(), z.string()).optional(),
        hierarchical: z.boolean().optional(),
        deleteWithUser: z.boolean().optional().default(false),
        publiclyQueryable: z.boolean().optional().default(false),
        public: z.boolean().default(false),
        _builtin: z.boolean().optional().default(false),
      })
    ),
    statusNames: z.union([
      z.enum([...defaults.postStatuses]),
      z.array(z.string()),
    ]),
    statuses: z.record(
      z.union([z.enum([...defaults.postStatuses]), z.string()]),
      z.object({
        label: z.string(),
        public: z.boolean().optional(),
        protected: z.boolean().optional(),
        private: z.boolean().optional(),
        internal: z.boolean().optional(),
        _builtin: z.boolean().optional(),
      })
    ),
  }),
  taxonomy: z.object({
    names: z.union([z.enum([...defaults.taxonomyNames]), z.array(z.string())]),
    settings: z.record(
      z.union([z.enum([...defaults.taxonomyNames]), z.string()]),
      z.object({
        hierarchical: z.boolean(),
        objectType: z.string(),
        _builtin: z.boolean(),
        capabilities: z
          .record(
            z.enum([
              "manage_terms",
              "edit_terms",
              "delete_terms",
              "assign_terms",
            ]),
            z.string()
          )
          .optional(),
        showUi: z.boolean().optional().default(true),
      })
    ),
  }),
  roles,
});

export const configs = z.record(z.string(), config);
