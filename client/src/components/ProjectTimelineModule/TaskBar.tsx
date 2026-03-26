import React, { useEffect, useRef, useState } from 'react';
import type { TimelineTask } from '../../app/types';
import { addDays } from './utils';

interface TaskBarProps {
  task: TimelineTask;
  phaseColor: string;
  dayWidth: number;
  rowTop: number;
  rowHeight: number;
  hasConflict: boolean;
  onCommit: (taskId: string, nextStartDate: string, nextEndDate: string) => void;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';

export const TaskBar: React.FC<TaskBarProps> = ({
  task,
  phaseColor,
  dayWidth,
  rowTop,
  rowHeight,
  hasConflict,
  onCommit,
}) => {
  const [previewStartOffset, setPreviewStartOffset] = useState(task.startOffset);
  const [previewDuration, setPreviewDuration] = useState(task.durationInDays);
  const dragRef = useRef<{ mode: DragMode; pointerX: number; startOffset: number; duration: number } | null>(null);

  useEffect(() => {
    setPreviewStartOffset(task.startOffset);
    setPreviewDuration(task.durationInDays);
  }, [task.startOffset, task.durationInDays]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const deltaDays = Math.round((event.clientX - dragRef.current.pointerX) / dayWidth);

      if (dragRef.current.mode === 'move') {
        setPreviewStartOffset(Math.max(0, dragRef.current.startOffset + deltaDays));
      } else if (dragRef.current.mode === 'resize-start') {
        const nextOffset = Math.max(0, dragRef.current.startOffset + deltaDays);
        const endOffset = dragRef.current.startOffset + dragRef.current.duration - 1;
        const nextDuration = Math.max(1, endOffset - nextOffset + 1);
        setPreviewStartOffset(nextOffset);
        setPreviewDuration(nextDuration);
      } else {
        setPreviewDuration(Math.max(1, dragRef.current.duration + deltaDays));
      }
    };

    const onUp = () => {
      if (!dragRef.current) return;
      const nextStartDate = addDays(task.startDate, previewStartOffset - task.startOffset);
      const nextEndDate = addDays(nextStartDate, previewDuration - 1);
      dragRef.current = null;
      onCommit(task.id, nextStartDate, task.type === 'milestone' ? nextStartDate : nextEndDate);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dayWidth, onCommit, previewDuration, previewStartOffset, task.id, task.startDate, task.startOffset, task.type]);

  if (task.type === 'milestone') {
    const left = previewStartOffset * dayWidth + dayWidth / 2;
    return (
      <button
        type="button"
        title={`${task.title}\n${task.startDate}`}
        className="absolute"
        style={{ left: left - 10, top: rowTop + rowHeight / 2 - 10 }}
        onPointerDown={(event) => {
          dragRef.current = {
            mode: 'move',
            pointerX: event.clientX,
            startOffset: previewStartOffset,
            duration: previewDuration,
          };
        }}
      >
        <span
          className={`block h-5 w-5 rotate-45 rounded-[3px] border-2 ${task.isCritical ? 'shadow-[0_0_0_3px_rgba(234,179,8,0.2)]' : ''} ${hasConflict ? 'border-rose-500' : 'border-white'}`}
          style={{ backgroundColor: phaseColor }}
        />
      </button>
    );
  }

  return (
    <div
      className={`absolute z-20 flex items-center rounded-xl border text-left shadow-sm transition-shadow hover:shadow-md ${task.isCritical ? 'ring-2 ring-amber-300/60' : ''} ${hasConflict ? 'border-rose-400' : 'border-white/60'}`}
      style={{
        left: previewStartOffset * dayWidth,
        top: rowTop + 10,
        width: Math.max(dayWidth, previewDuration * dayWidth),
        height: rowHeight - 20,
        backgroundColor: phaseColor,
      }}
      title={`${task.title}\n${task.startDate} -> ${task.endDate}\n${previewDuration} day(s)`}
    >
      <button
        type="button"
        className="h-full w-2 cursor-ew-resize rounded-l-xl bg-black/10"
        onPointerDown={(event) => {
          event.stopPropagation();
          dragRef.current = {
            mode: 'resize-start',
            pointerX: event.clientX,
            startOffset: previewStartOffset,
            duration: previewDuration,
          };
        }}
      />
      <button
        type="button"
        className="flex h-full flex-1 items-center gap-2 px-3 text-white"
        onPointerDown={(event) => {
          dragRef.current = {
            mode: 'move',
            pointerX: event.clientX,
            startOffset: previewStartOffset,
            duration: previewDuration,
          };
        }}
      >
        <span className="truncate text-xs font-semibold">{task.title}</span>
        <span className="ml-auto text-[10px] font-medium opacity-90">{previewDuration}d</span>
      </button>
      <button
        type="button"
        className="h-full w-2 cursor-ew-resize rounded-r-xl bg-black/10"
        onPointerDown={(event) => {
          event.stopPropagation();
          dragRef.current = {
            mode: 'resize-end',
            pointerX: event.clientX,
            startOffset: previewStartOffset,
            duration: previewDuration,
          };
        }}
      />
    </div>
  );
};

export default TaskBar;
