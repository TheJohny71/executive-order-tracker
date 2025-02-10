'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Category {
  name: string;
}

interface Agency {
  name: string;
}

interface Order {
  id: string;
  title: string;
  number: string;
  summary: string;
  datePublished: string;
  link: string;
  type: string;
  categories: Category[];
  agencies: Agency[];
  status: Array<{ name: string }>;
}

interface OrdersResponse {
  orders: Order[];
  metadata: {
    categories: Category[];
    agencies: Agency[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const ExecutiveOrderTracker: FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');

  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ['orders', page, search, selectedCategory, selectedAgency],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedAgency && { agency: selectedAgency }),
      });

      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  if (!data) return null;

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleAgencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgency(e.target.value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Executive Order Tracker</h1>
      
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <div className="flex gap-4">
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="p-2 border rounded"
          >
            <option value="">All Categories</option>
            {data.metadata.categories.map((category: Category) => (
              <option key={category.name} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={selectedAgency}
            onChange={handleAgencyChange}
            className="p-2 border rounded"
          >
            <option value="">All Agencies</option>
            {data.metadata.agencies.map((agency: Agency) => (
              <option key={agency.name} value={agency.name}>
                {agency.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {data.orders.map((order: Order) => (
          <div key={order.id} className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">{order.title}</h2>
            <p className="text-gray-600">{order.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {order.categories.map((category: Category) => (
                <span key={category.name} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  {category.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Previous
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!data.pagination.hasMore}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ExecutiveOrderTracker;