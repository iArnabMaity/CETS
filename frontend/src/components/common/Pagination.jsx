import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const Pagination = ({ 
    currentPage, 
    totalItems, 
    itemsPerPage, 
    onPageChange,
    className = "" 
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const delta = 2; // Number of pages to show before and after current page
        
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }
        return pages;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between px-6 py-4 glass-card mt-6 gap-4 ${className}`}>
            <div className="text-xs text-slate-500 font-medium">
                Showing <span className="text-slate-300 font-bold">{startItem}</span> to <span className="text-slate-300 font-bold">{endItem}</span> of <span className="text-indigo-400 font-bold">{totalItems}</span> results
            </div>

            <div className="flex items-center space-x-1">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all mr-2"
                    title="Previous Page"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {getPageNumbers().map((page, idx) => (
                    page === '...' ? (
                        <div key={`ellipsis-${idx}`} className="px-3 py-2 text-slate-600">
                            <MoreHorizontal className="w-4 h-4" />
                        </div>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                                currentPage === page 
                                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                                : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                            }`}
                        >
                            {page}
                        </button>
                    )
                ))}

                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all ml-2"
                    title="Next Page"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
