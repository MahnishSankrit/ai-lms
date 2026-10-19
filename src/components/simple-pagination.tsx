// "Previous · Page 2 of 5 · Next" buttons, shared by list pages.
// The page itself decides which rows to show; this only changes the page number.

import { Button } from "@/components/ui/button";

export default function SimplePagination({
    page,
    totalPages,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
}) {
    // Nothing to paginate if everything fits on one page.
    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="mt-4 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                Previous
            </Button>
            <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
                Next
            </Button>
        </div>
    );
}
