import Link from "next/link";
import "_wp/settings";
import Application from "@rnaga/wp-node/application";

export default async function Home() {
  const wp = await Application.getContext();

  await wp.current.assumeUser(1);

  const postsResponse = await wp.utils.crud.post.list(
    { status: ["publish"] },
    {
      postTypes: ["post"],
    }
  );
  const posts = postsResponse.data || [];

  return (
    <div className="font-sans min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Blog Posts</h1>
        <ul className="space-y-6">
          {posts.map(
            (post: {
              post_name?: string;
              post_title?: string;
              post_excerpt?: string;
              post_date?: string;
              ID: number;
            }) => (
              <li key={post.ID} className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  <Link href={`${post.ID}`} className="hover:underline">
                    {post.post_title || "Untitled Post"}{" "}
                  </Link>
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Published on{" "}
                  {post.post_date
                    ? new Date(post.post_date).toLocaleDateString()
                    : "Unknown date"}
                </p>
                <p className="text-gray-700">
                  {post.post_excerpt || "No excerpt available."}
                </p>
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  );
}
