import { Config } from "../config";

// register_initial_settings
export const defaultOptionKeys = [
  "siteurl",
  "home",
  "blogname",
  "blogdescription",
  "users_can_register",
  "admin_email",
  "start_of_week",
  "use_balanceTags",
  "use_smilies",
  "require_name_email",
  "comments_notify",
  "posts_per_rss",
  "rss_use_excerpt",
  "mailserver_url",
  "mailserver_login",
  "mailserver_pass",
  "mailserver_port",
  "default_category",
  "default_comment_status",
  "default_ping_status",
  "default_pingback_flag",
  "posts_per_page",
  "date_format",
  "time_format",
  "links_updated_date_format",
  "comment_moderation",
  "moderation_notify",
  "permalink_structure",
  "rewrite_rules",
  "hack_file",
  "blog_charset",
  "moderation_keys",
  "active_plugins",
  "category_base",
  "ping_sites",
  "comment_max_links",
  "gmt_offset",
  "default_email_category",
  "recently_edited",
  "template",
  "stylesheet",
  "comment_registration",
  "html_type",
  "use_trackback",
  "default_role",
  "db_version",
  "uploads_use_yearmonth_folders",
  "upload_path",
  "blog_public",
  "default_link_category",
  "show_on_front",
  "tag_base",
  "show_avatars",
  "avatar_rating",
  "upload_url_path",
  "thumbnail_size_w",
  "thumbnail_size_h",
  "thumbnail_crop",
  "medium_size_w",
  "medium_size_h",
  "avatar_default",
  "large_size_w",
  "large_size_h",
  "image_default_link_type",
  "image_default_size",
  "image_default_align",
  "close_comments_for_old_posts",
  "close_comments_days_old",
  "thread_comments",
  "thread_comments_depth",
  "page_comments",
  "comments_per_page",
  "default_comments_page",
  "comment_order",
  "sticky_posts",
  "widget_categories",
  "widget_text",
  "widget_rss",
  "uninstall_plugins",
  "timezone_string",
  "page_for_posts",
  "page_on_front",
  "default_post_format",
  "link_manager_enabled",
  "finished_splitting_shared_terms",
  "site_icon",
  "medium_large_size_w",
  "medium_large_size_h",
  "wp_page_for_privacy_policy",
  "show_comments_cookies_opt_in",
  "admin_email_lifespan",
  "disallowed_keys",
  "comment_previously_approved",
  "auto_plugin_theme_update_emails",
  "auto_update_core_dev",
  "auto_update_core_minor",
  "auto_update_core_major",
  "wp_force_deactivated_plugins",
  "wp_attachment_pages_enabled",
] as const;

