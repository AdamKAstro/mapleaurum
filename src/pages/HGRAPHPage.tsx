// src/pages/HGRAPHPage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

const HGRAPHPage: React.FC = () => {
  return (
    <div className="p-6 text-white bg-navy-900 min-h-screen">
      <Helmet>
        <title>HGRAPH | Community Token Inspired by Graphene Research</title>
        <meta
          name="description"
          content="HGRAPH is an independent community cryptocurrency token inspired by graphene research. Educational project - not affiliated with any company. High risk speculative token."
        />
        <meta
          name="keywords"
          content="HGRAPH, graphene, cryptocurrency, community token, educational, speculative, Polygon, DeFi"
        />
        <link rel="canonical" href="https://mapleaurum.com/HGRAPH" />
      </Helmet>
      
      <div className="max-w-4xl mx-auto">
        {/* CRITICAL DISCLAIMER - TOP OF PAGE */}
        <div className="mb-8 p-6 bg-red-900 border-2 border-red-600 rounded-lg">
          <h2 className="text-2xl font-bold text-red-200 mb-4">⚠️ IMPORTANT DISCLAIMERS</h2>
          <div className="space-y-3 text-red-100">
            <p className="font-semibold">
              HGRAPH is an INDEPENDENT community token NOT AFFILIATED with HydroGraph Clean Power Inc. or any other company.
            </p>
            <p>
              This is a highly speculative, experimental cryptocurrency with extreme risk of total loss. 
              Only trade with funds you can afford to lose completely.
            </p>
            <p>
              This token was created as an educational/community project inspired by graphene research. 
              It has NO intrinsic value and NO business backing.
            </p>
            <p className="font-semibold">
              NOT FINANCIAL ADVICE. Consult professionals before any investment decisions.
            </p>
          </div>
        </div>

        {/* Logo Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto w-32 h-32 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-white">HG</span>
          </div>
          <p className="text-sm text-gray-400">Custom logo coming soon</p>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">HGRAPH: Community Token Inspired by Graphene Research</h1>
        
        {/* NOW LIVE Section */}
        <div className="mb-8 p-4 bg-green-800 border border-green-600 rounded-lg">
          <h3 className="text-lg font-semibold text-green-200 mb-2">🎉 NOW LIVE ON POLYGON</h3>
          <p className="text-green-100">
            HGRAPH is now tradeable with active liquidity pools. Proceed with extreme caution - very low liquidity means high volatility.
          </p>
        </div>

        <p className="text-lg mb-4">
          HGRAPH is an independent community cryptocurrency token created to celebrate and discuss the potential of graphene research. 
          Inspired by innovations in fractal graphene and materials science, this educational project brings together enthusiasts 
          interested in the "wonder material" that could transform multiple industries.
        </p>

        {/* Educational Focus */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Educational Mission: The Graphene Revolution</h2>
          <p className="text-gray-200 mb-4">
            Graphene, a single layer of carbon atoms, represents one of the most promising materials of the 21st century. 
            Research into fractal graphene production, enhanced dispersion methods, and scalable manufacturing continues to 
            advance across universities and companies worldwide.
          </p>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li><strong>Educational Purpose</strong>: This token serves as a focal point for graphene research discussions and community building around materials science.</li>
            <li><strong>Research Awareness</strong>: Highlighting innovations in graphene production, from detonation synthesis to scalable manufacturing processes.</li>
            <li><strong>Community Driven</strong>: Building a network of enthusiasts interested in next-generation materials and their applications.</li>
          </ul>
        </section>

        {/* Token Details */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Token Information</h2>
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-200 mb-2">
                  <strong>Contract Address:</strong>
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-cyan-400 text-sm bg-gray-900 p-2 rounded flex-1">
                    0x5209500eed0c66762158770f0d719EE7745954E0
                  </code>
                  <button 
                    onClick={() => navigator.clipboard.writeText('0x5209500eed0c66762158770f0d719EE7745954E0')}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <p className="text-gray-200"><strong>Network:</strong> Polygon</p>
                <p className="text-gray-200"><strong>Standard:</strong> ERC-20</p>
                <p className="text-gray-200"><strong>Total Supply:</strong> 10,000 HGRAPH</p>
                <p className="text-gray-200"><strong>Decimals:</strong> 18</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
            <h3 className="text-yellow-200 font-semibold mb-2">⚠️ Trading Warnings</h3>
            <ul className="text-yellow-100 text-sm space-y-1">
              <li>• Very low liquidity (~$22 total) means extreme price volatility</li>
              <li>• High slippage expected on trades</li>
              <li>• Price can change dramatically with small trades</li>
              <li>• No guarantees of liquidity or ability to sell</li>
            </ul>
          </div>
        </section>

        {/* Trading Information */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Where to Trade (High Risk)</h2>
          
          <div className="mb-6 p-4 bg-red-800 rounded-lg">
            <h3 className="text-red-200 font-semibold mb-2">🚨 EXTREME RISK WARNING</h3>
            <p className="text-red-100 text-sm">
              Current liquidity is extremely low. Any trading should be done with micro amounts only. 
              Expect 20-50% slippage or complete inability to trade. This is experimental software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-400 mb-2">SushiSwap (Primary)</h3>
              <p className="text-gray-300 text-sm mb-3">Available trading pairs with low liquidity</p>
              <ul className="text-gray-300 text-sm space-y-1 mb-3">
                <li>• HGRAPH/WPOL (~$21 liquidity)</li>
                <li>• HGRAPH/USDC (~$1 liquidity)</li>
              </ul>
              <a
                href="https://sushi.com/swap?token0=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&token1=0x5209500eed0c66762158770f0d719EE7745954E0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
              >
                Trade on SushiSwap
              </a>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-2">Live Data</h3>
              <p className="text-gray-300 text-sm mb-3">Current market information</p>
              <ul className="text-gray-300 text-sm space-y-1 mb-3">
                <li>• <a href="https://www.geckoterminal.com/polygon_pos/pools" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">GeckoTerminal Charts</a></li>
                <li>• <a href="https://dexscreener.com/polygon/0x5209500eed0c66762158770f0d719EE7745954E0" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">DexScreener</a></li>
                <li>• <a href="https://polygonscan.com/address/0x5209500eed0c66762158770f0d719EE7745954E0" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">PolygonScan</a></li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">How to Trade (For Experienced Users Only)</h3>
            <ol className="text-gray-300 text-sm space-y-2">
              <li>1. <strong>Connect wallet</strong> to SushiSwap on Polygon network</li>
              <li>2. <strong>Have MATIC</strong> for gas fees (very small amounts needed)</li>
              <li>3. <strong>Set high slippage</strong> (10-20%) due to low liquidity</li>
              <li>4. <strong>Start with micro amounts</strong> ($1-5 maximum for testing)</li>
              <li>5. <strong>Expect volatility</strong> - prices change rapidly</li>
            </ol>
          </div>
        </section>

        {/* Community Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Community & Future Plans</h2>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Educational Initiatives</h3>
            <ul className="text-gray-300 space-y-2">
              <li>• Graphene research awareness and discussion</li>
              <li>• Educational content about materials science</li>
              <li>• Community-driven learning about nanotechnology</li>
              <li>• Potential future: Research funding donations (if token succeeds)</li>
            </ul>
          </div>
        </section>

        {/* Add to Wallet */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Add to Wallet</h2>
          <button
            onClick={async () => {
              if (window.ethereum) {
                try {
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }], // Polygon
                  });
                  
                  await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                      type: 'ERC20',
                      options: {
                        address: '0x5209500eed0c66762158770f0d719EE7745954E0',
                        symbol: 'HGRAPH',
                        decimals: 18,
                      },
                    },
                  });
                } catch (error) {
                  console.error('Error adding token:', error);
                }
              } else {
                alert('Please install MetaMask to add token to wallet');
              }
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
          >
            Add HGRAPH to MetaMask
          </button>
        </section>

        {/* Comprehensive Disclaimer */}
        <section className="text-sm text-gray-400 border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold mb-4 text-red-400">COMPREHENSIVE DISCLAIMERS & RISKS</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">No Affiliation</h4>
              <p>
                HGRAPH is completely independent and has NO affiliation, partnership, endorsement, or connection 
                with HydroGraph Clean Power Inc., The Graphene Council, or any other graphene-related company or organization.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Extreme Financial Risk</h4>
              <p>
                This token is experimental software with extreme risk of total loss. Current liquidity is minimal (~$22). 
                Prices are highly volatile and unpredictable. You may be unable to sell tokens or recover any value.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-300 mb-2">No Utility or Value Promise</h4>
              <p>
                HGRAPH has no inherent utility, use case, or promise of future value. It is purely experimental and educational. 
                There are no roadmaps, business plans, or development promises.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Regulatory Uncertainty</h4>
              <p>
                Cryptocurrency regulations vary by jurisdiction and are constantly evolving. This token may be subject 
                to regulatory action, restrictions, or prohibition in your jurisdiction.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Technical Risks</h4>
              <p>
                Smart contracts can contain bugs, vulnerabilities, or unexpected behavior. The Polygon network, 
                SushiSwap, and related infrastructure may experience downtime, hacks, or other technical issues.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Not Financial Advice</h4>
              <p>
                Nothing on this website constitutes financial, investment, legal, or professional advice. 
                Always consult qualified professionals before making any financial decisions.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-red-900 rounded-lg">
            <p className="font-semibold text-red-200">
              BY INTERACTING WITH HGRAPH, YOU ACKNOWLEDGE UNDERSTANDING THESE RISKS AND AGREE THAT YOU ARE SOLELY 
              RESPONSIBLE FOR ANY LOSSES. NEVER TRADE MORE THAN YOU CAN AFFORD TO LOSE COMPLETELY.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HGRAPHPage;