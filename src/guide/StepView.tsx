import { memo } from 'react';
import type { Step } from './types';
import { FormattedText } from './FormattedText';

const META_LABELS: Record<string, string> = {
  gp_stack: 'GP stack',
  items_needed: 'Items needed',
};
const META_SKIP = new Set(['total_time', 'skills_quests_met']);

// Memoized so its DOM (search marks, user highlights) survives parent re-renders.
const StepBody = memo(function StepBody({ step }: { step: Step }) {
  const meta = Object.entries(step.metadata ?? {}).filter(([k, v]) => !META_SKIP.has(k) && v);
  return (
    <div className="step-body">
      <div className="step-text">
        <FormattedText content={step.content} />
      </div>
      {step.nestedContent?.map((n, i) => (
        <div key={i} className="step-nested" style={{ marginLeft: `${n.level * 1.25}rem` }}>
          <FormattedText content={n.content} />
        </div>
      ))}
      {meta.length > 0 && (
        <dl className="step-meta">
          {meta.map(([k, v]) => (
            <div key={k}>
              <dt>{META_LABELS[k] ?? k.replace(/_/g, ' ')}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
});

interface Props {
  step: Step;
  stepId: string;
  number: number;
  done: boolean;
  collapsed: boolean;
  hidden: boolean;
  onToggle: (stepId: string) => void;
}

export const StepView = memo(function StepView({ step, stepId, number, done, collapsed, hidden, onToggle }: Props) {
  const time = step.metadata?.total_time;
  return (
    <div
      id={`step-${stepId}`}
      className={`step${done ? ' done' : ''}${collapsed ? ' collapsed' : ''}`}
      hidden={hidden}
    >
      <div className="step-head">
        <label>
          <input type="checkbox" checked={done} onChange={() => onToggle(stepId)} />
          <span className="step-num">Step {number}</span>
        </label>
        {time && <span className="step-time">{time}</span>}
      </div>
      <StepBody step={step} />
    </div>
  );
});
