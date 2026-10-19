// The search box in the top bar.
// - Press Ctrl+K (Cmd+K on Mac) anywhere to jump into it.
// - Type 2+ letters: it asks /api/search and shows a dropdown with
//   matching classrooms, exams and results. Click one to open it.
// - Press Esc (or click away) to close the dropdown.

"use client"

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type SearchItem = {
    id: string;
    title: string;
    subtitle: string;
    href: string;
};

type SearchResults = {
    classrooms: SearchItem[];
    exams: SearchItem[];
    results: SearchItem[];
};

const EMPTY_RESULTS: SearchResults = { classrooms: [], exams: [], results: [] };

export default function GlobalSearch() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Ctrl+K / Cmd+K focuses the search box from anywhere on the page.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault(); // stop the browser's own Ctrl+K action
                inputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        // Remove the listener when the component goes away.
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Search 300ms after the user stops typing, not on every key press.
    useEffect(() => {
        if (query.trim().length < 2) {
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
                const data = await response.json();
                if (response.ok) {
                    setResults(data);
                }
            } catch (error) {
                console.error("Error searching:", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        // If the user types again before 300ms, cancel the old timer.
        return () => clearTimeout(timer);
    }, [query]);

    const closeDropdown = () => {
        setOpen(false);
        inputRef.current?.blur();
    };

    const total = results.classrooms.length + results.exams.length + results.results.length;
    const showDropdown = open && query.trim().length >= 2;

    return (
        <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                ref={inputRef}
                placeholder="Search classrooms, exams, results..."
                className="pr-14 pl-8"
                aria-label="Search"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                // Small delay so a click on a result still works before the list closes.
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") closeDropdown();
                }}
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
                Ctrl K
            </kbd>

            {showDropdown && (
                <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
                    {loading && <p className="px-2 py-3 text-sm text-muted-foreground">Searching...</p>}

                    {!loading && total === 0 && (
                        <p className="px-2 py-3 text-sm text-muted-foreground">No matches for &quot;{query}&quot;</p>
                    )}

                    {!loading && (
                        <>
                            <SearchSection title="Classrooms" items={results.classrooms} onPick={closeDropdown} />
                            <SearchSection title="Exams" items={results.exams} onPick={closeDropdown} />
                            <SearchSection title="Results" items={results.results} onPick={closeDropdown} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// One group in the dropdown, e.g. "Exams" with its matching items.
function SearchSection({
    title,
    items,
    onPick,
}: {
    title: string;
    items: SearchItem[];
    onPick: () => void;
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="py-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{title}</p>
            {items.map((item) => (
                <Link
                    key={title + item.id}
                    href={item.href}
                    onClick={onPick}
                    className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                    <span className="font-medium">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.subtitle}</span>
                </Link>
            ))}
        </div>
    );
}
