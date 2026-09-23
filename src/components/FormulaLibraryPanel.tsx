import React, { useState, useMemo } from 'react';
import { BookOpen, Search, ArrowRight, Star, Filter } from 'lucide-react';
import { FORMULA_CATALOG } from '../engine/formulaLibrary';
import { FormulaItem } from '../types';

interface FormulaLibraryPanelProps {
  onUseFormula: (expr: string) => void;
}

export const FormulaLibraryPanel: React.FC<FormulaLibraryPanelProps> = ({ onUseFormula }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('calc_formula_favs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem('calc_formula_favs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const categories = [
    { id: 'all', label: 'All Formulas' },
    { id: 'algebra', label: 'Algebra' },
    { id: 'geometry', label: 'Geometry' },
    { id: 'trigonometry', label: 'Trigonometry' },
    { id: 'calculus', label: 'Calculus' },
    { id: 'physics', label: 'Physics' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'finance', label: 'Finance' },
  ];

  const filteredFormulas = useMemo(() => {
    return FORMULA_CATALOG.filter((f) => {
      const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.displayFormula.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div id="formula-library-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Formula Library & Theorems
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Curated mathematical, physical, and financial formulas with one-click calculator loading
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search formulas..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedCategory === c.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid of Formulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFormulas.map((item) => {
          const isFav = favorites.includes(item.id);
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.name}
                  </h3>
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                  </button>
                </div>

                <div className="p-3 my-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 text-center">
                  {item.displayFormula}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                  {item.description}
                </p>

                {item.variables && item.variables.length > 0 && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mb-3">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Variables:
                    </span>
                    {item.variables.map((v, i) => (
                      <div key={i} className="flex gap-1.5">
                        <span className="font-mono text-indigo-500">{v.symbol}:</span>
                        <span>
                          {v.name} {v.unit ? `(${v.unit})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {item.exampleCalculation && (
                  <div className="text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 mb-4">
                    <strong className="text-slate-700 dark:text-slate-300">Example: </strong>
                    {item.exampleCalculation}
                  </div>
                )}
              </div>

              {item.defaultExpression && (
                <button
                  onClick={() => onUseFormula(item.defaultExpression!)}
                  className="w-full mt-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Use in Calculator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
