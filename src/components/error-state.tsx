// A reusable "something went wrong" block with a retry button.

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-12 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm text-destructive">{message}</p>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    Try again
                </Button>
            )}
        </div>
    );
}
