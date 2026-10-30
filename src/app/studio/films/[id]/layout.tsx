import { Suspense } from "react";
import { FilmTabs } from "./film-tabs";

/** Tabs for one film. Each tab page loads the film itself (and checks ownership). */
export default function FilmLayout({ children }: LayoutProps<"/studio/films/[id]">) {
  return (
    <div className="grid gap-6">
      <Suspense fallback={<div className="h-9 border-b border-line" />}>
        <FilmTabs />
      </Suspense>
      {children}
    </div>
  );
}
