# WP-Node

## 📘 Documentation

👉 **[View Full Documentation at rnaga.github.io/wp-node →](https://rnaga.github.io/wp-node/)**

## What is WP-Node?

WP-Node is a Node.js project written in TypeScript that mirrors the WordPress database schema and functionality. It enables developers to build scalable, modern backends on top of existing WordPress data.

Key benefits include:

- No need to run WordPress PHP
- Type-safe interaction with WordPress tables (`posts`, `users`, `terms`, etc.)
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

## Limitations

**WP-Node Core** is designed specifically to interact with the WordPress database. It does not support traditional WordPress features such as:

- Themes and appearance settings, including updating styling
- WordPress Template rendering or theming APIs
- WordPress plugins

Its scope is intentionally limited to providing a type-safe, programmatic interface to WordPress data — not replicating the full behavior of the WordPress runtime.

## Requirements

- **Node.js** `>=22.0.0`
- **MySQL** or **MariaDB**
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

## Configuration

Create your config:

```sh
npx @rnaga/wp-node-cli -- config
```

It will prompt for database settings and generate:

```
_wp/
  └── config/wp.json
.env
```

You can configure additional settings such as:

- `staticAssetsPath`: Path for media references
- `multisite.enabled`: Enable or disable multisite support
- Custom post types, taxonomies, statuses

## CLI Usage

Install CLI tools:

```sh
npm i -S @rnaga/wp-node-cli -- -h
```

Basic command to list posts:

```sh
npx @rnaga/wp-node-cli -- post list
```

Develop your own commands using decorators:

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

## Contributing

Feel free to fork, open issues, or suggest improvements. This project is in active development.

---

## License

MIT License.
