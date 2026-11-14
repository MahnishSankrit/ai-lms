// The header used at the top of every dashboard page, so they all look the same:
//
//   Title                                   [main button(s)]
//   short description (optional)
//   [filters / tabs] (optional, passed as children)
//
// Usage:
//   <PageHeader
//       title="My Exams"
//       description="Everything you've created."
//       actions={<Button>+ New exam</Button>}
//   >
//       <Tabs>...</Tabs>
//   </PageHeader>
//
// It also sets the standard gap below the header (24px), so pages don't
// each pick their own spacing.

export default function PageHeader({
    title,
    description,
    actions,
    children,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>

                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>

            {children}
        </div>
    );
}
