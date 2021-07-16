import { BeneficiaryApplication } from '@popcorn/utils';
import CardGridHeader from 'components/CardGridHeader';
import Navbar from 'components/NavBar/NavBar';
import { useState } from 'react';
import * as Icon from 'react-feather';
import BeneficiaryCard from './BeneficiaryCard';

interface BeneficiaryGridProps {
  beneficiaries: BeneficiaryApplication[];
  subtitle: string;
  title: string;
}

export default function BeneficiaryGrid({
  beneficiaries,
  subtitle,
  title,
}: BeneficiaryGridProps) {
  const [searchFilter, setSearchFilter] = useState<string>('');

  return (
    <div className="w-full bg-gray-900 pb-16">
      <Navbar />
      <CardGridHeader title={title} subtitle={subtitle} />
      <div className="grid grid-cols-2 gap-4 items-center justify-start ml-36 mr-64 my-4 h-1/2">
        <div className="sm:w-full sm:max-w-md lg:mt-0 lg:flex-1">
          <form className="sm:flex">
            <input
              type="search"
              name="searchfilter"
              className="w-full border-white px-5 py-3 placeholder-warm-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cyan-700 focus:ring-white rounded-md"
              placeholder={'Search ' + title}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </form>
        </div>
      </div>
      <ul className="sm:grid sm:grid-cols-2 gap-x-2 gap-y-12 lg:grid-cols-3 mx-36">
        {beneficiaries
          ?.filter((beneficiary) => {
            return beneficiary.organizationName
              .toLowerCase()
              .includes(searchFilter.toLowerCase());
          })
          .map((beneficiary) => (
            <BeneficiaryCard
              key={beneficiary.beneficiaryAddress}
              beneficiary={beneficiary}
            />
          ))}
      </ul>
    </div>
  );
}
