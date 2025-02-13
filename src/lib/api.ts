export interface OrderFilters {
  type?: string;
  category?: string;
  agency?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function fetchOrders(filters: OrderFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/orders?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch orders");
  }

  return response.json();
}

export async function triggerScrape() {
  const response = await fetch("/api/scrape");

  if (!response.ok) {
    throw new Error("Failed to trigger scrape");
  }

  return response.json();
}

export async function markOrderAsViewed(orderId: string) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) {
    throw new Error("Failed to mark order as viewed");
  }

  return response.json();
}
