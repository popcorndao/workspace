export default function Loading(): JSX.Element {
  return (
    <div className="md:flex md:items-center md:justify-between">
      <button type="button" className="bg-gray-100" disabled>
        <svg
          className="animate-spin h-5 w-5 mr-3"
          viewBox="0 0 24 24"
        ></svg>
        Loading Proposal...
      </button>
    </div>
  );
}
