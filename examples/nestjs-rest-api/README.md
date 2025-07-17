# WP-Node NestJS REST API Example

This is a [NestJS](https://nestjs.com/) REST API application that demonstrates how to integrate WP-Node with the NestJS framework to create a modern, scalable API for WordPress data.

## What This Example Does

This NestJS application showcases:

- **Simple CRUD Operations**: Demonstrates Create, Read, Update, and Delete operations for WordPress post records (`wp_posts` table)
- **NestJS Integration**: Uses NestJS's powerful dependency injection and module system with WP-Node
- **Type-Safe API**: Full TypeScript integration with WordPress data structures
- **RESTful Endpoints**: Modern REST API design for WordPress post management

## Prerequisites

Before running this example, ensure you have:

1. **WordPress Database**: A running WordPress installation or database
2. **Node.js**: Version 22.0.0 or higher
3. **WP-Node Configuration**: Proper database credentials and configuration

For WordPress setup, see the [main WP-Node installation guide](https://github.com/rnaga/wp-node?tab=readme-ov-file#installation).

## Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Run the Development Server**:

   ```bash
   # development
   npm run start

   # watch mode (recommended for development)
   npm run start:dev

   # production mode
   npm run start:prod
   ```

## API Endpoints

The API will be available at `http://localhost:3000` with endpoints like:

- `POST /` - Create a new post
- `GET /:id` - Get a specific post
- `PUT /:id` - Update a specific post
- `DELETE /:id` - Delete a specific post

## Learn More

- [WP-Node Documentation](https://rnaga.github.io/wp-node/) - Learn about WP-Node features and API
- [NestJS Documentation](https://docs.nestjs.com) - Learn about NestJS framework
- [WordPress Database Schema](https://codex.wordpress.org/Database_Description) - Understanding WordPress data structure
