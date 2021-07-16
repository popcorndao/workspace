import {BeneficiaryApplication} from '@popcorn/utils';
import CardBody from 'components/CommonComponents/CardBody';
import Link from 'next/link';

interface BeneficiaryCardProps {
    beneficiary: BeneficiaryApplication
}

const BeneficiaryCard: React.FC<BeneficiaryCardProps> = ({beneficiary}) => {
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
};
export default BeneficiaryCard
