// src/pages/company-detail.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFilters } from '../contexts/filter-context';
import { useSubscription } from '../contexts/subscription-context';
import { Button } from '../components/ui/button';
import { PageContainer } from '../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  ArrowLeft, Heart, Building2, DollarSign, BarChart3, 
  Lock, TrendingUp, Coins, Mountain, Factory, Shield,
  AlertCircle, Loader2
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, cn } from '../lib/utils';
import { TierBadge } from '../components/ui/tier-badge';
import type { Company, ColumnTier, MetricConfig } from '../lib/types';
import { metrics as allMetrics } from '../lib/metric-types';

interface MetricDisplayProps {
  label: string;
  value: any;
  format?: 'currency' | 'number' | 'percent' | 'text';
  tier?: ColumnTier;
  userTier: ColumnTier;
  icon?: React.ReactNode;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({ 
  label, 
  value, 
  format = 'text', 
  tier = 'free',
  userTier,
  icon
}) => {
  const tierLevels: Record<ColumnTier, number> = { free: 0, pro: 1, premium: 2 };
  const hasAccess = tierLevels[userTier] >= tierLevels[tier];

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'N/A';
    switch (format) {
      case 'currency':
        return formatCurrency(val, { compact: true });
      case 'number':
        return formatNumber(val, { decimals: 1 });
      case 'percent':
        return formatPercent(val, 1);
      default:
        return String(val);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400 flex items-center gap-1">
          {icon}
          {label}
        </span>
        {!hasAccess && <TierBadge tier={tier} size="xs" />}
      </div>
      {hasAccess ? (
        <p className="text-gray-200 font-medium">{formatValue(value)}</p>
      ) : (
        <div className="flex items-center gap-2 text-gray-500">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Upgrade to view</span>
        </div>
      )}
    </div>
  );
};

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchCompaniesByIds, isCompanySelected, toggleCompanySelection, currentUserTier } = useFilters();
  const { currentUserSubscriptionTier } = useSubscription();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the subscription tier for data access
  const userTier = (currentUserSubscriptionTier as ColumnTier) || 'free';

  useEffect(() => {
    const loadCompany = async () => {
      if (!id || isNaN(Number(id))) {
        setError('Invalid company ID');
        setLoading(false);
        return;
      }

      try {
        const companies = await fetchCompaniesByIds([Number(id)]);
        if (companies.length > 0) {
          setCompany(companies[0]);
        } else {
          setError('Company not found');
        }
      } catch (err) {
        setError('Failed to load company details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [id, fetchCompaniesByIds]);

  if (loading) {
    return (
      <PageContainer title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      </PageContainer>
    );
  }

  if (error || !company) {
    return (
      <PageContainer title="Error">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <div className="text-red-400 text-lg">{error || 'Company not found'}</div>
          <Button onClick={() => navigate('/companies')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Companies
          </Button>
        </div>
      </PageContainer>
    );
  }

  const isFavorite = isCompanySelected(company.company_id);

  // Get metric configurations for tier checking
  const getMetricTier = (metricPath: string): ColumnTier => {
    const metric = allMetrics.find(m => m.nested_path === metricPath);
    return metric?.tier || 'free';
  };

  return (
    <PageContainer
      title={company.company_name}
      description={
        <div className="flex items-center gap-3">
          {company.tsx_code && (
            <span className="text-sm text-gray-400 font-medium">TSX: {company.tsx_code}</span>
          )}
          <span className="text-sm text-gray-400">•</span>
          <span className={cn(
            "text-sm font-medium capitalize",
            company.status === 'producer' && "text-green-400",
            company.status === 'developer' && "text-blue-400",
            company.status === 'explorer' && "text-purple-400",
            company.status === 'royalty' && "text-yellow-400"
          )}>
            {company.status || 'Other'}
          </span>
          {company.headquarters && (
            <>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-400">{company.headquarters}</span>
            </>
          )}
        </div>
      }
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => toggleCompanySelection(company.company_id)}
            variant={isFavorite ? "default" : "outline"}
            size="sm"
            className={cn(
              isFavorite && "bg-cyan-600 hover:bg-cyan-700"
            )}
          >
            <Heart className={cn(
              "w-4 h-4 mr-2",
              isFavorite && "fill-current"
            )} />
            {isFavorite ? 'Favorited' : 'Add to Favorites'}
          </Button>
          <Button onClick={() => navigate('/companies')} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Grid
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Company Overview Card */}
        <Card className="bg-navy-800/50 border-navy-600/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Company Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.description && (
              <div className="space-y-1">
                <span className="text-sm text-gray-400">Description</span>
                <p className="text-gray-200 text-sm leading-relaxed">{company.description}</p>
              </div>
            )}
            <MetricDisplay
              label="Minerals of Interest"
              value={company.minerals_of_interest?.join(', ') || 'None specified'}
              userTier={userTier}
            />
            <div className="grid grid-cols-2 gap-4">
              <MetricDisplay
                label="Gold %"
                value={company.percent_gold}
                format="percent"
                userTier={userTier}
              />
              <MetricDisplay
                label="Silver %"
                value={company.percent_silver}
                format="percent"
                userTier={userTier}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Metrics Card */}
        <Card className="bg-navy-800/50 border-navy-600/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              Financial Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricDisplay
              label="Share Price"
              value={company.share_price}
              format="currency"
              userTier={userTier}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricDisplay
              label="Market Cap"
              value={company.financials?.market_cap_value}
              format="currency"
              userTier={userTier}
              tier={getMetricTier('financials.market_cap_value')}
            />
            <MetricDisplay
              label="Enterprise Value"
              value={company.financials?.enterprise_value_value}
              format="currency"
              userTier={userTier}
              tier={getMetricTier('financials.enterprise_value_value')}
            />
            <MetricDisplay
              label="Cash Position"
              value={company.financials?.cash_value}
              format="currency"
              userTier={userTier}
              tier={getMetricTier('financials.cash_value')}
            />
            <MetricDisplay
              label="Free Cash Flow"
              value={company.financials?.free_cash_flow}
              format="currency"
              userTier={userTier}
              tier={getMetricTier('financials.free_cash_flow')}
            />
          </CardContent>
        </Card>

        {/* Valuation Metrics Card */}
        <Card className="bg-navy-800/50 border-navy-600/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Valuation Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricDisplay
              label="EV/EBITDA"
              value={company.financials?.enterprise_to_ebitda}
              format="number"
              userTier={userTier}
              tier={getMetricTier('financials.enterprise_to_ebitda')}
            />
            <MetricDisplay
              label="P/E Ratio"
              value={company.financials?.trailing_pe}
              format="number"
              userTier={userTier}
              tier={getMetricTier('financials.trailing_pe')}
            />
            <MetricDisplay
              label="Price to Book"
              value={company.financials?.price_to_book}
              format="number"
              userTier={userTier}
              tier={getMetricTier('financials.price_to_book')}
            />
            <MetricDisplay
              label="EV per Resource"
              value={company.valuation_metrics?.ev_per_resource_oz_all}
              format="currency"
              userTier={userTier}
              tier={getMetricTier('valuation_metrics.ev_per_resource_oz_all')}
            />
          </CardContent>
        </Card>

        {/* Production & Resources Card */}
        <Card className="bg-navy-800/50 border-navy-600/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Mountain className="w-5 h-5 text-cyan-400" />
              Production & Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricDisplay
              label="Current Production"
              value={company.production?.current_production_total_aueq_koz}
              format="number"
              userTier={userTier}
              tier={getMetricTier('production.current_production_total_aueq_koz')}
              icon={<Factory className="w-4 h-4" />}
            />
            <MetricDisplay
              label="Reserves"
              value={company.mineral_estimates?.reserves_total_aueq_moz}
              format="number"
              userTier={userTier}
              tier={getMetricTier('mineral_estimates.reserves_total_aueq_moz')}
            />
            <MetricDisplay
              label="M&I Resources"
              value={company.mineral_estimates?.measured_indicated_total_aueq_moz}
              format="number"
              userTier={userTier}
              tier={getMetricTier('mineral_estimates.measured_indicated_total_aueq_moz')}
            />
            <MetricDisplay
              label="Reserve Life"
              value={company.production?.reserve_life_years}
              format="number"
              userTier={userTier}
              tier={getMetricTier('production.reserve_life_years')}
            />
          </CardContent>
        </Card>

        {/* Costs Card */}
        {company.status === 'producer' && (
          <Card className="bg-navy-800/50 border-navy-600/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Coins className="w-5 h-5 text-cyan-400" />
                Operating Costs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetricDisplay
                label="AISC (Last Year)"
                value={company.costs?.aisc_last_year}
                format="currency"
                userTier={userTier}
                tier={getMetricTier('costs.aisc_last_year')}
              />
              <MetricDisplay
                label="AISC (Last Quarter)"
                value={company.costs?.aisc_last_quarter}
                format="currency"
                userTier={userTier}
                tier={getMetricTier('costs.aisc_last_quarter')}
              />
              <MetricDisplay
                label="Future AISC"
                value={company.costs?.aisc_future}
                format="currency"
                userTier={userTier}
                tier={getMetricTier('costs.aisc_future')}
              />
            </CardContent>
          </Card>
        )}

        {/* Risk Metrics Card */}
        <Card className="bg-navy-800/50 border-navy-600/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Risk Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricDisplay
              label="Debt Value"
              value={company.financials?.debt_value}
              format="currency"
              userTier={userTier}
              tier={getMetricTier('financials.debt_value')}
            />
            <MetricDisplay
              label="Debt/Equity"
              value={
                company.financials?.debt_value && company.financials?.market_cap_value
                  ? company.financials.debt_value / company.financials.market_cap_value
                  : null
              }
              format="percent"
              userTier={userTier}
              tier="pro"
            />
            <MetricDisplay
              label="Shares Outstanding"
              value={company.financials?.shares_outstanding}
              format="number"
              userTier={userTier}
              tier={getMetricTier('financials.shares_outstanding')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Upgrade CTA for free users */}
      {userTier === 'free' && (
        <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Unlock Full Company Analysis
              </h3>
              <p className="text-gray-400">
                Upgrade to Pro or Premium to access all metrics and advanced features
              </p>
            </div>
            <Button 
              onClick={() => navigate('/subscribe')}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default CompanyDetailPage;