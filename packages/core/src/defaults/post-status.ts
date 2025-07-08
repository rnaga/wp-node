// WordPress/wp-includes/post.php
// create_initial_post_types
// register_post_status

export const postStatuses = [
  "publish",
  "future",
  "draft",
  "pending",
  "private",
  "trash",
  "inherit",
  "auto-draft",
  "request-pending",
  "request-confirmed",
  "request-failed",
  "request-completed",
] as const;

// register_post_status
export const postStatusObject: Record<
  (typeof postStatuses)[number],
  {
    label: string;
    public?: boolean;
    protected?: boolean;
    private?: boolean;
    internal?: boolean;
    _builtin: boolean;
  }
> = {
  publish: {
    label: "Published",
    public: true,
    _builtin: true,
  },
  future: {
    label: "Scheduled",
    protected: true,
    _builtin: true,
  },
  draft: {
    label: "Draft",
    protected: true,
    _builtin: true,
  },
  pending: {
    label: "Pending",
    protected: true,
    _builtin: true,
  },
  private: {
    label: "Private",
    private: true,
    _builtin: true,
  },
  trash: {
    label: "Trach",
    internal: true,
    _builtin: true,
  },
  "auto-draft": {
    label: "auto-draft",
    internal: true,
    _builtin: true,
  },
  inherit: {
    label: "inherid",
    internal: true,
    _builtin: true,
  },
  "request-pending": {
    label: "Pending",
    internal: true,
    _builtin: true,
  },
  "request-confirmed": {
    label: "Confirmed",
    internal: true,
    _builtin: true,
  },
  "request-failed": {
    label: "Failed",
    internal: true,
    _builtin: true,
  },
  "request-completed": {
    label: "Completed",
    internal: true,
    _builtin: true,
  },
};
