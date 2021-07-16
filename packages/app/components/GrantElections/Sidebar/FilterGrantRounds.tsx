import { IGrantRoundFilter } from 'pages/grant-elections/[type]';
import { Dispatch } from 'react';

interface IFilterGrantRounds {
  grantRoundFilter: IGrantRoundFilter;
  setGrantRoundFilter: Dispatch<IGrantRoundFilter>;
}

export default function FilterGrantRounds({
  grantRoundFilter,
  setGrantRoundFilter,
}: IFilterGrantRounds): JSX.Element {
  function filterGrantRounds(key: string): void {
    const shallow = { ...grantRoundFilter };
    shallow[key] = !shallow[key];
    setGrantRoundFilter(shallow);
  }

  return (
    <span className="flex flex-row items-center space-x-2">
      <p>Show:</p>
      {Object.keys(grantRoundFilter)?.map((key) => (
        <label
          key={key}
          className="flex flex-row items-center space-x-1 cursor-pointer"
          htmlFor={`show-${key}-elections`}
          onClick={() => filterGrantRounds(key)}
        >
          <input
            id={`show-${key}-elections`}
            type="checkbox"
            checked={grantRoundFilter[key]}
            readOnly
          />
          <p>{key}</p>
        </label>
      ))}
    </span>
  );
}
