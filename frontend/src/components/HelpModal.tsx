// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Help Modal Component
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useState } from 'react';
import { X, BookOpen, HelpCircle, Search } from 'lucide-react';

interface HelpTopic {
  id: string;
  title: string;
  content: string;
  category: string;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    content: 'The executive dashboard provides a high-level view of key business metrics including revenue, orders, margins, and exceptions. Use the company switcher to view data for different entities, and the date filters to analyze specific periods.',
    category: 'Dashboard'
  },
  {
    id: 'sales-analytics',
    title: 'Sales Analytics',
    content: 'The sales analytics module tracks quote-to-invoice performance with full traceability. View pipeline progression, revenue trends, and drill down into individual orders. Filter by date, company, or search for specific customers or orders.',
    category: 'Sales'
  },
  {
    id: 'stock-management',
    title: 'Stock & Inventory',
    content: 'Monitor inventory levels across warehouses with real-time visibility. Track stockouts, low stock items, and aging inventory. Use filters to view by category, warehouse, or status.',
    category: 'Inventory'
  },
  {
    id: 'exception-monitoring',
    title: 'Exception Monitoring',
    content: 'Business exceptions are automatically detected and categorized by severity. Critical exceptions require immediate attention while warnings indicate potential issues. Use the resolution workflow to track and manage exceptions.',
    category: 'Exceptions'
  },
  {
    id: 'date-filters',
    title: 'Date Filtering',
    content: 'Use the date filter bar at the top of each page to analyze data for specific periods. You can compare current periods to prior years, drill down to monthly or daily views, and switch between companies instantly.',
    category: 'Navigation'
  },
  {
    id: 'export-data',
    title: 'Exporting Data',
    content: 'Export data tables to CSV or Excel formats using the export buttons on each page. Charts can be downloaded as images for presentations.',
    category: 'Features'
  }
];

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);

  if (!isOpen) return null;

  const filteredTopics = HELP_TOPICS.filter(topic => 
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(HELP_TOPICS.map(t => t.category)));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose}></div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
                aria-label="Close help dialog"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-cyan-100 sm:mx-0 sm:h-10 sm:w-10">
                <HelpCircle className="h-6 w-6 text-cyan-600" aria-hidden="true" />
              </div>
              
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
                  GONXT Analytics Help Center
                </h3>
                
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                      placeholder="Search help topics..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedTopic(null);
                      }}
                      aria-label="Search help topics"
                    />
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <nav className="space-y-1" aria-label="Help categories">
                      {categories.map(category => (
                        <div key={category} className="font-medium text-sm text-gray-500 mb-2">
                          {category}
                        </div>
                      ))}
                      {filteredTopics.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => setSelectedTopic(topic)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md ${
                            selectedTopic?.id === topic.id
                              ? 'bg-cyan-50 text-cyan-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          aria-pressed={selectedTopic?.id === topic.id}
                        >
                          {topic.title}
                        </button>
                      ))}
                    </nav>
                  </div>
                  
                  <div className="md:col-span-2">
                    {selectedTopic ? (
                      <div className="prose prose-cyan max-w-none">
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{selectedTopic.title}</h4>
                        <p className="text-gray-700">{selectedTopic.content}</p>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Related Topics</h5>
                          <div className="flex flex-wrap gap-2">
                            {HELP_TOPICS.filter(t => t.category === selectedTopic.category && t.id !== selectedTopic.id)
                              .slice(0, 3)
                              .map(topic => (
                                <button
                                  key={topic.id}
                                  onClick={() => setSelectedTopic(topic)}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                                >
                                  {topic.title}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Select a help topic</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Choose a topic from the list to view detailed help information.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}