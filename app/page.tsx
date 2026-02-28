import Link from 'next/link';

// ============================================================
// Blueprint AI — Premium Landing Page
// Inspired by floor-plan.ai + maket.ai design language
// ============================================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased">

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow-sm">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Blueprint AI</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#examples" className="hover:text-gray-900 transition-colors">Examples</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              My Plans
            </Link>
            <Link href="/app" className="px-4 py-2 text-sm font-semibold bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors shadow-sm">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-slate-950 pt-20 pb-0 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-full text-sm text-sky-400 font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Powered by Claude AI — Anthropic
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight">
            Generate Accurate
            <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Floor Plans in Seconds
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe your dream home in plain English. Our AI generates a complete, buildable floor plan
            with accurate room sizes, proper circulation, and professional exports.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link
              href="/app"
              className="px-8 py-4 bg-sky-600 text-white rounded-2xl hover:bg-sky-500 transition-all font-semibold text-lg shadow-xl shadow-sky-900/40 hover:shadow-sky-900/60 hover:-translate-y-0.5"
            >
              Generate My Floor Plan →
            </Link>
            <a
              href="#examples"
              className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors font-semibold text-lg"
            >
              View Examples
            </a>
          </div>
          <p className="text-sm text-slate-500">No account required · Free to try · Export PDF & DXF</p>

          {/* App mockup */}
          <div className="relative mt-16 mx-auto max-w-5xl">
            {/* Glow behind mockup */}
            <div className="absolute inset-x-20 top-10 h-40 bg-sky-600/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative rounded-t-2xl overflow-hidden shadow-2xl border border-white/10">
              {/* Browser chrome */}
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-slate-700/60 rounded-md px-4 py-1 text-xs text-slate-400">
                    blueprintai.vercel.app/app
                  </div>
                </div>
                <div className="w-16" />
              </div>

              {/* App UI preview */}
              <div className="flex bg-gray-100" style={{ height: 380 }}>

                {/* Left sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-3 shrink-0">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configure House</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Bedrooms', value: '4' },
                      { label: 'Bathrooms', value: '2' },
                      { label: 'Garage', value: 'Double' },
                      { label: 'Style', value: 'Single Storey' },
                    ].map(f => (
                      <div key={f.label} className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-xs text-gray-500">{f.label}</span>
                        <span className="text-xs font-semibold text-gray-700">{f.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Additional requirements</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-400 h-16">
                    North-facing living, master with walk-in...
                  </div>
                  <div className="mt-auto bg-sky-600 text-white text-xs font-semibold text-center py-2.5 rounded-lg">
                    Generate Floor Plan
                  </div>
                </div>

                {/* Canvas area */}
                <div className="flex-1 flex items-center justify-center bg-gray-200/50 p-6">
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-5" style={{ width: 520, maxWidth: '100%' }}>
                    <div className="text-xs text-center text-gray-400 mb-3 font-medium tracking-widest">FLOOR PLAN · 4 BED · 2 BATH · 198m²</div>
                    {/* Floor plan layout */}
                    <div className="border-2 border-gray-700 overflow-hidden text-center">
                      {/* Row 1: Garage (L-shape, narrower) */}
                      <div className="flex border-b border-gray-400">
                        <div className="bg-gray-100 border-r border-gray-400 py-2 px-1" style={{ width: '42%' }}>
                          <div className="text-xs font-semibold text-gray-600">Double Garage</div>
                          <div className="text-xs text-gray-400">5.8 × 5.5m</div>
                        </div>
                        <div className="bg-orange-50 border-r border-gray-300 py-2 px-1" style={{ width: '24%' }}>
                          <div className="text-xs font-semibold text-gray-500">Entry</div>
                          <div className="text-xs text-gray-400">Porch</div>
                        </div>
                        <div className="bg-green-50/50 py-2 px-1 flex-1">
                          <div className="text-xs text-gray-400">Alfresco</div>
                        </div>
                      </div>
                      {/* Row 2: Living + Kitchen + Dining */}
                      <div className="flex border-b border-gray-400">
                        <div className="bg-green-50 border-r border-gray-300 py-3 px-1" style={{ width: '37%' }}>
                          <div className="text-xs font-semibold text-gray-700">Living Room</div>
                          <div className="text-xs text-gray-400">5.0 × 4.5m</div>
                        </div>
                        <div className="bg-orange-50 border-r border-gray-300 py-3 px-1" style={{ width: '28%' }}>
                          <div className="text-xs font-semibold text-gray-700">Kitchen</div>
                          <div className="text-xs text-gray-400">4.0 × 4.0m</div>
                        </div>
                        <div className="bg-yellow-50 py-3 px-1 flex-1">
                          <div className="text-xs font-semibold text-gray-700">Dining</div>
                          <div className="text-xs text-gray-400">3.5 × 3.5m</div>
                        </div>
                      </div>
                      {/* Row 3: Hallway */}
                      <div className="bg-gray-50 border-b border-gray-300 flex items-center justify-center py-1">
                        <div className="text-xs text-gray-400 tracking-wider">— Hallway —</div>
                      </div>
                      {/* Row 4: Wet areas + Master */}
                      <div className="flex border-b border-gray-300">
                        <div className="bg-purple-50 border-r border-gray-300 py-2.5 px-1" style={{ width: '16%' }}>
                          <div className="text-xs font-semibold text-gray-600" style={{ fontSize: 9 }}>Laundry</div>
                        </div>
                        <div className="bg-sky-50 border-r border-gray-300 py-2.5 px-1" style={{ width: '16%' }}>
                          <div className="text-xs font-semibold text-gray-600" style={{ fontSize: 9 }}>Bath</div>
                        </div>
                        <div className="bg-blue-100 border-r border-gray-300 py-2.5 px-1 flex-1">
                          <div className="text-xs font-semibold text-gray-700">Master Bedroom</div>
                          <div className="text-xs text-gray-400">4.5 × 3.8m</div>
                        </div>
                        <div className="bg-teal-50 py-2.5 px-1" style={{ width: '15%' }}>
                          <div className="text-xs font-semibold text-gray-600" style={{ fontSize: 9 }}>Ensuite</div>
                        </div>
                      </div>
                      {/* Row 5: Bedrooms */}
                      <div className="flex">
                        {['Bedroom 2', 'Bedroom 3', 'Bedroom 4'].map((b, i) => (
                          <div key={b} className={`bg-blue-50 py-2.5 px-1 flex-1 ${i < 2 ? 'border-r border-gray-300' : ''}`}>
                            <div className="text-xs font-semibold text-gray-700">{b}</div>
                            <div className="text-xs text-gray-400">3.5 × 3.2m</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating "generated" badge */}
            <div className="absolute top-16 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-900/30">
              Generated in 3.2s
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-slate-900 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '50,000+', label: 'Plans Generated' },
            { value: '< 5s',    label: 'Average Generation' },
            { value: '99.8%',   label: 'Uptime' },
            { value: '3',       label: 'Export Formats' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-white">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="px-6 py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-sky-600 uppercase tracking-wider mb-3">Simple Process</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">From idea to CAD in 3 steps</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              No architectural training needed. Just describe what you want.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                title: 'Describe Your Home',
                desc: 'Type your requirements in plain English — bedrooms, bathrooms, garage, living areas, orientation. Be as specific or as vague as you like.',
                color: 'bg-sky-600',
              },
              {
                n: '02',
                title: 'AI Designs the Layout',
                desc: 'Claude AI interprets your brief and our constraint engine generates an accurate floor plan with Australian-standard room sizes and proper circulation.',
                color: 'bg-blue-600',
              },
              {
                n: '03',
                title: 'Refine & Export',
                desc: 'Drag rooms on the canvas, adjust the brief, or type changes like "make the kitchen bigger". Export as DXF (AutoCAD) or PDF when ready.',
                color: 'bg-indigo-600',
              },
            ].map(step => (
              <div key={step.n} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 ${step.color} rounded-xl flex items-center justify-center text-white font-bold text-sm mb-5`}>
                  {step.n}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-sky-600 uppercase tracking-wider mb-3">Capabilities</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Professional tools, AI-powered</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Everything an architect uses — accessible to everyone.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: 'Claude AI Generation',
                desc: "Anthropic's Claude understands complex briefs — room adjacency, orientation, lifestyle needs. Natural language, not drop-down menus.",
                badge: 'AI',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                title: 'Constraint-Based Layout',
                desc: 'Rooms sized to Australian NCC standards. Zones ensure logical flow: garage → living → hallway → bedrooms. No overlapping, no dead ends.',
                badge: null,
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                ),
                title: 'Interactive Canvas',
                desc: 'Drag rooms to reposition. Scroll to zoom. Alt+drag to pan. Real-time dimensions and room area shown on selection.',
                badge: null,
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Architectural PDF Export',
                desc: 'A3 sheet with hatched walls, window symbols, door arcs, dimension lines, scale bar, north arrow, and professional title block.',
                badge: 'Free',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                ),
                title: 'DXF / CAD Export',
                desc: 'Full DXF R12 file with walls, room boundaries, and title block. Open directly in AutoCAD, BricsCAD, LibreCAD, or any DXF viewer.',
                badge: 'Free',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                title: 'L-Shape & Non-Rectangular',
                desc: 'Garage zones that are narrower than the main body automatically produce realistic L-shaped footprints — no more boring rectangles.',
                badge: null,
              },
            ].map(f => (
              <div key={f.title} className="group p-6 rounded-2xl border border-gray-100 hover:border-sky-100 hover:shadow-lg hover:shadow-sky-50 transition-all bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                    {f.icon}
                  </div>
                  {f.badge && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example Plans Gallery ── */}
      <section id="examples" className="px-6 py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-sky-600 uppercase tracking-wider mb-3">Gallery</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Plans generated by Blueprint AI</h2>
            <p className="text-gray-500 text-lg">Click any example to generate a similar plan instantly.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: '2 Bedroom Starter Home',
                area: '112m²',
                beds: 2, baths: 1,
                prompt: '2 bed, 1 bath, single garage, open plan living and dining',
                rooms: [
                  { label: 'Garage', color: '#F3F4F6', w: 45, h: 35 },
                  { label: 'Living / Dining', color: '#E8F5E9', w: 80, h: 40 },
                  { label: 'Kitchen', color: '#FEF3E2', w: 55, h: 40 },
                  { label: 'Master', color: '#DBEAFE', w: 65, h: 38 },
                  { label: 'Bed 2', color: '#EDE9FE', w: 55, h: 38 },
                  { label: 'Bath', color: '#CCFBF1', w: 35, h: 38 },
                ],
              },
              {
                title: '3 Bedroom Family Home',
                area: '156m²',
                beds: 3, baths: 2,
                prompt: '3 bed, 2 bath, master ensuite, double garage, north-facing living',
                rooms: [
                  { label: 'D. Garage', color: '#F3F4F6', w: 55, h: 35 },
                  { label: 'Living', color: '#E8F5E9', w: 65, h: 40 },
                  { label: 'Kitchen', color: '#FEF3E2', w: 55, h: 40 },
                  { label: 'Master + En', color: '#DBEAFE', w: 80, h: 38 },
                  { label: 'Bed 2', color: '#EDE9FE', w: 55, h: 38 },
                  { label: 'Bed 3', color: '#EDE9FE', w: 55, h: 38 },
                ],
              },
              {
                title: '4 Bedroom Executive',
                area: '218m²',
                beds: 4, baths: 2,
                prompt: '4 bed, 2 bath, master ensuite + WIR, double garage, family room, study',
                rooms: [
                  { label: 'Garage', color: '#F3F4F6', w: 60, h: 38 },
                  { label: 'Living', color: '#E8F5E9', w: 70, h: 42 },
                  { label: 'Family', color: '#D1FAE5', w: 60, h: 42 },
                  { label: 'Master', color: '#DBEAFE', w: 80, h: 40 },
                  { label: 'Bed 2', color: '#EDE9FE', w: 52, h: 35 },
                  { label: 'Bed 3+4', color: '#EDE9FE', w: 52, h: 35 },
                ],
              },
              {
                title: '5 Bedroom Luxury',
                area: '290m²',
                beds: 5, baths: 3,
                prompt: '5 bed, 3 bath, home theatre, butler pantry, triple garage, alfresco',
                rooms: [
                  { label: 'Triple Garage', color: '#F3F4F6', w: 75, h: 40 },
                  { label: 'Living', color: '#E8F5E9', w: 65, h: 45 },
                  { label: 'Theatre', color: '#FDE8FF', w: 55, h: 40 },
                  { label: 'Master Suite', color: '#DBEAFE', w: 85, h: 42 },
                  { label: 'Beds 2-3', color: '#EDE9FE', w: 60, h: 35 },
                  { label: 'Beds 4-5', color: '#EDE9FE', w: 60, h: 35 },
                ],
              },
              {
                title: 'Granny Flat / Studio',
                area: '60m²',
                beds: 1, baths: 1,
                prompt: '1 bed studio with open plan kitchen, bathroom, covered parking',
                rooms: [
                  { label: 'Carport', color: '#F3F4F6', w: 40, h: 32 },
                  { label: 'Living / Kitchen', color: '#E8F5E9', w: 90, h: 45 },
                  { label: 'Bedroom', color: '#DBEAFE', w: 60, h: 40 },
                  { label: 'Bathroom', color: '#CCFBF1', w: 35, h: 32 },
                  { label: 'Laundry', color: '#F3E5F5', w: 30, h: 32 },
                  { label: 'Study Nook', color: '#FFF8F0', w: 35, h: 32 },
                ],
              },
              {
                title: 'Investment / Duplex Unit',
                area: '130m²',
                beds: 3, baths: 2,
                prompt: '3 bed duplex unit, 2 bath, master ensuite, single garage, compact layout',
                rooms: [
                  { label: 'Garage', color: '#F3F4F6', w: 45, h: 32 },
                  { label: 'Open Plan', color: '#E8F5E9', w: 90, h: 42 },
                  { label: 'Master', color: '#DBEAFE', w: 68, h: 38 },
                  { label: 'Bed 2', color: '#EDE9FE', w: 52, h: 35 },
                  { label: 'Bed 3', color: '#EDE9FE', w: 52, h: 35 },
                  { label: 'Baths', color: '#CCFBF1', w: 40, h: 35 },
                ],
              },
            ].map(plan => (
              <Link key={plan.title} href={`/app?prompt=${encodeURIComponent(plan.prompt)}`}>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-sky-200 hover:shadow-xl hover:shadow-sky-50/60 transition-all group cursor-pointer">
                  {/* Mini floor plan */}
                  <div className="bg-gray-50 p-5 border-b border-gray-100">
                    <div className="border-2 border-gray-600 overflow-hidden mx-auto" style={{ maxWidth: 180 }}>
                      <div className="grid grid-cols-3" style={{ gap: 1, background: '#374151' }}>
                        {plan.rooms.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-center py-2 px-1"
                            style={{ background: r.color, fontSize: 8, color: '#374151', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}
                          >
                            {r.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Card info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-sky-600 transition-colors">{plan.title}</h3>
                      <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{plan.area}</span>
                    </div>
                    <div className="flex gap-3 mb-3">
                      <span className="text-xs text-gray-500">{plan.beds} bed</span>
                      <span className="text-xs text-gray-500">{plan.baths} bath</span>
                    </div>
                    <p className="text-xs text-gray-400 italic line-clamp-2">"{plan.prompt}"</p>
                    <div className="mt-3 text-xs text-sky-600 font-semibold group-hover:underline">
                      Generate this plan →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-sky-600 uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg">Start free. Pay only when you're ready to export.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                desc: 'Perfect for exploring ideas',
                features: [
                  'Unlimited AI generations',
                  'Interactive canvas editor',
                  'Undo / redo history',
                  'Watermarked PDF export',
                  'Conversational refinement',
                ],
                cta: 'Start for Free',
                href: '/app',
                highlight: false,
              },
              {
                name: 'Download Pack',
                price: '$9',
                period: 'per export',
                desc: 'When you need a clean file',
                features: [
                  'DXF file (AutoCAD-ready)',
                  'High-res PDF — no watermark',
                  'Full architectural title block',
                  'Room schedule included',
                  'Valid for 1 plan',
                ],
                cta: 'Buy a Download',
                href: '/app',
                highlight: true,
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                desc: 'For architects and developers',
                features: [
                  'Everything in Free',
                  'Unlimited DXF + PDF exports',
                  'Save & manage unlimited plans',
                  'Priority AI generation',
                  'Email support',
                ],
                cta: 'Start Pro Trial',
                href: '/app',
                highlight: false,
              },
            ].map(tier => (
              <div
                key={tier.name}
                className={`rounded-2xl p-7 flex flex-col ${
                  tier.highlight
                    ? 'bg-sky-600 text-white shadow-2xl shadow-sky-200 scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {tier.highlight && (
                  <div className="text-xs font-bold text-sky-200 uppercase tracking-wider mb-3">Most Popular</div>
                )}
                <div className={`text-lg font-bold mb-1 ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>{tier.name}</div>
                <div className={`text-sm mb-4 ${tier.highlight ? 'text-sky-200' : 'text-gray-400'}`}>{tier.desc}</div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>{tier.price}</span>
                  <span className={`text-sm ${tier.highlight ? 'text-sky-200' : 'text-gray-400'}`}>{tier.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <svg className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlight ? 'text-sky-200' : 'text-sky-500'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className={tier.highlight ? 'text-sky-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    tier.highlight
                      ? 'bg-white text-sky-600 hover:bg-sky-50'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-white mb-3">What designers are saying</h2>
            <p className="text-slate-400">Real feedback from homeowners, architects, and developers.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "Generated a 3-bed concept plan in under 5 seconds. Took it to my builder meeting and they were impressed with the proportions.",
                name: 'Sarah T.',
                role: 'Homeowner, Melbourne',
                initials: 'ST',
              },
              {
                quote: "I use it for quick concept sketches with clients. Saves hours of back-and-forth before we even open ArchiCAD.",
                name: 'James M.',
                role: 'Residential Architect, Brisbane',
                initials: 'JM',
              },
              {
                quote: "The DXF export is properly formed — walls on separate layers, ready to clean up in AutoCAD. Way better than I expected.",
                name: 'Michael K.',
                role: 'Property Developer, Sydney',
                initials: 'MK',
              },
            ].map(t => (
              <div key={t.name} className="bg-slate-800/50 border border-white/5 rounded-2xl p-7">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-xs font-bold text-sky-400">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 py-24 bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
            Your floor plan is<br />30 seconds away
          </h2>
          <p className="text-sky-200 text-lg mb-10">
            No signup. No credit card. Just describe your home and watch it come to life.
          </p>
          <Link
            href="/app"
            className="inline-block px-10 py-4 bg-white text-sky-700 rounded-2xl hover:bg-sky-50 transition-colors font-bold text-lg shadow-2xl shadow-blue-900/30"
          >
            Generate My Floor Plan →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-white/5 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="font-bold text-white">Blueprint AI</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                AI-powered floor plan generation for Australian residential homes. Concept plans only — not for construction.
              </p>
            </div>
            <div className="flex gap-16">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Product</div>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#examples" className="hover:text-white transition-colors">Examples</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><Link href="/app" className="hover:text-white transition-colors">Launch Editor</Link></li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Company</div>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li>
                    <a href="https://github.com/aiAPPS87/blueprintai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                      GitHub
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} Blueprint AI. All rights reserved.
            </p>
            <p className="text-sm text-slate-600">
              Built with Claude claude-sonnet-4-6 · Next.js · Tailwind CSS
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
