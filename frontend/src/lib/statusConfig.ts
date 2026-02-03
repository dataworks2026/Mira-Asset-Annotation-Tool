export const ANNOTATION_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "gray" | "yellow" | "green" }
> = {
  not_started: { label: "Not Started", variant: "gray" },
  in_progress: { label: "In Progress", variant: "yellow" },
  completed: { label: "Completed", variant: "green" },
};
