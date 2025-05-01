export const products = {
  pro: {
    priceId: 'price_1RJVcCPMCIlIT9KEUaR6HP2J',
    name: 'Maple Aurum Pro',
    description: 'Maple Aurum Pro. Advanced analytics and insights',
    mode: 'subscription' as const,
    successUrl: 'https://mapleaurum.com/subscribe/success',
    cancelUrl: 'https://mapleaurum.com/subscribe'
  },
  premium: {
    priceId: 'price_1RJVdHPMCIlIT9KE489wZrgI',
    name: 'Maple Aurum Premium',
    description: 'Maple Aurum Premium. Complete access and premium features',
    mode: 'subscription' as const,
    successUrl: 'https://mapleaurum.com/subscribe/success',
    cancelUrl: 'https://mapleaurum.com/subscribe'
  },
} as const;