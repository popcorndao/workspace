import Divider from 'components/CommonComponents/Divider';
import ProgressBar from 'components/ProgressBar';

import {
  bigNumberToNumber,
  formatAndRoundBigNumber,
} from '@popcorn/utils/formatBigNumber';
import { Proposal } from '@popcorn/utils';


const CurrentStandings: React.FC<Proposal> = (proposal) => {
    return(
        <div className="content-center mx-48">
            <div className="grid my-2 justify-items-stretch">
            <span className="mx-4  w-1/2 justify-self-center flex flex-row justify-between">
              <p className="text-xl font-semibold text-gray-900">
                Current Standings
              </p>
            </span>
            </div>
            <div className="grid my-2 justify-items-stretch">
            <span className="mx-4  w-1/2 justify-self-center flex flex-row justify-between">
              <p className="text-lg font-medium text-gray-700">Votes For</p>
              <span className="text-base text-gray-700 flex flex-row">
                <p>{formatAndRoundBigNumber(proposal?.votes?.for)}</p>
              </span>
            </span>
            </div>

            <div className="grid my-2 justify-items-stretch">
            <span className="mx-4  w-1/2 justify-self-center flex flex-row justify-between  pb-2">
              <ProgressBar
                  progress={
                      bigNumberToNumber(proposal?.votes?.for) === 0
                          ? 0
                          : (100 * bigNumberToNumber(proposal?.votes?.for)) /
                          bigNumberToNumber(
                              proposal?.votes?.for.add(proposal?.votes?.against),
                          )
                  }
                  progressColor={'bg-green-300'}
              />
            </span>
            </div>
            <div className="grid my-2 justify-items-stretch">
            <span className="mx-4  w-1/2 justify-self-center flex flex-row justify-between">
              <p className="text-lg font-medium text-gray-700">Votes Against</p>
              <span className="text-base text-gray-700 flex flex-row">
                <p>{formatAndRoundBigNumber(proposal?.votes?.against)}</p>
              </span>
            </span>
            </div>

            <div className="grid my-2 justify-items-stretch">
            <span className="mx-4  w-1/2 justify-self-center flex flex-row justify-between border-b-2 pb-2">
              <ProgressBar
                  progress={
                      bigNumberToNumber(proposal?.votes?.against) === 0
                          ? 0
                          : (100 * bigNumberToNumber(proposal?.votes?.against)) /
                          bigNumberToNumber(
                              proposal?.votes?.for.add(proposal?.votes?.against),
                          )
                  }
                  progressColor={'bg-red-400'}
              />
            </span>
            </div>

            <div className="grid my-2 justify-items-stretch">
            <span className="mx-4  w-1/2 justify-self-center flex flex-row justify-between">
              <p className="text-lg font-medium text-gray-700">Total Votes</p>
              <span className="text-base text-gray-700 flex flex-row">
                <p>
                  {formatAndRoundBigNumber(
                      proposal?.votes?.for.add(proposal?.votes?.against),
                  )}
                </p>
              </span>
            </span>
            </div>
            <Divider/>
        </div>
    );
};
export default CurrentStandings
