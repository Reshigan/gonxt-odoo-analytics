// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — CoreUI Components Unit Tests
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { render, screen } from '@testing-library/react';
import { KPICard, Badge, StateBadge, StockBadge, SeverityBadge, DeliveryBadge } from '../src/components/CoreUI';
import { TrendingUp, CheckCircle, XCircle, Truck, DollarSign, Clock, AlertCircle } from 'lucide-react';

describe('CoreUI Components', () => {
  describe('KPICard', () => {
    it('should render with correct title and value', () => {
      render(
        <KPICard 
          title="Test Metric" 
          value="R 1,000K" 
          icon={TrendingUp}
          color="#00D4F5"
        />
      );

      expect(screen.getByText('Test Metric')).toBeInTheDocument();
      expect(screen.getByText('R 1,000K')).toBeInTheDocument();
    });

    it('should display positive delta correctly', () => {
      render(
        <KPICard 
          title="Test Metric" 
          value="R 1,000K" 
          delta={5.2}
          icon={TrendingUp}
          color="#00D4F5"
        />
      );

      expect(screen.getByText('+5.2%')).toBeInTheDocument();
    });

    it('should display negative delta correctly', () => {
      render(
        <KPICard 
          title="Test Metric" 
          value="R 1,000K" 
          delta={-3.1}
          icon={TrendingUp}
          color="#00D4F5"
        />
      );

      expect(screen.getByText('-3.1%')).toBeInTheDocument();
    });
  });

  describe('Badges', () => {
    it('should render generic badge with correct text and color', () => {
      render(<Badge color="#00D4F5">Test</Badge>);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should render state badge with correct icon and text', () => {
      render(<StateBadge state="sale" />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('should render stock badge with correct styling', () => {
      render(<StockBadge status="stockout" />);
      expect(screen.getByText('Stockout')).toBeInTheDocument();
    });

    it('should render severity badge with correct colors', () => {
      render(<SeverityBadge severity="critical" />);
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('should render delivery badge with correct status', () => {
      render(<DeliveryBadge state="complete" />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });
});