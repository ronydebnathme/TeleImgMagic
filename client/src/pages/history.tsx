import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityItem } from '@/components/dashboard/RecentActivity';

export default function History() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch all activities
  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['/api/images/history'],
  });

  // Pagination logic
  const totalPages = activities ? Math.ceil(activities.length / pageSize) : 0;
  const paginatedActivities = activities ? activities.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-800">History</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 border-b border-slate-200 sm:px-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-slate-900">Activity History</h3>
              <div className="flex space-x-2">
                <select className="border border-slate-300 rounded-md shadow-sm text-sm">
                  <option value="all">All Activities</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                </select>
                <input 
                  type="text" 
                  className="border border-slate-300 rounded-md shadow-sm text-sm px-3 py-2" 
                  placeholder="Search..."
                />
              </div>
            </div>
          </div>
          <div className="overflow-hidden">
            {isLoading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin h-10 w-10 text-primary-500">
                  <i className="ri-loader-4-line text-3xl"></i>
                </div>
              </div>
            ) : paginatedActivities.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <i className="ri-inbox-line text-5xl text-slate-400"></i>
                <p className="mt-2 text-sm text-slate-500">No activity history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Image</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Filename</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Size</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedActivities.map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-10 w-10 rounded-md bg-slate-200 overflow-hidden">
                            {activity.thumbnail ? (
                              <img src={activity.thumbnail} alt="Thumbnail" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <i className="ri-image-line text-slate-400"></i>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{activity.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{activity.filename}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{activity.filesize}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            activity.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : activity.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{activity.timeAgo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <button className="text-primary-600 hover:text-primary-800 mr-3">
                            <i className="ri-download-line"></i>
                          </button>
                          <button className="text-slate-600 hover:text-slate-800">
                            <i className="ri-more-2-fill"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination controls */}
            {totalPages > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * pageSize, activities?.length || 0)}</span> of{' '}
                      <span className="font-medium">{activities?.length || 0}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <i className="ri-arrow-left-s-line"></i>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                              : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <i className="ri-arrow-right-s-line"></i>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
