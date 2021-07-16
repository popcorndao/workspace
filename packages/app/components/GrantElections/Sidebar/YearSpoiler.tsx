import { IGrantRoundFilter } from 'pages/grant-elections/[type]';
import { useEffect } from 'react';
import { useState } from 'react';
import GrantRoundLink, { IGrantRound } from './GrantRoundLink';

interface YearSpoilerProps {
  year: number;
  grantRounds: IGrantRound[];
  scrollToGrantRound: (grantId: number) => void;
  grantRoundFilter: IGrantRoundFilter;
  opened?: boolean;
}

const YearSpoiler: React.FC<YearSpoilerProps> = ({
  year,
  grantRounds,
  scrollToGrantRound,
  grantRoundFilter,
  opened = false,
}) => {
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
};
export default YearSpoiler
