import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">Blueprint AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            My Plans
          </Link>
          <Link
            href="/app"
            className="px-4 py-2 text-sm bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-medium"
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-full text-sm text-sky-700 mb-6">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          Powered by Claude AI
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          Generate Floor Plans
          <br />
          <span className="text-sky-600">with Plain English</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Describe your house — bedrooms, bathrooms, garage, living areas — and AI generates
          an interactive floor plan in seconds. Refine with conversation. Export as DXF or JPG.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/app"
            className="px-8 py-4 bg-sky-600 text-white rounded-2xl hover:bg-sky-700 transition-colors font-semibold text-lg shadow-lg shadow-sky-200"
          >
            Generate My Floor Plan →
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-colors font-semibold text-lg"
          >
            See How It Works
          </a>
        </div>
        <p className="text-sm text-gray-400 mt-4">Free to try · No account required · Export DXF from $9</p>
      </section>

      {/* Demo preview */}
      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-50 to-sky-50 rounded-3xl border border-gray-200 overflow-hidden shadow-xl">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400 ml-2">Blueprint AI Editor</span>
          </div>
          <div className="p-8 text-center text-gray-400 min-h-64 flex items-center justify-center">
            <div>
              <div className="grid grid-cols-3 gap-2 mb-4 max-w-sm mx-auto text-left">
                {['Master Bedroom\n4.0×3.5m', 'Bedroom 2\n3.0×3.0m', 'Bedroom 3\n3.0×3.0m',
                  'Living Room\n5.0×4.0m', 'Kitchen\n3.5×3.5m', 'Bathroom\n2.4×1.8m',
                  'Garage\n5.5×5.5m', 'Hallway\n1.5×8.0m', 'Laundry\n2.0×1.8m'].map((r) => (
                  <div
                    key={r}
                    className="bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-600"
                  >
                    {r.split('\n').map((line, i) => (
                      <div key={i} className={i === 0 ? 'font-semibold text-gray-800' : 'text-gray-400'}>
                        {line}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-sm text-sky-600 font-medium">↑ Interactive floor plan preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">How It Works</h2>
          <p className="text-center text-gray-500 mb-12">Three steps from description to CAD file</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: '💬',
                title: 'Describe Your House',
                desc: 'Type your requirements in plain English. "4 bed, 2 bath, master with ensuite, double garage, north-facing living room."',
              },
              {
                step: '2',
                icon: '🏠',
                title: 'AI Generates the Plan',
                desc: 'Claude AI interprets your requirements and generates a constraint-based floor plan with proper room sizes and connections.',
              },
              {
                step: '3',
                icon: '📐',
                title: 'Refine & Export',
                desc: 'Chat to refine — "make the kitchen bigger", "add a study". Then export as DXF for AutoCAD or high-res JPG.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-sky-100 mx-auto mb-4 flex items-center justify-center text-3xl">
                  {item.icon}
                </div>
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Everything You Need</h2>
          <p className="text-center text-gray-500 mb-12">Professional floor plan tools, AI-powered</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🤖', title: 'Claude AI', desc: 'Natural language understanding by Anthropic\'s Claude.' },
              { icon: '🏗️', title: 'Smart Layout Engine', desc: 'Constraint-based algorithm ensures rooms don\'t overlap and flow logically.' },
              { icon: '✏️', title: 'Interactive Editing', desc: 'Drag rooms, resize walls, and see real-time dimensions.' },
              { icon: '📁', title: 'DXF Export', desc: 'Professional CAD files with walls, dimensions, and title blocks.' },
              { icon: '🖼️', title: 'JPG Export', desc: 'High-resolution images (A3 equivalent) for presentations.' },
              { icon: '💾', title: 'Save & Resume', desc: 'Save plans to your account and continue editing anytime.' },
            ].map((f) => (
              <div key={f.title} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Simple Pricing</h2>
          <p className="text-center text-gray-500 mb-12">Start free, pay only when you export</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                features: ['3 floor plan generations', 'Interactive canvas editor', 'Watermarked JPG export', 'Conversational refinement'],
                cta: 'Start Free',
                href: '/app',
                highlight: false,
              },
              {
                name: 'Download Pack',
                price: '$9',
                period: 'per download',
                features: ['1 DXF + JPG bundle', 'No watermark', 'Full resolution JPG', 'Professional title block'],
                cta: 'Buy Download',
                href: '/app',
                highlight: true,
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                features: ['Unlimited generations', 'Unlimited DXF + JPG exports', 'Save unlimited plans', 'Priority AI processing'],
                cta: 'Start Pro',
                href: '/app',
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 ${
                  tier.highlight
                    ? 'bg-sky-600 text-white ring-4 ring-sky-200'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <h3 className={`font-bold text-lg mb-1 ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className={`text-4xl font-extrabold ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {tier.price}
                  </span>
                  <span className={`text-sm ${tier.highlight ? 'text-sky-200' : 'text-gray-400'}`}>
                    {tier.period}
                  </span>
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg
                        className={`w-4 h-4 mt-0.5 shrink-0 ${tier.highlight ? 'text-sky-200' : 'text-sky-500'}`}
                        fill="currentColor" viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className={tier.highlight ? 'text-sky-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
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

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Ready to design your home?
        </h2>
        <p className="text-gray-500 mb-8 text-lg">
          No signup required. Start generating floor plans in seconds.
        </p>
        <Link
          href="/app"
          className="inline-block px-10 py-4 bg-sky-600 text-white rounded-2xl hover:bg-sky-700 transition-colors font-semibold text-lg shadow-lg shadow-sky-200"
        >
          Generate My Floor Plan →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="font-semibold text-gray-800">Blueprint AI</span>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Blueprint AI. Concept plans only — not for construction.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-700">Privacy</a>
            <a href="#" className="hover:text-gray-700">Terms</a>
            <a href="https://github.com/aiAPPS87/blueprintai" className="hover:text-gray-700" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
