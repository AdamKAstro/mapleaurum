// This is the full content for your NEW file: src/pages/GrapheneExplorerPage.tsx

import React from 'react';
import { Helmet } from 'react-helmet-async';

// Styles to make the iframe fill the entire browser window, with no borders
const explorerContainerStyle: React.CSSProperties = {
  position: 'fixed', // Fixed position to cover viewport
  top: 0,
  left: 0,
  width: '100vw',    // 100% of the viewport width
  height: '100vh',   // 100% of the viewport height
  overflow: 'hidden',
  backgroundColor: '#0a0e27' // Match the explorer's dark background
};

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: '0', // No border
};

/**
 * A standalone page that hosts the self-contained HydroGraph Graphene Explorer
 * in a full-screen iframe, completely independent of the main site's Header/Sidebar layout.
 */
const GrapheneExplorerPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>HydroGraph Reactive Graphene Explorer</title>
        <meta
          name="description"
          content="Interactive Graphene Additive Explorer: Simulate fractal combinations of reactive graphene additives and visualize data on chemical properties, binding energy, and applications."
        />
        <meta
          name="keywords"
          content="graphene, fractal graphene, reactive graphene, hydrograph, simulation, data visualization, material science, chemical additives"
        />
        {/* Update this canonical URL to whatever path you decide in App.tsx */}
        <link rel="canonical" href="https://mapleaurum.com/graphene-explorer" />
      </Helmet>
      <div style={explorerContainerStyle}>
        <iframe
          src="/hydrograph/HydroGraphRGExplorer.html"
          title="HydroGraph Reactive Graphene Explorer"
          style={iframeStyle}
          sandbox="allow-scripts allow-same-origin" 
        />
      </div>
    </>
  );
};

export default GrapheneExplorerPage;