export const options = (
  config: Config,
  options: {
    siteUrl: string;
  }
): Record<(typeof defaultOptionKeys)[number], any> => {
  const url = options.siteUrl;
  const timezoneOffset = config.config.timezoneOffset;
  const template = config.config.constants.WP_DEFAULT_THEME;
  const stylesheet = config.config.constants.WP_DEFAULT_THEME;
  const WPDBversion = config.config.constants.WP_DB_VERSION;

  let timezoneString: string = "";
  let gmtOffset: number = 0;

  /*
   * translators: default GMT offset or timezone string. Must be either a valid offset (-12 to 14)
   * or a valid timezone string (America/New_York). See https://www.php.net/manual/en/timezones.php
   * for all timezone strings currently supported by PHP.
   *
   * Important: When a previous timezone string, like `Europe/Kiev`, has been superseded by an
   * updated one, like `Europe/Kyiv`, as a rule of thumb, the **old** timezone name should be used
   * in the "translation" to allow for the default timezone setting to be PHP cross-version compatible,
   * as old timezone names will be recognized in new PHP versions, while new timezone names cannot
   * be recognized in old PHP versions.
   *
   * To verify which timezone strings are available in the _oldest_ PHP version supported, you can
   * use https://3v4l.org/6YQAt#v5.6.20 and replace the "BR" (Brazil) in the code line with the
   * country code for which you want to look up the supported timezone names.
   */
  const offsetOrTz: string = timezoneOffset; // Replace with your actual input string

  if (!isNaN(Number(offsetOrTz))) {
    gmtOffset = Number(offsetOrTz);
  } else if (
    offsetOrTz &&
    Intl.DateTimeFormat().resolvedOptions().timeZone === offsetOrTz
  ) {
    timezoneString = offsetOrTz;
  }

  return {
    siteurl: url,
    home: url,
    blogname: "My Site", // Assuming a direct translation without localization functions
    blogdescription: "",
    users_can_register: 0,
    admin_email: "you@example.com",
    // translators: Default start of the week. 0 = Sunday, 1 = Monday.
    start_of_week: "1", // Assuming a direct translation without localization functions
    use_balanceTags: 0,
    use_smilies: 1,
    require_name_email: 1,
    comments_notify: 1,
    posts_per_rss: 10,
    rss_use_excerpt: 0,
    mailserver_url: "mail.example.com",
    mailserver_login: "login@example.com",
    mailserver_pass: "password",
    mailserver_port: 110,
    default_category: 1,
    default_comment_status: "open",
    default_ping_status: "open",
    default_pingback_flag: 1,
    posts_per_page: 10,
    // translators: Default date format, see https://www.php.net/manual/datetime.format.php
    date_format: "F j, Y", // Assuming a direct translation without localization functions
    // translators: Default time format, see https://www.php.net/manual/datetime.format.php
    time_format: "g:i a", // Assuming a direct translation without localization functions
    // translators: Links last updated date format, see https://www.php.net/manual/datetime.format.php
    links_updated_date_format: "F j, Y g:i a", // Assuming a direct translation without localization functions
    comment_moderation: 0,
    moderation_notify: 1,
    permalink_structure: "",
    rewrite_rules: "",
    hack_file: 0,
    blog_charset: "UTF-8",
    moderation_keys: "",
    active_plugins: [],
    category_base: "",
    ping_sites: "http://rpc.pingomatic.com/",
    comment_max_links: 2,
    gmt_offset: gmtOffset,

    // 1.5.0
    default_email_category: 1,
    recently_edited: "",
    template: template,
    stylesheet: stylesheet,
    comment_registration: 0,
    html_type: "text/html",

    // 1.5.1
    use_trackback: 0,

    // 2.0.0
    default_role: "subscriber",
    db_version: WPDBversion,

    // 2.0.1
    uploads_use_yearmonth_folders: 1,
    upload_path: "",

    // 2.1.0
    blog_public: "1",
    default_link_category: 2,
    show_on_front: "posts",

    // 2.2.0
    tag_base: "",

    // 2.5.0
    show_avatars: "1",
    avatar_rating: "G",
    upload_url_path: "",
    thumbnail_size_w: 150,
    thumbnail_size_h: 150,
    thumbnail_crop: 1,
    medium_size_w: 300,
    medium_size_h: 300,

    // 2.6.0
    avatar_default: "mystery",

    // 2.7.0
    large_size_w: 1024,
    large_size_h: 1024,
    image_default_link_type: "none",
    image_default_size: "",
    image_default_align: "",
    close_comments_for_old_posts: 0,
    close_comments_days_old: 14,
    thread_comments: 1,
    thread_comments_depth: 5,
    page_comments: 0,
    comments_per_page: 50,
    default_comments_page: "newest",
    comment_order: "asc",
    sticky_posts: [],
    widget_categories: [],
    widget_text: [],
    widget_rss: [],
    uninstall_plugins: [],

    // 2.8.0
    timezone_string: timezoneString,

    // 3.0.0
    page_for_posts: 0,
    page_on_front: 0,

    // 3.1.0
    default_post_format: 0,

    // 3.5.0
    link_manager_enabled: 0,

    // 4.3.0
    finished_splitting_shared_terms: 1,
    site_icon: 0,

    // 4.4.0
    medium_large_size_w: 768,
    medium_large_size_h: 0,

    // 4.9.6
    wp_page_for_privacy_policy: 0,

    // 4.9.8
    show_comments_cookies_opt_in: 1,

    // 5.3.0
    admin_email_lifespan: Date.now() + 6 * 30 * 24 * 60 * 60 * 1000, // Converted to TypeScript equivalent for 6 months

    // 5.5.0
    disallowed_keys: "",
    comment_previously_approved: 1,
    auto_plugin_theme_update_emails: [],

    // 5.6.0
    auto_update_core_dev: "enabled",
    auto_update_core_minor: "enabled",
    // Default to enabled for new installs.
    // See https://core.trac.wordpress.org/ticket/51742.
    auto_update_core_major: "enabled",

    // 5.8.0
    wp_force_deactivated_plugins: [],

    // 6.4.0
    wp_attachment_pages_enabled: 0,
  };
};
