import { IGrantRoundFilter } from 'pages/grant-elections/[type]';
import { useEffect } from 'react';
import { useState } from 'react';
import GrantRoundLink, { IGrantRound } from './GrantRoundLink';

interface IYearSpoiler {
  year: number;
  grantRounds: IGrantRound[];
  scrollToGrantRound: (grantId: number) => void;
  grantRoundFilter: IGrantRoundFilter;
  opened?: boolean;
}

export default function YearSpoiler({
  year,
  grantRounds,
  scrollToGrantRound,
  grantRoundFilter,
  opened = false,
}: IYearSpoiler): JSX.Element {
  const [showGrants, setGrantVisibility] = useState<boolean>(false);

  useEffect(() => {
    setGrantVisibility(opened);
  }, []);

  return (
    <div>
      <a
        className="text-base cursor-pointer"
        onClick={() => setGrantVisibility((prevState) => !prevState)}
      >
        {year}
      </a>
      {showGrants && (
        <ul>
          {grantRounds
            ?.filter(
              (grantRound) => grantRoundFilter.active && grantRound.active,
            )
            .map((grantRound) => (
              <GrantRoundLink
                key={`${grantRound.id}-GrantLink`}
                grantRound={grantRound}
                scrollToGrantRound={scrollToGrantRound}
              />
            ))}
          {grantRounds
            ?.filter(
              (grantRound) => grantRoundFilter.closed && !grantRound.active,
            )
            .map((grantRound) => (
              <GrantRoundLink
                key={`${grantRound.id}-GrantLink`}
                grantRound={grantRound}
                scrollToGrantRound={scrollToGrantRound}
              />
            ))}
        </ul>
      )}
    </div>
  );
}
