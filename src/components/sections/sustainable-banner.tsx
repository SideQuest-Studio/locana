export default function SustainableBanner() {
  return (
    <section className="bg-slate-50/50 border-b border-slate-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <span className="text-xl font-bold text-slate-800 block">50+</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eco-Attractions</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-800 block">10k+ kg</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Carbon Offsets</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-800 block">100%</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Community Certified</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-800 block">15%</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Conservation Fee</span>
          </div>
        </div>
      </div>
    </section>
  )
}
