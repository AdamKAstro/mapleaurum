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
          content="HGRAPH, graphene, cryptocurrency, fractal graphene, reactive graphene, technology, investment, Polygon"
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
        
        {/* STATUS UPDATE - NEW */}
        <div className="mb-6 p-4 bg-green-800 border border-green-600 rounded-lg">
          <h3 className="text-lg font-semibold text-green-200 mb-2">🎉 HGRAPH is Now Live!</h3>
          <p className="text-green-100">
            HGRAPH has successfully launched on Polygon network with lower fees and faster transactions. 
            Trading is now available with initial liquidity pools active.
          </p>
        </div>

        <p className="text-lg mb-4">
          HGRAPH is your gateway to the graphene revolution, a cryptocurrency token designed to capture the transformative potential of graphene—the material poised to redefine our civilization. With breakthroughs like HydroGraph's fractal and reactive graphene, offering 99.8% purity and unparalleled scalability, HGRAPH positions you at the forefront of a technological leap in composites, energy storage, and biomedical applications.
        </p>
        <p className="text-lg mb-4 font-semibold text-cyan-400">
          Important: HGRAPH is an independent cryptocurrency token and is not affiliated with HydroGraph Clean Power Inc. or any other company. It is a speculative investment vehicle for those excited about graphene's future.
        </p>

        {/* Graphene Revolution Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Why HGRAPH? The Graphene Revolution Awaits</h2>
          <p className="text-gray-200 mb-4">
            Graphene, dubbed the "wonder material" of the 21st century, is set to transform industries with its unmatched strength, conductivity, and versatility. Innovations like HydroGraph's patented detonation process produce fractal graphene with reactive edges, solving the clumping problem and enabling applications from super-strong composites to ultra-efficient batteries. HGRAPH lets you tap into this monumental shift without investing in individual stocks.
          </p>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li><strong>Fractal Graphene Innovation</strong>: HydroGraph's 99.8% pure graphene, validated by The Graphene Council, offers superior dispersion for composites, boosting strength by up to 27% in concrete and reducing wear by 80% in aerospace applications.</li>
            <li><strong>Scalable Production</strong>: Breakthroughs in scalable graphene production, like KTH's carbon fiber method, are slashing costs and driving adoption in EVs, 5G, and more.</li>
            <li><strong>Speculative Potential</strong>: With the graphene market projected to grow from $897M in 2025 to $3.7B by 2030 (33.11% CAGR), HGRAPH offers exposure to this explosive growth.</li>
          </ul>
        </section>

        {/* Token Details - UPDATED */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Token Details</h2>
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <p className="text-gray-200 mb-2">
              <strong>Contract Address:</strong>{' '}
              <a
                href="https://polygonscan.com/address/0x5209500eed0c66762158770f0d719EE7745954E0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-mono text-sm"
              >
                0x5209500eed0c66762158770f0d719EE7745954E0
              </a>
              <button 
                onClick={() => navigator.clipboard.writeText('0x5209500eed0c66762158770f0d719EE7745954E0')}
                className="ml-2 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
              >
                Copy
              </button>
            </p>
            <p className="text-gray-200 mb-2">
              <strong>Blockchain:</strong> Polygon (MATIC)
            </p>
            <p className="text-gray-200 mb-2">
              <strong>Token Standard:</strong> ERC-20
            </p>
            <p className="text-gray-200 mb-2">
              <strong>Total Supply:</strong> 10,000 HGRAPH
            </p>
            <p className="text-gray-200">
              <strong>Decimals:</strong> 18
            </p>
          </div>
        </section>

        {/* Trading Section - UPDATED */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How to Buy HGRAPH</h2>
          
          {/* Step-by-step guide */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-cyan-400">Quick Start Guide:</h3>
            <ol className="list-decimal list-inside text-gray-200 space-y-2">
              <li>Connect your wallet to Polygon network</li>
              <li>Get MATIC for gas fees (very low cost)</li>
              <li>Visit Uniswap and paste HGRAPH contract address</li>
              <li>Swap MATIC, USDC, or ETH for HGRAPH</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <a
              href="https://app.uniswap.org/#/swap?chain=polygon&outputCurrency=0x5209500eed0c66762158770f0d719EE7745954E0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded text-white font-semibold text-center"
            >
              Buy on Uniswap (Polygon)
            </a>
            <a
              href="https://quickswap.exchange/#/swap?outputCurrency=0x5209500eed0c66762158770f0d719EE7745954E0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold text-center"
            >
              Buy on QuickSwap
            </a>
          </div>

          <button
            onClick={async () => {
              if (window.ethereum) {
                try {
                  // Switch to Polygon network
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }], // Polygon mainnet
                  });
                  
                  // Add HGRAPH token to wallet
                  await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                      type: 'ERC20',
                      options: {
                        address: '[YOUR_NEW_CONTRACT_ADDRESS]',
                        symbol: 'HGRAPH',
                        decimals: 18,
                        image: 'https://mapleaurum.com/HGlogo.jpg',
                      },
                    },
                  });
                } catch (error) {
                  console.error('Error adding token:', error);
                }
              } else {
                alert('Please install MetaMask to connect your wallet');
              }
            }}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white font-semibold"
          >
            Add HGRAPH to Wallet
          </button>
        </section>

        {/* Market Info Section - NEW */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Market Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-cyan-400">Network</h3>
              <p className="text-2xl font-bold">Polygon</p>
              <p className="text-sm text-gray-400">Low fees, fast transactions</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-cyan-400">Supply</h3>
              <p className="text-2xl font-bold">10,000</p>
              <p className="text-sm text-gray-400">Fixed supply</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-cyan-400">Status</h3>
              <p className="text-2xl font-bold text-green-400">LIVE</p>
              <p className="text-sm text-gray-400">Trading active</p>
            </div>
          </div>
        </section>

        {/* Useful Links - NEW */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Useful Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="https://polygonscan.com/address/[YOUR_NEW_CONTRACT_ADDRESS]"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-center text-sm"
            >
              PolygonScan
            </a>
            <a
              href="https://dexscreener.com/polygon/[YOUR_POOL_ADDRESS]"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-center text-sm"
            >
              DexScreener
            </a>
            <a
              href="https://app.uniswap.org/#/pools"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded text-center text-sm"
            >
              Liquidity Pools
            </a>
            <a
              href="https://bridge.polygon.technology/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-center text-sm"
            >
              Polygon Bridge
            </a>
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