"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="font-bricolage text-3xl font-medium tracking-[-0.03em]">
        Something went wrong
      </h1>
      <p className="text-carbon-600 mt-4 leading-7">
        We could not load this page. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-12 rounded-xl bg-black text-sm font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}
