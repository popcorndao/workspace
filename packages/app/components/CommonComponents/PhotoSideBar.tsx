import { BeneficiaryApplication } from '@popcorn/utils';

export default function PhotoSideBar(
  beneficiary: BeneficiaryApplication,
): JSX.Element {
  return (
    <div className="col-span-2 space-y-4">
      <h3 className="text-lg leading-6 font-medium text-gray-900">Photos</h3>
      {beneficiary?.files?.additionalImages?.map((photoURL) => {
        return (
          <img
            className="w-full"
            src={`${process.env.IPFS_URL}${photoURL}`}
            alt=""
          />
        );
      })}
    </div>
  );
}
