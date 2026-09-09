// Mock data standing in for the Node.js/Express + PostgreSQL API described
// in the proposal (section 5.1). Once the backend is ready, replace the
// arrays below with fetch() calls to the real endpoints — the component
// code that renders them won't need to change much.

export const categories = ["All", "Meals", "Snacks", "Beverages"];

export const menuItems = [
  {
    id: "m1",
    name: "Ema Datshi Rice Bowl",
    category: "Meals",
    price: 85,
    prepTime: "12 min",
    available: true,
    description: "Chili cheese stew served over steamed rice.",
  },
  {
    id: "m2",
    name: "Chicken Momo (10 pcs)",
    category: "Meals",
    price: 100,
    prepTime: "15 min",
    available: true,
    description: "Steamed dumplings with house chili sauce.",
  },
  {
    id: "m3",
    name: "Vegetable Thukpa",
    category: "Meals",
    price: 75,
    prepTime: "10 min",
    available: true,
    description: "Warm noodle soup with seasonal vegetables.",
  },
  {
    id: "m4",
    name: "Samosa (2 pcs)",
    category: "Snacks",
    price: 30,
    prepTime: "5 min",
    available: true,
    description: "Crisp pastry with spiced potato filling.",
  },
  {
    id: "m5",
    name: "Cheese Sandwich",
    category: "Snacks",
    price: 45,
    prepTime: "6 min",
    available: false,
    description: "Grilled sandwich with local cheese.",
  },
  {
    id: "m6",
    name: "Butter Tea",
    category: "Beverages",
    price: 20,
    prepTime: "3 min",
    available: true,
    description: "Traditional salted butter tea, served hot.",
  },
  {
    id: "m7",
    name: "Milk Tea",
    category: "Beverages",
    price: 15,
    prepTime: "3 min",
    available: true,
    description: "Sweet milk tea, served hot or iced.",
  },
];

export const tables = [
  { id: "t1", label: "Table 1", seats: 2, nearWindow: true },
  { id: "t2", label: "Table 2", seats: 4, nearWindow: false },
  { id: "t3", label: "Table 3", seats: 4, nearWindow: false },
  { id: "t4", label: "Table 4", seats: 6, nearWindow: false },
  { id: "t5", label: "Table 5", seats: 2, nearWindow: true },
];

export const timeSlots = [
  "11:30 AM", "11:45 AM", "12:00 PM", "12:15 PM",
  "12:30 PM", "12:45 PM", "1:00 PM", "1:15 PM",
];

// Flat surcharge applied when a customer chooses takeaway instead of dine-in.
export const TAKEAWAY_FEE = 10;

// A customer's live order/queue state — used on the Order Status page.
export const sampleOrder = {
  id: "ORD-0142",
  queueNumber: 7,
  aheadInQueue: 3,
  status: "preparing", // waiting | preparing | ready | delayed
  orderType: "dine-in", // dine-in | takeaway
  table: "Table 3",
  time: "12:15 PM",
  items: [
    { name: "Chicken Momo (10 pcs)", qty: 1 },
    { name: "Milk Tea", qty: 2 },
  ],
  total: 130,
};

// Bookings/orders queue as staff would see it on the dashboard.
export const staffQueue = [
  { id: "ORD-0139", customer: "Pema Choden", table: "Table 1", orderType: "dine-in", items: 2, status: "ready", time: "12:00 PM" },
  { id: "ORD-0140", customer: "Tashi Norbu", table: "Table 4", orderType: "dine-in", items: 3, status: "preparing", time: "12:05 PM" },
  { id: "ORD-0141", customer: "Dechen Lham", table: "Table 2", orderType: "dine-in", items: 1, status: "waiting", time: "12:10 PM" },
  { id: "ORD-0142", customer: "Karma Wangdi", table: "Table 3", orderType: "dine-in", items: 2, status: "preparing", time: "12:15 PM" },
  { id: "ORD-0143", customer: "Sonam Yangki", table: "—", orderType: "takeaway", items: 1, status: "delayed", time: "12:15 PM" },
];

export const statusStyles = {
  waiting: { label: "Waiting", className: "bg-waiting/15 text-waiting" },
  preparing: { label: "Preparing", className: "bg-preparing/15 text-preparing" },
  ready: { label: "Ready", className: "bg-ready/15 text-ready" },
  delayed: { label: "Delayed", className: "bg-delayed/15 text-delayed" },
};