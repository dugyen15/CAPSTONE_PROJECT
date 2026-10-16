// Colours and labels for order statuses (these match the status values the backend sends).
export const statusStyles = {
  waiting: { label: "Waiting", className: "bg-waiting/15 text-waiting" },
  preparing: { label: "Preparing", className: "bg-preparing/15 text-preparing" },
  ready: { label: "Ready", className: "bg-ready/15 text-ready" },
  delayed: { label: "Delayed", className: "bg-delayed/15 text-delayed" },
  completed: { label: "Completed", className: "bg-ready/15 text-ready" },
  cancelled: { label: "Cancelled", className: "bg-delayed/15 text-delayed" },
};
