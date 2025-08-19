// src/pages/HGRAPHPage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

const HGRAPHPage: React.FC = () => {
  return (
    <div className="p-6 text-white bg-navy-900 min-h-screen">
      <Helmet>
        <title>HGRAPH | Powering the Graphene Revolution</title>
        <meta
          name="description"
          content="HGRAPH is a cryptocurrency token fueling the graphene revolution. Join the movement to invest in the future of fractal and reactive graphene innovations."
        />
        <meta
          name="keywords"
          content="HGRAPH, graphene, cryptocurrency, fractal graphene, reactive graphene, technology, investment"
        />
        <link rel="canonical" href="https://mapleaurum.com/HGRAPH" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'HGRAPH Token',
                item: 'https://mapleaurum.com/HGRAPH',
              },
            ],
          })}
        </script>
      </Helmet>
      <div className="max-w-4xl mx-auto">
        {/* Logo Section */}
        <div className="mb-8 text-center">
          <img
            src="/HGlogo.jpg"
            alt="HGRAPH Token Logo"
            className="mx-auto w-32 h-32 object-contain"
          />
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">HGRAPH: Fueling the Graphene Revolution</h1>
        <p className="text-lg mb-4">
          HGRAPH is your gateway to the graphene revolution, a cryptocurrency token designed to capture the transformative potential of graphene—the material poised to redefine our civilization. With breakthroughs like HydroGraph’s fractal and reactive graphene, offering 99.8% purity and unparalleled scalability, HGRAPH positions you at the forefront of a technological leap in composites, energy storage, and biomedical applications.
        </p>
        <p className="text-lg mb-4 font-semibold text-cyan-400">
          Important: HGRAPH is an independent cryptocurrency token and is not affiliated with HydroGraph Clean Power Inc. or any other company. It is a speculative investment vehicle for those excited about graphene’s future.
        </p>

        {/* Graphene Revolution Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Why HGRAPH? The Graphene Revolution Awaits</h2>
          <p className="text-gray-200 mb-4">
            Graphene, dubbed the “wonder material” of the 21st century, is set to transform industries with its unmatched strength, conductivity, and versatility. Innovations like HydroGraph’s patented detonation process produce fractal graphene with reactive edges, solving the clumping problem and enabling applications from super-strong composites to ultra-efficient batteries. HGRAPH lets you tap into this monumental shift without investing in individual stocks.
          </p>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li><strong>Fractal Graphene Innovation</strong>: HydroGraph’s 99.8% pure graphene, validated by The Graphene Council, offers superior dispersion for composites, boosting strength by up to 27% in concrete and reducing wear by 80% in aerospace applications.</li>
            <li><strong>Scalable Production</strong>: Breakthroughs in scalable graphene production, like KTH’s carbon fiber method, are slashing costs and driving adoption in EVs, 5G, and more.</li>
            <li><strong>Speculative Potential</strong>: With the graphene market projected to grow from $897M in 2025 to $3.7B by 2030 (33.11% CAGR), HGRAPH offers exposure to this explosive growth.</li>
          </ul>
        </section>

        {/* Token Details */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Token Details</h2>
          <p className="text-gray-200">
            <strong>Contract Address:</strong>{' '}
            <a
              href="https://etherscan.io/token/0x544c9922b8f4b3a268562240e2eabba4e0f30359"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 hover:underline"
            >
              0x544c9922b8f4b3a268562240e2eabba4e0f30359
            </a>
          </p>
          <p className="text-gray-200">
            <strong>Blockchain:</strong> Ethereum
          </p>
          <p className="text-gray-200">
            <strong>Token Standard:</strong> ERC-20
          </p>
        </section>

        {/* Call to Action */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Join the Graphene Revolution</h2>
          <p className="text-gray-200 mb-4">
            Ready to invest in the future of graphene? Trade HGRAPH on Uniswap or connect your wallet to explore tokenomics. Always conduct your own research before investing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://app.uniswap.org/#/swap?outputCurrency=0x544c9922b8f4b3a268562240e2eabba4e0f30359"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded text-white font-semibold text-center"
            >
              Buy HGRAPH on Uniswap
            </a>
            <button
              onClick={() => window.ethereum && window.ethereum.request({ method: 'eth_requestAccounts' })}
              className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white font-semibold text-center"
            >
              Connect Wallet
            </button>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="text-sm text-gray-400 border-t border-gray-700 pt-4">
          <h3 className="text-lg font-semibold mb-2">Disclaimer</h3>
          <p>
            Investing in cryptocurrencies like HGRAPH involves significant risk and may result in the loss of your entire investment. HGRAPH is not affiliated with HydroGraph Clean Power Inc., MapleAurum, or any other company unless explicitly stated. Always perform your own due diligence and consult a financial advisor before investing. The information provided is for informational purposes only and does not constitute financial advice.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HGRAPHPage;