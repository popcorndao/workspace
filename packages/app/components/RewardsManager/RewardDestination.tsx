interface RewardDestinationProps {
  destination: string;
  reward: string;
}

export default function RewardDestination({
  destination,
  reward,
}: RewardDestinationProps): JSX.Element {
  return (
    <div>
      <p className="text-xl font-bold text-right">{destination}</p>
      <span className="flex flex-row items-center justify-end mt-1">
        <p className="text-base">+{reward}</p>
        <img
          src="/images/popcorn_v1_rainbow_bg.png"
          alt="Logo"
          className="w-4 h-4 ml-2"
        ></img>
      </span>
    </div>
  );
}
