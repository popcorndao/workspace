interface ProgressbarProps {
  progress: number;
  progressColor?: string;
  height?: string;
}

export default function ProgressBar({
  progress,
  progressColor = 'bg-gray-500',
  height = 'h-4',
}: ProgressbarProps): JSX.Element {
  return (
    <div className={`w-full bg-gray-200 rounded ${height}`}>
      <div
        className={`h-full rounded ${progressColor}`}
        style={{
          width: `${progress.toFixed(2)}%`,
        }}
      ></div>
    </div>
  );
}
