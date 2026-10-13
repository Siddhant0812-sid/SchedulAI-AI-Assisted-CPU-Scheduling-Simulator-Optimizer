import React from 'react';
import { TimelineSegmentOutput, getProcessColor } from '../types/scheduling';

interface GanttChartProps {
  timeline: TimelineSegmentOutput[];
  highlightProcessId?: number | null;
  onSelectProcess?: (processId: number) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  timeline,
  highlightProcessId = null,
  onSelectProcess,
}) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="empty-banner">
        No timeline segments available for this algorithm.
      </div>
    );
  }

  const startTime = timeline[0].start_time;
  const endTime = timeline[timeline.length - 1].end_time;
  const totalDuration = Math.max(1, endTime - startTime);

  return (
    <div className="gantt-wrapper" aria-label="CPU Execution Gantt Chart">
      <div className="gantt-track" style={{ minWidth: `${Math.max(520, timeline.length * 64)}px` }}>
        {timeline.map((seg, idx) => {
          const duration = seg.end_time - seg.start_time;
          const widthPct = (duration / totalDuration) * 100;
          const isIdle = seg.process_id === null;
          const isDimmed =
            highlightProcessId !== null && seg.process_id !== highlightProcessId;
          const bgColor = getProcessColor(seg.process_id);

          return (
            <div
              key={`${seg.process_name}-${seg.start_time}-${idx}`}
              className={`gantt-segment ${isIdle ? 'gantt-idle' : ''} ${
                isDimmed ? 'gantt-dimmed' : ''
              } ${
                highlightProcessId !== null && seg.process_id === highlightProcessId
                  ? 'gantt-highlighted'
                  : ''
              }`}
              style={{
                width: `${widthPct}%`,
                backgroundColor: isIdle ? undefined : bgColor,
              }}
              onClick={() => {
                if (seg.process_id !== null && onSelectProcess) {
                  onSelectProcess(seg.process_id);
                }
              }}
              role={seg.process_id !== null && onSelectProcess ? 'button' : undefined}
              tabIndex={seg.process_id !== null ? 0 : -1}
              title={`${seg.process_name}: [${seg.start_time} → ${seg.end_time}] (Duration: ${duration})`}
              aria-label={`${seg.process_name} from time ${seg.start_time} to ${seg.end_time}, duration ${duration}`}
            >
              <span className="gantt-label">{seg.process_name}</span>
              <span className="gantt-duration">{duration}u</span>
              <span className="gantt-time-start">{seg.start_time}</span>
              {idx === timeline.length - 1 && (
                <span className="gantt-time-end">{seg.end_time}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

