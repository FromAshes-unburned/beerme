import Link from 'next/link';

const steps = [
  { emoji: '🔞', title: 'Verify your age', desc: 'Quick one-time ID check via Stripe Identity — takes under a minute.' },
  { emoji: '🍺', title: 'Browse local breweries', desc: 'See menus, prices, and distance from your front door.' },
  { emoji: '🚗', title: 'Get it delivered', desc: 'A vetted driver picks up your order and checks ID at the door.' },
];

const partners = [
  { name: 'Against the Grain', hood: 'Louisville, KY' },
  { name: 'Gravely Brewing', hood: 'Louisville, KY' },
  { name: 'Akasha Brewing', hood: 'Louisville, KY' },
  { name: 'Mile Wide Beer Co.', hood: 'Louisville, KY' },
];

export default function MarketingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-2xl font-bold tracking-tight">🍺 Beer Me</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/register" className="text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-24 bg-amber-50">
        <span className="text-6xl mb-6">🍺</span>
        <h1 className="text-5xl font-extrabold tracking-tight max-w-2xl leading-tight">
          Local craft beer,<br />delivered to your door.
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-xl">
          Louisville&apos;s finest local breweries, on demand. Order online, track your driver live, and enjoy — you must be 21+ to order.
        </p>
        <div className="mt-10 flex gap-4 flex-wrap justify-center">
          <Link href="/register" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-4 rounded-full text-lg transition-colors">
            Order now →
          </Link>
          <Link href="/browse" className="border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-8 py-4 rounded-full text-lg transition-colors">
            Browse breweries
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500">Must be 21 or older · ID verified at account creation &amp; delivery</p>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-gray-50">
              <span className="text-4xl">{s.emoji}</span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-gray-500 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brewery partners */}
      <section className="bg-amber-50 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Partner breweries</h2>
          <p className="text-center text-gray-500 mb-10">Launching in Louisville — more coming soon</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {partners.map((p) => (
              <div key={p.name} className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
                <span className="text-3xl mb-3">🏭</span>
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-gray-400 mt-1">{p.hood}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Are you a brewery? */}
      <section className="px-6 py-20 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Are you a brewery?</h2>
        <p className="text-gray-500 mb-8">
          Partner with Beer Me to reach more customers with zero delivery infrastructure. We handle drivers, payments, and compliance.
        </p>
        <a href="mailto:mhernandezd0715@gmail.com" className="inline-block border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white font-semibold px-8 py-3 rounded-full transition-colors">
          Get in touch
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2025 Beer Me · Louisville, KY</span>
          <span>Must be 21+ to order · Drink responsibly</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-gray-600">Sign in</Link>
            <Link href="/admin" className="hover:text-gray-600">Brewery portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
