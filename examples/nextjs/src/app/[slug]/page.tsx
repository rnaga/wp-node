import Application from "@rnaga/wp-node/application";

export default async function Blog({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const wp = await Application.getContext();

  await wp.current.assumeUser(1);

  // Await params before using its properties
  const { slug } = await params;

  // Check if the slug is number or string
  const slugOrId = !isNaN(Number(slug)) ? parseInt(slug) : slug;

  // Fetch the post by slug
  const { data: post } = await wp.utils.crud.post.get(slugOrId ?? 1);

  if (!post) {
    return (
      <div className="font-sans min-h-screen bg-gray-100 p-8">
        <p className="text-center text-gray-500">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-gray-100 p-8">
      <article className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {post.post_title}
          </h1>
          <p className="text-sm text-gray-500">
            Published on{" "}
            {post.post_date
              ? new Date(post.post_date).toLocaleDateString()
              : "Unknown date"}{" "}
            by {post.author.display_name}
          </p>
        </header>
        <section className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: post.post_content }} />
        </section>
        <footer className="mt-6 border-t pt-4 text-sm text-gray-500">
          <p>
            Categories:{" "}
            {post.categories?.map((cat) => cat.name).join(", ") || "None"}
          </p>
          <p>Tags: {post.tags?.map((tag) => tag.name).join(", ") || "None"}</p>
        </footer>
      </article>
    </div>
  );
}
