import React from 'react';
import { Users, CheckCircle2, TrendingUp } from 'lucide-react';

interface StatsProps {
  total: number;
  closed: number;
  totalRevenue?: number;
}

export const Stats: React.FC<StatsProps> = ({ total, closed, totalRevenue }) => {
  const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
          <Users size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">Total Contactos</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">Clientes Cerrados</p>
          <p className="text-2xl font-bold text-gray-900">{closed}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
          <TrendingUp size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">Tasa de Conversión</p>
          <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
        </div>
      </div>

      {totalRevenue !== undefined && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Ingresos Totales</p>
            <p className="text-2xl font-bold text-emerald-600">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};
