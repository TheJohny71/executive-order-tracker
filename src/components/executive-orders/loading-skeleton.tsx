export const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
        <div className="p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-20 bg-gray-200 rounded"></div>
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 w-3/4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
        </div>
        <div className="p-6 pt-0 bg-white hidden">
          <div className="space-y-4">
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);