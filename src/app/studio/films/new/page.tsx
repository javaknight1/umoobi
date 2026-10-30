import type { Metadata } from "next";
import { NewFilmForm } from "./new-film-form";

export const metadata: Metadata = { title: "Add a film · Studio", robots: { index: false } };

export default function NewFilmPage() {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <h1 className="font-display text-4xl">Add a film</h1>
      <p className="text-muted">
        Start with the basics. You&apos;ll upload the master, trailers and subtitles next. New accounts can add 3
        features (40 minutes or more) and 12 shorts a year.
      </p>
      <NewFilmForm />
    </div>
  );
}
