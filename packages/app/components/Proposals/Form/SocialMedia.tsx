import { FormStepProps } from 'pages/proposals/propose';
import React, { useState } from 'react';
import ContinueButton from './ContinueButton';
import SocialMediaTable from './SocialMediaTable';

const SocialMedia: React.FC<FormStepProps> = ({
  form,
  navigation,
  visible,
}) => {
  const [formData, setFormData] = form;
  const { currentStep, setCurrentStep, setStepLimit } = navigation;
  const [platform, setPlatform] = useState<string>('Facebook');

  function getUrl(platform) {
    switch (platform) {
      case 'Twitter': {
        return formData.links.twitterUrl;
      }
      case 'LinkedIn': {
        return formData.links.linkedinUrl;
      }
      case 'Instagram': {
        return formData.links.instagramUrl;
      }
      case 'GitHub': {
        return formData.links.githubUrl;
      }
      case 'Facebook': {
        return formData.links.facebookUrl;
      }
    }
  }

  function setUrl(event) {
    const url = event.target.value;
    switch (platform) {
      case 'Twitter': {
        setFormData({
          ...formData,
          links: { ...formData.links, twitterUrl: url },
        });
        break;
      }
      case 'LinkedIn': {
        setFormData({
          ...formData,
          links: { ...formData.links, linkedinUrl: url },
        });
        break;
      }
      case 'Instagram': {
        setFormData({
          ...formData,
          links: { ...formData.links, instagramUrl: url },
        });
        break;
      }
      case 'GitHub': {
        setFormData({
          ...formData,
          links: { ...formData.links, githubUrl: url },
        });
        break;
      }
      case 'Facebook': {
        setFormData({
          ...formData,
          links: { ...formData.links, facebookUrl: url },
        });
        break;
      }
    }
  }

  return (
    visible && (
      <div className="mx-auto content-center justify-items-center">
        <h2 className="justify-self-center text-base text-indigo-600 font-semibold tracking-wide">
          {navigation.currentStep} - Upload social media links
        </h2>

        <div className="grid justify-items-stretch ...">
          <p className="mt-8 mb-6 block text-sm font-medium text-gray-700">
            Add links to your social media profiles.
          </p>
          <div className="mt-5 md:mt-0 md:col-span-2 space-y-5">
            <div className="col-span-6 sm:col-span-3">
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700"
                >
                  Platform
                </label>
                <select
                  id="platform"
                  name="platform"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  defaultValue="Facebook"
                  onChange={(event) => setPlatform(event.target.value)}
                  value={platform}
                >
                  {[
                    'Facebook',
                    'LinkedIn',
                    'Instagram',
                    'GitHub',
                    'Twitter',
                  ].map((platform, i) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-span-6">
              <label
                htmlFor="street_address"
                className="block text-sm font-medium text-gray-700"
              >
                URL
              </label>
              <input
                type="text"
                name="url"
                id="url"
                onChange={setUrl}
                value={getUrl(platform)}
                placeholder="https://twitter.com/Popcorn_DAO"
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <SocialMediaTable form={form} />
        <div className="row-auto my-2 justify-self-center">
          <ContinueButton navigation={navigation} />
        </div>
      </div>
    )
  );
};
export default SocialMedia
