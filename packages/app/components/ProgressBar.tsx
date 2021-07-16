interface ProgressbarProps {
  progress: number;
  progressColor?: string;
  height?: string;
}

const ProgressBar: React.FC<ProgressbarProps> = ({
  progress,
  progressColor = 'bg-gray-500',
  height = 'h-4',
}) => {
    return (
        <div className={`w-full bg-gray-200 rounded ${height}`}>
            <div
                className={`h-full rounded ${progressColor}`}
                style={{
                    width: `${progress.toFixed(2)}%`,
                }}
                />
        </div>
    );
};
export default ProgressBar
