const PageLayout = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-slate-500">
          {description}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm min-h-[500px]">
        {children || (
          <div className="flex items-center justify-center h-[420px] text-slate-400">
            {title} Module Coming Soon
          </div>
        )}
      </div>
    </div>
  );
};

export default PageLayout;