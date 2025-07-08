import * as defaults from "../defaults";

export interface PostTypeExtend {}

export type PostType =
  | (typeof defaults.postTypes)[number]
  | keyof PostTypeExtend;

type PostTypeSupports =
  | "title"
  | "editor"
  | "author"
  | "thumbnail"
  | "excerpt"
  | "trackbacks"
  | "custom-fields"
  | "comments"
  | "revisions"
  | "post-formats"
  | "page-attributes";

export type PostTypeObject = Record<
  string,
  {
    supports: PostTypeSupports[];
    capabilityType: string | [string, string];
    deleteWithUser: boolean;
    mapMetaCap: boolean;
    capabilities?: Record<string, string>;
    hierarchical?: boolean;
    showInRest: boolean;
    publiclyQueryable?: boolean;
    _builtin: boolean;
    public: boolean;
  }
>;

export interface PostStatusExtend {}

export type PostStatus =
  | (typeof defaults.postStatuses)[number]
  | keyof PostStatusExtend;

export type PostStatusObject = Record<
  string,
  {
    label: string;
    public?: boolean;
    protected?: boolean;
    private?: boolean;
    internal?: boolean;
    _builtin: boolean;
  }
>;
