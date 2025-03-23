export type TabType = 'basic' | 'filters' | 'advanced';

interface ToolTabProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function ToolTab({ activeTab, onTabChange }: ToolTabProps) {
  return (
    <div className="border-b border-slate-200">
      <nav className="flex -mb-px space-x-8">
        <button
          onClick={() => onTabChange('basic')}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'basic'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Basic
        </button>
        <button
          onClick={() => onTabChange('filters')}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'filters'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Filters
        </button>
        <button
          onClick={() => onTabChange('advanced')}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'advanced'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Advanced
        </button>
      </nav>
    </div>
  );
}
