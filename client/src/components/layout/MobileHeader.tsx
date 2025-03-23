interface MobileHeaderProps {
  toggleMobileMenu: () => void;
}

export default function MobileHeader({ toggleMobileMenu }: MobileHeaderProps) {
  return (
    <div className="md:hidden flex items-center justify-between h-16 bg-white border-b border-slate-200 px-4 sm:px-6">
      <div className="flex items-center">
        <i className="ri-image-edit-line text-primary-600 text-xl mr-2"></i>
        <span className="text-lg font-semibold text-slate-800">Image Magic</span>
      </div>
      <button 
        type="button" 
        className="text-slate-500 hover:text-slate-600"
        onClick={toggleMobileMenu}
      >
        <i className="ri-menu-line text-2xl"></i>
      </button>
    </div>
  );
}
