interface EventHeaderTitleProps {
  eventName: string;
}

export default function EventHeaderTitle({ eventName }: EventHeaderTitleProps) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Event
      </p>
      <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-zinc-950">
        {eventName}
      </h1>
    </div>
  );
}
