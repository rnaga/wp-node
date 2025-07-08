# WP-Node

## 📘 Documentation

👉 **[View Full Documentation at rnaga.github.io/wp-node →](https://rnaga.github.io/wp-node/)**

## What is WP-Node?

WP-Node is a Node.js project written in TypeScript that mirrors the WordPress database schema and functionality. It enables developers to build scalable, modern backends on top of existing WordPress data.

Key benefits include:

- No need to run WordPress PHP
- Type-safe interaction with WordPress tables (`posts`, `users`, `terms`, `comments`, `etc.`)
- Utility classes for querying posts, terms, users, comments, and metadata
- Supports both Single Site and Multi Site WordPress setups
- CLI tools to seed databases and run custom commands
- Clean architecture with Dependency Injection and decorators

## Features

- **TypeScript-first**: Fully typed interfaces and schema validation using [Zod](https://zod.dev/)
- **[Knex.js](https://knexjs.org/) Integration**: Query builder with SQL injection prevention and fluent chaining
- **Dependency Injection**: Built-in decorator-based system for injecting services like `PostUtil`, `TermUtil`, and `MetaUtil`, enabling clean separation of concerns and easier testing
- **Hooks API**: Inspired by WordPress hooks (`do_action`, `apply_filters`), and supports implementation as async-compatible functions

## Use Cases

WP-Node is ideal for scenarios where you need direct access to WordPress database without relying on the full WordPress stack. Example use cases include:

- **Running background jobs or cron tasks** that update WordPress records — without needing a full WordPress installation
- **Building a lightweight REST API** using Node.js and TypeScript that interacts with WordPress data
- **Debugging or inspecting database records** from a modern TypeScript environment
- **Creating a web app** (e.g., using Next.js) that needs to pull or push data from a WordPress database, without relying on PHP codebase

## Requirements

- **Node.js** `>=22.0.0`
- **MySQL** or **MariaDB**
- **nvm**: Make sure you have [`nvm`](https://github.com/nvm-sh/nvm) command installed on your local machine.
- Optional: Docker for local WordPress database setup

## Installation

To spin up a sample environment with WordPress and database in Docker:

```sh
docker network inspect wpnet >/dev/null 2>&1 || docker network create wpnet && \
docker run -d --name wpdb --network wpnet -p 33306:3306 \
  -e MYSQL_ROOT_PASSWORD=example \
  -e MYSQL_DATABASE=wordpress \
  -e MYSQL_USER=wp \
  -e MYSQL_PASSWORD=wp \
  mariadb && \
docker run -d --name wp --network wpnet -p 8080:80 \
  -e WORDPRESS_DB_HOST=wpdb:3306 \
  -e WORDPRESS_DB_USER=wp \
  -e WORDPRESS_DB_PASSWORD=wp \
  -e WORDPRESS_DB_NAME=wordpress \
  wordpress
```

Visit http://localhost:8080 in your browser to complete the WordPress setup.

### Initialize WP-Node Project

To get started, create a new folder for your project. This folder will serve as the root directory for your WP-Node application.

```sh
mkdir wp-node
cd wp-node
```

Then, run the command to initialize the project and follow the prompts:

```sh
npx @rnaga/wp-node-cli -- init
```

```sh
✔ Enter your database hostname: · localhost
✔ Enter your database port: · 33306
✔ Enter your database username: · wp
✔ Enter your database password: · **
✔ Enter your database name: · wordpress
✔ Is it a multi-site? · No
✔ Enter your static assets path: · public
```

### Project Structure

After initialization, your project will look like this:

```
./
├── _wp
│   ├── config
│   │   ├── index.d.ts
│   │   └── wp.json
│   └── settings.ts
├── .env
├── index.ts
├── package-lock.json
├── package.json
└── tsconfig.json
```

**Key files**

- `_wp/config/wp.json`: Holds configuration for WP-Node such as public path and multisite info. This file is imported by settings.ts.
- `_wp/settings.ts`: Initializes the WP-Node Context, including config, database access and hooks.
- `index.ts`: The main entry point for your WP-Node app. A basic sample is provided.
- `.env`: Stores sensitive environment variables, including your database credentials and other configuration values required at runtime.

### Run the App

Once the config is initialized, run the app using:

```sh
mvn use 22
npx ts-node ./index.ts
```

If everything is working correctly, you’ll see SQL output like:

```sh
select * from `wp_posts` as `posts_5` where `posts_5`.`ID` = 1
[
  {
    ID: 1,
    post_author: 1,
    post_title: 'Hello world!',
    ...
  }
]
```

## CLI

WP-Node CLI provides a convenient way to interact with WordPress data without writing any code.

To query a post (e.g. ID = 1), run:

```sh
npx @rnaga/wp-node-cli -- post get 1 -Z table -F ID,post_title,post_type

┌────────────┬────────────────┐
│ (index)    │ Values         │
├────────────┼────────────────┤
│ ID         │ 1              │
│ post_title │ 'Hello world!' │
│ post_type  │ 'post'         │
└────────────┴────────────────┘
```

### Listing Available Commands

To view all available CLI commands, run:

```
npx @rnaga/wp-node-cli -- -h
```

output:

```sh
Usage: <command> <subcommand> [options]

Commands:
   blog             Blog commands
   comment          Comment commands
   config           Generate WP config files
   init             Initialize WP with Node. (Generate wp.json and install dependencies)
   install          Initialize a new blog and create a user
   meta             Meta commands (post, comment, blog, term, user, site)
   option           Options commands
   post             Post commands
   repl             Start a REPL
   role             Role commands
   site             Site commands
   term             Term commands
   user             User commands
```

### Develop your CLI using decorators:

**Example**:

```ts
@command("page", { description: "Page commands" })
export class PageCli extends Cli {
  @subcommand("list", { description: "List pages" })
  async list() {
    const context = await Application.getContext();
    const posts = await context.postUtil.findByType("page");
    console.log(posts);
  }
}
```

## Dependency Injection

WP-Node uses a custom `@component()` decorator to support DI scopes:

- **Singleton**: One instance for entire app
- **Context**: One instance per context (e.g. HTTP request)
- **Transient**: New instance every time

```ts
@component({ scope: Scope.Transient })
export class Post {
  constructor(
    public meta: Meta,
    private logger: Logger,
    private queryUtil: QueryUtil,
    ...
  ) {}
}
```

## Hooks System

- **Filter**: Modify data in chainable handlers (similar to `apply_filters`)
- **Action**: Fire off side effects (`do_action` equivalent)

## Limitations

**WP-Node Core** is designed specifically to interact with the WordPress database. It does not support traditional WordPress features such as:

- Themes and appearance settings, including updating styling
- WordPress Template rendering or theming APIs
- WordPress plugins

Its scope is intentionally limited to providing a type-safe, programmatic interface to WordPress data — not replicating the full behavior of the WordPress runtime.

## Contributing

Feel free to fork, open issues, or suggest improvements. This project is in active development.

---

## License

MIT License.
