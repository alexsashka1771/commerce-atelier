import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>
        This page has
        <br />
        <em>wandered off.</em>
      </h1>
      <p>There are still good things to find.</p>
      <Link className="button" href="/collections">
        Back to the collection ↗
      </Link>
    </div>
  );
}
