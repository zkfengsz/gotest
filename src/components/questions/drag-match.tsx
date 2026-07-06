"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { DragOptions, DragPair } from "@/types/database";
import { GripVertical } from "lucide-react";
import { useMemo, useState } from "react";

interface DragMatchProps {
  options: DragOptions;
  value?: DragPair[];
  onChange?: (value: DragPair[]) => void;
  showCorrect?: boolean;
  correctAnswer?: DragPair[];
  disabled?: boolean;
}

function DraggableItem({
  id,
  text,
  disabled,
}: {
  id: string;
  text: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm",
        isDragging && "opacity-40",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{text}</span>
    </div>
  );
}

function DropZone({
  id,
  label,
  matchedText,
  showCorrect,
  isCorrect,
  disabled,
}: {
  id: string;
  label: string;
  matchedText?: string;
  showCorrect?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div className="flex items-center gap-3">
      <div className="w-1/2 rounded-lg border bg-slate-50 px-3 py-2.5 text-sm font-medium">
        {label}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[44px] w-1/2 items-center rounded-lg border-2 border-dashed px-3 py-2 text-sm transition-colors",
          isOver && "border-[#003366] bg-blue-50",
          matchedText && "border-solid border-[#003366] bg-blue-50",
          showCorrect && isCorrect && "border-green-500 bg-green-50",
          showCorrect && matchedText && !isCorrect && "border-red-500 bg-red-50"
        )}
      >
        {matchedText ?? (
          <span className="text-muted-foreground">拖拽右侧选项到此处</span>
        )}
      </div>
    </div>
  );
}

export function DragMatch({
  options,
  value = [],
  onChange,
  showCorrect,
  correctAnswer = [],
  disabled,
}: DragMatchProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const pairMap = useMemo(() => {
    const map = new Map<string, string>();
    value.forEach((p) => map.set(p.left, p.right));
    return map;
  }, [value]);

  const usedRightIds = useMemo(() => new Set(value.map((p) => p.right)), [value]);

  const availableRight = options.right.filter((r) => !usedRightIds.has(r.id));

  const rightTextMap = useMemo(() => {
    const map = new Map<string, string>();
    options.right.forEach((r) => map.set(r.id, r.text));
    return map;
  }, [options.right]);

  const correctMap = useMemo(() => {
    const map = new Map<string, string>();
    correctAnswer.forEach((p) => map.set(p.left, p.right));
    return map;
  }, [correctAnswer]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || disabled) return;

    const rightId = String(active.id);
    const leftId = String(over.id);

    if (!options.left.find((l) => l.id === leftId)) return;

    const filtered = value.filter((p) => p.left !== leftId && p.right !== rightId);
    onChange?.([...filtered, { left: leftId, right: rightId }]);
  }

  const activeText = activeId ? rightTextMap.get(activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <p className="mb-4 text-xs text-muted-foreground">
        将右侧选项拖拽到左侧对应行的虚线框中完成匹配
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#003366]">匹配项</h4>
          {options.left.map((left) => {
            const matchedRightId = pairMap.get(left.id);
            const matchedText = matchedRightId
              ? rightTextMap.get(matchedRightId)
              : undefined;
            const isCorrect =
              showCorrect && matchedRightId === correctMap.get(left.id);

            return (
              <DropZone
                key={left.id}
                id={left.id}
                label={left.text}
                matchedText={matchedText}
                showCorrect={showCorrect}
                isCorrect={isCorrect}
                disabled={disabled}
              />
            );
          })}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#003366]">可选项</h4>
          {availableRight.map((right) => (
            <DraggableItem
              key={right.id}
              id={right.id}
              text={right.text}
              disabled={disabled}
            />
          ))}
          {availableRight.length === 0 && (
            <p className="text-sm text-muted-foreground">所有选项已匹配</p>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeText ? (
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm shadow-lg">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            {activeText}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
