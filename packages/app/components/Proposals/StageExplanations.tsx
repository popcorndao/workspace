export const ProposalStageExplanations: React.FC = () => {
    return(
        <div>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wider my-4">
                Beneficiary nominated
            </h2>
            <p>Any user with atleast 2k POP is able to nominate a beneficiary</p>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wider my-4">
                Open Voting
            </h2>
            <p>
                In the first phase of voting, users have 48 hours to vote on the
                nomination. If the beneficiary passes with a majority, the process moves
                onto the challenge step.
            </p>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wide my-4">
                Challenge Period
            </h2>
            <p>
                The second phase of voting is the challenge period. Here, users have 48
                hours where they are only be able to vote “No” to veto the nomination.
                (This additional phase prevents exploits where a flood of late “Yes”
                votes swings the results). At the end of the challenge period, if the
                nomination receives more yes votes than no votes, the elected
                organization will become eligible to receive grants as an eligible
                beneficiary
            </p>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wider my-4">
                Beneficiary is eligible for grants
            </h2>
        </div>
    );
};

export const TakedownStageExplanations: React.FC = () => {
    return(
        <div>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wider my-4">
                Takedown Initiated
            </h2>
            <p>
                Any user with atleast 2000 POP is able to initiate a takedown proposal.
            </p>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wider my-4">
                Open Voting
            </h2>
            <p>
                In the first phase of voting, users have 48 hours to vote on the
                takedown. If the takedown passes with a majority, the process moves onto
                the challenge period.
            </p>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wide my-4">
                Challenge Period
            </h2>
            <p>
                The second phase of voting is the challenge period. Here, users have 48
                hours where they are only be able to vote “No” to veto the takedown.
                (This additional phase prevents exploits where a flood of late “Yes”
                votes swings the results). At the end of the challenge period, if the
                nomination receives more yes votes than no votes, the takedown will
                succeed and the organization will no longer be eligible to receive
                grants as an eligible beneficiary
            </p>
            <h2 className="text-lg leading-6 font-semibold text-indigo-900 uppercase tracking-wider my-4">
                Beneficiary is struck off and is ineligible for grants
            </h2>
        </div>
    );
};
