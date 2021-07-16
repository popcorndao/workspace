import { Proposal } from '@popcorn/utils';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

const getTimeLeft = (stageDeadline: Date): string => {
  const date1 = DateTime.fromISO(new Date().toISOString());
  // TODO: Remove conditional below when we get deadline from contract
  const date2 = stageDeadline
    ? DateTime.fromISO(stageDeadline.toISOString())
    : DateTime.fromISO(new Date().toISOString());
  const diff = date2
    .diff(date1, ['days', 'hours', 'minutes', 'seconds'])
    .toObject();
  if (diff.days >= 1) return `${diff.days} days left`;
  if (diff.hours > 1)
    return `${diff.hours} hours and ${diff.minutes} minutes left`;
  if (diff.hours === 1)
    return `${diff.hours} hour and ${diff.minutes} minutes left`;
  if (diff.minutes > 1) return `${diff.minutes} minutes left`;
  if (diff.minutes === 1) return `${diff.minutes} minute left`;
  if (diff.seconds === 1) return `${diff.seconds} second left`;
  if (diff.seconds > 0) return `${diff.seconds} seconds left`;
  return 'Voting has ended';
};

const CountdownTimer: React.FC<Proposal> = (proposal) => {
  const [timeLeft, setTimeLeft] = useState<string>(
    getTimeLeft(proposal?.stageDeadline),
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(proposal?.stageDeadline));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid my-2 justify-items-stretch">
      <p
        title={proposal?.stageDeadline.toLocaleDateString() + " " + proposal?.stageDeadline.toLocaleTimeString()}
        className="justify-self-center mt-1 text-l text-gray-500"
      >
        {timeLeft}
      </p>
    </div>
  );
};
export default CountdownTimer
