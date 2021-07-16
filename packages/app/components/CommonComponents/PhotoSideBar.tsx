import { BeneficiaryApplication } from '@popcorn/utils';

export default function PhotoSideBar(
  beneficiary: BeneficiaryApplication,
): JSX.Element {
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900">Photos</h3>
      {beneficiary?.files?.additionalImages?.map((image) => {
        return (
          <img
            className="w-full"
            src={`${process.env.IPFS_URL}${image?.image}`}
            alt={image?.description}
          />
        );
      })}
    </div>
  );
}
