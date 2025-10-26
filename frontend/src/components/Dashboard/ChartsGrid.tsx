import React from 'react';
import ExponentialChart from '../charts/ExponentialChart';
import RussiaInteractiveMap from '../charts/RussiaInteractiveMap';
import RadarChart from '../charts/RadarChart';
import FederalSharesChart from '../charts/FederalSharesChart';

const ChartsGrid: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Первый ряд - основной график */}
      <div className="w-full min-h-0">
        <ExponentialChart />
      </div>

      {/* Второй ряд - региональные показатели */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="w-full min-h-0">
          <RadarChart />
        </div>
        <div className="w-full min-h-0">
          <FederalSharesChart />
        </div>
      </div>

      {/* Третий ряд - карта на всю ширину */}
      <div className="w-full">
        <RussiaInteractiveMap />
      </div>
    </div>
  );
};

export default ChartsGrid;
