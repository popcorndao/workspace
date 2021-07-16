import { BeneficiaryApplication } from '@popcorn/utils';
import CardBody from 'components/CommonComponents/CardBody';
import Link from 'next/link';

export default function BeneficiaryCard(
  beneficiary: BeneficiaryApplication,
): JSX.Element {
  return (
    <div
      key={beneficiary.beneficiaryAddress}
      className="flex flex-col rounded-lg shadow-lg overflow-hidden bg-white"
    >
      <Link href={`/beneficiaries/${beneficiary.beneficiaryAddress}`} passHref>
        <a>
          <CardBody
            imgUrl={`${process.env.IPFS_URL}${beneficiary?.files.profileImage?.image}`}
            name={beneficiary.organizationName}
            missionStatement={beneficiary?.missionStatement}
          />
        </a>
      </Link>
    </div>
  );
}
