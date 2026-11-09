const LABELS: Record<string, string> = {
  CREATING: "Placing",
  PENDING: "Pending",
  PROCESSING: "Processing",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  PARTIAL: "Partial",
  CANCELED: "Canceled",
  FAILED: "Failed",
  NEEDS_REVIEW: "Being checked",
};

export function Status({ value }: { value: string }) {
  return <span className={`badge badge-${value.toLowerCase()}`}>{LABELS[value] ?? value}</span>;
}
