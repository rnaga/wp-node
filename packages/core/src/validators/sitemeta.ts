import { z } from "zod";

export const sitemeta = z.object({
  site_name: z.string(),
  admin_email: z.string().email(),
  admin_user_id: z.number(), // Assuming 'siteUserId' is a number
  registration: z.string(),
  upload_filetypes: z.string(), // Joined string of file types
  blog_upload_space: z.number(),
  fileupload_maxk: z.number(),
  site_admins: z.array(z.string()), // Assuming 'siteAdmins' is an array of strings
  allowedthemes: z.record(z.literal(true)), // Object with keys and boolean 'true' as value
  illegal_names: z.array(z.string()), // Array of strings
  wpmu_upgrade_site: z.number(), // Assuming 'WP_DB_VERSION' is a number
  welcome_email: z.string(),
  first_post: z.string(),
  siteurl: z.string().url(),
  add_new_users: z.number().min(0).max(1), // 0 or 1
  upload_space_check_disabled: z.number().min(0).max(1), // 0 or 1
  subdomain_install: z.string(), // Assuming it's a string
  ms_files_rewriting: z.number().min(0).max(1), // 0 or 1
  user_count: z.number(), // Assuming 'user_count' is a number
  initial_db_version: z.number(), // Assuming 'initial_db_version' is a number
  active_sitewide_plugins: z.array(z.any()), // Adjust according to the actual type
  WPLANG: z.string(), // Assuming 'WPLANG' is a string
  registrationnotification: z.enum(["yes", "no"]),
  menu_items: z.array(z.string()), // Assuming it's an array of strings
  first_page: z.string(),
  first_comment: z.string(),
  first_comment_url: z.string().url(), // Assuming it's a valid URL
  first_comment_author: z.string(),
  welcome_user_email: z.string().email(), // Assuming it's a valid email
  limited_email_domains: z.array(z.string().email()), // Assuming it's an array of valid email domains
  banned_email_domains: z.array(z.string().email()), // Assuming it's an array of valid email domains
  new_admin_email: z.string().email(), // Assuming it's a valid email
  first_comment_email: z.string().email(), // Assuming it's a valid email
});
