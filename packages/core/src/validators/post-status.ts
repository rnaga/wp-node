import { z } from "zod";

export const postStatus = z.record(
  z.string(),
  z.object({
    label: z.boolean().default(false),
    label_count: z.boolean().default(false),
    exclude_from_search: z.any().nullable().default(null),
    _builtin: z.boolean().default(false),
    public: z.any().nullable().default(null),
    internal: z.any().nullable().default(null),
    protected: z.any().nullable().default(null),
    private: z.any().nullable().default(null),
    publiclyQueryable: z.any().nullable().default(null),
    show_in_admin_status_list: z.any().nullable().default(null),
    show_in_admin_all_list: z.any().nullable().default(null),
    date_floating: z.any().nullable().default(null),
  })
);
