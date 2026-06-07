"use client";

import type { EventMap, EventName } from "@sunwjy/funnel-client";
import { funnel } from "@/lib/funnel";

interface TrackButtonProps<E extends EventName> {
  event: E;
  params: EventMap[E];
  label: string;
  className?: string;
}

/**
 * 클릭 시 지정된 이벤트를 track하는 범용 버튼 컴포넌트.
 */
export function TrackButton<E extends EventName>({
  event,
  params,
  label,
  className,
}: TrackButtonProps<E>) {
  function handleClick() {
    funnel.track(event, params);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
