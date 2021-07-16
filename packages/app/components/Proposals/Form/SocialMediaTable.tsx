// Display table that contains platform, url and option to delete

import { TrashIcon } from '@heroicons/react/solid';
import { BeneficiaryApplication } from '@popcorn/utils';
import Link from 'next/link';
import React from 'react';

interface SocialMediaTableProps {
  form: [
    BeneficiaryApplication,
    React.Dispatch<React.SetStateAction<BeneficiaryApplication>>,
  ];
}

const SocialMediaTable: React.FC<SocialMediaTableProps> = ({ form }) => {
  const [formData, setFormData] = form;
  const { twitterUrl, linkedinUrl, facebookUrl, instagramUrl, githubUrl } =
    formData.links;
  function clearUrl(platform) {
    switch (platform) {
      case 'Twitter': {
        setFormData({
          ...formData,
          links: { ...formData.links, twitterUrl: '' },
        });
        break;
      }
      case 'LinkedIn': {
        setFormData({
          ...formData,
          links: { ...formData.links, linkedinUrl: '' },
        });
        break;
      }
      case 'Instagram': {
        setFormData({
          ...formData,
          links: { ...formData.links, instagramUrl: '' },
        });
        break;
      }
      case 'GitHub': {
        setFormData({
          ...formData,
          links: { ...formData.links, githubUrl: '' },
        });
        break;
      }
      case 'Facebook': {
        setFormData({
          ...formData,
          links: { ...formData.links, facebookUrl: '' },
        });
        break;
      }
    }
  }

  function getRow(url, platform) {
    return url !== '' ? (
      <tr key={platform}>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {platform}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          <Link href={url}>{url}</Link>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <a
            href="#"
            className="text-red-400 hover:text-red-900"
            onClick={() => {
              clearUrl(platform);
            }}
          >
            <TrashIcon className="h-5 w-5" aria-hidden="true" />
          </a>
        </td>
      </tr>
    ) : (
      <tr></tr>
    );
  }

  return (
    <div className="my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Platform
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  URL
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Delete
                </th>
              </tr>
            </thead>
            <tbody>
              {getRow(twitterUrl, 'Twitter')}
              {getRow(linkedinUrl, 'LinkedIn')}
              {getRow(facebookUrl, 'Facebook')}
              {getRow(githubUrl, 'GitHub')}
              {getRow(instagramUrl, 'Instagram')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default SocialMediaTable
