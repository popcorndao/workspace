import { Proposal } from '@popcorn/utils';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

const padTime = (x: number): string => {
  return String(x).padStart(2, '0');
};

const getTimeLeft = (stageDeadline: Date): string => {
  const date1 = DateTime.fromISO(new Date().toISOString());
  // TODO: Remove conditional below when we get deadline from contract
  const date2 = stageDeadline
    ? DateTime.fromISO(stageDeadline.toISOString())
    : DateTime.fromISO(new Date().toISOString());
  const diff = date2.diff(date1, ['hours', 'minutes', 'seconds']).toObject();

  return (
    padTime(diff.hours) +
    ':' +
    padTime(diff.minutes) +
    ':' +
    padTime(parseInt(diff.seconds))
  );
};

export default function CountdownTimer(proposal: Proposal) {
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
      <p className="justify-self-center mt-1 text-l text-gray-500">
        {timeLeft !== '00:00:00'
          ? timeLeft + ' left'
          : 'Voting period has ended'}
      </p>
    </div>
  );
}
