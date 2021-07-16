import { PaperClipIcon } from '@heroicons/react/solid';
import { BeneficiaryApplication } from '@popcorn/utils';
import SocialMedia from '../CommonComponents/SocialMedia';

export default function BeneficiaryInformation(
  beneficiary: BeneficiaryApplication,
): JSX.Element {
  return (
    <div className="col-span-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg my-4">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Beneficiary Information
          </h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="bg-gray-50 py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Mission Statement
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {beneficiary?.missionStatement}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Beneficiary Address
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {beneficiary?.beneficiaryAddress}
              </dd>
            </div>
            <div className="bg-gray-50 py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Proof of Ownership
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <a href={beneficiary?.links?.proofOfOwnership}>
                  {beneficiary?.links?.proofOfOwnership}
                </a>
              </dd>
            </div>

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Attachments</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                  {beneficiary?.files?.impactReports?.map(
                    (reportUrl, index) => {
                      return (
                        <li className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                          <div className="w-0 flex-1 flex items-center">
                            <PaperClipIcon
                              className="flex-shrink-0 h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                            <span className="ml-2 flex-1 w-0 truncate">
                              Impact report / audit {index + 1}
                            </span>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <a
                              href={`${process.env.IPFS_URL}${reportUrl}`}
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              Download
                            </a>
                          </div>
                        </li>
                      );
                    },
                  )}
                </ul>
              </dd>
            </div>
            <div className="bg-gray-50 py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Social Media, Website and Contact Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <SocialMedia {...beneficiary} />
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
