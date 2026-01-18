'use client';

import { Button } from '@/components/ui/button';

interface CreditBalanceProps {
  balance: string;
  onPurchaseClick?: () => void;
}

export function CreditBalance({ balance, onPurchaseClick }: CreditBalanceProps) {
  const balanceNum = parseFloat(balance || '0');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Credit Balance</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {balanceNum.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {balanceNum === 1 ? 'video credit' : 'video credits'}
          </p>
        </div>
      </div>

      {onPurchaseClick && (
        <div className="mt-4">
          <Button onClick={onPurchaseClick} className="w-full">
            Purchase Credits
          </Button>
        </div>
      )}
    </div>
  );
}
