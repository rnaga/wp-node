# WP-Node Next.js Blog Example

This is a [Next.js](https://nextjs.org) blog application that demonstrates how to integrate WP-Node with a modern React framework to create a WordPress-powered blog interface.

## What This Example Does

This Next.js application showcases:

- **WordPress Data Integration**: Fetches posts directly from a WordPress database using WP-Node
- **Blog Listing Page**: Displays all published posts with titles, excerpts, and publication dates
- **Dynamic Post Pages**: Individual post pages accessible via slug-based routing (`/[slug]`)
- **Server-Side Rendering**: Renders WordPress content on the server for better SEO and performance
- **Modern UI**: Clean, responsive design using Tailwind CSS
- **Type Safety**: Full TypeScript integration with WordPress data structures

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
   npm run dev
   ```

3. **View the Application**:
   Open [http://localhost:3000](http://localhost:3000) to see:
   - **Home Page**: List of all blog posts
   - **Individual Posts**: Navigate to `/[post-slug]` to view specific posts

## Project Structure

- `src/app/page.tsx` - Blog listing page showing all posts
- `src/app/[slug]/page.tsx` - Dynamic post page for individual articles
- `_wp/` - WP-Node configuration directory

## Key Features Demonstrated

### WordPress Data Fetching

```typescript
const wp = await Application.getContext();
const posts = await wp.utils.crud.post.list({});
```

### Dynamic Routing

The `[slug]` route automatically handles WordPress post slugs, allowing URLs like:

- `/hello-world` - Displays the "Hello world!" post
- `/my-first-post` - Displays a post with slug "my-first-post"

It also accepts numeric Post IDs (corresponding to `wp_posts.ID`) such as:

- `/1` - Displays the post with ID 1
- `/42` - Displays the post with ID 42

### Type-Safe WordPress Integration

All WordPress data is properly typed, providing IntelliSense and compile-time error checking when working with post properties like `post_title`, `post_content`, `post_date`, etc.

## Customization

You can extend this example by:

- Adding pagination to the post listing
- Implementing category and tag filtering
- Adding a search functionality
- Creating custom post type support
- Integrating WordPress user authentication

## Learn More

- [WP-Node Documentation](https://rnaga.github.io/wp-node/) - Learn about WP-Node features and API
