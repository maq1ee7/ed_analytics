import React from 'react';
import ExponentialChart from '../charts/ExponentialChart';
import HistogramChart from '../charts/HistogramChart';
import RussiaInteractiveMap from '../charts/RussiaInteractiveMap';

const ChartsGrid: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Верхний ряд - два графика */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="w-full min-h-0">
          <ExponentialChart />
        </div>
        <div className="w-full min-h-0">
          <HistogramChart />
        </div>
      </div>

      {/* Нижний ряд - карта на всю ширину */}
      <div className="w-full">
        <RussiaInteractiveMap />
      </div>
    </div>
  );
};

export default ChartsGrid;
