// Top horizontal step indicator. Renders a Hexagon per step from STEPS,
// fills with brass when completed, oxblood-glow when active. Verbatim from prototype.

import React from 'react';
import { Hexagon, Check } from 'lucide-react';
import { STEPS } from '../../config/steps.js';

const StepIndicator = ({ current, onStepClick, completed }) => (
  <div className="border-b border-pf-brass-dim/20 bg-pf-bg-elev/40 backdrop-blur-sm">
    <div className="max-w-7xl mx-auto px-8 py-5">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isActive = i === current;
          const isDone = completed.includes(i);
          const isClickable = i <= Math.max(current, ...completed);
          return (
            <React.Fragment key={step.key}>
              <button
                onClick={() => isClickable && onStepClick(i)}
                disabled={!isClickable}
                className={`group flex flex-col items-center gap-1.5 transition-all
                            ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
              >
                <div className="relative">
                  <Hexagon
                    size={38}
                    strokeWidth={1.2}
                    className={`transition-all ${
                      isActive ? 'text-pf-oxblood-glow drop-shadow-[0_0_8px_rgba(200,50,62,0.5)]'
                      : isDone ? 'text-pf-brass'
                      : 'text-pf-brass-dim/40'
                    }`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isDone ? (
                      <Check size={16} className="text-pf-brass" strokeWidth={2.5} />
                    ) : (
                      <span className={`font-display text-[10px] tracking-wider ${isActive ? 'text-pf-bone' : 'text-pf-stone'}`}>
                        {step.num}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`font-display text-[10px] tracking-[0.2em] uppercase transition-colors
                                  ${isActive ? 'text-pf-bone' : isDone ? 'text-pf-brass' : 'text-pf-stone'}`}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span className={`h-px flex-1 mx-2 transition-colors ${
                  i < current ? 'bg-pf-brass' : 'bg-pf-brass-dim/20'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  </div>
);

export default StepIndicator;
