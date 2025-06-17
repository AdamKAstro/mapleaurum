// src/components/glass-customization-tool.tsx
import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { StatusBadge } from './status-badge';
import { Badge } from './ui/badge';
import { MineralBadge } from './mineral-badge';
import { Copy, Check } from 'lucide-react';

interface GlassConfig {
  blur: string;
  opacity: string;
  color: string;
  border: string;
  shadow: string;
  gradient: string;
  animation: string;
  special: string;
}

export function GlassCustomizationTool() {
  const [config, setConfig] = useState<GlassConfig>({
    blur: 'md',
    opacity: '10',
    color: 'none',
    border: 'normal',
    shadow: 'glass',
    gradient: 'linear',
    animation: 'none',
    special: 'none'
  });

  const [copied, setCopied] = useState(false);

  const updateConfig = (key: keyof GlassConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const getClasses = () => {
    const classes = ['rounded-xl', 'p-6', 'transition-all', 'duration-300'];
    
    // Blur
    if (config.blur !== 'none') {
      classes.push(`glass-blur-${config.blur}`);
    }
    
    // Base opacity
    classes.push(`glass-opacity-${config.opacity}`);
    
    // Color variations
    if (config.color !== 'none') {
      classes.push(`glass-${config.color}`);
    }
    
    // Border variations
    switch (config.border) {
      case 'thin':
        classes.push('glass-border-thin');
        break;
      case 'thick':
        classes.push('glass-border-thick');
        break;
      case 'gradient':
        classes.push('glass-border-gradient');
        break;
      case 'glow':
        classes.push('glass-border-glow');
        break;
      default:
        classes.push('border border-white/20');
    }
    
    // Shadow variations
    if (config.shadow !== 'none') {
      classes.push(config.shadow);
    }
    
    // Gradient variations
    if (config.gradient !== 'linear' && config.color === 'none') {
      classes.push(`glass-gradient-${config.gradient}`);
    }
    
    // Animations
    if (config.animation !== 'none') {
      classes.push(`glass-${config.animation}`);
    }
    
    // Special effects
    if (config.special !== 'none') {
      classes.push(`glass-${config.special}`);
    }
    
    return classes.join(' ');
  };

  const copyClasses = async () => {
    try {
      await navigator.clipboard.writeText(getClasses());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const examples = [
    { name: 'Classic Glass', config: { blur: 'md', opacity: '10', color: 'none', border: 'normal', shadow: 'glass', gradient: 'linear', animation: 'none', special: 'none' } },
    { name: 'Frosted Glass', config: { blur: 'lg', opacity: '15', color: 'none', border: 'normal', shadow: 'glass-lg', gradient: 'linear', animation: 'none', special: 'frosted' } },
    { name: 'Colored Glass', config: { blur: 'md', opacity: '10', color: 'blue', border: 'normal', shadow: 'glass-shadow-colored', gradient: 'linear', animation: 'none', special: 'none' } },
    { name: 'Aurora Glass', config: { blur: 'lg', opacity: '10', color: 'aurora', border: 'glow', shadow: 'glass-lg', gradient: 'linear', animation: 'none', special: 'none' } },
    { name: 'Animated Glass', config: { blur: 'md', opacity: '10', color: 'none', border: 'normal', shadow: 'glass', gradient: 'linear', animation: 'shimmer', special: 'none' } },
    { name: 'Premium Glass', config: { blur: 'xl', opacity: '15', color: 'none', border: 'gradient', shadow: 'glass-shadow-multi', gradient: 'linear', animation: 'none', special: 'premium' } },
    { name: 'Metallic Glass', config: { blur: 'md', opacity: '20', color: 'none', border: 'thick', shadow: 'glass-shadow-hard', gradient: 'linear', animation: 'none', special: 'metallic' } },
    { name: 'Neumorphic Glass', config: { blur: 'md', opacity: '10', color: 'none', border: 'normal', shadow: 'none', gradient: 'linear', animation: 'none', special: 'neumorphic' } }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Preview Area */}
      <div className="flex justify-center">
        <div className="relative">
          <div className={getClasses()}>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Glass Preview
            </h2>
            <p className="text-white/80 mb-4">
              This is how your glass component looks with the current settings.
              Adjust the options below to customize the appearance.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">Primary</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <StatusBadge status="producer" />
              <Badge variant="success">Active</Badge>
              <MineralBadge mineral="gold" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Examples */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Quick Examples</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => setConfig(example.config as GlassConfig)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white text-sm transition-colors"
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      {/* Customization Controls */}
      <div className="glass-card rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-white mb-6">Customization Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Blur Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Blur Intensity
            </label>
            <select
              value={config.blur}
              onChange={(e) => updateConfig('blur', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="none">None</option>
              <option value="xs">Extra Small (2px)</option>
              <option value="sm">Small (4px)</option>
              <option value="md">Medium (8px)</option>
              <option value="lg">Large (16px)</option>
              <option value="xl">Extra Large (24px)</option>
              <option value="2xl">2X Large (40px)</option>
              <option value="3xl">3X Large (64px)</option>
            </select>
          </div>

          {/* Opacity Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Background Opacity
            </label>
            <select
              value={config.opacity}
              onChange={(e) => updateConfig('opacity', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="5">5%</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
            </select>
          </div>

          {/* Color Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Color Tint
            </label>
            <select
              value={config.color}
              onChange={(e) => updateConfig('color', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="none">None</option>
              <option value="blue">Blue</option>
              <option value="purple">Purple</option>
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="red">Red</option>
              <option value="teal">Teal</option>
              <option value="aurora">Aurora</option>
            </select>
          </div>

          {/* Border Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Border Style
            </label>
            <select
              value={config.border}
              onChange={(e) => updateConfig('border', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="normal">Normal</option>
              <option value="thin">Thin</option>
              <option value="thick">Thick</option>
              <option value="gradient">Gradient</option>
              <option value="glow">Glow</option>
            </select>
          </div>

          {/* Shadow Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Shadow Type
            </label>
            <select
              value={config.shadow}
              onChange={(e) => updateConfig('shadow', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="none">None</option>
              <option value="glass">Glass (Default)</option>
              <option value="glass-lg">Glass Large</option>
              <option value="glass-shadow-soft">Soft</option>
              <option value="glass-shadow-hard">Hard</option>
              <option value="glass-shadow-colored">Colored</option>
              <option value="glass-shadow-multi">Multi-layer</option>
              <option value="glass-shadow-inner">Inner</option>
            </select>
          </div>

          {/* Gradient Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Gradient Type
            </label>
            <select
              value={config.gradient}
              onChange={(e) => updateConfig('gradient', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
              <option value="conic">Conic</option>
              <option value="diagonal">Diagonal</option>
            </select>
          </div>

          {/* Animation Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Animation
            </label>
            <select
              value={config.animation}
              onChange={(e) => updateConfig('animation', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="none">None</option>
              <option value="shimmer">Shimmer</option>
              <option value="shimmer-slow">Shimmer Slow</option>
              <option value="shimmer-fast">Shimmer Fast</option>
              <option value="pulse">Pulse</option>
              <option value="rotate">Rotate</option>
            </select>
          </div>

          {/* Special Effects Control */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Special Effects
            </label>
            <select
              value={config.special}
              onChange={(e) => updateConfig('special', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              <option value="none">None</option>
              <option value="frosted">Frosted</option>
              <option value="metallic">Metallic</option>
              <option value="iridescent">Iridescent</option>
              <option value="noise">Noise Texture</option>
              <option value="neumorphic">Neumorphic</option>
              <option value="neumorphic-inset">Neumorphic Inset</option>
              <option value="premium">Premium</option>
              <option value="elegant">Elegant</option>
            </select>
          </div>
        </div>

        {/* Generated Classes Display */}
        <div className="mt-8 p-4 bg-black/30 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="text-white/80 text-sm font-medium mb-2">Generated Classes:</h4>
              <code className="text-green-400 text-sm break-all">
                {getClasses()}
              </code>
            </div>
            <button
              onClick={copyClasses}
              className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={copied ? "Copied!" : "Copy classes"}
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-white/60" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="glass-card rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-white mb-6">Usage Examples</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white/80 font-medium mb-3">Component with Multiple Effects</h4>
            <div className="glass-premium glass-interactive glass-shimmer-slow rounded-xl p-4">
              <p className="text-white/80 text-sm">
                Premium interactive glass with shimmer animation
              </p>
            </div>
            <code className="text-green-400 text-xs mt-2 block">
              class="glass-premium glass-interactive glass-shimmer-slow"
            </code>
          </div>

          <div>
            <h4 className="text-white/80 font-medium mb-3">Custom CSS Variables</h4>
            <div 
              className="glass-custom rounded-xl p-4"
              style={{
                '--glass-blur': '20px',
                '--glass-bg': 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.1))',
                '--glass-border-color': 'rgba(147, 51, 234, 0.3)'
              } as React.CSSProperties}
            >
              <p className="text-white/80 text-sm">
                Custom glass using CSS variables
              </p>
            </div>
            <code className="text-green-400 text-xs mt-2 block">
              class="glass-custom" style="--glass-blur: 20px; ..."
            </code>
          </div>
        </div>
      </div>

      {/* Real Component Examples */}
      <div className="glass-card rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-white mb-6">Your Components with Glass Effects</h3>
        
        <div className="space-y-6">
          {/* StatusBadge Examples */}
          <div>
            <h4 className="text-white/80 font-medium mb-3">StatusBadge Variations</h4>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <StatusBadge status="producer" className="glass-green glass-shimmer" />
                <p className="text-xs text-white/60">glass-green glass-shimmer</p>
              </div>
              <div className="space-y-1">
                <StatusBadge status="developer" className="glass-metallic" />
                <p className="text-xs text-white/60">glass-metallic</p>
              </div>
              <div className="space-y-1">
                <StatusBadge status="explorer" className="glass-aurora" />
                <p className="text-xs text-white/60">glass-aurora</p>
              </div>
            </div>
          </div>

          {/* Button Examples */}
          <div>
            <h4 className="text-white/80 font-medium mb-3">Button Variations</h4>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <Button variant="primary" className="glass-frosted glass-interactive">
                  Frosted Button
                </Button>
                <p className="text-xs text-white/60">glass-frosted glass-interactive</p>
              </div>
              <div className="space-y-1">
                <Button variant="secondary" className="glass-neumorphic">
                  Neumorphic
                </Button>
                <p className="text-xs text-white/60">glass-neumorphic</p>
              </div>
            </div>
          </div>

          {/* MineralBadge Examples */}
          <div>
            <h4 className="text-white/80 font-medium mb-3">MineralBadge Variations</h4>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <MineralBadge mineral="gold" className="glass-metallic glass-shimmer" />
                <p className="text-xs text-white/60">glass-metallic glass-shimmer</p>
              </div>
              <div className="space-y-1">
                <MineralBadge mineral="uranium" className="glass-pulse glass-border-glow" />
                <p className="text-xs text-white/60">glass-pulse glass-border-glow</p>
              </div>
              <div className="space-y-1">
                <MineralBadge mineral="lithium" className="glass-iridescent" />
                <p className="text-xs text-white/60">glass-iridescent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}